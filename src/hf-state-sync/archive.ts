import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { checkIntegrity, vacuumInto } from "./sqlite.js";

const execFileAsync = promisify(execFile);

// Secrets live in HF Space Secrets, never in snapshots; scratch state is
// rebuildable. These exclusions apply ONLY inside OpenClaw state dirs
// (`.openclaw`): user workspace content is durable data no matter what it is
// named, so a `workspace/logs/` directory must survive.
const STATE_EXCLUDED_NAMES = new Set([".env", "credentials", "tmp", "cache", "logs"]);
const STATE_EXCLUDED_SUFFIXES = [".log"];
// WAL/SHM sidecars are never a durable format anywhere; live .sqlite files
// are replaced by VACUUM INTO copies during staging.
const SIDECAR_SUFFIXES = [".sqlite-wal", ".sqlite-shm"];
const STATE_DIR_NAME = ".openclaw";
export const PROTECTED_STATE_DIR_NAME = ".mlclaw-protected";

function isExcluded(name: string, inStateDir: boolean): boolean {
  if (SIDECAR_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
    return true;
  }
  if (!inStateDir) {
    return false;
  }
  return STATE_EXCLUDED_NAMES.has(name) || STATE_EXCLUDED_SUFFIXES.some((suffix) => name.endsWith(suffix));
}

/**
 * Walk the live tree once: copy regular files, skip excluded names, and
 * collect live SQLite DBs for consistent copying. Discovering DBs during the
 * same filtered walk keeps DBs under excluded dirs (e.g. cache/) out of the
 * snapshot.
 */
async function copyTreeFiltered(params: {
  sourceDir: string;
  destDir: string;
  databases: string[];
  rootDir: string;
  inStateDir: boolean;
  depth: number;
  excludeProtectedState: boolean;
}): Promise<void> {
  const { sourceDir, destDir, databases, rootDir, inStateDir, depth, excludeProtectedState } = params;
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeProtectedState && depth === 0 && entry.name === PROTECTED_STATE_DIR_NAME) {
      continue;
    }
    if (isExcluded(entry.name, inStateDir)) {
      continue;
    }
    const source = path.join(sourceDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyTreeFiltered({
        sourceDir: source,
        destDir: dest,
        databases,
        rootDir,
        // Only the top-level .openclaw dir is OpenClaw state; a workspace
        // project may legitimately contain its own .openclaw directory.
        inStateDir: inStateDir || (depth === 0 && entry.name === STATE_DIR_NAME),
        depth: depth + 1,
        excludeProtectedState,
      });
    } else if (entry.isFile()) {
      if (entry.name.endsWith(".sqlite")) {
        databases.push(path.relative(rootDir, source));
      } else {
        await fs.copyFile(source, dest);
      }
    } else if (entry.isSymbolicLink()) {
      // Workspaces hold checked-out repos; dropping symlinks would restore
      // them broken. The link target is copied verbatim, not followed.
      await fs.symlink(await fs.readlink(source), dest);
    }
  }
}

export type StageResult =
  { kind: "staged"; databases: string[] } | { kind: "corrupt-database"; database: string; detail: string };

/**
 * Stage a snapshot of the live dir: filtered file copy plus a consistent,
 * integrity-checked VACUUM INTO copy of every live SQLite DB.
 */
export async function stageLiveDir(
  liveDir: string,
  stagingDir: string,
  options: { excludeProtectedState?: boolean } = {},
): Promise<StageResult> {
  const databases: string[] = [];
  await copyTreeFiltered({
    sourceDir: liveDir,
    destDir: stagingDir,
    databases,
    rootDir: liveDir,
    inStateDir: false,
    depth: 0,
    excludeProtectedState: options.excludeProtectedState ?? false,
  });
  for (const relative of databases) {
    const staged = path.join(stagingDir, relative);
    await fs.mkdir(path.dirname(staged), { recursive: true });
    vacuumInto(path.join(liveDir, relative), staged);
    const integrity = checkIntegrity(staged);
    if (integrity.kind === "corrupt") {
      return { kind: "corrupt-database", database: relative, detail: integrity.detail };
    }
  }
  return { kind: "staged", databases };
}

// Two-step tar + zstd keeps this portable across GNU tar and bsdtar; tar's
// --use-compress-program extraction semantics differ between them.
export async function createTarZst(sourceDir: string, outFile: string): Promise<void> {
  const tarFile = `${outFile}.tar`;
  await execFileAsync("tar", ["-cf", tarFile, "-C", sourceDir, "."]);
  await execFileAsync("zstd", ["-q", "-f", "--rm", tarFile, "-o", outFile]);
}

export async function extractTarZst(archiveFile: string, destDir: string): Promise<void> {
  const tarFile = `${archiveFile}.extracted.tar`;
  await execFileAsync("zstd", ["-q", "-f", "-d", archiveFile, "-o", tarFile]);
  try {
    await fs.mkdir(destDir, { recursive: true });
    await execFileAsync("tar", ["-xf", tarFile, "-C", destDir]);
  } finally {
    await fs.rm(tarFile, { force: true });
  }
}

export async function sha256File(file: string): Promise<string> {
  const hash = createHash("sha256");
  await pipeline(createReadStream(file), hash);
  return hash.digest("hex");
}
