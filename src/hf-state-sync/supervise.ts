import { type ChildProcess, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import type { BucketHub } from "./hub.js";
import { type SyncConfig, log, logError } from "./paths.js";
import { runSnapshot } from "./snapshot.js";

/**
 * Run OpenClaw as a child process with a periodic snapshot loop. On SIGTERM/
 * SIGINT (Space shutdown/rebuild) the signal is forwarded and a best-effort
 * final snapshot runs after the child exits, so at most one interval of state
 * is lost. If the platform hard-kills us first, the interval loop has already
 * bounded the loss the same way.
 */
export async function supervise(params: {
  config: SyncConfig;
  hub: BucketHub;
  command: string[];
}): Promise<number> {
  const { config, hub, command } = params;
  const [binary, ...args] = command;
  if (!binary) {
    throw new Error("supervise: missing child command");
  }
  const bootTime = new Date().toISOString();

  const child: ChildProcess = spawn(binary, args, { stdio: "inherit" });
  const childExit = new Promise<number>((resolve) => {
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 128 : 1)));
    child.on("error", (err) => {
      logError(`child failed to start: ${err.message}`);
      resolve(1);
    });
  });

  let stopping = false;
  let inFlight: Promise<void> | null = null;
  const runOnce = async (label: string) => {
    try {
      const outcome = await runSnapshot({ config, hub, bootTime });
      if (outcome.kind === "failed") {
        logError(`${label}: snapshot failed: ${outcome.detail}`);
      }
    } finally {
      inFlight = null;
    }
  };
  const snapshotInterval = () => {
    if (inFlight) {
      log("interval: previous snapshot still running, skipping");
      return Promise.resolve();
    }
    inFlight = runOnce("interval");
    return inFlight;
  };
  // The final snapshot must neither be skipped nor kill an in-flight upload:
  // wait the in-flight one out, then take a fresh snapshot of the quiesced
  // state before the process is allowed to exit.
  const snapshotFinal = async () => {
    if (inFlight) {
      await inFlight;
    }
    inFlight = runOnce("final");
    await inFlight;
  };

  const loop = (async () => {
    while (!stopping) {
      await delay(config.intervalSeconds * 1000);
      if (stopping) {
        return;
      }
      await snapshotInterval();
    }
  })();

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
  await snapshotFinal();
  return exitCode;
}
