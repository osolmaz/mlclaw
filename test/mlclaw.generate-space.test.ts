import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateSpaceRepo } from "../src/mlclaw/git.js";

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .sort();
}

describe("generated Space repository", () => {
  it("uses an explicit runtime image when requested", async () => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-space-test-"));
    await generateSpaceRepo(process.cwd(), outDir, { runtimeImage: "example/runtime:test" });

    const files = await listFiles(outDir);
    const required = [
      ".gitattributes",
      "Dockerfile",
      "README.md",
      "assets/mlclaw.svg",
    ];

    for (const file of required) {
      expect(files).toContain(file);
    }
    for (const file of files) {
      expect(
        file === ".gitattributes" ||
          file === "Dockerfile" ||
          file === "README.md" ||
          file.startsWith("assets/"),
      ).toBe(true);
    }

    expect(files.some((file) => file.startsWith("src/mlclaw/"))).toBe(false);
    expect(files.some((file) => file.startsWith("src/"))).toBe(false);
    expect(files).not.toContain("scripts/parity-probe.ts");
    expect(files.some((file) => file.startsWith("dist/"))).toBe(false);
    await expect(fs.readFile(path.join(outDir, "README.md"), "utf8")).resolves.toContain("assets/mlclaw.svg");
    await expect(fs.readFile(path.join(outDir, "Dockerfile"), "utf8")).resolves.toBe("FROM example/runtime:test\n");
  });

  it("bundles the Space runtime by default", async () => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-space-test-"));
    await generateSpaceRepo(process.cwd(), outDir);

    const files = await listFiles(outDir);
    const required = [
      ".gitattributes",
      "Dockerfile",
      "README.md",
      "assets/mlclaw.svg",
      "runtime/entrypoint.sh",
      "runtime/hf-state-sync.js",
      "runtime/mlclaw-space-runtime.js",
      "runtime/openclaw.default.json",
      "runtime/scripts/configure-huggingface-model.mjs",
      "runtime/scripts/configure-telegram.mjs",
      "runtime/scripts/report-telegram-probe.mjs",
    ];

    for (const file of required) {
      expect(files).toContain(file);
    }
    for (const file of files) {
      expect(
        file === ".gitattributes" ||
          file === "Dockerfile" ||
          file === "README.md" ||
          file.startsWith("assets/") ||
          file.startsWith("runtime/"),
      ).toBe(true);
    }
    expect(files.some((file) => file.startsWith("src/"))).toBe(false);
    expect(files.some((file) => file.startsWith("docs/"))).toBe(false);
    expect(files).not.toContain("scripts/parity-probe.ts");

    const dockerfile = await fs.readFile(path.join(outDir, "Dockerfile"), "utf8");
    expect(dockerfile).toContain("FROM ghcr.io/openclaw/openclaw:latest");
    expect(dockerfile).toContain("COPY --chown=node:node runtime/hf-state-sync.js /app/hf-state-sync.js");
    expect(dockerfile).toContain("CMD [\"/app/entrypoint.sh\"]");
    await expect(fs.readFile(path.join(outDir, "runtime/openclaw.default.json"), "utf8")).resolves.toContain(
      "\"dangerouslyDisableDeviceAuth\": true",
    );
  });
});
