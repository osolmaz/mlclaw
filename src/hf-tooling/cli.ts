#!/usr/bin/env node
import { seedHuggingFaceTooling } from "./seed.js";

try {
  const result = await seedHuggingFaceTooling();
  const copied = result.copiedSkills.length;
  const skipped = result.skippedSkills.length;
  const templates = result.copiedTemplateFiles.length;
  const manifest = result.wroteManifest ? "updated" : "current";
  console.log(
    `[hf-tooling] workspace=${result.workspaceDir} skills=copied:${copied},skipped:${skipped} templates:${templates} manifest:${manifest}`,
  );
} catch (err) {
  console.error(`[hf-tooling] ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
