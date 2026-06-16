import type { HubApi } from "./hub-api.js";
import type { GatewayLocation } from "./gateway-location.js";
import { normalizeBucketPrefix, remotePath } from "../hf-state-sync/paths.js";

export const RUNTIME_STATUS_NAME = "runtime/status.json";
export const RUNTIME_HANDOFF_REQUEST_NAME = "runtime/handoff-request.json";
export const RUNTIME_HANDOFF_ACK_NAME = "runtime/handoff-ack.json";
export const DEFAULT_LEASE_TTL_MS = 3 * 60 * 1000;

export type RuntimeLease = {
  schemaVersion: 1;
  agent: string;
  runtimeId: string;
  gatewayLocation: GatewayLocation;
  runtimeImage: string;
  startedAt: string;
  lastHeartbeatAt: string;
  lastSnapshotId?: string;
};

export type RuntimeHandoffRequest = {
  schemaVersion: 1;
  requestId: string;
  agent: string;
  runtimeId: string;
  requestedAt: string;
  targetRuntimeId: string;
};

export type RuntimeHandoffAck = {
  schemaVersion: 1;
  requestId: string;
  agent: string;
  runtimeId: string;
  gatewayLocation: GatewayLocation | "unknown";
  completedAt: string;
  lastSnapshotId?: string;
};

export function runtimeObjectPath(name: string, bucketPrefix?: string): string {
  return remotePath({ bucketPrefix: normalizeBucketPrefix(bucketPrefix) }, name);
}

export async function readRuntimeLease(hub: HubApi, bucket: string, bucketPrefix?: string): Promise<RuntimeLease | null> {
  const blob = await hub.bucket(bucket).downloadFile(runtimeObjectPath(RUNTIME_STATUS_NAME, bucketPrefix));
  if (!blob) {
    return null;
  }
  return JSON.parse(await blob.text()) as RuntimeLease;
}

export async function writeRuntimeLease(
  hub: HubApi,
  bucket: string,
  lease: RuntimeLease,
  bucketPrefix?: string,
): Promise<void> {
  await hub.bucket(bucket).uploadFiles([
    {
      path: runtimeObjectPath(RUNTIME_STATUS_NAME, bucketPrefix),
      content: new Blob([JSON.stringify(lease, null, 2) + "\n"], { type: "application/json" }),
    },
  ]);
}

export async function writeRuntimeHandoffRequest(
  hub: HubApi,
  bucket: string,
  request: RuntimeHandoffRequest,
  bucketPrefix?: string,
): Promise<void> {
  await hub.bucket(bucket).uploadFiles([
    {
      path: runtimeObjectPath(RUNTIME_HANDOFF_REQUEST_NAME, bucketPrefix),
      content: new Blob([JSON.stringify(request, null, 2) + "\n"], { type: "application/json" }),
    },
  ]);
}

export async function readRuntimeHandoffAck(
  hub: HubApi,
  bucket: string,
  bucketPrefix?: string,
): Promise<RuntimeHandoffAck | null> {
  const blob = await hub.bucket(bucket).downloadFile(runtimeObjectPath(RUNTIME_HANDOFF_ACK_NAME, bucketPrefix));
  if (!blob) {
    return null;
  }
  return JSON.parse(await blob.text()) as RuntimeHandoffAck;
}

export async function clearRuntimeHandoffRequest(hub: HubApi, bucket: string, bucketPrefix?: string): Promise<void> {
  await hub.bucket(bucket).deleteFiles([runtimeObjectPath(RUNTIME_HANDOFF_REQUEST_NAME, bucketPrefix)]);
}

export function runtimeLeaseIsLive(lease: RuntimeLease, now = new Date(), ttlMs = DEFAULT_LEASE_TTL_MS): boolean {
  const last = Date.parse(lease.lastHeartbeatAt);
  return Number.isFinite(last) && now.getTime() - last < ttlMs;
}

export async function assertNoLiveForeignLease(params: {
  hub: HubApi;
  bucket: string;
  bucketPrefix?: string | undefined;
  runtimeId: string;
  allowedRuntimeIds?: string[];
  takeover?: boolean;
}): Promise<void> {
  const lease = await readRuntimeLease(params.hub, params.bucket, params.bucketPrefix);
  if (
    !lease ||
    lease.runtimeId === params.runtimeId ||
    params.allowedRuntimeIds?.includes(lease.runtimeId) ||
    !runtimeLeaseIsLive(lease) ||
    params.takeover
  ) {
    return;
  }
  throw new Error(
    `another gateway appears active (${lease.gatewayLocation}, ${lease.runtimeId}, heartbeat ${lease.lastHeartbeatAt}); pass --takeover to replace it`,
  );
}
