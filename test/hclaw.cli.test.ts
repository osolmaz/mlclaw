import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "../src/hclaw/cli.js";
import { DEFAULT_RUNTIME_IMAGE } from "../src/hclaw/runtime-image.js";
import { readManifest, readSecretEnv, writeManifest, type DeploymentManifest } from "../src/hclaw/local-config.js";
import type { HubApi, SpaceRuntime } from "../src/hclaw/hub-api.js";
import type { DockerRunner, DockerInspect, DockerRunParams } from "../src/hclaw/docker.js";
import type { BucketEntry } from "../src/hf-bucket-client/client.js";

type PromptAnswer = string | boolean;

function createPrompt(answers: PromptAnswer[], interactive = true) {
  const notes: Array<{ message: string; title?: string }> = [];
  return {
    notes,
    prompt: {
      isInteractive: () => interactive,
      intro: () => undefined,
      outro: () => undefined,
      note: (message: string, title?: string) => {
        notes.push({ message, ...(title ? { title } : {}) });
      },
      text: async () => String(answers.shift() ?? ""),
      password: async () => String(answers.shift() ?? ""),
      confirm: async () => Boolean(answers.shift()),
      cancel: () => undefined,
    },
  };
}

function createFakeHub(opts: { acknowledgeHandoff?: boolean } = {}) {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const variables = new Map<string, { value?: string }>();
  const secrets = new Map<string, { key: string }>();
  const bucketObjects = new Map<string, string>();
  const bucketClient = {
    async uploadFiles(files: Array<{ path: string; content: Blob }>) {
      calls.push({ name: "bucket.uploadFiles", args: [files.map((file) => file.path)] });
      for (const file of files) {
        const text = await file.content.text();
        bucketObjects.set(file.path, text);
        if (file.path === "openclaw-state/runtime/handoff-request.json" && opts.acknowledgeHandoff !== false) {
          const request = JSON.parse(text) as { requestId: string; agent: string; runtimeId: string };
          bucketObjects.set("openclaw-state/runtime/handoff-ack.json", JSON.stringify({
            schemaVersion: 1,
            requestId: request.requestId,
            agent: request.agent,
            runtimeId: request.runtimeId,
            gatewayLocation: request.runtimeId.startsWith("local-") ? "local" : "space",
            completedAt: "2026-06-16T00:00:01.000Z",
            lastSnapshotId: "openclaw-state/snapshots/state-test.tar.zst",
          }));
        }
      }
    },
    async deleteFiles(paths: string[]) {
      calls.push({ name: "bucket.deleteFiles", args: [paths] });
      for (const file of paths) {
        bucketObjects.delete(file);
      }
    },
    async downloadFile(file: string) {
      calls.push({ name: "bucket.downloadFile", args: [file] });
      const value = bucketObjects.get(file);
      return value ? new Blob([value]) : null;
    },
    async listFiles() {
      return [...bucketObjects.keys()].map((path) => ({ path, size: 0, type: "file" as const })) satisfies BucketEntry[];
    },
    async assertBucketAccessible() {
      calls.push({ name: "bucket.assertBucketAccessible", args: [] });
    },
  };
  const hub = {
    calls,
    bucketObjects,
    bucket() {
      calls.push({ name: "bucket", args: [] });
      return bucketClient;
    },
    async whoami() {
      calls.push({ name: "whoami", args: [] });
      return { name: "alice" };
    },
    async createBucket(...args: unknown[]) {
      calls.push({ name: "createBucket", args });
    },
    async createDockerSpace(...args: unknown[]) {
      calls.push({ name: "createDockerSpace", args });
    },
    async addSpaceVariable(repoId: string, key: string, value: string) {
      calls.push({ name: "addSpaceVariable", args: [repoId, key, value] });
      variables.set(key, { value });
    },
    async deleteSpaceVariable(repoId: string, key: string) {
      calls.push({ name: "deleteSpaceVariable", args: [repoId, key] });
      variables.delete(key);
    },
    async getSpaceVariables() {
      calls.push({ name: "getSpaceVariables", args: [] });
      return variables;
    },
    async addSpaceSecret(repoId: string, key: string, value: string) {
      calls.push({ name: "addSpaceSecret", args: [repoId, key, value] });
      secrets.set(key, { key });
    },
    async getSpaceSecrets() {
      calls.push({ name: "getSpaceSecrets", args: [] });
      return secrets;
    },
    async restartSpace(...args: unknown[]) {
      calls.push({ name: "restartSpace", args });
      const agent = variables.get("OPENCLAW_AGENT_NAME")?.value ?? "research";
      const bucket = variables.get("OPENCLAW_HF_STATE_BUCKET")?.value ?? "alice/research-data";
      bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
        schemaVersion: 1,
        agent,
        runtimeId: variables.get("HUGGINGCLAW_RUNTIME_ID")?.value ?? `space-${agent}`,
        gatewayLocation: variables.get("HUGGINGCLAW_GATEWAY_LOCATION")?.value ?? "space",
        runtimeImage: variables.get("HUGGINGCLAW_RUNTIME_IMAGE")?.value ?? DEFAULT_RUNTIME_IMAGE,
        startedAt: "2026-06-16T00:00:00.000Z",
        lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
        lastSnapshotId: `${bucket}/snapshot.tar.zst`,
      }));
    },
    async pauseSpace(...args: unknown[]) {
      calls.push({ name: "pauseSpace", args });
      return { stage: "PAUSED", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: -1 };
    },
    async getSpaceRuntime(): Promise<SpaceRuntime> {
      calls.push({ name: "getSpaceRuntime", args: [] });
      return { stage: "RUNNING", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: -1 };
    },
    async fetchSpaceLogs() {
      calls.push({ name: "fetchSpaceLogs", args: [] });
      return "restored snapshot\nsnapshot 2026 uploaded";
    },
    async assertBucketAccessible(...args: unknown[]) {
      calls.push({ name: "assertBucketAccessible", args });
    },
    async requestSpaceHardware(...args: unknown[]) {
      calls.push({ name: "requestSpaceHardware", args });
      return { stage: "RUNNING", hardware: args[1], requested_hardware: args[1], sleep_time: args[2] as number };
    },
    async setSpaceSleepTime(...args: unknown[]) {
      calls.push({ name: "setSpaceSleepTime", args });
      return { stage: "RUNNING", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: args[1] as number };
    },
  };
  return hub as typeof hub & HubApi;
}

async function createRuntime(hub: HubApi, prompt: ReturnType<typeof createPrompt>["prompt"], stderr: string[] = []) {
  const docker = createFakeDocker();
  const configRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hclaw-cli-test-"));
  return {
    env: {},
    stdout: { log: () => undefined },
    stderr: { error: (message: unknown) => stderr.push(String(message)) },
    readToken: async () => "hf_test_token",
    hubFactory: () => hub,
    pushTemplateToSpace: async () => ({ templateRev: "test-template" }),
    getTelegramBot: async () => ({
      id: 1,
      is_bot: true,
      first_name: "Research",
      username: "research_bot",
    }),
    dockerRunner: docker,
    configRoot,
    now: () => new Date("2026-06-16T00:00:00.000Z"),
    prompt,
  };
}

function createFakeDocker(): DockerRunner & { calls: Array<{ name: string; args: unknown[] }>; inspectValue: DockerInspect | null } {
  return {
    calls: [],
    inspectValue: null,
    async pull(...args: unknown[]) {
      this.calls.push({ name: "pull", args });
    },
    async run(params: DockerRunParams) {
      this.calls.push({ name: "run", args: [params] });
      this.inspectValue = { exists: true, running: true, status: "running", image: params.image };
    },
    async start(...args: unknown[]) {
      this.calls.push({ name: "start", args });
      this.inspectValue = { exists: true, running: true, status: "running" };
    },
    async stop(...args: unknown[]) {
      this.calls.push({ name: "stop", args });
      this.inspectValue = { exists: true, running: false, status: "exited" };
    },
    async rm(...args: unknown[]) {
      this.calls.push({ name: "rm", args });
      this.inspectValue = null;
    },
    async disableRestart(...args: unknown[]) {
      this.calls.push({ name: "disableRestart", args });
    },
    async logs(...args: unknown[]) {
      this.calls.push({ name: "logs", args });
      return "logs";
    },
    async inspect(...args: unknown[]) {
      this.calls.push({ name: "inspect", args });
      return this.inspectValue;
    },
  };
}

describe("hclaw CLI", () => {
  it("runs bootstrap as local gateway by default", async () => {
    const hub = createFakeHub();
    const { prompt, notes } = createPrompt(["telegram-token", "7216393410"]);

    const runtime = await createRuntime(hub, prompt);
    const code = await main(["--gateway-token", "gateway-token", "--no-pull"], runtime);

    expect(code).toBe(0);
    expect(notes).toEqual([]);
    expect(hub.calls).toContainEqual({ name: "createBucket", args: ["alice/research-data", true] });
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    expect(runtime.dockerRunner.calls).toContainEqual({
      name: "run",
      args: [
        expect.objectContaining({
          containerName: "huggingclaw-research",
          image: DEFAULT_RUNTIME_IMAGE,
        }),
      ],
    });
    const manifest = await readManifest(runtime.configRoot, "research");
    expect(manifest.localRuntimeId).toMatch(/^local-research-[a-f0-9]{16}$/);
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      HUGGINGCLAW_RUNTIME_ID: manifest.localRuntimeId,
    });
  });

  it("pulls the runtime image by default for a new local gateway", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "7216393410"]);
    const runtime = await createRuntime(hub, prompt);

    const code = await main(["--gateway-token", "gateway-token"], runtime);

    expect(code).toBe(0);
    expect(runtime.dockerRunner.calls).toContainEqual({
      name: "pull",
      args: [DEFAULT_RUNTIME_IMAGE],
    });
  });

  it("does not rewrite local config when bootstrap is blocked by a live Space lease", async () => {
    const hub = createFakeHub();
    hub.bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "research",
      runtimeId: "space-research",
      gatewayLocation: "space",
      runtimeImage: "example/runtime:old",
      startedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
    }) + "\n");
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    const original: DeploymentManifest = {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-original",
      gatewayLocation: "space" as const,
      model: "old-model",
      runtimeImage: "example/runtime:old",
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
    };
    await writeManifest(runtime.configRoot, original);

    const code = await main([
      "bootstrap",
      "--name",
      "research",
      "--telegram-token",
      "telegram-token",
      "--telegram-user-id",
      "7216393410",
      "--gateway-token",
      "gateway-token",
      "--no-pull",
    ], runtime);

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("another gateway appears active");
    await expect(readManifest(runtime.configRoot, "research")).resolves.toEqual(original);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("blocks Space bootstrap when a local gateway lease is live", async () => {
    const hub = createFakeHub();
    hub.bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "research",
      runtimeId: "local-research-existing",
      gatewayLocation: "local",
      runtimeImage: "example/runtime:old",
      startedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
    }) + "\n");
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    const code = await main([
      "bootstrap",
      "--gateway",
      "space",
      "--telegram-token",
      "telegram-token",
      "--telegram-user-id",
      "7216393410",
      "--gateway-token",
      "gateway-token",
      "--yes",
    ], runtime);

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("another gateway appears active");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    await expect(readManifest(runtime.configRoot, "research")).rejects.toThrow();
  });

  it("runs bootstrap as Space gateway when requested and prompts for paid hardware", async () => {
    const hub = createFakeHub();
    const { prompt, notes } = createPrompt(["telegram-token", "7216393410", true]);

    const code = await main(["bootstrap", "--gateway", "space", "--gateway-token", "gateway-token"], await createRuntime(hub, prompt));

    expect(code).toBe(0);
    expect(notes).toEqual([
      expect.objectContaining({
        title: "Cost warning",
        message: expect.stringContaining("cpu-upgrade at $0.03/hour"),
      }),
    ]);
    expect(hub.calls).toContainEqual({ name: "createBucket", args: ["alice/research-data", true] });
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: [
        "alice/research",
        {
          private: true,
          hardware: "cpu-upgrade",
          sleepTimeSeconds: -1,
        },
      ],
    });
    expect(hub.calls).toContainEqual({
      name: "requestSpaceHardware",
      args: ["alice/research", "cpu-upgrade", -1],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "HUGGINGCLAW_GATEWAY_LOCATION", "space"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "TELEGRAM_BOT_TOKEN", "telegram-token"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "TELEGRAM_ALLOWED_USERS", "7216393410"],
    });
  });

  it("fails non-interactive Space bootstrap without paid hardware consent", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];

    const code = await main([
      "bootstrap",
      "--gateway",
      "space",
      "--telegram-token",
      "telegram-token",
      "--telegram-user-id",
      "7216393410",
      "--gateway-token",
      "gateway-token",
    ], await createRuntime(hub, prompt, stderr));

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("paid Hugging Face Space hardware requires explicit consent");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("fails non-interactive bootstrap without Telegram token", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];

    const code = await main([
      "bootstrap",
      "--telegram-user-id",
      "7216393410",
      "--gateway-token",
      "gateway-token",
    ], await createRuntime(hub, prompt, stderr));

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("Telegram bot token is required");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("updates Space hardware settings through the Hugging Face settings API", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);

    const code = await main([
      "settings",
      "alice/research",
      "--hardware",
      "cpu-upgrade",
      "--sleep-time",
      "-1",
      "--yes",
    ], await createRuntime(hub, prompt));

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "requestSpaceHardware",
      args: ["alice/research", "cpu-upgrade", -1],
    });
  });

  it("rejects settings gateway changes so migrations stay state-safe", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];

    const code = await main([
      "settings",
      "research",
      "--gateway",
      "local",
    ], await createRuntime(hub, prompt, stderr));

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("gateway location changes must use `hclaw gateway migrate`");
  });

  it("preserves the configured Space runtime image during update", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_TEMPLATE_REV", "old-template");
    await hub.addSpaceVariable("alice/research", "HUGGINGCLAW_RUNTIME_IMAGE", "registry.example/huggingclaw:test");
    const { prompt } = createPrompt([]);
    const baseRuntime = await createRuntime(hub, prompt);
    const pushed: Array<{ runtimeImage: string | undefined }> = [];
    const runtime = {
      ...baseRuntime,
      pushTemplateToSpace: async (params: { runtimeImage?: string }) => {
        pushed.push({ runtimeImage: params.runtimeImage });
        return { templateRev: "test-template" };
      },
    };

    const code = await main(["update", "alice/research"], runtime);

    expect(code).toBe(0);
    expect(pushed).toEqual([{ runtimeImage: "registry.example/huggingclaw:test" }]);
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "HUGGINGCLAW_RUNTIME_IMAGE", "registry.example/huggingclaw:test"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "HUGGINGCLAW_GATEWAY_LOCATION", "space"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "HUGGINGCLAW_RUNTIME_ID", "space-research"],
    });
  });

  it("migrates local to Space and back without starting both gateways", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "7216393410"]);
    const runtime = await createRuntime(hub, prompt);

    await expect(main(["bootstrap", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(main([
      "gateway",
      "migrate",
      "research",
      "--to",
      "space",
      "--yes",
    ], runtime)).resolves.toBe(0);

    const disableRestartIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "disableRestart");
    const stopIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "stop");
    const localHandoffIndex = hub.calls.findIndex((call) =>
      call.name === "bucket.uploadFiles" &&
      Array.isArray(call.args[0]) &&
      call.args[0].includes("openclaw-state/runtime/handoff-request.json")
    );
    const createSpaceIndex = hub.calls.findIndex((call) => call.name === "createDockerSpace");
    expect(disableRestartIndex).toBeGreaterThanOrEqual(0);
    expect(stopIndex).toBeGreaterThanOrEqual(0);
    expect(stopIndex).toBeGreaterThan(disableRestartIndex);
    expect(localHandoffIndex).toBeGreaterThanOrEqual(0);
    expect(createSpaceIndex).toBeGreaterThan(localHandoffIndex);
    expect(hub.calls).toContainEqual({ name: "createDockerSpace", args: ["alice/research", expect.any(Object)] });
    expect(hub.calls).toContainEqual({ name: "restartSpace", args: ["alice/research", true] });

    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(main([
      "gateway",
      "migrate",
      "research",
      "--to",
      "local",
      "--no-pull",
    ], runtime)).resolves.toBe(0);

    const disableIndex = hub.calls.findIndex((call) =>
      call.name === "addSpaceVariable" &&
      call.args[1] === "HUGGINGCLAW_GATEWAY_DISABLED" &&
      call.args[2] === "1"
    );
    const handoffIndex = hub.calls.findIndex((call) =>
      call.name === "bucket.uploadFiles" &&
      Array.isArray(call.args[0]) &&
      call.args[0].includes("openclaw-state/runtime/handoff-request.json")
    );
    const pauseIndex = hub.calls.findIndex((call) => call.name === "pauseSpace");
    const removeIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "rm");
    const startIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "run");
    expect(disableIndex).toBeGreaterThanOrEqual(0);
    expect(handoffIndex).toBeGreaterThan(disableIndex);
    expect(pauseIndex).toBeGreaterThan(handoffIndex);
    expect(removeIndex).toBeGreaterThanOrEqual(0);
    expect(startIndex).toBeGreaterThan(removeIndex);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "start")).toBe(false);
  });
});
