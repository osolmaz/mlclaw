import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function readToken(env: NodeJS.ProcessEnv = process.env): Promise<string> {
  const fromEnv = env.HF_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  const candidates = [
    env.HF_TOKEN_PATH,
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

