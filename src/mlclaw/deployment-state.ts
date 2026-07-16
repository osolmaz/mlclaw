import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { BucketClient } from "../hf-bucket-client/client.js";
import { localConfigPaths, type DeploymentManifest } from "./local-config.js";
import { AGENT_NAME_PATTERN } from "./naming.js";

export const DEPLOYMENT_PATH = ".mlclaw/deployment.json";
export const DESIRED_STATE_PATH = ".mlclaw/desired-state.json";
export const TOMBSTONE_PATH = ".mlclaw/tombstone.json";
const MAX_CONTROL_BYTES = 64 * 1024;
const LOCAL_LOCK_HEARTBEAT_MS = 30_000;
const LOCAL_LOCK_STALE_MS = 5 * 60_000;

const identitySchema = z
  .object({
    schemaVersion: z.literal(1),
    deploymentId: z.string().uuid(),
    agent: z.string().regex(AGENT_NAME_PATTERN),
    owner: z.string().min(1).max(128),
    bucket: z.string().min(3).max(256),
    statePrefix: z.string().min(1).max(256),
    credentialKeySha256: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: z.string().datetime(),
  })
  .strict();

const desiredStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    deploymentId: z.string().uuid(),
    generation: z.number().int().nonnegative(),
    updatedAt: z.string().datetime(),
    gateway: z
      .object({
        location: z.enum(["local", "space"]),
        port: z.number().int().min(1).max(65535),
        tailscaleMode: z.enum(["off", "direct", "serve"]),
      })
      .strict(),
    model: z.string().min(1).max(512),
    runtimeImage: z.string().min(1).max(1024),
    space: z
      .object({
        repo: z.string().min(3).max(256),
        visibility: z.enum(["private", "public"]),
        hardware: z.string().min(1).max(128).optional(),
        sleepTime: z.number().int().min(-1).optional(),
      })
      .strict(),
  })
  .strict();

const operationStateSchema = z.enum([
  "planned",
  "applying",
  "waiting_for_approval",
  "verifying",
  "rolling_back",
  "completed",
  "failed",
  "cleaned",
]);
const operationSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: z.string().uuid(),
    deploymentId: z.string().uuid(),
    targetGeneration: z.number().int().nonnegative(),
    state: operationStateSchema,
    startedAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    detail: z.string().max(1000).optional(),
  })
  .strict();

const leaseSchema = z
  .object({
    schemaVersion: z.literal(1),
    deploymentId: z.string().uuid(),
    operationId: z.string().uuid(),
    holderId: z.string().min(1).max(256),
    fencingToken: z.string().uuid(),
    generation: z.number().int().nonnegative(),
    acquiredAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  })
  .strict();

const tombstoneSchema = z
  .object({
    schemaVersion: z.literal(1),
    deploymentId: z.string().uuid(),
    movedTo: z.string().min(3).max(256),
    tombstonedAt: z.string().datetime(),
  })
  .strict();

export type DeploymentIdentity = z.infer<typeof identitySchema>;
export type DeploymentDesiredState = z.infer<typeof desiredStateSchema>;
export type DeploymentOperation = z.infer<typeof operationSchema>;
export type DeploymentOperationState = z.infer<typeof operationStateSchema>;
export type DeploymentControlLease = z.infer<typeof leaseSchema>;
export type DeploymentTombstone = z.infer<typeof tombstoneSchema>;
export type HeldControlLease = { value: DeploymentControlLease; revision: string };
export type ControlLeaseStore = {
  read(): Promise<{ value: unknown | null; revision: string }>;
  compareAndSwap(expectedRevision: string, value: unknown | null): Promise<string>;
};

export function deploymentIdentity(manifest: DeploymentManifest, statePrefix = "openclaw-state"): DeploymentIdentity {
  if (!manifest.credentialKeySha256) throw new Error("deployment credential key fingerprint is missing");
  return identitySchema.parse({
    schemaVersion: 1,
    deploymentId: manifest.deploymentId,
    agent: manifest.agent,
    owner: manifest.owner,
    bucket: manifest.bucket,
    statePrefix,
    credentialKeySha256: manifest.credentialKeySha256,
    createdAt: manifest.createdAt,
  });
}

export function deploymentDesiredState(
  manifest: DeploymentManifest,
  visibility: "private" | "public" = manifest.spaceVisibility ?? "private",
): DeploymentDesiredState {
  return desiredStateSchema.parse({
    schemaVersion: 1,
    deploymentId: manifest.deploymentId,
    generation: manifest.desiredGeneration,
    updatedAt: manifest.updatedAt,
    gateway: {
      location: manifest.gatewayLocation,
      port: manifest.localPort ?? 7860,
      tailscaleMode:
        manifest.tailscaleMode ??
        (manifest.networkAccess?.provider === "tailscale-direct"
          ? "direct"
          : manifest.networkAccess?.provider === "tailscale-serve" && manifest.networkAccess.enabled
            ? "serve"
            : "off"),
    },
    model: manifest.model,
    runtimeImage: manifest.runtimeImage,
    space: {
      repo: manifest.space,
      visibility,
      ...(manifest.spaceHardware ? { hardware: manifest.spaceHardware } : {}),
      ...(typeof manifest.spaceSleepTime === "number" ? { sleepTime: manifest.spaceSleepTime } : {}),
    },
  });
}

export async function readDeploymentIdentity(
  client: Pick<BucketClient, "downloadFile">,
): Promise<DeploymentIdentity | null> {
  return await readDocument(client, DEPLOYMENT_PATH, identitySchema);
}

export async function readDesiredState(
  client: Pick<BucketClient, "downloadFile">,
): Promise<DeploymentDesiredState | null> {
  return await readDocument(client, DESIRED_STATE_PATH, desiredStateSchema);
}

export async function readDeploymentTombstone(
  client: Pick<BucketClient, "downloadFile">,
): Promise<DeploymentTombstone | null> {
  return await readDocument(client, TOMBSTONE_PATH, tombstoneSchema);
}

export async function writeDeploymentTombstone(
  client: Pick<BucketClient, "uploadFiles">,
  deploymentId: string,
  movedTo: string,
  now: Date,
): Promise<void> {
  const tombstone = tombstoneSchema.parse({
    schemaVersion: 1,
    deploymentId,
    movedTo,
    tombstonedAt: now.toISOString(),
  });
  await client.uploadFiles([jsonBlob(TOMBSTONE_PATH, tombstone)]);
}

export async function writeCanonicalState(
  client: Pick<BucketClient, "uploadFiles">,
  identity: DeploymentIdentity,
  desired: DeploymentDesiredState,
): Promise<void> {
  await client.uploadFiles([
    jsonBlob(DEPLOYMENT_PATH, identitySchema.parse(identity)),
    jsonBlob(DESIRED_STATE_PATH, desiredStateSchema.parse(desired)),
  ]);
}

export async function writeDeploymentIdentity(
  client: Pick<BucketClient, "uploadFiles">,
  identity: DeploymentIdentity,
): Promise<void> {
  await client.uploadFiles([jsonBlob(DEPLOYMENT_PATH, identitySchema.parse(identity))]);
}

export function newOperation(manifest: DeploymentManifest, now: Date): DeploymentOperation {
  return operationSchema.parse({
    schemaVersion: 1,
    operationId: randomUUID(),
    deploymentId: manifest.deploymentId,
    targetGeneration: manifest.desiredGeneration,
    state: "planned",
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

export async function writeOperation(
  root: string,
  client: Pick<BucketClient, "uploadFiles">,
  operation: DeploymentOperation,
): Promise<void> {
  const parsed = operationSchema.parse(operation);
  const local = path.join(localConfigPaths(root).operationsDir, `${parsed.operationId}.json`);
  await atomicPrivateWrite(local, stringify(parsed));
  await client.uploadFiles([jsonBlob(`.mlclaw/operations/${parsed.operationId}.json`, parsed)]);
}

export async function updateOperation(
  root: string,
  client: Pick<BucketClient, "uploadFiles">,
  operation: DeploymentOperation,
  state: DeploymentOperationState,
  now: Date,
  detail?: string,
): Promise<DeploymentOperation> {
  const next = operationSchema.parse({
    ...operation,
    state,
    updatedAt: now.toISOString(),
    ...(detail ? { detail } : {}),
  });
  await writeOperation(root, client, next);
  return next;
}

export async function readResumableOperation(
  root: string,
  deploymentId: string,
  targetGeneration: number,
): Promise<DeploymentOperation | null> {
  const directory = localConfigPaths(root).operationsDir;
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const operations = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const raw = await fs.readFile(path.join(directory, entry.name), "utf8");
        return operationSchema.parse(JSON.parse(raw));
      }),
  );
  return (
    operations
      .filter(
        (operation) =>
          operation.deploymentId === deploymentId &&
          operation.targetGeneration === targetGeneration &&
          (operation.state === "planned" ||
            operation.state === "applying" ||
            operation.state === "waiting_for_approval" ||
            operation.state === "verifying"),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
  );
}

export async function withDeploymentLock<T>(root: string, deploymentId: string, task: () => Promise<T>): Promise<T> {
  const file = path.join(localConfigPaths(root).locksDir, `${deploymentId}.lock`);
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const token = randomUUID();
  const lock = stringify({ pid: process.pid, host: os.hostname(), token, createdAt: new Date().toISOString() });
  try {
    await fs.writeFile(file, lock, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    if (!(await replaceStaleLocalLock(file, lock))) {
      throw new Error(`deployment ${deploymentId} is already being reconciled on this host`);
    }
  }
  let heartbeat = Promise.resolve();
  const heartbeatTimer = setInterval(() => {
    heartbeat = heartbeat.then(async () => await refreshOwnedLocalLock(file, token)).catch(() => undefined);
  }, LOCAL_LOCK_HEARTBEAT_MS);
  heartbeatTimer.unref();
  try {
    return await task();
  } finally {
    clearInterval(heartbeatTimer);
    await heartbeat;
    await removeOwnedLocalLock(file, token);
  }
}

async function replaceStaleLocalLock(file: string, replacement: string): Promise<boolean> {
  const guard = `${file}.reclaim`;
  try {
    await fs.mkdir(guard);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw error;
  }
  try {
    const [raw, stat] = await Promise.all([fs.readFile(file, "utf8"), fs.stat(file)]);
    const value = JSON.parse(raw) as { pid?: unknown; host?: unknown; createdAt?: unknown };
    if (value.host !== os.hostname() || typeof value.pid !== "number") return false;
    const createdAt = typeof value.createdAt === "string" ? Date.parse(value.createdAt) : Number.NaN;
    const lastRefresh = Number.isFinite(createdAt) ? Math.max(createdAt, stat.mtimeMs) : stat.mtimeMs;
    if (processIsAlive(value.pid) && Date.now() - lastRefresh <= LOCAL_LOCK_STALE_MS) return false;
    await fs.rm(file);
    await fs.writeFile(file, replacement, { flag: "wx", mode: 0o600 });
    return true;
  } catch {
    return false;
  } finally {
    await fs.rm(guard, { recursive: true, force: true });
  }
}

async function refreshOwnedLocalLock(file: string, token: string): Promise<void> {
  if (!(await localLockHasToken(file, token))) return;
  const now = new Date();
  await fs.utimes(file, now, now);
}

async function removeOwnedLocalLock(file: string, token: string): Promise<void> {
  if (await localLockHasToken(file, token)) await fs.rm(file, { force: true });
}

async function localLockHasToken(file: string, token: string): Promise<boolean> {
  try {
    const value = JSON.parse(await fs.readFile(file, "utf8")) as { token?: unknown };
    return value.token === token;
  } catch {
    return false;
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

export async function acquireControlLease(
  store: ControlLeaseStore,
  manifest: DeploymentManifest,
  operation: DeploymentOperation,
  now: Date,
): Promise<HeldControlLease> {
  const snapshot = await store.read();
  const current = snapshot.value === null ? null : leaseSchema.parse(snapshot.value);
  if (current && Date.parse(current.expiresAt) > now.getTime() && current.operationId !== operation.operationId) {
    throw new Error(`deployment is already controlled by ${current.holderId} until ${current.expiresAt}`);
  }
  const lease = leaseSchema.parse({
    schemaVersion: 1,
    deploymentId: manifest.deploymentId,
    operationId: operation.operationId,
    holderId: `${os.hostname()}:${process.pid}`,
    fencingToken: randomUUID(),
    generation: manifest.desiredGeneration,
    acquiredAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 120_000).toISOString(),
  });
  const revision = await store.compareAndSwap(snapshot.revision, lease);
  const verified = await store.read();
  if (verified.revision !== revision || leaseSchema.parse(verified.value).fencingToken !== lease.fencingToken)
    throw new Error("could not verify deployment control lease ownership");
  return { value: lease, revision };
}

export async function releaseControlLease(store: ControlLeaseStore, lease: HeldControlLease): Promise<void> {
  const current = await store.read();
  if (
    current.revision === lease.revision &&
    current.value !== null &&
    leaseSchema.parse(current.value).fencingToken === lease.value.fencingToken
  ) {
    await store.compareAndSwap(lease.revision, null);
  }
}

export async function assertControlLease(store: ControlLeaseStore, lease: HeldControlLease, now: Date): Promise<void> {
  const current = await store.read();
  const currentLease = current.value === null ? null : leaseSchema.parse(current.value);
  if (
    current.revision !== lease.revision ||
    currentLease?.fencingToken !== lease.value.fencingToken ||
    Date.parse(currentLease.expiresAt) <= now.getTime()
  ) {
    throw new Error("deployment control lease ownership was lost");
  }
}

export async function renewControlLease(
  store: ControlLeaseStore,
  lease: HeldControlLease,
  now: Date,
): Promise<HeldControlLease> {
  await assertControlLease(store, lease, now);
  const renewed = leaseSchema.parse({
    ...lease.value,
    expiresAt: new Date(now.getTime() + 120_000).toISOString(),
  });
  const revision = await store.compareAndSwap(lease.revision, renewed);
  const held = { value: renewed, revision };
  await assertControlLease(store, held, now);
  return held;
}

async function readDocument<T>(
  client: Pick<BucketClient, "downloadFile">,
  file: string,
  schema: z.ZodType<T>,
): Promise<T | null> {
  const blob = await client.downloadFile(file);
  if (!blob) return null;
  if (blob.size > MAX_CONTROL_BYTES) throw new Error(`${file} exceeds ${MAX_CONTROL_BYTES} bytes`);
  return schema.parse(JSON.parse(await blob.text()));
}

function jsonBlob(path: string, value: unknown): { path: string; content: Blob } {
  return { path, content: new Blob([stringify(value)], { type: "application/json" }) };
}

function stringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function atomicPrivateWrite(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, content, { mode: 0o600, flag: "wx" });
  await fs.rename(temporary, file);
  await fs.chmod(file, 0o600);
}
