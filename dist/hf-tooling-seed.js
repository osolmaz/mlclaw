#!/usr/bin/env node
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);

// src/hf-tooling/seed.ts
import fs from "node:fs/promises";
import path from "node:path";
var DEFAULT_HF_TOOLING_ASSET_ROOT = "/app/assets/hf-tooling";
var DEFAULT_OPENCLAW_LIVE_DIR = "/tmp/openclaw-live";
async function seedHuggingFaceTooling(options = {}) {
  const env = options.env ?? process.env;
  const assetRoot = options.assetRoot ?? env.MLCLAW_HF_TOOLING_DIR ?? DEFAULT_HF_TOOLING_ASSET_ROOT;
  const workspaceDir = options.workspaceDir ?? resolveWorkspaceDir(env);
  const now = options.now ?? (() => /* @__PURE__ */ new Date());
  const manifest = await readToolingManifest(assetRoot);
  const skillsRoot = path.join(workspaceDir, ".agents", "skills");
  const copiedSkills = [];
  const skippedSkills = [];
  await fs.mkdir(skillsRoot, { recursive: true });
  for (const skill of manifest.skills.installed) {
    const source = path.join(assetRoot, "skills", skill);
    const target = path.join(skillsRoot, skill);
    if (await pathExists(target)) {
      skippedSkills.push(skill);
      continue;
    }
    await assertDirectory(source, `baseline skill ${skill}`);
    await fs.cp(source, target, { recursive: true, preserveTimestamps: true });
    copiedSkills.push(skill);
  }
  const templateRoot = path.join(assetRoot, "templates");
  const copiedTemplateFiles = await copyMissingTree(templateRoot, workspaceDir);
  const wroteManifest = await writeWorkspaceManifest({
    manifest,
    workspaceDir,
    installedAt: now().toISOString()
  });
  return {
    workspaceDir,
    copiedSkills,
    skippedSkills,
    copiedTemplateFiles,
    wroteManifest
  };
}
function resolveWorkspaceDir(env) {
  const explicit = env.OPENCLAW_WORKSPACE_DIR?.trim();
  if (explicit) {
    return explicit;
  }
  const liveDir = env.OPENCLAW_LIVE_DIR?.trim() || DEFAULT_OPENCLAW_LIVE_DIR;
  return path.join(liveDir, "workspace");
}
async function readToolingManifest(assetRoot) {
  const raw = await fs.readFile(path.join(assetRoot, "manifest.json"), "utf8");
  const parsed = JSON.parse(raw);
  assertToolingManifest(parsed);
  return parsed;
}
function assertToolingManifest(value) {
  if (typeof value !== "object" || value === null) {
    throw new Error("HF tooling manifest must be an object");
  }
  const record = value;
  if (record.schemaVersion !== 1) {
    throw new Error("HF tooling manifest schemaVersion must be 1");
  }
  const skills = record.skills;
  if (!skills || !Array.isArray(skills.installed) || !skills.installed.every((skill) => typeof skill === "string")) {
    throw new Error("HF tooling manifest must list installed skills");
  }
  const python = record.python;
  if (!python || typeof python.packages !== "object" || python.packages === null) {
    throw new Error("HF tooling manifest must list Python packages");
  }
}
async function copyMissingTree(sourceRoot, targetRoot) {
  const copied = [];
  await assertDirectory(sourceRoot, "HF tooling templates");
  for (const entry of await fs.readdir(sourceRoot, { withFileTypes: true })) {
    const source = path.join(sourceRoot, entry.name);
    const target = path.join(targetRoot, entry.name);
    if (entry.isDirectory()) {
      copied.push(...await copyMissingTree(source, target));
    } else if (entry.isFile()) {
      if (await pathExists(target)) {
        continue;
      }
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
      copied.push(path.relative(targetRoot, target).split(path.sep).join(path.posix.sep));
    }
  }
  return copied;
}
async function writeWorkspaceManifest(params) {
  const manifestPath = path.join(params.workspaceDir, ".agents", ".mlclaw-hf-tooling.json");
  const existing = await readExistingWorkspaceManifest(manifestPath);
  const installedAt = existing?.installedAt ?? params.installedAt;
  const next = {
    ...params.manifest,
    installedAt
  };
  if (existing && sameBaseline(existing, next)) {
    return false;
  }
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(next, null, 2)}
`, "utf8");
  return true;
}
async function readExistingWorkspaceManifest(manifestPath) {
  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const record = parsed;
    if (typeof record.installedAt !== "string") {
      return null;
    }
    assertToolingManifest(record);
    return record;
  } catch (err) {
    if (isMissingFileError(err)) {
      return null;
    }
    return null;
  }
}
function sameBaseline(a, b) {
  return JSON.stringify(withoutInstalledAt(a)) === JSON.stringify(withoutInstalledAt(b));
}
function withoutInstalledAt(value) {
  const { installedAt: _installedAt, ...rest } = value;
  return rest;
}
async function assertDirectory(dir, label) {
  let stat;
  try {
    stat = await fs.stat(dir);
  } catch (err) {
    if (isMissingFileError(err)) {
      throw new Error(`${label} is missing: ${dir}`);
    }
    throw err;
  }
  if (!stat.isDirectory()) {
    throw new Error(`${label} is not a directory: ${dir}`);
  }
}
async function pathExists(candidate) {
  try {
    await fs.access(candidate);
    return true;
  } catch (err) {
    if (isMissingFileError(err)) {
      return false;
    }
    throw err;
  }
}
function isMissingFileError(err) {
  return err instanceof Error && "code" in err && err.code === "ENOENT";
}

// src/hf-tooling/cli.ts
try {
  const result = await seedHuggingFaceTooling();
  const copied = result.copiedSkills.length;
  const skipped = result.skippedSkills.length;
  const templates = result.copiedTemplateFiles.length;
  const manifest = result.wroteManifest ? "updated" : "current";
  console.log(
    `[hf-tooling] workspace=${result.workspaceDir} skills=copied:${copied},skipped:${skipped} templates:${templates} manifest:${manifest}`
  );
} catch (err) {
  console.error(`[hf-tooling] ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
