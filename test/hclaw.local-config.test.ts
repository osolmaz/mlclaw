import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseSecretEnv,
  readManifest,
  readSecretEnv,
  renderSecretEnv,
  writeManifest,
  writeSecretEnv,
} from "../src/hclaw/local-config.js";

describe("local Hugging Claw config", () => {
  it("round-trips manifests", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hclaw-config-"));

    await writeManifest(root, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-test",
      gatewayLocation: "local",
      model: "huggingface/Qwen/Qwen3-8B",
      runtimeImage: "example/runtime:test",
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(readManifest(root, "research")).resolves.toMatchObject({
      agent: "research",
      gatewayLocation: "local",
      bucket: "alice/research-data",
    });
  });

  it("writes secret env files with user-only permissions", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hclaw-config-"));

    await writeSecretEnv(root, "research", {
      HF_TOKEN: "hf_test",
      TELEGRAM_BOT_TOKEN: "token with spaces",
    });

    await expect(readSecretEnv(root, "research")).resolves.toEqual({
      HF_TOKEN: "hf_test",
      TELEGRAM_BOT_TOKEN: "token with spaces",
    });
    const stat = await fs.stat(path.join(root, "secrets", "research.env"));
    expect(stat.mode & 0o777).toBe(0o600);
  });

  it("quotes only env values that need quoting", () => {
    expect(renderSecretEnv({ A: "plain-token", B: "has spaces" })).toBe('A=plain-token\nB="has spaces"\n');
    expect(parseSecretEnv('A=plain-token\nB="has spaces"\n')).toEqual({ A: "plain-token", B: "has spaces" });
  });
});
