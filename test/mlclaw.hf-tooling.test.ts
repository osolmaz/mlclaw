import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { seedHuggingFaceTooling } from "../src/hf-tooling/seed.js";

const BASELINE_SKILLS = [
  "hf-cli",
  "huggingface-spaces",
  "huggingface-datasets",
  "huggingface-local-models",
  "huggingface-best",
  "hf-mem",
  "huggingface-tool-builder",
  "huggingface-papers",
  "huggingface-gradio",
  "huggingface-zerogpu",
];

const OPTIONAL_ONLY_SKILLS = [
  "hf-cloud-aws-context-discovery",
  "hf-cloud-python-env-setup",
  "hf-cloud-sagemaker-deployment-planner",
  "hf-cloud-sagemaker-iam-preflight",
  "hf-cloud-sagemaker-production-defaults",
  "hf-cloud-serving-image-selection",
  "huggingface-community-evals",
  "huggingface-llm-trainer",
  "huggingface-lora-space-builder",
  "huggingface-paper-publisher",
  "huggingface-trackio",
  "huggingface-vision-trainer",
  "train-sentence-transformers",
  "transformers-js",
  "trl-training",
];

describe("Hugging Face tooling baseline", () => {
  it("vendors the expected baseline skills and excludes optional pack skills", async () => {
    const manifest = JSON.parse(await fs.readFile("assets/hf-tooling/manifest.json", "utf8")) as {
      skills: { installed: string[] };
    };

    expect(manifest.skills.installed).toEqual(BASELINE_SKILLS);
    for (const skill of BASELINE_SKILLS) {
      await expect(fs.access(path.join("assets/hf-tooling/skills", skill, "SKILL.md"))).resolves.toBeUndefined();
    }
    for (const skill of OPTIONAL_ONLY_SKILLS) {
      await expect(fs.access(path.join("assets/hf-tooling/skills", skill, "SKILL.md"))).rejects.toMatchObject({
        code: "ENOENT",
      });
    }
  });

  it("seeds skills, templates, examples, and a stable manifest without overwriting existing skills", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-hf-tooling-"));
    const workspaceDir = path.join(root, "workspace");
    const existingSkill = path.join(workspaceDir, ".agents/skills/hf-cli");
    await fs.mkdir(existingSkill, { recursive: true });
    await fs.writeFile(path.join(existingSkill, "SKILL.md"), "# User customized hf-cli\n", "utf8");

    const first = await seedHuggingFaceTooling({
      assetRoot: path.resolve("assets/hf-tooling"),
      workspaceDir,
      now: () => new Date("2026-07-09T00:00:00.000Z"),
    });

    expect(first.skippedSkills).toContain("hf-cli");
    expect(first.copiedSkills).toEqual(BASELINE_SKILLS.filter((skill) => skill !== "hf-cli"));
    expect(first.wroteManifest).toBe(true);
    await expect(fs.readFile(path.join(existingSkill, "SKILL.md"), "utf8")).resolves.toBe("# User customized hf-cli\n");
    await expect(fs.access(path.join(workspaceDir, ".agents/mcp/huggingface.json"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(workspaceDir, "examples/huggingface/README.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(workspaceDir, ".env.example"))).resolves.toBeUndefined();

    const rawManifest = await fs.readFile(path.join(workspaceDir, ".agents/.mlclaw-hf-tooling.json"), "utf8");
    expect(rawManifest).toContain("\"installedAt\": \"2026-07-09T00:00:00.000Z\"");
    expect(rawManifest).toContain("\"hf-discover\"");
    expect(rawManifest).toContain("\"uv\"");

    const second = await seedHuggingFaceTooling({
      assetRoot: path.resolve("assets/hf-tooling"),
      workspaceDir,
      now: () => new Date("2026-07-10T00:00:00.000Z"),
    });

    expect(second.copiedSkills).toEqual([]);
    expect(second.wroteManifest).toBe(false);
    await expect(fs.readFile(path.join(workspaceDir, ".agents/.mlclaw-hf-tooling.json"), "utf8")).resolves.toBe(rawManifest);
  });
});
