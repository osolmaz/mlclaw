import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_HF_TOOLING_ASSET_ROOT = "/app/assets/hf-tooling";
export const DEFAULT_OPENCLAW_LIVE_DIR = "/tmp/openclaw-live";

export type HfToolingManifest = {
  schemaVersion: 1;
  source: {
    skills: string;
    revision: string;
  };
  tools: Record<string, unknown>;
  python: {
    packages: Record<string, string>;
  };
  skills: {
    source: string;
    revision: string;
    installed: string[];
  };
  templates: {
    mcpConfig: string;
    examples: string;
  };
};

export type SeedHuggingFaceToolingOptions = {
  assetRoot?: string;
  workspaceDir?: string;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
};

export type SeedHuggingFaceToolingResult = {
  workspaceDir: string;
  copiedSkills: string[];
  skippedSkills: string[];
  copiedWorkspaceSkills: string[];
  skippedWorkspaceSkills: string[];
  copiedTemplateFiles: string[];
  wroteContextFile: boolean;
  wroteManifest: boolean;
};

type WorkspaceManifest = HfToolingManifest & {
  installedAt: string;
};

const MLCLAW_CONTEXT_START = "<!-- MLCLAW:HUGGINGFACE_TOOLING:START -->";
const MLCLAW_CONTEXT_END = "<!-- MLCLAW:HUGGINGFACE_TOOLING:END -->";

export async function seedHuggingFaceTooling(
  options: SeedHuggingFaceToolingOptions = {},
): Promise<SeedHuggingFaceToolingResult> {
  const env = options.env ?? process.env;
  const assetRoot = options.assetRoot ?? env.MLCLAW_HF_TOOLING_DIR ?? DEFAULT_HF_TOOLING_ASSET_ROOT;
  const workspaceDir = options.workspaceDir ?? resolveWorkspaceDir(env);
  const now = options.now ?? (() => new Date());
  const manifest = await readToolingManifest(assetRoot);

  const agentSkills = await copyBaselineSkills({
    assetRoot,
    manifest,
    targetRoot: path.join(workspaceDir, ".agents", "skills"),
  });
  const workspaceSkills = await copyBaselineSkills({
    assetRoot,
    manifest,
    targetRoot: path.join(workspaceDir, "skills"),
  });

  const templateRoot = path.join(assetRoot, "templates");
  const copiedTemplateFiles = await copyMissingTree(templateRoot, workspaceDir);
  const wroteContextFile = await ensureWorkspaceContextFile({ manifest, workspaceDir });
  const wroteManifest = await writeWorkspaceManifest({
    manifest,
    workspaceDir,
    installedAt: now().toISOString(),
  });

  return {
    workspaceDir,
    copiedSkills: agentSkills.copied,
    skippedSkills: agentSkills.skipped,
    copiedWorkspaceSkills: workspaceSkills.copied,
    skippedWorkspaceSkills: workspaceSkills.skipped,
    copiedTemplateFiles,
    wroteContextFile,
    wroteManifest,
  };
}

async function copyBaselineSkills(params: {
  assetRoot: string;
  manifest: HfToolingManifest;
  targetRoot: string;
}): Promise<{ copied: string[]; skipped: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];
  await fs.mkdir(params.targetRoot, { recursive: true });

  for (const skill of params.manifest.skills.installed) {
    const source = path.join(params.assetRoot, "skills", skill);
    const target = path.join(params.targetRoot, skill);
    if (await pathExists(target)) {
      skipped.push(skill);
      continue;
    }
    await assertDirectory(source, `baseline skill ${skill}`);
    await fs.cp(source, target, { recursive: true, preserveTimestamps: true });
    copied.push(skill);
  }

  return { copied, skipped };
}

async function ensureWorkspaceContextFile(params: {
  manifest: HfToolingManifest;
  workspaceDir: string;
}): Promise<boolean> {
  const contextPath = path.join(params.workspaceDir, "AGENTS.md");
  const block = buildWorkspaceContextBlock(params.manifest);
  const existing = await readTextFileIfExists(contextPath);
  const next = mergeManagedBlock(existing, block);

  if (existing === next) {
    return false;
  }

  await fs.mkdir(path.dirname(contextPath), { recursive: true });
  await fs.writeFile(contextPath, next, "utf8");
  return true;
}

function buildWorkspaceContextBlock(manifest: HfToolingManifest): string {
  const skills = manifest.skills.installed.map((skill) => `- \`${skill}\``).join("\n");
  return `${MLCLAW_CONTEXT_START}
## ML Claw Hugging Face Tooling

This workspace has Hugging Face tooling preinstalled. Use the Hugging Face CLI
\`hf\`, \`hf-discover\`, and \`uv\` for Hub, dataset, model, Space, and bucket
work.

Hugging Face agent skills are available in both \`.agents/skills\` and
\`skills\`. Prefer these skills when the task involves Hugging Face:

${skills}

The pinned tooling manifest is \`.agents/.mlclaw-hf-tooling.json\`.
${MLCLAW_CONTEXT_END}
`;
}

function mergeManagedBlock(existing: string | null, block: string): string {
  const normalizedBlock = block.endsWith("\n") ? block : `${block}\n`;
  if (!existing) {
    return `# ML Claw Workspace\n\n${normalizedBlock}`;
  }

  const start = existing.indexOf(MLCLAW_CONTEXT_START);
  const end = existing.indexOf(MLCLAW_CONTEXT_END);
  if (start >= 0 && end >= start) {
    const afterEnd = end + MLCLAW_CONTEXT_END.length;
    const suffix = existing.slice(afterEnd).replace(/^\r?\n/u, "");
    const next = `${existing.slice(0, start)}${normalizedBlock}${suffix}`;
    return next.replace(/\n{4,}/g, "\n\n\n");
  }

  const trimmed = existing.replace(/\s+$/u, "");
  return `${trimmed}\n\n${normalizedBlock}`;
}

async function readTextFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (err) {
    if (isMissingFileError(err)) {
      return null;
    }
    throw err;
  }
}

function resolveWorkspaceDir(env: NodeJS.ProcessEnv): string {
  const explicit = env.OPENCLAW_WORKSPACE_DIR?.trim();
  if (explicit) {
    return explicit;
  }
  const liveDir = env.OPENCLAW_LIVE_DIR?.trim() || DEFAULT_OPENCLAW_LIVE_DIR;
  return path.join(liveDir, "workspace");
}

async function readToolingManifest(assetRoot: string): Promise<HfToolingManifest> {
  const raw = await fs.readFile(path.join(assetRoot, "manifest.json"), "utf8");
  const parsed = JSON.parse(raw) as unknown;
  assertToolingManifest(parsed);
  return parsed;
}

function assertToolingManifest(value: unknown): asserts value is HfToolingManifest {
  if (typeof value !== "object" || value === null) {
    throw new Error("HF tooling manifest must be an object");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== 1) {
    throw new Error("HF tooling manifest schemaVersion must be 1");
  }
  const skills = record.skills as Record<string, unknown> | undefined;
  if (!skills || !Array.isArray(skills.installed) || !skills.installed.every((skill) => typeof skill === "string")) {
    throw new Error("HF tooling manifest must list installed skills");
  }
  const python = record.python as Record<string, unknown> | undefined;
  if (!python || typeof python.packages !== "object" || python.packages === null) {
    throw new Error("HF tooling manifest must list Python packages");
  }
}

async function copyMissingTree(sourceRoot: string, targetRoot: string): Promise<string[]> {
  const copied: string[] = [];
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

async function writeWorkspaceManifest(params: {
  manifest: HfToolingManifest;
  workspaceDir: string;
  installedAt: string;
}): Promise<boolean> {
  const manifestPath = path.join(params.workspaceDir, ".agents", ".mlclaw-hf-tooling.json");
  const existing = await readExistingWorkspaceManifest(manifestPath);
  const installedAt = existing?.installedAt ?? params.installedAt;
  const next: WorkspaceManifest = {
    ...params.manifest,
    installedAt,
  };

  if (existing && sameBaseline(existing, next)) {
    return false;
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return true;
}

async function readExistingWorkspaceManifest(manifestPath: string): Promise<WorkspaceManifest | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, "utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (typeof record.installedAt !== "string") {
      return null;
    }
    assertToolingManifest(record);
    return record as WorkspaceManifest;
  } catch (err) {
    if (isMissingFileError(err)) {
      return null;
    }
    return null;
  }
}

function sameBaseline(a: WorkspaceManifest, b: WorkspaceManifest): boolean {
  return JSON.stringify(withoutInstalledAt(a)) === JSON.stringify(withoutInstalledAt(b));
}

function withoutInstalledAt(value: WorkspaceManifest): HfToolingManifest {
  const { installedAt: _installedAt, ...rest } = value;
  return rest;
}

async function assertDirectory(dir: string, label: string): Promise<void> {
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

async function pathExists(candidate: string): Promise<boolean> {
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

function isMissingFileError(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
}
