import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { HubApi } from "./hub-api.js";

const execFileAsync = promisify(execFile);

export async function pushTemplateToSpace(params: {
  targetRepo: string;
  token: string;
  sourceDir?: string;
  runtimeImage?: string;
}): Promise<{ templateRev: string }> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-space-"));
  try {
    const sourceDir = params.sourceDir ?? process.env.MLCLAW_SOURCE_DIR ?? await findPackagedSourceRoot();
    const templateRev = await currentTemplateRev(sourceDir);
    const outDir = path.join(tempRoot, "space");
    await fs.mkdir(outDir, { recursive: true });
    await generateSpaceRepo(sourceDir, outDir, {
      ...(params.runtimeImage ? { runtimeImage: params.runtimeImage } : {}),
    });

    const hub = new HubApi({ token: params.token });
    const [files, existingFiles] = await Promise.all([
      readFilesForCommit(outDir),
      hub.listSpaceFiles(params.targetRepo).catch(() => []),
    ]);
    const nextPaths = new Set(files.map((file) => file.path));
    const deletePaths = existingFiles.filter((file) => !nextPaths.has(file));
    await hub.commitSpaceFiles(params.targetRepo, {
      files,
      deletePaths,
      title: `Deploy ML Claw ${templateRev.slice(0, 12)}`,
    });
    return { templateRev };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

export async function currentTemplateRev(sourceDir?: string): Promise<string> {
  sourceDir ??= process.env.MLCLAW_SOURCE_DIR ?? await findPackagedSourceRoot();
  try {
    const { stdout } = await execFileAsync("git", ["-C", sourceDir, "rev-parse", "HEAD"]);
    const rev = stdout.trim();
    if (rev) {
      return rev;
    }
  } catch {
    // npm installs and no-git launcher environments fall back to package metadata.
  }
  const pkg = JSON.parse(await fs.readFile(path.join(sourceDir, "package.json"), "utf8")) as {
    name?: string;
    version?: string;
  };
  return `npm:${pkg.name ?? "mlclaw"}@${pkg.version ?? "unknown"}`;
}

export async function generateSpaceRepo(
  sourceDir: string,
  outDir: string,
  options: { runtimeImage?: string } = {},
): Promise<void> {
  const copies: Array<[string, string]> = [
    [".gitattributes", ".gitattributes"],
    ["assets/mlclaw.svg", "assets/mlclaw.svg"],
    ["space/README.md", "README.md"],
  ];
  if (!options.runtimeImage) {
    copies.push(
      ["dist/hf-state-sync.js", "runtime/hf-state-sync.js"],
      ["dist/mlclaw-space-runtime.js", "runtime/mlclaw-space-runtime.js"],
      ["entrypoint.sh", "runtime/entrypoint.sh"],
      ["openclaw.default.json", "runtime/openclaw.default.json"],
      ["scripts/configure-huggingface-model.mjs", "runtime/scripts/configure-huggingface-model.mjs"],
      ["scripts/configure-telegram.mjs", "runtime/scripts/configure-telegram.mjs"],
      ["scripts/report-telegram-probe.mjs", "runtime/scripts/report-telegram-probe.mjs"],
    );
  }
  for (const [from, to] of copies) {
    await copyExisting(path.join(sourceDir, from), path.join(outDir, to));
  }
  await fs.writeFile(
    path.join(outDir, "Dockerfile"),
    options.runtimeImage ? imageDockerfile(options.runtimeImage) : bundledDockerfile(),
    "utf8",
  );
}

function imageDockerfile(runtimeImage: string): string {
  return `FROM ${runtimeImage}\n`;
}

function bundledDockerfile(): string {
  return `FROM ghcr.io/openclaw/openclaw:latest

LABEL org.opencontainers.image.source="https://github.com/osolmaz/mlclaw"
LABEL org.opencontainers.image.description="ML Claw runtime for OpenClaw on Hugging Face"

USER root
RUN apt-get update \\
  && apt-get install -y --no-install-recommends gosu zstd \\
  && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node runtime/hf-state-sync.js /app/hf-state-sync.js
COPY --chown=node:node runtime/mlclaw-space-runtime.js /app/mlclaw-space-runtime.js
COPY --chown=node:node runtime/openclaw.default.json /app/openclaw.default.json
COPY --chown=node:node runtime/entrypoint.sh /app/entrypoint.sh
COPY --chown=node:node runtime/scripts/ /app/scripts/
COPY --chown=node:node assets/ /app/assets/
RUN chmod +x /app/entrypoint.sh

ENV PORT=7860
ENV MLCLAW_OPENCLAW_PORT=7861
ENV OPENCLAW_GATEWAY_PORT=7861
ENV OPENCLAW_LIVE_DIR=/tmp/openclaw-live
ENV OPENCLAW_STATE_DIR=/tmp/openclaw-live/.openclaw
ENV OPENCLAW_WORKSPACE_DIR=/tmp/openclaw-live/workspace
ENV OPENCLAW_CONFIG_PATH=/tmp/openclaw-live/.openclaw/openclaw.json
ENV OPENCLAW_DISABLE_BONJOUR=1

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 CMD node -e "const port=process.env.PORT||'7860'; fetch('http://127.0.0.1:'+port+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]
`;
}

async function findPackagedSourceRoot(): Promise<string> {
  const start = path.dirname(fileURLToPath(import.meta.url));
  let dir = start;
  while (true) {
    if (await hasPackagedSourceFiles(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not find packaged ML Claw source files. Reinstall the mlclaw npm package.");
    }
    dir = parent;
  }
}

async function hasPackagedSourceFiles(dir: string): Promise<boolean> {
  const required = [
    "package.json",
    "Dockerfile",
    "entrypoint.sh",
    "space/README.md",
    "src/hf-state-sync/cli.ts",
    "src/hf-bucket-client/client.ts",
  ];
  try {
    await Promise.all(required.map((file) => fs.access(path.join(dir, file))));
    return true;
  } catch {
    return false;
  }
}

async function copyExisting(from: string, to: string): Promise<void> {
  const stat = await fs.stat(from);
  await fs.mkdir(path.dirname(to), { recursive: true });
  if (stat.isDirectory()) {
    await fs.cp(from, to, { recursive: true });
  } else {
    await fs.copyFile(from, to);
    await fs.chmod(to, stat.mode);
  }
}

async function readFilesForCommit(root: string): Promise<Array<{ path: string; content: Buffer }>> {
  const files: Array<{ path: string; content: Buffer }> = [];
  for (const relativePath of await listFiles(root)) {
    files.push({
      path: relativePath,
      content: await fs.readFile(path.join(root, relativePath)),
    });
  }
  return files;
}

async function listFiles(root: string, dir = ""): Promise<string[]> {
  const absoluteDir = path.join(root, dir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(dir.split(path.sep).join(path.posix.sep), entry.name);
    const absolutePath = path.join(root, relativePath);
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      const stat = await fs.stat(absolutePath);
      if (stat.isFile()) {
        files.push(relativePath);
      }
    }
  }
  return files.sort();
}
