import { spawn } from "node:child_process";
import fs, { constants as fsConstants } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const HF_CLI_INSTALL_URL = "https://hf.co/cli/install.sh";
export const HF_ACCOUNT_CREATE_URL = "https://huggingface.co/join";
export const HF_CLI_INSTALL_COMMAND = `curl -LsSf ${HF_CLI_INSTALL_URL} | bash`;

export type HfCliRuntime = {
  findExecutable: () => Promise<string | undefined>;
  install: () => Promise<void>;
  login: (executable: string) => Promise<void>;
  openUrl: (url: string) => Promise<boolean>;
};

export function createSystemHfCli(env: NodeJS.ProcessEnv = process.env): HfCliRuntime {
  return {
    findExecutable: async () => await findHfExecutable(env),
    install: async () => await installHfCli(env),
    login: async (executable) => await runInherited(executable, ["auth", "login"], env),
    openUrl: async (url) => await openUrl(url, env),
  };
}

async function findHfExecutable(env: NodeJS.ProcessEnv): Promise<string | undefined> {
  const fromPath = await hfCommandPath(env);
  if (fromPath) {
    return fromPath;
  }

  const home = env.HOME || os.homedir();
  const candidates = [
    env.HF_CLI_BIN_DIR && path.join(env.HF_CLI_BIN_DIR, "hf"),
    path.join(home, ".local", "bin", "hf"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      await fs.access(candidate, fsConstants.X_OK);
      return candidate;
    } catch {
      // Try the next standard installation path.
    }
  }
  return undefined;
}

async function hfCommandPath(env: NodeJS.ProcessEnv): Promise<string | undefined> {
  return await new Promise((resolve) => {
    const child = spawn("sh", ["-c", "command -v hf"], {
      env,
      stdio: ["ignore", "pipe", "ignore"],
    });
    let output = "";
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      output += chunk;
    });
    child.once("error", () => resolve(undefined));
    child.once("close", (code) => resolve(code === 0 ? output.trim() || undefined : undefined));
  });
}

async function installHfCli(env: NodeJS.ProcessEnv): Promise<void> {
  if (process.platform !== "darwin" && process.platform !== "linux") {
    throw new Error(`automatic Hugging Face CLI installation is not supported on ${process.platform}`);
  }

  const response = await fetch(HF_CLI_INSTALL_URL, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`failed to download the Hugging Face CLI installer: HTTP ${response.status}`);
  }

  const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-hf-cli-"));
  const installerPath = path.join(temporaryDirectory, "install.sh");
  try {
    await fs.writeFile(installerPath, await response.text(), { mode: 0o700 });
    await runInherited("bash", [installerPath], env);
  } finally {
    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function runInherited(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit" });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited ${signal ? `after signal ${signal}` : `with status ${code ?? "unknown"}`}`));
    });
  });
}

async function openUrl(url: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  const command = process.platform === "darwin" ? "open" : process.platform === "linux" ? "xdg-open" : undefined;
  if (!command) {
    return false;
  }
  return await new Promise((resolve) => {
    const child = spawn(command, [url], { env, stdio: "ignore" });
    child.once("error", () => resolve(false));
    child.once("close", (code) => resolve(code === 0));
  });
}
