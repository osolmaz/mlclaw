import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("hclaw bundle", () => {
  it("matches the committed source build", async () => {
    const tmp = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "hclaw-bundle-")), "hclaw.mjs");
    await execFileAsync("npx", [
      "esbuild",
      "src/hclaw/cli.ts",
      "--bundle",
      "--platform=node",
      "--target=node22",
      "--format=esm",
      `--outfile=${tmp}`,
      "--banner:js=import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    ]);
    const [expected, actual] = await Promise.all([
      fs.readFile(tmp, "utf8"),
      fs.readFile("dist/hclaw.mjs", "utf8"),
    ]);
    expect(actual).toBe(expected);
  });
});
