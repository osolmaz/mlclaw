import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateSpaceRepo } from "../src/hclaw/git.js";

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .sort();
}

describe("generated Space repository", () => {
  it("contains only runtime files and assets", async () => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "hclaw-space-test-"));
    await generateSpaceRepo(process.cwd(), outDir);

    const files = await listFiles(outDir);
    const required = [
      ".gitattributes",
      "Dockerfile",
      "README.md",
      "assets/huggingclaw.svg",
      "entrypoint.sh",
      "openclaw.default.json",
      "package-lock.json",
      "package.json",
      "scripts/configure-telegram.mjs",
      "scripts/report-telegram-probe.mjs",
      "src/hf-bucket-client/client.ts",
      "src/hf-state-sync/cli.ts",
      "src/vendor/hfjs-xet/utils/uploadShards.ts",
      "tsconfig.json",
    ];

    for (const file of required) {
      expect(files).toContain(file);
    }
    for (const file of files) {
      expect(
        file === ".gitattributes" ||
          file === "Dockerfile" ||
          file === "README.md" ||
          file === "entrypoint.sh" ||
          file === "openclaw.default.json" ||
          file === "package-lock.json" ||
          file === "package.json" ||
          file === "tsconfig.json" ||
          file.startsWith("assets/") ||
          file.startsWith("scripts/") ||
          file.startsWith("src/hf-bucket-client/") ||
          file.startsWith("src/hf-state-sync/") ||
          file.startsWith("src/vendor/"),
      ).toBe(true);
    }

    expect(files.some((file) => file.startsWith("src/hclaw/"))).toBe(false);
    expect(files).not.toContain("scripts/parity-probe.ts");
    expect(files.some((file) => file.startsWith("dist/"))).toBe(false);
    await expect(fs.readFile(path.join(outDir, "README.md"), "utf8")).resolves.toContain("assets/huggingclaw.svg");
    const pkg = JSON.parse(await fs.readFile(path.join(outDir, "package.json"), "utf8")) as {
      name?: string;
      private?: boolean;
      bin?: unknown;
      files?: unknown;
    };
    expect(pkg.name).toBe("huggingclaw-generated-space");
    expect(pkg.private).toBe(true);
    expect(pkg.bin).toBeUndefined();
    expect(pkg.files).toBeUndefined();
  });
});
