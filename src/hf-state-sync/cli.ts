import { createHfBucketHub, createMountedBucketHub } from "./hub.js";
import type { BucketHub } from "./hub.js";
import { type SyncConfig, log, logError, resolveSyncConfig } from "./paths.js";
import { runRestore } from "./restore.js";
import { prepareRestore } from "./prepare.js";
import { runSnapshot } from "./snapshot.js";
import { supervise } from "./supervise.js";
import { runStageWorker, trustedStageArchive } from "./stage-worker.js";

const USAGE = `usage:
  hf-state-sync restore
  hf-state-sync snapshot
  hf-state-sync supervise -- <command> [args...]`;

function makeHub(config: SyncConfig): BucketHub | null {
  if (!config.bucket) {
    return null;
  }
  if (config.stateMountDir) {
    log(`using mounted state bucket at ${config.stateMountDir}`);
    return createMountedBucketHub({ mountDir: config.stateMountDir });
  }
  return createHfBucketHub({ bucket: config.bucket });
}

async function main(argv: string[]): Promise<number> {
  if (argv[0] === "stage-worker") {
    const liveDir = argv[1];
    if (!liveDir) {
      logError("stage-worker: missing live directory");
      return 2;
    }
    return runStageWorker(liveDir);
  }
  const config = resolveSyncConfig();
  const hub = makeHub(config);
  if (!hub) {
    logError("OPENCLAW_HF_STATE_BUCKET is not set; state will NOT survive restarts");
  }
  const mode = argv[0];

  switch (mode) {
    case "prepare-restore":
      await prepareRestore(config);
      return 0;
    case "restore": {
      if (!hub) {
        return 0;
      }
      const outcome = await runRestore({ config, hub });
      switch (outcome.kind) {
        case "restored":
          return 0;
        case "fresh-start":
          log(`fresh start (${outcome.reason})`);
          return 0;
        case "invalid-manifest":
          // Refuse to silently lose a bucket that claims to have state.
          logError(`manifest exists but is invalid, refusing fresh start: ${outcome.reason}`);
          return 1;
        case "all-snapshots-failed":
          logError(`all snapshots failed verification: ${outcome.tried.join(", ")}`);
          return 1;
      }
      break;
    }
    case "snapshot": {
      if (!hub) {
        return 1;
      }
      const stageArchive = trustedStageArchive(config, process.argv[1]);
      const outcome = await runSnapshot({
        config,
        hub,
        bootTime: new Date().toISOString(),
        ...(stageArchive ? { stageArchive } : {}),
      });
      if (outcome.kind === "failed") {
        logError(outcome.detail);
        return 1;
      }
      log(`snapshot outcome: ${outcome.kind}`);
      return 0;
    }
    case "supervise": {
      const separator = argv.indexOf("--");
      const command = separator >= 0 ? argv.slice(separator + 1) : [];
      if (command.length === 0) {
        logError(USAGE);
        return 2;
      }
      if (!hub) {
        // Still run the child: a Space without a bucket should serve, just
        // without durability.
        const { spawn } = await import("node:child_process");
        const child = spawn(command[0] as string, command.slice(1), { stdio: "inherit" });
        return await new Promise<number>((resolve) => {
          process.on("SIGTERM", () => child.kill("SIGTERM"));
          process.on("SIGINT", () => child.kill("SIGINT"));
          child.on("exit", (code) => resolve(code ?? 1));
        });
      }
      return await supervise({ config, hub, command });
    }
    default:
      logError(USAGE);
      return 2;
  }
  return 2;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    logError(err instanceof Error ? (err.stack ?? err.message) : String(err));
    process.exit(1);
  },
);
