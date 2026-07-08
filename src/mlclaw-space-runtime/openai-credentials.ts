import fs from "node:fs/promises";
import path from "node:path";
import type { SpaceRuntimeConfig } from "./config.js";

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
