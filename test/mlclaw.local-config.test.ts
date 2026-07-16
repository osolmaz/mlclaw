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
} from "../src/mlclaw/local-config.js";

describe("local ML Claw config", () => {
  it("round-trips manifests", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-config-"));

    await writeManifest(root, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-test",
      gatewayLocation: "local",
      model: "huggingface/google/gemma-4-26B-A4B-it",
      runtimeImage: "example/runtime:test",
      localGateway: {
        engine: "docker",
        dockerContext: "desktop-linux",
        dockerEndpoint: "unix:///docker.sock",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(readManifest(root, "research")).resolves.toMatchObject({
      agent: "research",
      gatewayLocation: "local",
      bucket: "alice/research-data",
      localGateway: {
        engine: "docker",
        dockerContext: "desktop-linux",
        dockerEndpoint: "unix:///docker.sock",
      },
    });
  });

  it("writes secret env files with user-only permissions", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-config-"));

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

  it("round-trips Podman gateway bindings", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-config-"));
    await writeManifest(root, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-test",
      gatewayLocation: "local",
      model: "test-model",
      runtimeImage: "example/runtime:test",
      localGateway: {
        engine: "podman",
        podmanConnection: "local",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(readManifest(root, "research")).resolves.toMatchObject({
      localGateway: { engine: "podman", podmanConnection: "local" },
    });
  });

  it("writes Docker env-file values without shell quotes", () => {
    const raw = "A=plain-token\nB=has spaces\nC=123,456\nD=https://proxy.example/?a=b&c=d\n";
    expect(
      renderSecretEnv({
      A: "plain-token",
      B: "has spaces",
      C: "123,456",
      D: "https://proxy.example/?a=b&c=d",
      }),
    ).toBe(raw);
    expect(parseSecretEnv(raw)).toEqual({
      A: "plain-token",
      B: "has spaces",
      C: "123,456",
      D: "https://proxy.example/?a=b&c=d",
    });
    expect(() => renderSecretEnv({ A: "line\nbreak" })).toThrow("cannot contain newlines");
  });
});
