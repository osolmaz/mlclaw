import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { GatewayLocation } from "./gateway-location.js";

export type DeploymentManifest = {
  version: 1;
  agent: string;
  owner: string;
  bucket: string;
  space: string;
  localRuntimeId: string;
  gatewayLocation: GatewayLocation;
  model: string;
  runtimeImage: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalConfigPaths = {
  root: string;
  deploymentsDir: string;
  secretsDir: string;
};

export function defaultConfigRoot(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.HUGGINGCLAW_CONFIG_HOME?.trim();
  if (explicit) {
    return explicit;
  }
  const xdg = env.XDG_CONFIG_HOME?.trim();
  if (xdg) {
    return path.join(xdg, "huggingclaw");
  }
  return path.join(os.homedir(), ".config", "huggingclaw");
}

export function localConfigPaths(root: string): LocalConfigPaths {
  return {
    root,
    deploymentsDir: path.join(root, "deployments"),
    secretsDir: path.join(root, "secrets"),
  };
}

export function manifestPath(root: string, agent: string): string {
  return path.join(localConfigPaths(root).deploymentsDir, `${agent}.json`);
}

export function secretEnvPath(root: string, agent: string): string {
  return path.join(localConfigPaths(root).secretsDir, `${agent}.env`);
}

export async function writeManifest(root: string, manifest: DeploymentManifest): Promise<void> {
  const file = manifestPath(root, manifest.agent);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export async function readManifest(root: string, agent: string): Promise<DeploymentManifest> {
  const file = manifestPath(root, agent);
  const parsed = JSON.parse(await fs.readFile(file, "utf8")) as DeploymentManifest;
  if (parsed.version !== 1) {
    throw new Error(`unsupported deployment manifest version in ${file}`);
  }
  return parsed;
}

export async function manifestExists(root: string, agent: string): Promise<boolean> {
  try {
    await fs.access(manifestPath(root, agent));
    return true;
  } catch {
    return false;
  }
}

export function renderSecretEnv(values: Record<string, string>): string {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${quoteEnvValue(value)}`)
    .join("\n")}\n`;
}

export async function writeSecretEnv(root: string, agent: string, values: Record<string, string>): Promise<void> {
  const file = secretEnvPath(root, agent);
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, renderSecretEnv(values), { encoding: "utf8", mode: 0o600 });
  await fs.chmod(file, 0o600);
}

export async function readSecretEnv(root: string, agent: string): Promise<Record<string, string>> {
  return parseSecretEnv(await fs.readFile(secretEnvPath(root, agent), "utf8"));
}

export function parseSecretEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equals = trimmed.indexOf("=");
    if (equals <= 0) {
      continue;
    }
    const key = trimmed.slice(0, equals);
    const value = trimmed.slice(equals + 1);
    out[key] = unquoteEnvValue(value);
  }
  return out;
}

function quoteEnvValue(value: string): string {
  if (/^[A-Za-z0-9_./:@+-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

function unquoteEnvValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return JSON.parse(value) as string;
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}
