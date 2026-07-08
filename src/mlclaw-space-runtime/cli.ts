#!/usr/bin/env node
import process from "node:process";
import { loadConfig } from "./config.js";
import { SpaceRuntimeServer } from "./server.js";

const config = loadConfig();
const server = new SpaceRuntimeServer(config);

if (config.sessionSecretGenerated && config.mode === "app") {
  process.stderr.write("[mlclaw] MLCLAW_SESSION_SECRET is missing; generated an ephemeral session secret for this boot\n");
}

const httpServer = await server.start();

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  process.stdout.write(`[mlclaw] received ${signal}; shutting down\n`);
  httpServer.close();
  await server.stop();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
