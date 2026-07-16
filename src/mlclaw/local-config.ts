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
  localGateway?: LocalGatewayBinding;
  createdAt: string;
  updatedAt: string;
};

export type LocalGatewayBinding = {
  engine: "docker";
  dockerContext: string;
  dockerEndpoint?: string;
} | {
  engine: "podman";
  podmanConnection: string;
  podmanEndpoint?: string;
};

export type LocalConfigPaths = {
  root: string;
  deploymentsDir: string;
  secretsDir: string;
};

export function defaultConfigRoot(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.MLCLAW_CONFIG_HOME?.trim();
  if (explicit) {
    return explicit;
  }
  const xdg = env.XDG_CONFIG_HOME?.trim();
  if (xdg) {
    return path.join(xdg, "mlclaw");
  }
  return path.join(os.homedir(), ".config", "mlclaw");
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
    .map(([key, value]) => renderEnvLine(key, value))
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
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }
    const equals = line.indexOf("=");
    if (equals <= 0) {
      continue;
    }
    const key = line.slice(0, equals).trim();
    out[key] = line.slice(equals + 1);
  }
  return out;
}

function renderEnvLine(key: string, value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    throw new Error(`invalid env key: ${key}`);
  }
  if (/[\r\n]/.test(value)) {
    throw new Error(`env value for ${key} cannot contain newlines`);
  }
  return `${key}=${value}`;
}
