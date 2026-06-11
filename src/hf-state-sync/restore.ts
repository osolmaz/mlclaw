import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { extractTarZst, sha256File } from "./archive.js";
import type { BucketHub } from "./hub.js";
import { MANIFEST_REMOTE_NAME, type SnapshotEntry, parseManifest } from "./manifest.js";
import { type SyncConfig, log, logError, remotePath } from "./paths.js";
import { checkIntegrity, findSqliteFiles } from "./sqlite.js";

export type RestoreOutcome =
  | { kind: "restored"; entry: SnapshotEntry }
  | { kind: "fresh-start"; reason: "no-bucket" | "no-manifest" | "live-dir-exists" }
  // Both failure kinds must stop the boot: starting fresh and snapshotting
  // would overwrite the rollback index of a bucket that still holds state.
  | { kind: "invalid-manifest"; reason: string }
  | { kind: "all-snapshots-failed"; tried: string[] };

async function tryRestoreEntry(params: {
  hub: BucketHub;
  entry: SnapshotEntry;
  workDir: string;
  liveDir: string;
}): Promise<"restored" | "failed"> {
  const { hub, entry, workDir, liveDir } = params;
  const archivePath = path.join(workDir, `candidate-${entry.id}.tar.zst`);
  const downloaded = await hub.download(entry.path, archivePath);
  if (downloaded === "not-found") {
    logError(`snapshot ${entry.id} missing from bucket`);
    return "failed";
  }
  const digest = await sha256File(archivePath);
  if (digest !== entry.sha256) {
    logError(`snapshot ${entry.id} checksum mismatch`);
    return "failed";
  }
  // Extract next to the live dir, not in tmpdir: the final rename into place
  // must stay on one filesystem (rename across mounts fails with EXDEV).
  const extractDir = `${liveDir}.restoring-${entry.id}`;
  await fs.rm(extractDir, { recursive: true, force: true });
  try {
    try {
      await extractTarZst(archivePath, extractDir);
    } catch (err) {
      // A checksum can match a manifest that was written for a broken upload;
      // extraction failure must fall back to older entries, not abort restore.
      const detail = err instanceof Error ? err.message : String(err);
      logError(`snapshot ${entry.id} failed to extract: ${detail}`);
      return "failed";
    }
    for (const database of await findSqliteFiles(extractDir)) {
      const integrity = checkIntegrity(database);
      if (integrity.kind === "corrupt") {
        logError(`snapshot ${entry.id} db ${path.basename(database)} corrupt: ${integrity.detail}`);
        return "failed";
      }
    }
    // Verified: move into place atomically. The live dir must not exist yet
    // (fresh container) — restore never overwrites live state.
    await fs.mkdir(path.dirname(liveDir), { recursive: true });
    await fs.rename(extractDir, liveDir);
    return "restored";
  } finally {
    // No-op after a successful rename; clears partial extractions otherwise.
    await fs.rm(extractDir, { recursive: true, force: true });
  }
}

/** Restore the newest verified snapshot into the (not yet existing) live dir. */
export async function runRestore(params: {
  config: SyncConfig;
  hub: BucketHub;
}): Promise<RestoreOutcome> {
  const { config, hub } = params;
  if (!config.bucket) {
    return { kind: "fresh-start", reason: "no-bucket" };
  }
  try {
    await fs.access(config.liveDir);
    return { kind: "fresh-start", reason: "live-dir-exists" };
  } catch {
    // expected: fresh container
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "hf-state-restore-"));
  try {
    const manifestPath = path.join(workDir, "manifest.json");
    const downloaded = await hub.download(remotePath(config, MANIFEST_REMOTE_NAME), manifestPath);
    if (downloaded === "not-found") {
      return { kind: "fresh-start", reason: "no-manifest" };
    }
    const parsed = parseManifest(await fs.readFile(manifestPath, "utf8"));
    if (parsed.kind === "invalid") {
      return { kind: "invalid-manifest", reason: parsed.reason };
    }

    const candidates = [parsed.manifest.current, ...parsed.manifest.previous];
    const tried: string[] = [];
    for (const entry of candidates) {
      tried.push(entry.id);
      if ((await tryRestoreEntry({ hub, entry, workDir, liveDir: config.liveDir })) === "restored") {
        log(`restored snapshot ${entry.id} (created ${entry.createdAt})`);
        return { kind: "restored", entry };
      }
    }
    return { kind: "all-snapshots-failed", tried };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
