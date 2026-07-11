import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { BucketHub } from "./hub.js";
import { type SyncConfig, log, logError, remotePath } from "./paths.js";
import { runSnapshot, type SnapshotOutcome } from "./snapshot.js";
import { trustedStageArchive } from "./stage-worker.js";

const LEASE_HEARTBEAT_MS = 60_000;
const HANDOFF_REQUEST_TTL_MS = 10 * 60 * 1000;

/**
 * Run OpenClaw as a child process with a periodic snapshot loop. On SIGTERM/
 * SIGINT (Space shutdown/rebuild) the signal is forwarded and a best-effort
 * final snapshot runs after the child exits, so at most one interval of state
 * is lost. If the platform hard-kills us first, the interval loop has already
 * bounded the loss the same way.
 */
export async function supervise(params: { config: SyncConfig; hub: BucketHub; command: string[] }): Promise<number> {
  const { config, hub, command } = params;
  const [binary, ...args] = command;
  if (!binary) {
    throw new Error("supervise: missing child command");
  }
  const bootTime = new Date().toISOString();
  const scriptPath = process.argv[1];
  const stageArchive = trustedStageArchive(config, scriptPath);
  let lastSnapshotId: string | undefined;
  const handoffState: { request: RuntimeHandoffRequest | null } = { request: null };

  const writeLease = async () => {
    const status = {
      schemaVersion: 1,
      agent: config.agentName,
      runtimeId: config.runtimeId,
      gatewayLocation: config.gatewayLocation,
      runtimeImage: config.runtimeImage,
      startedAt: bootTime,
      lastHeartbeatAt: new Date().toISOString(),
      ...(lastSnapshotId ? { lastSnapshotId } : {}),
    };
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hf-state-lease-"));
    try {
      const file = path.join(tmpDir, "status.json");
      await fs.writeFile(file, JSON.stringify(status, null, 2) + "\n");
      await hub.upload(file, remotePath(config, "runtime/status.json"));
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  };
  const readHandoffRequest = async (): Promise<RuntimeHandoffRequest | null> => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hf-state-handoff-"));
    try {
      const file = path.join(tmpDir, "request.json");
      const result = await hub.download(remotePath(config, "runtime/handoff-request.json"), file);
      if (result === "not-found") {
        return null;
      }
      const parsed = JSON.parse(await fs.readFile(file, "utf8")) as RuntimeHandoffRequest;
      if (
        parsed?.schemaVersion !== 1 ||
        parsed.agent !== config.agentName ||
        parsed.runtimeId !== config.runtimeId ||
        typeof parsed.requestedAt !== "string" ||
        typeof parsed.requestId !== "string" ||
        !parsed.requestId
      ) {
        return null;
      }
      const requestedAt = Date.parse(parsed.requestedAt);
      if (!Number.isFinite(requestedAt) || Date.now() - requestedAt > HANDOFF_REQUEST_TTL_MS) {
        log(`ignoring expired handoff request ${parsed.requestId}`);
        await hub.delete([remotePath(config, "runtime/handoff-request.json")]).catch((err) => {
          logError(`failed to clear expired handoff request: ${err instanceof Error ? err.message : String(err)}`);
        });
        return null;
      }
      return parsed;
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  };
  const writeHandoffAck = async (request: RuntimeHandoffRequest) => {
    const ack = {
      schemaVersion: 1,
      requestId: request.requestId,
      agent: config.agentName,
      runtimeId: config.runtimeId,
      gatewayLocation: config.gatewayLocation,
      completedAt: new Date().toISOString(),
      ...(lastSnapshotId ? { lastSnapshotId } : {}),
    };
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "hf-state-handoff-ack-"));
    try {
      const file = path.join(tmpDir, "ack.json");
      await fs.writeFile(file, JSON.stringify(ack, null, 2) + "\n");
      await hub.upload(file, remotePath(config, "runtime/handoff-ack.json"));
      await hub.delete([remotePath(config, "runtime/handoff-request.json")]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  };

  const child: ChildProcess = spawn(binary, args, {
    stdio: "inherit",
    env: supervisedChildEnvironment(process.env),
  });
  const childExit = new Promise<number>((resolve) => {
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 128 : 1)));
    child.on("error", (err) => {
      logError(`child failed to start: ${err.message}`);
      resolve(1);
    });
  });

  let stopping = false;
  let inFlight: Promise<SnapshotOutcome> | null = null;
  const runOnce = async (label: string): Promise<SnapshotOutcome> => {
    try {
      const outcome = await runSnapshot({
        config,
        hub,
        bootTime,
        ...(stageArchive ? { stageArchive } : {}),
      });
      if (outcome.kind === "failed") {
        logError(`${label}: snapshot failed: ${outcome.detail}`);
      } else if (outcome.kind === "uploaded") {
        lastSnapshotId = outcome.entry.path;
      }
      await writeLease().catch((err) => {
        logError(`${label}: lease heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
      });
      return outcome;
    } finally {
      inFlight = null;
    }
  };
  const snapshotInterval = async () => {
    if (inFlight) {
      log("interval: previous snapshot still running, skipping");
      return;
    }
    inFlight = runOnce("interval");
    await inFlight;
  };
  // The final snapshot must neither be skipped nor kill an in-flight upload:
  // wait the in-flight one out, then take a fresh snapshot of the quiesced
  // state before the process is allowed to exit.
  const snapshotFinal = async (): Promise<SnapshotOutcome> => {
    if (inFlight) {
      await inFlight;
    }
    inFlight = runOnce("final");
    return await inFlight;
  };

  const snapshotLoop = (async () => {
    while (!stopping) {
      await delay(config.intervalSeconds * 1000);
      if (stopping) {
        return;
      }
      await snapshotInterval();
    }
  })();
  void snapshotLoop;

  const heartbeatLoop = (async () => {
    await writeLease().catch((err) =>
      logError(`initial lease failed: ${err instanceof Error ? err.message : String(err)}`),
    );
    while (!stopping) {
      await delay(LEASE_HEARTBEAT_MS);
      if (stopping) {
        return;
      }
      await writeLease().catch((err) => {
        logError(`lease heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  })();
  void heartbeatLoop;

  const handoffLoop = (async () => {
    while (!stopping && !handoffState.request) {
      await delay(config.handoffPollSeconds * 1000);
      if (stopping || handoffState.request) {
        return;
      }
      try {
        const request = await readHandoffRequest();
        if (!request) {
          continue;
        }
        handoffState.request = request;
        log(`handoff ${request.requestId} requested for ${request.targetRuntimeId}`);
        stopping = true;
        child.kill("SIGTERM");
      } catch (err) {
        logError(`handoff poll failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  })();
  void handoffLoop;

  const forwardSignal = (signal: NodeJS.Signals) => {
    log(`received ${signal}, shutting down`);
    stopping = true;
    child.kill(signal);
  };
  process.on("SIGTERM", forwardSignal);
  process.on("SIGINT", forwardSignal);

  const exitCode = await childExit;
  stopping = true;

  log(`child exited with code ${exitCode}, taking final snapshot`);
  if (!handoffState.request) {
    try {
      const shutdownRequest = await readHandoffRequest();
      if (shutdownRequest) {
        handoffState.request = shutdownRequest;
        log(`handoff ${shutdownRequest.requestId} requested for ${shutdownRequest.targetRuntimeId}`);
      }
    } catch (err) {
      logError(`shutdown handoff check failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  const finalOutcome = await snapshotFinal();
  if (handoffState.request) {
    const request = handoffState.request;
    if (finalOutcome.kind !== "uploaded") {
      throw new Error(
        `handoff ${request.requestId} final snapshot did not upload: ${snapshotFailureDetail(finalOutcome)}`,
      );
    }
    await writeHandoffAck(request).catch((err) => {
      throw new Error(
        `handoff ${request.requestId} snapshot completed but ack failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
    log(`handoff ${request.requestId} acknowledged`);
    return 0;
  }
  return exitCode;
}

export function supervisedChildEnvironment(source: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const env = { ...source };
  delete env.MLCLAW_STATE_HF_TOKEN;
  return env;
}

function snapshotFailureDetail(outcome: SnapshotOutcome): string {
  switch (outcome.kind) {
    case "uploaded":
      return "uploaded";
    case "failed":
      return outcome.detail;
    case "skipped":
      return outcome.reason;
  }
}

type RuntimeHandoffRequest = {
  schemaVersion: 1;
  requestId: string;
  agent: string;
  runtimeId: string;
  requestedAt: string;
  targetRuntimeId: string;
};
