import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { HF_ACCOUNT_CREATE_URL, HF_CLI_INSTALL_COMMAND, type HfCliRuntime } from "./hf-cli.js";

type HfOnboardingPrompt = {
  isInteractive: () => boolean;
  note: (message: string, title?: string) => void;
  confirm: (message: string, initialValue: boolean) => Promise<boolean>;
};

export async function readToken(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const fromEnv = env.HF_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const candidates = [
    env.HF_TOKEN_PATH,
    env.HF_HOME && path.join(env.HF_HOME, "token"),
    path.join(os.homedir(), ".cache", "huggingface", "token"),
    path.join(os.homedir(), ".huggingface", "token"),
  ].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    try {
      const token = (await fs.readFile(candidate, "utf8")).trim();
      if (token) {
        return token;
      }
    } catch {
      // Try the next standard location.
    }
  }
  throw new Error("HF token not found. Set HF_TOKEN or run `hf auth login` once.");
}

export async function ensureHfToken(params: {
  readToken: () => Promise<string>;
  hfCli: HfCliRuntime;
  prompt: HfOnboardingPrompt;
}): Promise<string> {
  let missingTokenError: unknown;
  try {
    return await params.readToken();
  } catch (error) {
    missingTokenError = error;
  }

  if (!params.prompt.isInteractive()) {
    throw missingTokenError;
  }

  let executable = await params.hfCli.findExecutable();
  if (!executable) {
    params.prompt.note(
      `ML Claw uses the official Hugging Face CLI to sign you in.\n\nManual install command:\n${HF_CLI_INSTALL_COMMAND}`,
      "Hugging Face CLI required",
    );
    const install = await params.prompt.confirm("Install the Hugging Face CLI now?", true);
    if (!install) {
      throw new Error(`Hugging Face CLI installation was declined. Install it with: ${HF_CLI_INSTALL_COMMAND}`);
    }
    await params.hfCli.install();
    executable = await params.hfCli.findExecutable();
    if (!executable) {
      throw new Error(
        `Hugging Face CLI was installed but could not be found. Open a new terminal or run: ${HF_CLI_INSTALL_COMMAND}`,
      );
    }
  }

  const hasAccount = await params.prompt.confirm("Do you already have a Hugging Face account?", true);
  if (!hasAccount) {
    const opened = await params.hfCli.openUrl(HF_ACCOUNT_CREATE_URL);
    params.prompt.note(
      `${opened ? "A browser was opened for account creation." : "Create your account in a browser."}\n\n${HF_ACCOUNT_CREATE_URL}`,
      "Create a Hugging Face account",
    );
    const accountCreated = await params.prompt.confirm("Have you created your Hugging Face account?", false);
    if (!accountCreated) {
      throw new Error(`Create a Hugging Face account at ${HF_ACCOUNT_CREATE_URL}, then run ML Claw again`);
    }
  }

  params.prompt.note(
    "Complete Hugging Face sign-in in the browser. ML Claw will resume automatically afterward.",
    "Hugging Face sign-in",
  );
  await params.hfCli.login(executable);
  try {
    return await params.readToken();
  } catch {
    throw new Error("Hugging Face sign-in completed, but no local token was found. Run `hf auth login` and try again.");
  }
}
