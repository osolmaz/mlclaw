import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, writeFileSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { PROTECTED_STATE_DIR_NAME, createTarZst, extractTarZst, stageLiveDir } from "./archive.js";
import type { SyncConfig } from "./paths.js";
import type { StageArchive, StagedArchiveOutcome } from "./snapshot.js";

type WorkerMessage = StagedArchiveOutcome | { kind: "failed"; detail: string };

export function unprivilegedStageArchive(params: { uid: number; gid: number; scriptPath: string }): StageArchive {
  return async ({ liveDir, archivePath }) => {
    const child = spawn(process.execPath, [params.scriptPath, "stage-worker", liveDir], {
      uid: params.uid,
      gid: params.gid,
      env: snapshotWorkerEnvironment(process.env),
      stdio: ["ignore", "pipe", "inherit", "pipe"],
    });
    if (!child.stdout || !child.stdio[3]) {
      child.kill("SIGKILL");
      throw new Error("snapshot staging worker pipes are unavailable");
    }
    const archiveOutput = createWriteStream(archivePath, { flags: "wx", mode: 0o600 });
    const metadata = collect(child.stdio[3] as NodeJS.ReadableStream);
    const archive = pipeline(child.stdout, archiveOutput);
    const exitCode = await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve(code ?? (signal ? 128 : 1)));
    });
    await archive;
    const message = parseWorkerMessage(await metadata);
    if (exitCode !== 0 || message.kind === "failed") {
      throw new Error(
        message.kind === "failed" ? message.detail : `snapshot staging worker exited with code ${exitCode}`,
      );
    }
    return message;
  };
}

export function protectedStageArchive(params: {
  base: StageArchive;
  sourceDir: string;
  archiveName: string;
}): StageArchive {
  return async (request) => {
    const outcome = await params.base(request);
    if (outcome.kind !== "staged") {
      return outcome;
    }
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "hf-state-protected-stage-"));
    try {
      const stagingDir = path.join(workDir, "stage");
      await extractTarZst(request.archivePath, stagingDir);
      const destination = path.join(stagingDir, params.archiveName);
      await fs.cp(params.sourceDir, destination, {
        recursive: true,
        force: false,
        preserveTimestamps: true,
        filter: (source) => includeProtectedSnapshotPath(params.sourceDir, source),
      });
      await fs.chmod(destination, 0o700);
      await fs.rm(request.archivePath, { force: true });
      await createTarZst(stagingDir, request.archivePath);
      await fs.chmod(request.archivePath, 0o600);
      return outcome;
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }
  };
}

export function includeProtectedSnapshotPath(sourceDir: string, source: string): boolean {
  const relative = path.relative(sourceDir, source);
  return relative !== "hf-broker/mirrors" && !relative.startsWith(`hf-broker/mirrors${path.sep}`);
}

export function trustedStageArchive(config: SyncConfig, scriptPath: string | undefined): StageArchive | undefined {
  const canStageAsOpenClaw =
    process.getuid?.() === 0 &&
    Boolean(scriptPath) &&
    config.snapshotUid !== undefined &&
    config.snapshotGid !== undefined;
  if (!canStageAsOpenClaw) {
    if (config.protectedStateDir) {
      throw new Error("protected runtime state requires root snapshot staging with an OpenClaw UID and GID");
    }
    return undefined;
  }

  let stageArchive = unprivilegedStageArchive({
    uid: config.snapshotUid as number,
    gid: config.snapshotGid as number,
    scriptPath: scriptPath as string,
  });
  if (config.protectedStateDir) {
    stageArchive = protectedStageArchive({
      base: stageArchive,
      sourceDir: config.protectedStateDir,
      archiveName: PROTECTED_STATE_DIR_NAME,
    });
  }
  return stageArchive;
}

export async function runStageWorker(liveDir: string): Promise<number> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "hf-state-stage-worker-"));
  try {
    const stagingDir = path.join(workDir, "stage");
    const archivePath = path.join(workDir, "snapshot.tar.zst");
    const staged = await stageLiveDir(liveDir, stagingDir, { excludeProtectedState: true });
    if (staged.kind === "corrupt-database") {
      writeWorkerMessage(staged);
      return 0;
    }
    await createTarZst(stagingDir, archivePath);
    writeWorkerMessage({ kind: "staged", databaseCount: staged.databases.length });
    await pipeline(createReadStream(archivePath), process.stdout);
    return 0;
  } catch (err) {
    writeWorkerMessage({ kind: "failed", detail: err instanceof Error ? err.message : String(err) });
    return 1;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export function snapshotWorkerEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    HOME: "/home/node",
    PATH: env.PATH,
    TMPDIR: env.TMPDIR,
  };
}

function writeWorkerMessage(message: WorkerMessage): void {
  writeFileSync(3, `${JSON.stringify(message)}\n`);
}

async function collect(stream: NodeJS.ReadableStream | null): Promise<string> {
  if (!stream) {
    throw new Error("snapshot staging worker metadata pipe is unavailable");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseWorkerMessage(raw: string): WorkerMessage {
  const parsed = JSON.parse(raw) as WorkerMessage;
  if (parsed.kind === "staged" && Number.isInteger(parsed.databaseCount) && parsed.databaseCount >= 0) {
    return parsed;
  }
  if (parsed.kind === "corrupt-database" && parsed.database && parsed.detail) {
    return parsed;
  }
  if (parsed.kind === "failed" && parsed.detail) {
    return parsed;
  }
  throw new Error("snapshot staging worker returned invalid metadata");
}
