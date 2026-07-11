import fs from "node:fs/promises";
import path from "node:path";
import type { SyncConfig } from "./paths.js";

export async function prepareRestore(config: SyncConfig): Promise<void> {
  if (config.snapshotUid === undefined || config.snapshotGid === undefined) {
    throw new Error("restore preparation requires MLCLAW_OPENCLAW_UID and MLCLAW_OPENCLAW_GID");
  }
  const liveParent = path.dirname(config.liveDir);
  await fs.mkdir(liveParent, { recursive: true });
  await fs.chown(liveParent, config.snapshotUid, config.snapshotGid);

  if (!config.stateMountDir) {
    return;
  }
  await makeTraversableDirectory(config.stateMountDir);
  const prefixRoot = confinedPath(config.stateMountDir, config.bucketPrefix);
  let prefixPart = config.stateMountDir;
  for (const part of config.bucketPrefix.split("/").filter(Boolean)) {
    prefixPart = path.join(prefixPart, part);
    await makeTraversableDirectory(prefixPart);
  }
  await makeReadableIfFile(path.join(prefixRoot, "manifest.json"));
  const snapshotsDir = path.join(prefixRoot, "snapshots");
  await makeTraversableDirectory(snapshotsDir);
  let entries;
  try {
    entries = await fs.readdir(snapshotsDir, { withFileTypes: true });
  } catch (err) {
    if (isNotFound(err)) {
      return;
    }
    throw err;
  }
  for (const entry of entries) {
    if (entry.isFile()) {
      await fs.chmod(path.join(snapshotsDir, entry.name), 0o644);
    }
  }
}

async function makeTraversableDirectory(directory: string): Promise<void> {
  try {
    const stat = await fs.lstat(directory);
    if (stat.isDirectory()) {
      await fs.chmod(directory, 0o711);
    }
  } catch (err) {
    if (!isNotFound(err)) {
      throw err;
    }
  }
}

function confinedPath(root: string, relative: string): string {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relative);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`invalid state prefix outside mounted bucket: ${relative}`);
  }
  return resolved;
}

async function makeReadableIfFile(file: string): Promise<void> {
  try {
    const stat = await fs.lstat(file);
    if (stat.isFile()) {
      await fs.chmod(file, 0o644);
    }
  } catch (err) {
    if (!isNotFound(err)) {
      throw err;
    }
  }
}

function isNotFound(err: unknown): boolean {
  return err instanceof Error && "code" in err && err.code === "ENOENT";
}
