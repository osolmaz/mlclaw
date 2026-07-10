import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { OAuthIdentity } from "./oauth.js";

type StoredCredential = {
  username: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope: string[];
  expiresAt?: number;
  updatedAt: number;
};

type CredentialDocument = {
  version: 1;
  credentials: Record<string, StoredCredential>;
};

type EncryptedEnvelope = {
  version: 1;
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
};

export type McpCredentialStatus = {
  configured: boolean;
  username: string;
  scope: string[];
  expiresAt: string | null;
  refreshable: boolean;
};

export type McpCredentialStoreOptions = {
  file: string;
  secret: string;
  providerUrl: string;
  clientId?: string;
  clientSecret?: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export class McpCredentialStore {
  private readonly key: Buffer;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private loaded = false;
  private document: CredentialDocument = { version: 1, credentials: {} };
  private refreshes = new Map<string, Promise<string>>();

  constructor(private readonly options: McpCredentialStoreOptions) {
    this.key = Buffer.from(hkdfSync(
      "sha256",
      Buffer.from(options.secret, "utf8"),
      Buffer.alloc(0),
      Buffer.from("mlclaw:mcp-oauth:v1", "utf8"),
      32,
    ));
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  async save(identity: OAuthIdentity): Promise<void> {
    await this.load();
    this.document.credentials[identity.username] = {
      username: identity.username,
      accessToken: identity.accessToken,
      ...(identity.refreshToken ? { refreshToken: identity.refreshToken } : {}),
      tokenType: identity.tokenType,
      scope: [...identity.scope],
      ...(identity.expiresAt ? { expiresAt: identity.expiresAt } : {}),
      updatedAt: this.now(),
    };
    await this.persist();
  }

  async clear(username: string): Promise<void> {
    await this.load();
    if (!(username in this.document.credentials)) {
      return;
    }
    delete this.document.credentials[username];
    await this.persist();
  }

  async status(username: string): Promise<McpCredentialStatus> {
    await this.load();
    const credential = this.document.credentials[username];
    return credential
      ? {
          configured: true,
          username,
          scope: [...credential.scope],
          expiresAt: credential.expiresAt ? new Date(credential.expiresAt).toISOString() : null,
          refreshable: Boolean(credential.refreshToken),
        }
      : {
          configured: false,
          username,
          scope: [],
          expiresAt: null,
          refreshable: false,
        };
  }

  async accessToken(username: string): Promise<string> {
    await this.load();
    const credential = this.document.credentials[username];
    if (!credential) {
      throw new Error(`Hugging Face MCP authorization is not configured for ${username}`);
    }
    if (!credential.expiresAt || credential.expiresAt > this.now() + 60_000) {
      return credential.accessToken;
    }
    const existing = this.refreshes.get(username);
    if (existing) {
      return existing;
    }
    const refreshing = this.refresh(username, credential).finally(() => {
      this.refreshes.delete(username);
    });
    this.refreshes.set(username, refreshing);
    return refreshing;
  }

  private async load(): Promise<void> {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    let raw: string;
    try {
      raw = await fs.readFile(this.options.file, "utf8");
    } catch (err) {
      if (isNotFound(err)) {
        return;
      }
      this.loaded = false;
      throw new Error("Could not read encrypted MCP credentials");
    }
    try {
      this.document = decodeDocument(decryptEnvelope(raw, this.key));
    } catch {
      this.loaded = false;
      throw new Error("Encrypted MCP credentials are invalid or cannot be decrypted");
    }
  }

  private async persist(): Promise<void> {
    const directory = path.dirname(this.options.file);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${this.options.file}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`;
    const encrypted = encryptDocument(this.document, this.key);
    try {
      await fs.writeFile(temporary, `${JSON.stringify(encrypted)}\n`, { encoding: "utf8", mode: 0o600 });
      await fs.chmod(temporary, 0o600);
      await fs.rename(temporary, this.options.file);
      await fs.chmod(this.options.file, 0o600);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  private async refresh(username: string, credential: StoredCredential): Promise<string> {
    if (!credential.refreshToken || !this.options.clientId || !this.options.clientSecret) {
      throw new Error("Hugging Face MCP authorization expired; sign in again");
    }
    const providerUrl = this.options.providerUrl.replace(/\/+$/, "");
    const basic = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString("base64");
    const response = await this.fetchImpl(`${providerUrl}/oauth/token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credential.refreshToken,
        client_id: this.options.clientId,
      }),
    });
    if (!response.ok) {
      throw new Error("Hugging Face MCP authorization expired; sign in again");
    }
    const body = await response.json() as Record<string, unknown>;
    const accessToken = stringValue(body.access_token);
    if (!accessToken) {
      throw new Error("Hugging Face MCP token refresh returned an invalid response");
    }
    const expiresIn = numberValue(body.expires_in);
    const refreshed: StoredCredential = {
      ...credential,
      accessToken,
      refreshToken: stringValue(body.refresh_token) ?? credential.refreshToken,
      tokenType: stringValue(body.token_type) ?? credential.tokenType,
      scope: scopeValue(body.scope) ?? credential.scope,
      ...(expiresIn ? { expiresAt: this.now() + expiresIn * 1000 } : {}),
      updatedAt: this.now(),
    };
    this.document.credentials[username] = refreshed;
    await this.persist();
    return accessToken;
  }
}

function encryptDocument(document: CredentialDocument, key: Buffer): EncryptedEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(document), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  };
}

function decryptEnvelope(raw: string, key: Buffer): unknown {
  const envelope = JSON.parse(raw) as Partial<EncryptedEnvelope>;
  if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm" ||
    !envelope.iv || !envelope.tag || !envelope.ciphertext) {
    throw new Error("invalid envelope");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64url"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8"));
}

function decodeDocument(value: unknown): CredentialDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid credential document");
  }
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || !record.credentials || typeof record.credentials !== "object" || Array.isArray(record.credentials)) {
    throw new Error("invalid credential document");
  }
  const credentials: Record<string, StoredCredential> = {};
  for (const [username, raw] of Object.entries(record.credentials as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("invalid credential");
    }
    const item = raw as Record<string, unknown>;
    const accessToken = stringValue(item.accessToken);
    const refreshToken = stringValue(item.refreshToken);
    const expiresAt = numberValue(item.expiresAt);
    if (!accessToken || stringValue(item.username) !== username) {
      throw new Error("invalid credential");
    }
    credentials[username] = {
      username,
      accessToken,
      ...(refreshToken ? { refreshToken } : {}),
      tokenType: stringValue(item.tokenType) ?? "Bearer",
      scope: scopeValue(item.scope) ?? [],
      ...(expiresAt ? { expiresAt } : {}),
      updatedAt: numberValue(item.updatedAt) ?? 0,
    };
  }
  return { version: 1, credentials };
}

function scopeValue(value: unknown): string[] | undefined {
  const values = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string" ? value.split(/\s+/) : undefined;
  return values ? [...new Set(values.map((item) => item.trim()).filter(Boolean))] : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function isNotFound(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && err.code === "ENOENT");
}
