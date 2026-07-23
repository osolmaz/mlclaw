import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  seedHuggingFaceTooling,
  waitForBootstrapAndSeedHuggingFaceTooling,
} from "../src/hf-tooling/seed.js";

const BASELINE_SKILLS = [
  "hf-broker",
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
      skills: { installed: string[]; managed: Array<{ name: string; revision: string }> };
    };

    expect(manifest.skills.installed).toEqual(BASELINE_SKILLS);
    expect(manifest.skills.managed).toContainEqual({
      name: "hf-broker",
      source: "https://github.com/osolmaz/brokerkit",
      revision: "hf-broker/v0.6.0",
    });
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
    const existingWorkspaceSkill = path.join(workspaceDir, "skills/hf-cli");
    await fs.mkdir(existingSkill, { recursive: true });
    await fs.writeFile(path.join(existingSkill, "SKILL.md"), "# User customized hf-cli\n", "utf8");
    await fs.mkdir(existingWorkspaceSkill, { recursive: true });
    await fs.writeFile(path.join(existingWorkspaceSkill, "SKILL.md"), "# User workspace hf-cli\n", "utf8");

    const first = await seedHuggingFaceTooling({
      assetRoot: path.resolve("assets/hf-tooling"),
      workspaceDir,
      now: () => new Date("2026-07-09T00:00:00.000Z"),
    });

    expect(first.skippedSkills).toContain("hf-cli");
    expect(first.copiedSkills).toEqual(BASELINE_SKILLS.filter((skill) => skill !== "hf-cli"));
    expect(first.skippedWorkspaceSkills).toContain("hf-cli");
    expect(first.copiedWorkspaceSkills).toEqual(BASELINE_SKILLS.filter((skill) => skill !== "hf-cli"));
    expect(first.wroteContextFile).toBe(true);
    expect(first.wroteManifest).toBe(true);
    await expect(fs.readFile(path.join(existingSkill, "SKILL.md"), "utf8")).resolves.toBe("# User customized hf-cli\n");
    await expect(fs.readFile(path.join(existingWorkspaceSkill, "SKILL.md"), "utf8")).resolves.toBe("# User workspace hf-cli\n");
    await expect(fs.access(path.join(workspaceDir, "skills/huggingface-spaces/SKILL.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(workspaceDir, ".agents/skills/huggingface-spaces/SKILL.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(workspaceDir, ".agents/mcp/huggingface.json"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(workspaceDir, "examples/huggingface/README.md"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(workspaceDir, ".env.example"))).resolves.toBeUndefined();
    const agentsMd = await fs.readFile(path.join(workspaceDir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain("ML Claw Hugging Face Tooling");
    expect(agentsMd).toContain("`hf-broker`");
    expect(agentsMd).toContain("`hf-cli`");
    expect(agentsMd).toContain("`hf_grant_request`");
    expect(agentsMd).toContain("deployment state bucket");
    expect(agentsMd).toContain("`.agents/skills`");
    expect(agentsMd).toContain("`skills`");

    const rawManifest = await fs.readFile(path.join(workspaceDir, ".agents/.mlclaw-hf-tooling.json"), "utf8");
    expect(rawManifest).toContain("\"installedAt\": \"2026-07-09T00:00:00.000Z\"");
    expect(rawManifest).toContain("\"hf-discover\"");
    expect(rawManifest).toContain("\"hf_xet\": \"1.5.2\"");
    expect(rawManifest).toContain("\"uv\"");

    const second = await seedHuggingFaceTooling({
      assetRoot: path.resolve("assets/hf-tooling"),
      workspaceDir,
      now: () => new Date("2026-07-10T00:00:00.000Z"),
    });

    expect(second.copiedSkills).toEqual([]);
    expect(second.copiedWorkspaceSkills).toEqual([]);
    expect(second.wroteContextFile).toBe(false);
    expect(second.wroteManifest).toBe(false);
    await expect(fs.readFile(path.join(workspaceDir, ".agents/.mlclaw-hf-tooling.json"), "utf8")).resolves.toBe(rawManifest);
  });

  it("updates the managed AGENTS.md block without deleting user instructions", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-hf-tooling-"));
    const workspaceDir = path.join(root, "workspace");
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(
      path.join(workspaceDir, "AGENTS.md"),
      [
        "# Project Instructions",
        "",
        "Keep this user instruction.",
        "",
        "<!-- MLCLAW:HUGGINGFACE_TOOLING:START -->",
        "old block",
        "<!-- MLCLAW:HUGGINGFACE_TOOLING:END -->",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await seedHuggingFaceTooling({
      assetRoot: path.resolve("assets/hf-tooling"),
      workspaceDir,
      now: () => new Date("2026-07-09T00:00:00.000Z"),
    });

    expect(result.wroteContextFile).toBe(true);
    const agentsMd = await fs.readFile(path.join(workspaceDir, "AGENTS.md"), "utf8");
    expect(agentsMd).toContain("Keep this user instruction.");
    expect(agentsMd).toContain("ML Claw Hugging Face Tooling");
    expect(agentsMd).toContain("`huggingface-datasets`");
    expect(agentsMd).toContain("Never ask");
    expect(agentsMd).toContain("matching `hf_*` MCP tool for the operation");
    expect(agentsMd).toContain("Omit `request_id` for a new");
    expect(agentsMd).toContain("`hf_operation_list`");
    expect(agentsMd).toContain("Never reuse a request ID");
    expect(agentsMd).toContain("instead of restarting the");
    expect(agentsMd).not.toContain("old block");
  });

  it("does not modify a fresh workspace until OpenClaw records bootstrap completion", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-hf-tooling-bootstrap-"));
    const workspaceDir = path.join(root, "workspace");
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(path.join(workspaceDir, "BOOTSTRAP.md"), "Complete native setup.\n", "utf8");
    await fs.writeFile(
      path.join(workspaceDir, "openclaw-workspace-state.json"),
      `${JSON.stringify({ version: 1, bootstrapSeededAt: "2026-07-10T00:00:00.000Z" }, null, 2)}\n`,
      "utf8",
    );

    const pending = waitForBootstrapAndSeedHuggingFaceTooling({
      assetRoot: path.resolve("assets/hf-tooling"),
      workspaceDir,
      pollIntervalMs: 5,
      now: () => new Date("2026-07-10T00:01:00.000Z"),
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    await expect(fs.access(path.join(workspaceDir, "skills/hf-cli/SKILL.md"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(fs.readFile(path.join(workspaceDir, "BOOTSTRAP.md"), "utf8")).resolves.toContain(
      "Complete native setup",
    );

    await fs.rm(path.join(workspaceDir, "BOOTSTRAP.md"));
    await fs.writeFile(
      path.join(workspaceDir, "openclaw-workspace-state.json"),
      `${JSON.stringify({
        version: 1,
        bootstrapSeededAt: "2026-07-10T00:00:00.000Z",
        setupCompletedAt: "2026-07-10T00:00:30.000Z",
      }, null, 2)}\n`,
      "utf8",
    );

    const result = await pending;
    expect(result?.copiedWorkspaceSkills).toEqual(BASELINE_SKILLS);
    await expect(fs.access(path.join(workspaceDir, "skills/hf-cli/SKILL.md"))).resolves.toBeUndefined();
    await expect(fs.readFile(path.join(workspaceDir, "AGENTS.md"), "utf8")).resolves.toContain(
      "ML Claw Hugging Face Tooling",
    );
  });

  it("seeds immediately when an existing workspace has no pending bootstrap", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-hf-tooling-existing-"));
    const workspaceDir = path.join(root, "workspace");
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(path.join(workspaceDir, "IDENTITY.md"), "# Existing identity\n", "utf8");

    const result = await waitForBootstrapAndSeedHuggingFaceTooling({
      assetRoot: path.resolve("assets/hf-tooling"),
      workspaceDir,
      pollIntervalMs: 5,
    });

    expect(result?.copiedWorkspaceSkills).toEqual(BASELINE_SKILLS);
    await expect(fs.access(path.join(workspaceDir, "skills/hf-cli/SKILL.md"))).resolves.toBeUndefined();
  });
});
