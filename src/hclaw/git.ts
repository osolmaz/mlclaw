import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SOURCE_REPO = "https://github.com/osolmaz/huggingclaw.git";
const SOURCE_REF = "main";
const HUB_URL = "https://huggingface.co";

export async function pushTemplateToSpace(params: {
  targetRepo: string;
  token: string;
  sourceRepo?: string;
  sourceRef?: string;
  sourceDir?: string;
}): Promise<{ templateRev: string }> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hclaw-space-"));
  try {
    const sourceDir = params.sourceDir ?? process.env.HCLAW_SOURCE_DIR ?? path.join(tempRoot, "source");
    if (!params.sourceDir && !process.env.HCLAW_SOURCE_DIR) {
      await run("git", [
        "clone",
        "--depth",
        "1",
        "--branch",
        params.sourceRef ?? SOURCE_REF,
        params.sourceRepo ?? SOURCE_REPO,
        sourceDir,
      ]);
    }
    const { stdout } = await run("git", ["-C", sourceDir, "rev-parse", "HEAD"]);
    const templateRev = stdout.trim();
    const outDir = path.join(tempRoot, "space");
    await fs.mkdir(outDir, { recursive: true });
    await generateSpaceRepo(sourceDir, outDir);
    await run("git", ["-C", outDir, "init", "-b", "main"]);
    await run("git", ["-C", outDir, "config", "user.email", "hclaw@users.noreply.github.com"]);
    await run("git", ["-C", outDir, "config", "user.name", "hclaw"]);
    await run("git", ["-C", outDir, "add", "-A"]);
    await run("git", ["-C", outDir, "commit", "-m", `Deploy Hugging Claw ${templateRev.slice(0, 12)}`]);

    const askpass = path.join(tempRoot, ".hclaw-git-askpass.sh");
    await fs.writeFile(
      askpass,
      `#!/usr/bin/env sh
case "$1" in
  *Username*) printf '%s\\n' 'hf_user' ;;
  *Password*) printf '%s\\n' "$HCLAW_GIT_TOKEN" ;;
  *) printf '%s\\n' ;;
esac
`,
      { mode: 0o700 },
    );
    const gitEnv = {
      ...process.env,
      GIT_ASKPASS: askpass,
      GIT_TERMINAL_PROMPT: "0",
      HCLAW_GIT_TOKEN: params.token,
    };
    await run("git", ["-C", outDir, "remote", "add", "origin", spaceUrl(params.targetRepo)]);
    await run("git", ["-C", outDir, "push", "--force", "origin", "HEAD:main"], gitEnv);
    return { templateRev };
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

export async function currentTemplateRev(): Promise<string> {
  const { stdout } = await run("git", ["rev-parse", "HEAD"]);
  return stdout.trim();
}

async function run(
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync(command, args, { env, maxBuffer: 20 * 1024 * 1024 });
  } catch (err) {
    if (err instanceof Error) {
      const withIo = err as Error & { stdout?: string; stderr?: string };
      throw new Error(`${command} ${args.map(redact).join(" ")} failed: ${withIo.stderr || withIo.message}`);
    }
    throw err;
  }
}

function spaceUrl(repo: string): string {
  return `${HUB_URL}/spaces/${repo}`;
}

function redact(arg: string): string {
  return arg.includes("@huggingface.co") ? "<authenticated-url>" : arg;
}

async function generateSpaceRepo(sourceDir: string, outDir: string): Promise<void> {
  const copies: Array<[string, string]> = [
    [".gitattributes", ".gitattributes"],
    ["Dockerfile", "Dockerfile"],
    ["entrypoint.sh", "entrypoint.sh"],
    ["openclaw.default.json", "openclaw.default.json"],
    ["package.json", "package.json"],
    ["package-lock.json", "package-lock.json"],
    ["tsconfig.json", "tsconfig.json"],
    ["assets/huggingclaw.svg", "assets/huggingclaw.svg"],
    ["space/README.md", "README.md"],
    ["scripts/configure-telegram.mjs", "scripts/configure-telegram.mjs"],
    ["scripts/report-telegram-probe.mjs", "scripts/report-telegram-probe.mjs"],
    ["src/hf-bucket-client", "src/hf-bucket-client"],
    ["src/hf-state-sync", "src/hf-state-sync"],
    ["src/vendor", "src/vendor"],
  ];
  for (const [from, to] of copies) {
    await copyExisting(path.join(sourceDir, from), path.join(outDir, to));
  }
  await writeSpacePackageJson(path.join(outDir, "package.json"));
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

async function writeSpacePackageJson(file: string): Promise<void> {
  const pkg = JSON.parse(await fs.readFile(file, "utf8")) as {
    name?: string;
    scripts?: Record<string, string>;
  };
  pkg.name = "huggingclaw-generated-space";
  pkg.scripts = {
    ...pkg.scripts,
    build: pkg.scripts?.["build:state-sync"] ?? "esbuild src/hf-state-sync/cli.ts --bundle --platform=node --target=node22 --format=esm --outfile=dist/hf-state-sync.js",
  };
  delete pkg.scripts["build:hclaw"];
  delete pkg.scripts["build:probe"];
  await fs.writeFile(file, `${JSON.stringify(pkg, null, 2)}\n`);
}
