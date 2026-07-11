import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { SpaceRuntimeConfig } from "./config.js";

type EncryptedOpenAiCredential = {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

export type OpenAiCredentialStatus = {
  configured: boolean;
  persistent: boolean;
};

export function openAiConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export async function loadOpenAiCredentialFile(file: string): Promise<string | undefined> {
  try {
    const raw = await fs.readFile(file, "utf8");
    const match = raw.match(/(?:^|\n)OPENAI_API_KEY=([^\n]+)/);
    return match?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function writeEphemeralOpenAiCredential(file: string, apiKey: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, `OPENAI_API_KEY=${apiKey.trim()}\n`, { encoding: "utf8", mode: 0o600 });
  await fs.chmod(file, 0o600);
}

export class OpenAiCredentialStore {
  private readonly key: Buffer;

  constructor(
    private readonly file: string,
    secret: string,
  ) {
    this.key = Buffer.from(
      hkdfSync(
        "sha256",
        Buffer.from(secret, "utf8"),
        Buffer.alloc(0),
        Buffer.from("mlclaw:openai-api-key:v1", "utf8"),
        32,
      ),
    );
  }

  async load(): Promise<string | undefined> {
    let raw: string;
    try {
      raw = await fs.readFile(this.file, "utf8");
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === "ENOENT") {
        return undefined;
      }
      throw new Error("Could not read encrypted OpenAI credential");
    }
    try {
      const envelope = JSON.parse(raw) as EncryptedOpenAiCredential;
      if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") {
        throw new Error("unsupported envelope");
      }
      const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(envelope.iv, "base64url"));
      decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
      const apiKey = Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
        decipher.final(),
      ]).toString("utf8");
      if (!validateOpenAiApiKey(apiKey)) {
        throw new Error("invalid key");
      }
      return apiKey;
    } catch {
      throw new Error("Encrypted OpenAI credential is invalid or cannot be decrypted");
    }
  }

  async save(apiKey: string): Promise<void> {
    const normalized = validateOpenAiApiKey(apiKey);
    if (!normalized) {
      throw new Error("valid OpenAI API key is required");
    }
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
    const envelope: EncryptedOpenAiCredential = {
      version: 1,
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64url"),
      tag: cipher.getAuthTag().toString("base64url"),
      ciphertext: ciphertext.toString("base64url"),
    };
    const directory = path.dirname(this.file);
    const temporary = `${this.file}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    try {
      await fs.writeFile(temporary, `${JSON.stringify(envelope)}\n`, { encoding: "utf8", mode: 0o600 });
      await fs.chmod(temporary, 0o600);
      await fs.rename(temporary, this.file);
      await fs.chmod(this.file, 0o600);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
}

export async function persistOpenAiCredentialToSpaceSecret(
  config: SpaceRuntimeConfig,
  apiKey: string,
): Promise<boolean> {
  if (!config.spaceId || !config.hfToken) {
    return false;
  }
  const response = await fetch(`${config.hubUrl.replace(/\/+$/, "")}/api/spaces/${config.spaceId}/secrets`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.hfToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      key: "OPENAI_API_KEY",
      value: apiKey.trim(),
    }),
  });
  if (!response.ok) {
    return false;
  }
  return true;
}

export function validateOpenAiApiKey(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!/^sk-[A-Za-z0-9_\-]{20,}$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}
