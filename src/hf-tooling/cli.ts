#!/usr/bin/env node
import { seedHuggingFaceTooling, waitForBootstrapAndSeedHuggingFaceTooling } from "./seed.js";

const waitForBootstrap = process.argv.includes("--wait-for-bootstrap");
const abort = new AbortController();
process.on("SIGTERM", () => abort.abort());
process.on("SIGINT", () => abort.abort());

try {
  const result = waitForBootstrap
    ? await waitForBootstrapAndSeedHuggingFaceTooling({ signal: abort.signal })
    : await seedHuggingFaceTooling();
  if (!result) {
    process.exitCode = 0;
  } else {
    const copied = result.copiedSkills.length;
    const skipped = result.skippedSkills.length;
    const workspaceCopied = result.copiedWorkspaceSkills.length;
    const workspaceSkipped = result.skippedWorkspaceSkills.length;
    const templates = result.copiedTemplateFiles.length;
    const context = result.wroteContextFile ? "updated" : "current";
    const manifest = result.wroteManifest ? "updated" : "current";
    console.log(
      `[hf-tooling] workspace=${result.workspaceDir} agentsSkills=copied:${copied},skipped:${skipped} workspaceSkills=copied:${workspaceCopied},skipped:${workspaceSkipped} templates:${templates} context:${context} manifest:${manifest}`,
    );
  }
} catch (err) {
  console.error(`[hf-tooling] ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
