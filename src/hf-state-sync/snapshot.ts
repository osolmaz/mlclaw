import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createTarZst, sha256File, stageLiveDir } from "./archive.js";
import type { BucketHub } from "./hub.js";
import {
  MANIFEST_REMOTE_NAME,
  type Manifest,
  type SnapshotEntry,
  parseManifest,
  promoteSnapshot,
  serializeManifest,
} from "./manifest.js";
import { type SyncConfig, log, remotePath } from "./paths.js";

export type SnapshotOutcome =
  | { kind: "uploaded"; entry: SnapshotEntry }
  | { kind: "skipped"; reason: "no-bucket" | "empty-state" }
  | { kind: "failed"; detail: string };

export type StagedArchiveOutcome =
  | { kind: "staged"; databaseCount: number }
  | { kind: "corrupt-database"; database: string; detail: string };

export type StageArchive = (params: {
  liveDir: string;
  archivePath: string;
}) => Promise<StagedArchiveOutcome>;

// Object names must be unique across overlapping containers (run-id suffix)
// AND within one run (counter): a final snapshot can land in the same second
// as the last interval snapshot, and an overwritten tarball behind a distinct
// manifest entry would poison rollback and confuse retention pruning.
let snapshotCounter = 0;
function snapshotId(now: Date, runId: string): string {
  snapshotCounter += 1;
  const stamp = now.toISOString().replaceAll(":", "-").replace(".", "-");
  return `${stamp}-${runId.slice(0, 8)}-${snapshotCounter}`;
}

type FetchManifestResult =
  | { kind: "none" }
  | { kind: "ok"; manifest: Manifest }
  | { kind: "invalid"; reason: string };

async function fetchManifest(
  config: SyncConfig,
  hub: BucketHub,
  workDir: string,
): Promise<FetchManifestResult> {
  const localPath = path.join(workDir, "manifest.remote.json");
  const result = await hub.download(remotePath(config, MANIFEST_REMOTE_NAME), localPath);
  if (result === "not-found") {
    return { kind: "none" };
  }
  const parsed = parseManifest(await fs.readFile(localPath, "utf8"));
  return parsed.kind === "ok"
    ? { kind: "ok", manifest: parsed.manifest }
    : { kind: "invalid", reason: parsed.reason };
}

/**
 * Stage, verify, upload, then promote: the manifest object is only
 * overwritten after the tarball upload succeeded, so it never references a
 * partial archive. Object writes are atomic; no locking (last verified
 * writer wins across overlapping containers).
 */
export async function runSnapshot(params: {
  config: SyncConfig;
  hub: BucketHub;
  bootTime: string;
  now?: () => Date;
  stageArchive?: StageArchive;
}): Promise<SnapshotOutcome> {
  const { config, hub } = params;
  if (!config.bucket) {
    return { kind: "skipped", reason: "no-bucket" };
  }
  try {
    await fs.access(config.liveDir);
  } catch {
    return { kind: "skipped", reason: "empty-state" };
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "hf-state-snapshot-"));
  try {
    const now = (params.now ?? (() => new Date()))();
    const id = snapshotId(now, config.runId);
    const archiveName = `state-${id}.tar.zst`;
    const archivePath = path.join(workDir, archiveName);
    const staged = params.stageArchive
      ? await params.stageArchive({ liveDir: config.liveDir, archivePath })
      : await stageArchiveInProcess(config.liveDir, path.join(workDir, "stage"), archivePath);
    if (staged.kind === "corrupt-database") {
      return {
        kind: "failed",
        detail: `live database ${staged.database} failed integrity check: ${staged.detail}`,
      };
    }

    const entry: SnapshotEntry = {
      id,
      path: remotePath(config, `snapshots/${archiveName}`),
      createdAt: now.toISOString(),
      sha256: await sha256File(archivePath),
      sizeBytes: (await fs.stat(archivePath)).size,
      runId: config.runId,
      bootTime: params.bootTime,
    };

    await hub.upload(archivePath, entry.path);

    const existing = await fetchManifest(config, hub, workDir);
    if (existing.kind === "invalid") {
      // The manifest is the only rollback index (buckets are non-versioned).
      // Never overwrite an index we cannot read — its snapshots may be the
      // only good copy of the user's data.
      return {
        kind: "failed",
        detail: `remote manifest is invalid, refusing to overwrite it: ${existing.reason}`,
      };
    }
    const { manifest, expired } = promoteSnapshot({
      existing: existing.kind === "ok" ? existing.manifest : null,
      entry,
      keep: config.keepSnapshots,
    });
    const manifestPath = path.join(workDir, "manifest.json");
    await fs.writeFile(manifestPath, serializeManifest(manifest));
    await hub.upload(manifestPath, remotePath(config, MANIFEST_REMOTE_NAME));

    if (expired.length > 0) {
      await hub.delete(expired.map((e) => e.path));
    }
    log(`snapshot ${entry.id} uploaded (${entry.sizeBytes} bytes, ${staged.databaseCount} dbs)`);
    return { kind: "uploaded", entry };
  } catch (err) {
    return { kind: "failed", detail: err instanceof Error ? err.message : String(err) };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

async function stageArchiveInProcess(
  liveDir: string,
  stagingDir: string,
  archivePath: string,
): Promise<StagedArchiveOutcome> {
  const staged = await stageLiveDir(liveDir, stagingDir);
  if (staged.kind === "corrupt-database") {
    return staged;
  }
  await createTarZst(stagingDir, archivePath);
  return { kind: "staged", databaseCount: staged.databases.length };
}
