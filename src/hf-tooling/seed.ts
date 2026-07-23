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
    managed: Array<{
      name: string;
      source: string;
      revision: string;
    }>;
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

export type WaitForBootstrapAndSeedOptions = SeedHuggingFaceToolingOptions & {
  pollIntervalMs?: number;
  signal?: AbortSignal;
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

const OPENCLAW_BOOTSTRAP_FILENAME = "BOOTSTRAP.md";
const OPENCLAW_WORKSPACE_STATE_FILENAME = "openclaw-workspace-state.json";

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

/**
 * Keep a fresh OpenClaw workspace pristine until its native onboarding flow
 * has completed. OpenClaw treats changed profile files and workspace skills as
 * evidence that onboarding already happened, so seeding either one early
 * causes it to discard BOOTSTRAP.md before the first prompt.
 */
export async function waitForBootstrapAndSeedHuggingFaceTooling(
  options: WaitForBootstrapAndSeedOptions = {},
): Promise<SeedHuggingFaceToolingResult | null> {
  const env = options.env ?? process.env;
  const workspaceDir = options.workspaceDir ?? resolveWorkspaceDir(env);
  const bootstrapPath = path.join(workspaceDir, OPENCLAW_BOOTSTRAP_FILENAME);
  const statePath = path.join(workspaceDir, OPENCLAW_WORKSPACE_STATE_FILENAME);
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;
  let observedPendingBootstrap = false;

  while (!options.signal?.aborted) {
    if (await pathExists(bootstrapPath)) {
      observedPendingBootstrap = true;
    } else if (!observedPendingBootstrap || await workspaceSetupIsComplete(statePath)) {
      return await seedHuggingFaceTooling({ ...options, workspaceDir });
    }

    await waitForPoll(pollIntervalMs, options.signal);
  }

  return null;
}

async function workspaceSetupIsComplete(statePath: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(await fs.readFile(statePath, "utf8")) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return false;
    }
    const setupCompletedAt = (parsed as Record<string, unknown>).setupCompletedAt;
    return typeof setupCompletedAt === "string" && setupCompletedAt.trim().length > 0;
  } catch {
    return false;
  }
}

async function waitForPoll(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return;
  }
  await new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, delayMs);
    signal?.addEventListener("abort", finish, { once: true });
  });
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

Protected Hugging Face mutations use the preconfigured HF Broker. Never ask
the user for a Hugging Face token and never run \`hf auth login\`. Choose the
matching \`hf_*\` MCP tool for the operation. Omit \`request_id\` for a new
operation unless you deliberately need an exact retry identity. Record the
returned operation \`id\`, then use \`hf_operation_wait\` or
\`hf_operation_get\` to observe completion. Use the bounded
\`hf_operation_list\` tool, optionally filtered by \`request_id\`, to recover
an operation after an ambiguous transport timeout.

Never reuse a request ID for a different target or argument set. A request-ID
conflict is durable: inspect the existing operation instead of restarting the
broker. Protected actions appear in the ML Claw BrokerKit control and may also
be sent through configured OpenClaw channels.

For repeated repository or bucket writes, request the narrowest temporary grant
with \`hf_grant_request\`. A bounded wait may return a pending grant; continue
with \`hf_grant_wait\` using the same grant ID. Revoke the grant when the work is
finished. Use the installed \`hf-broker\` client for local file upload and
verified download streams. Never use the deployment state bucket for agent
work; its exact target is denied by policy.

After repository creation, use the brokered Git transport for repository
contents. The limited broker credential is not a Hugging Face Hub token; do
not report it as missing Hub access.

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
  if (!Array.isArray(skills.managed) || !skills.managed.every(isManagedSkillSource)) {
    throw new Error("HF tooling manifest must list managed skill sources");
  }
  const python = record.python as Record<string, unknown> | undefined;
  if (!python || typeof python.packages !== "object" || python.packages === null) {
    throw new Error("HF tooling manifest must list Python packages");
  }
}

function isManagedSkillSource(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const source = value as Record<string, unknown>;
  return [source.name, source.source, source.revision].every(
    (field) => typeof field === "string" && field.trim().length > 0,
  );
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
