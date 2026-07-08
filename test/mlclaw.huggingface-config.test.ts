import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("Hugging Face model config", () => {
  it("registers the selected HF Router model as an explicit provider model", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-hf-model-"));
    const configPath = path.join(dir, "openclaw.json");
    await fs.writeFile(configPath, JSON.stringify({
      agents: {
        defaults: {
          model: {
            primary: "${OPENCLAW_MODEL}",
          },
        },
      },
    }));

    await execFileAsync("node", ["scripts/configure-huggingface-model.mjs", configPath], {
      env: {
        ...process.env,
        OPENCLAW_MODEL: "huggingface/google/gemma-4-26B-A4B-it",
      },
    });

    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(config.models.providers.huggingface).toMatchObject({
      baseUrl: "https://router.huggingface.co/v1",
      api: "openai-completions",
      models: [
        {
          id: "google/gemma-4-26B-A4B-it",
          input: ["text", "image"],
          contextWindow: 262144,
          maxTokens: 8192,
          api: "openai-completions",
        },
      ],
    });
  });

  it("does nothing for non-Hugging Face model refs", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-hf-model-"));
    const configPath = path.join(dir, "openclaw.json");
    await fs.writeFile(configPath, "{}");

    await execFileAsync("node", ["scripts/configure-huggingface-model.mjs", configPath], {
      env: {
        ...process.env,
        OPENCLAW_MODEL: "openai/gpt-5.5",
      },
    });

    await expect(fs.readFile(configPath, "utf8")).resolves.toBe("{}");
  });
});
