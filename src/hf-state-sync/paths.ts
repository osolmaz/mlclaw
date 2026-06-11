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
  keepSnapshots: number;
  /** Identifies this container run in manifests, for observability. */
  runId: string;
};

const DEFAULT_LIVE_DIR = "/tmp/openclaw-live";
const DEFAULT_PREFIX = "openclaw-state";
const DEFAULT_INTERVAL_SECONDS = 60;
const DEFAULT_KEEP = 5;

function positiveIntFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function resolveSyncConfig(env: NodeJS.ProcessEnv = process.env): SyncConfig {
  return {
    liveDir: env.OPENCLAW_LIVE_DIR?.trim() || DEFAULT_LIVE_DIR,
    bucket: env.OPENCLAW_HF_STATE_BUCKET?.trim() || null,
    bucketPrefix: (env.OPENCLAW_HF_STATE_PREFIX?.trim() || DEFAULT_PREFIX).replace(/\/+$/, ""),
    intervalSeconds: positiveIntFromEnv(env.HF_STATE_SYNC_INTERVAL_SECONDS, DEFAULT_INTERVAL_SECONDS),
    keepSnapshots: positiveIntFromEnv(env.HF_STATE_SYNC_KEEP, DEFAULT_KEEP),
    runId: randomUUID(),
  };
}

/** Remote object path under the configured bucket prefix. */
export function remotePath(config: Pick<SyncConfig, "bucketPrefix">, name: string): string {
  return `${config.bucketPrefix}/${name}`;
}

export function log(message: string): void {
  console.log(`[hf-state-sync] ${message}`);
}

export function logError(message: string): void {
  console.error(`[hf-state-sync] ${message}`);
}
