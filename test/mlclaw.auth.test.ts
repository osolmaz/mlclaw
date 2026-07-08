import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readToken } from "../src/mlclaw/auth.js";

describe("mlclaw auth", () => {
  it("reads the standard token location under HF_HOME", async () => {
    const hfHome = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-hf-home-"));
    await fs.writeFile(path.join(hfHome, "token"), "hf_test_token\n");

    await expect(readToken({ HF_HOME: hfHome })).resolves.toBe("hf_test_token");
  });
});
