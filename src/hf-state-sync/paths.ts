import { randomUUID } from "node:crypto";

/** Resolved runtime configuration for the state sync layer. */
export type SyncConfig = {
  /**
   * Root of all durable runtime data and the snapshot/restore unit. Contains
   * the OpenClaw state dir AND the agent workspace; snapshotting only the
   * state dir would silently drop workspace files on every restart.
   */
  liveDir: string;
  /** Bucket repo id (`owner/name`), or null when no bucket is configured. */
  bucket: string | null;
  /** Path prefix inside the bucket for all sync objects. */
  bucketPrefix: string;
  intervalSeconds: number;
  handoffPollSeconds: number;
  keepSnapshots: number;
  /** Identifies this container run in manifests, for observability. */
  runId: string;
  /** Stable logical runtime identity used for leases and handoff. */
  runtimeId: string;
  agentName: string;
  gatewayLocation: "local" | "space" | "unknown";
  runtimeImage: string;
};

const DEFAULT_LIVE_DIR = "/tmp/openclaw-live";
export const DEFAULT_BUCKET_PREFIX = "openclaw-state";
const DEFAULT_INTERVAL_SECONDS = 60;
const DEFAULT_HANDOFF_POLL_SECONDS = 5;
const DEFAULT_KEEP = 5;

function positiveIntFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveSyncConfig(env: NodeJS.ProcessEnv = process.env): SyncConfig {
  const runId = env.HUGGINGCLAW_RUN_ID?.trim() || randomUUID();
  return {
    liveDir: env.OPENCLAW_LIVE_DIR?.trim() || DEFAULT_LIVE_DIR,
    bucket: env.OPENCLAW_HF_STATE_BUCKET?.trim() || null,
    bucketPrefix: normalizeBucketPrefix(env.OPENCLAW_HF_STATE_PREFIX),
    intervalSeconds: positiveIntFromEnv(env.HF_STATE_SYNC_INTERVAL_SECONDS, DEFAULT_INTERVAL_SECONDS),
    handoffPollSeconds: positiveIntFromEnv(env.HF_STATE_SYNC_HANDOFF_POLL_SECONDS, DEFAULT_HANDOFF_POLL_SECONDS),
    keepSnapshots: positiveIntFromEnv(env.HF_STATE_SYNC_KEEP, DEFAULT_KEEP),
    runId,
    runtimeId: env.HUGGINGCLAW_RUNTIME_ID?.trim() || runId,
    agentName: env.OPENCLAW_AGENT_NAME?.trim() || "openclaw",
    gatewayLocation: env.HUGGINGCLAW_GATEWAY_LOCATION === "local" || env.HUGGINGCLAW_GATEWAY_LOCATION === "space"
      ? env.HUGGINGCLAW_GATEWAY_LOCATION
      : "unknown",
    runtimeImage: env.HUGGINGCLAW_RUNTIME_IMAGE?.trim() || "unknown",
  };
}

/** Remote object path under the configured bucket prefix. */
export function remotePath(config: Pick<SyncConfig, "bucketPrefix">, name: string): string {
  return `${normalizeBucketPrefix(config.bucketPrefix)}/${name.replace(/^\/+/, "")}`;
}

export function normalizeBucketPrefix(prefix: string | undefined): string {
  const normalized = (prefix?.trim() || DEFAULT_BUCKET_PREFIX).replace(/^\/+|\/+$/g, "");
  return normalized || DEFAULT_BUCKET_PREFIX;
}

export function log(message: string): void {
  console.log(`[hf-state-sync] ${message}`);
}

export function logError(message: string): void {
  console.error(`[hf-state-sync] ${message}`);
}
