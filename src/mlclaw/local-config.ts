import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import type { GatewayLocation } from "./gateway-location.js";
import { AGENT_NAME_PATTERN, assertAgentName } from "./naming.js";

export type DeploymentManifest = {
  version: 2;
  deploymentId: string;
  desiredGeneration: number;
  agent: string;
  owner: string;
  bucket: string;
  space: string;
  localRuntimeId: string;
  gatewayLocation: GatewayLocation;
  model: string;
  runtimeImage: string;
  credentialKeySha256?: string;
  tailscaleMode?: "off" | "direct" | "serve";
  spaceVisibility?: "private" | "public";
  spaceHardware?: string;
  spaceSleepTime?: number;
  recoveredWithoutCredentialKey?: boolean;
  pendingTombstoneBucket?: string;
  localPort?: number;
  localGateway?: LocalGatewayBinding;
  networkAccess?: NetworkAccessBinding;
  createdAt: string;
  updatedAt: string;
};

export type NetworkAccessBinding =
  | {
      provider: "tailscale-serve";
      enabled: boolean;
      dnsName: string;
      httpsPort: number;
      target: string;
      accessOrigin: string;
      pendingApproval?: boolean;
    }
  | {
      provider: "tailscale-direct";
      enabled: boolean;
      ipv4: string;
      dnsName?: string;
      port: number;
      accessOrigin: string;
    };

export type LocalGatewayBinding =
  | {
      engine: "docker";
      dockerContext: string;
      dockerEndpoint?: string;
    }
  | {
      engine: "podman";
      podmanConnection: string;
      podmanEndpoint?: string;
    };

export type LocalConfigPaths = {
  root: string;
  deploymentsDir: string;
  secretsDir: string;
  operationsDir: string;
  locksDir: string;
};

const localGatewaySchema = z.discriminatedUnion("engine", [
  z
    .object({
      engine: z.literal("docker"),
      dockerContext: z.string().min(1).max(256),
      dockerEndpoint: z.string().max(2048).optional(),
    })
    .strict(),
  z
    .object({
      engine: z.literal("podman"),
      podmanConnection: z.string().min(1).max(256),
      podmanEndpoint: z.string().max(2048).optional(),
    })
    .strict(),
]);

const networkAccessSchema = z.discriminatedUnion("provider", [
  z
    .object({
      provider: z.literal("tailscale-serve"),
      enabled: z.boolean(),
      dnsName: z.string().min(1).max(253),
      httpsPort: z.number().int().min(1).max(65535),
      target: z.string().url().max(2048),
      accessOrigin: z.string().url().max(2048),
      pendingApproval: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      provider: z.literal("tailscale-direct"),
      enabled: z.boolean(),
      ipv4: z.string().ip({ version: "v4" }),
      dnsName: z.string().min(1).max(253).optional(),
      port: z.number().int().min(1).max(65535),
      accessOrigin: z.string().url().max(2048),
    })
    .strict(),
]);

const manifestFields = {
  agent: z.string().regex(AGENT_NAME_PATTERN),
  owner: z.string().min(1).max(128),
  bucket: z.string().min(3).max(256),
  space: z.string().min(3).max(256),
  localRuntimeId: z.string().min(1).max(256),
  gatewayLocation: z.enum(["local", "space"]),
  model: z.string().min(1).max(512),
  runtimeImage: z.string().min(1).max(1024),
  credentialKeySha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  tailscaleMode: z.enum(["off", "direct", "serve"]).optional(),
  spaceVisibility: z.enum(["private", "public"]).optional(),
  spaceHardware: z.string().min(1).max(128).optional(),
  spaceSleepTime: z.number().int().min(-1).optional(),
  recoveredWithoutCredentialKey: z.boolean().optional(),
  pendingTombstoneBucket: z.string().min(3).max(256).optional(),
  localPort: z.number().int().min(1).max(65535).optional(),
  localGateway: localGatewaySchema.optional(),
  networkAccess: networkAccessSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};

const manifestSchema = z
  .object({
    version: z.literal(2),
    deploymentId: z.string().uuid(),
    desiredGeneration: z.number().int().nonnegative(),
    ...manifestFields,
  })
  .strict();

const legacyManifestSchema = z.object({ version: z.literal(1), ...manifestFields }).strict();

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
    operationsDir: path.join(root, "operations"),
    locksDir: path.join(root, "locks"),
  };
}

export function manifestPath(root: string, agent: string): string {
  return path.join(localConfigPaths(root).deploymentsDir, `${assertAgentName(agent)}.json`);
}

export function secretEnvPath(root: string, agent: string): string {
  return path.join(localConfigPaths(root).secretsDir, `${assertAgentName(agent)}.env`);
}

export async function writeManifest(root: string, input: DeploymentManifest | LegacyDeploymentManifest): Promise<void> {
  const manifest =
    input.version === 1
      ? importLegacyManifest(legacyManifestSchema.parse(input) as LegacyDeploymentManifest)
      : manifestSchema.parse(input);
  const file = manifestPath(root, manifest.agent);
  await writePrivateFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

export async function readManifest(root: string, agent: string): Promise<DeploymentManifest> {
  const file = manifestPath(root, agent);
  const raw: unknown = JSON.parse(await fs.readFile(file, "utf8"));
  const version =
    raw && typeof raw === "object" && "version" in raw ? (raw as { version?: unknown }).version : undefined;
  const parsed =
    version === 1 ? (legacyManifestSchema.parse(raw) as LegacyDeploymentManifest) : manifestSchema.parse(raw);
  if (parsed.version === 1) {
    return importLegacyManifest(parsed);
  }
  if (parsed.version !== 2) {
    throw new Error(`unsupported deployment manifest version in ${file}`);
  }
  return parsed as DeploymentManifest;
}

export async function listManifests(root: string): Promise<DeploymentManifest[]> {
  const dir = localConfigPaths(root).deploymentsDir;
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const manifests = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => readManifest(root, entry.name.slice(0, -5))),
  );
  return manifests.sort((a, b) => a.agent.localeCompare(b.agent));
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
  await writePrivateFile(file, renderSecretEnv(values));
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

export type LegacyDeploymentManifest = Omit<DeploymentManifest, "version" | "deploymentId" | "desiredGeneration"> & {
  version: 1;
};

function importLegacyManifest(manifest: LegacyDeploymentManifest): DeploymentManifest {
  const digest = createHash("sha256").update(`${manifest.owner}\0${manifest.bucket}\0${manifest.agent}`).digest("hex");
  const deploymentId = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  return { ...manifest, version: 2, deploymentId, desiredGeneration: 0 };
}

async function writePrivateFile(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600);
}
