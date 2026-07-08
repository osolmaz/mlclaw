import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("mlclaw bundle", () => {
  it("matches the committed source build", async () => {
    const tmp = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-bundle-")), "mlclaw.mjs");
    await execFileAsync("npx", [
      "esbuild",
      "src/mlclaw/cli.ts",
      "--bundle",
      "--platform=node",
      "--target=node22",
      "--format=esm",
      `--outfile=${tmp}`,
      "--banner:js=import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    ]);
    const [expected, actual] = await Promise.all([
      fs.readFile(tmp, "utf8"),
      fs.readFile("dist/mlclaw.mjs", "utf8"),
    ]);
    expect(actual).toBe(expected);
  });

  it("exposes the bundled ML Claw skill", async () => {
    const list = await execFileAsync("node", ["dist/mlclaw.mjs", "--skill", "list"]);
    expect(list.stdout).toContain("mlclaw\t");
    expect(list.stdout).not.toContain("skillflag\t");

    const show = await execFileAsync("node", ["dist/mlclaw.mjs", "--skill", "show", "mlclaw"]);
    expect(show.stdout).toContain("# ML Claw");
    expect(show.stdout).toContain("npx mlclaw bootstrap");
  });
});
