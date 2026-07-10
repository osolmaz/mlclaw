#!/usr/bin/env node
import { spawn, type ChildProcess } from "node:child_process";
import process from "node:process";
import { loadConfig } from "./config.js";
import { SpaceRuntimeServer } from "./server.js";

const config = loadConfig();
const server = new SpaceRuntimeServer(config);
let toolingSeeder: ChildProcess | undefined;

if (config.sessionSecretGenerated && config.mode === "app") {
  process.stderr.write("[mlclaw] MLCLAW_SESSION_SECRET is missing; generated an ephemeral session secret for this boot\n");
}
const httpServer = await server.start();

if (config.mode === "app") {
  toolingSeeder = spawn(
    process.execPath,
    [process.env.MLCLAW_HF_TOOLING_SEED_SCRIPT ?? "/app/hf-tooling-seed.js", "--wait-for-bootstrap"],
    {
      stdio: "inherit",
      env: toolingSeedEnvironment(process.env),
      ...(process.getuid?.() === 0
        ? { uid: config.openclawUid, gid: config.openclawGid }
        : {}),
    },
  );
  toolingSeeder.once("exit", (code, signal) => {
    if (code && code !== 0) {
      process.stderr.write(`[hf-tooling] delayed seeder exited code=${code} signal=${signal ?? "null"}\n`);
    }
    toolingSeeder = undefined;
  });
  toolingSeeder.once("error", (err) => {
    process.stderr.write(`[hf-tooling] delayed seeder failed to start: ${err.message}\n`);
    toolingSeeder = undefined;
  });
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  process.stdout.write(`[mlclaw] received ${signal}; shutting down\n`);
  toolingSeeder?.kill(signal);
  httpServer.close();
  await server.stop();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

export function toolingSeedEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    HOME: "/home/node",
    PATH: env.PATH,
    NODE_ENV: env.NODE_ENV,
    OPENCLAW_LIVE_DIR: env.OPENCLAW_LIVE_DIR,
    OPENCLAW_WORKSPACE_DIR: env.OPENCLAW_WORKSPACE_DIR,
    MLCLAW_HF_TOOLING_DIR: env.MLCLAW_HF_TOOLING_DIR,
  };
}
