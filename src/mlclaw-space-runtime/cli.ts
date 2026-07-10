#!/usr/bin/env node
import process from "node:process";
import { waitForBootstrapAndSeedHuggingFaceTooling } from "../hf-tooling/seed.js";
import { loadConfig } from "./config.js";
import { SpaceRuntimeServer } from "./server.js";

const config = loadConfig();
const server = new SpaceRuntimeServer(config);
const toolingSeedAbort = new AbortController();

if (config.sessionSecretGenerated && config.mode === "app") {
  process.stderr.write("[mlclaw] MLCLAW_SESSION_SECRET is missing; generated an ephemeral session secret for this boot\n");
}
if (config.credentialKeyGenerated && config.mode === "app") {
  process.stderr.write("[mlclaw] MLCLAW_CREDENTIAL_KEY is missing; generated an ephemeral credential key for this boot\n");
}

const httpServer = await server.start();

if (config.mode === "app") {
  void waitForBootstrapAndSeedHuggingFaceTooling({ signal: toolingSeedAbort.signal }).then(
    (result) => {
      if (result) {
        process.stdout.write(
          `[hf-tooling] seeded after OpenClaw bootstrap skills=${result.copiedWorkspaceSkills.length} templates=${result.copiedTemplateFiles.length}\n`,
        );
      }
    },
    (err) => {
      if (!toolingSeedAbort.signal.aborted) {
        process.stderr.write(`[hf-tooling] delayed seed failed: ${err instanceof Error ? err.message : String(err)}\n`);
      }
    },
  );
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  process.stdout.write(`[mlclaw] received ${signal}; shutting down\n`);
  toolingSeedAbort.abort();
  httpServer.close();
  await server.stop();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
