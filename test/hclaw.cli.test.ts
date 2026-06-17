import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, LOCAL_LIVE_DIR, LOCAL_VOLUME_MOUNT_PATH, main } from "../src/hclaw/cli.js";
import { DEFAULT_RUNTIME_IMAGE } from "../src/hclaw/runtime-image.js";
import { readManifest, readSecretEnv, writeManifest, writeSecretEnv, type DeploymentManifest } from "../src/hclaw/local-config.js";
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

function createFakeHub(opts: {
  acknowledgeHandoff?: boolean;
  ackCompletedAt?: string;
  downloadFileError?: Error;
  spaceRuntime?: SpaceRuntime;
} = {}) {
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
        if (file.path.endsWith("/runtime/handoff-request.json") && opts.acknowledgeHandoff !== false) {
          const prefix = file.path.slice(0, -"/runtime/handoff-request.json".length);
          const request = JSON.parse(text) as { requestId: string; agent: string; runtimeId: string };
          bucketObjects.set(`${prefix}/runtime/handoff-ack.json`, JSON.stringify({
            schemaVersion: 1,
            requestId: request.requestId,
            agent: request.agent,
            runtimeId: request.runtimeId,
            gatewayLocation: request.runtimeId.startsWith("local-") ? "local" : "space",
            completedAt: opts.ackCompletedAt ?? "2026-06-16T00:00:01.000Z",
            lastSnapshotId: `${prefix}/snapshots/state-test.tar.zst`,
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
      if (opts.downloadFileError) {
        throw opts.downloadFileError;
      }
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
      const prefix = variables.get("OPENCLAW_HF_STATE_PREFIX")?.value ?? "openclaw-state";
      bucketObjects.set(`${prefix}/runtime/status.json`, JSON.stringify({
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
      return opts.spaceRuntime ?? { stage: "RUNNING", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: -1 };
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
    async rmVolume(...args: unknown[]) {
      this.calls.push({ name: "rmVolume", args });
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
          volumeMountPath: LOCAL_VOLUME_MOUNT_PATH,
          liveDir: LOCAL_LIVE_DIR,
        }),
      ],
    });
    expect(runtime.dockerRunner.calls.find((call) => call.name === "run")?.args[0]).not.toHaveProperty("port");
    const manifest = await readManifest(runtime.configRoot, "research");
    expect(manifest.localRuntimeId).toMatch(/^local-research-[a-f0-9]{16}$/);
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      HUGGINGFACE_HUB_TOKEN: "hf_test_token",
      HUGGINGCLAW_RUNTIME_ID: manifest.localRuntimeId,
      HF_TOKEN: "hf_test_token",
      OPENCLAW_MODEL: DEFAULT_MODEL,
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

  it("refreshes a running local gateway without changing its runtime id", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([
      "telegram-token",
      "7216393410",
      "telegram-token",
      "7216393410",
    ]);
    const runtime = await createRuntime(hub, prompt);

    await expect(main(["--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
    const original = await readManifest(runtime.configRoot, "research");
    hub.bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "research",
      runtimeId: original.localRuntimeId,
      gatewayLocation: "local",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      startedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
    }) + "\n");
    runtime.dockerRunner.calls.length = 0;

    await expect(main([
      "bootstrap",
      "--name",
      "research",
      "--gateway-token",
      "gateway-token",
    ], runtime)).resolves.toBe(0);

    const refreshed = await readManifest(runtime.configRoot, "research");
    expect(refreshed.localRuntimeId).toBe(original.localRuntimeId);
    expect(runtime.dockerRunner.calls.map((call) => call.name)).toEqual([
      "inspect",
      "pull",
      "stop",
      "rm",
      "run",
    ]);
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      HUGGINGCLAW_RUNTIME_ID: original.localRuntimeId,
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

  it("uses the current runtime image during update by default", async () => {
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
    expect(pushed).toEqual([{ runtimeImage: DEFAULT_RUNTIME_IMAGE }]);
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "HUGGINGCLAW_RUNTIME_IMAGE", DEFAULT_RUNTIME_IMAGE],
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

  it("honors an explicit runtime image override during update", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_TEMPLATE_REV", "old-template");
    await hub.addSpaceVariable("alice/research", "HUGGINGCLAW_RUNTIME_IMAGE", "registry.example/huggingclaw:old");
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

    const code = await main(["update", "alice/research", "--runtime-image", "registry.example/huggingclaw:new"], runtime);

    expect(code).toBe(0);
    expect(pushed).toEqual([{ runtimeImage: "registry.example/huggingclaw:new" }]);
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "HUGGINGCLAW_RUNTIME_IMAGE", "registry.example/huggingclaw:new"],
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
    const removeVolumeIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "rmVolume");
    const startIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "run");
    expect(disableIndex).toBeGreaterThanOrEqual(0);
    expect(handoffIndex).toBeGreaterThanOrEqual(0);
    expect(disableIndex).toBeGreaterThan(handoffIndex);
    expect(pauseIndex).toBeGreaterThan(disableIndex);
    expect(removeIndex).toBeGreaterThanOrEqual(0);
    expect(removeVolumeIndex).toBeGreaterThan(removeIndex);
    expect(startIndex).toBeGreaterThan(removeVolumeIndex);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "start")).toBe(false);
  });

  it("reads runtime leases from the configured bucket prefix", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stdout: string[] = [];
    const runtime = {
      ...await createRuntime(hub, prompt),
      stdout: { log: (message: unknown) => stdout.push(String(message)) },
    };
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "local",
      model: "test-model",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    await writeSecretEnv(runtime.configRoot, "research", {
      OPENCLAW_HF_STATE_PREFIX: "custom/prefix",
    });
    hub.bucketObjects.set("custom/prefix/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "research",
      runtimeId: "local-research-existing",
      gatewayLocation: "local",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      startedAt: "2026-06-16T00:00:00.000Z",
      lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
    }) + "\n");

    await expect(main(["gateway", "status", "research"], runtime)).resolves.toBe(0);

    expect(stdout.join("\n")).toContain("Lease: local local-research-existing heartbeat 2026-06-16T00:00:01.000Z");
    expect(hub.calls).toContainEqual({
      name: "bucket.downloadFile",
      args: ["custom/prefix/runtime/status.json"],
    });
  });

  it("does not let ambient bucket prefix change an existing deployment", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stdout: string[] = [];
    const runtime = {
      ...await createRuntime(hub, prompt),
      env: { OPENCLAW_HF_STATE_PREFIX: "wrong/prefix" },
      stdout: { log: (message: unknown) => stdout.push(String(message)) },
    };
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "local",
      model: "test-model",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    hub.bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "research",
      runtimeId: "local-research-existing",
      gatewayLocation: "local",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      startedAt: "2026-06-16T00:00:00.000Z",
      lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
    }) + "\n");

    await expect(main(["gateway", "status", "research"], runtime)).resolves.toBe(0);

    expect(stdout.join("\n")).toContain("Lease: local local-research-existing heartbeat 2026-06-16T00:00:01.000Z");
    expect(hub.calls).toContainEqual({
      name: "bucket.downloadFile",
      args: ["openclaw-state/runtime/status.json"],
    });
    expect(hub.calls).not.toContainEqual({
      name: "bucket.downloadFile",
      args: ["wrong/prefix/runtime/status.json"],
    });
  });

  it("migrates with a custom bucket prefix and clock-skewed handoff ack", async () => {
    const hub = createFakeHub({ ackCompletedAt: "2026-06-15T23:59:59.000Z" });
    const { prompt } = createPrompt(["telegram-token", "7216393410"]);
    const runtime = await createRuntime(hub, prompt);

    await expect(main(["bootstrap", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
    await writeSecretEnv(runtime.configRoot, "research", {
      ...await readSecretEnv(runtime.configRoot, "research"),
      OPENCLAW_HF_STATE_PREFIX: "custom/prefix",
    });
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

    expect(hub.calls.some((call) =>
      call.name === "bucket.uploadFiles" &&
      Array.isArray(call.args[0]) &&
      call.args[0].includes("custom/prefix/runtime/handoff-request.json")
    )).toBe(true);
    expect(hub.calls.some((call) =>
      call.name === "bucket.downloadFile" &&
      call.args[0] === "openclaw-state/runtime/handoff-ack.json"
    )).toBe(false);
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "OPENCLAW_HF_STATE_PREFIX", "custom/prefix"],
    });
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(true);
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(true);
  });

  it("blocks local to Space migration when another live runtime owns the lease", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "7216393410"]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    await expect(main(["bootstrap", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;
    hub.bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "research",
      runtimeId: "space-someone-else",
      gatewayLocation: "space",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      startedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
    }) + "\n");

    await expect(main([
      "gateway",
      "migrate",
      "research",
      "--to",
      "space",
      "--yes",
    ], runtime)).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("another gateway appears active");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("blocks Space to local migration when another live runtime owns the lease", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "7216393410"]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    await expect(main(["bootstrap", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
    await expect(main([
      "gateway",
      "migrate",
      "research",
      "--to",
      "space",
      "--yes",
    ], runtime)).resolves.toBe(0);
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;
    hub.bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "research",
      runtimeId: "space-someone-else",
      gatewayLocation: "space",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      startedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date().toISOString(),
    }) + "\n");

    await expect(main([
      "gateway",
      "migrate",
      "research",
      "--to",
      "local",
      "--no-pull",
    ], runtime)).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("another gateway appears active");
    expect(hub.calls.some((call) =>
      call.name === "addSpaceVariable" &&
      call.args[1] === "HUGGINGCLAW_GATEWAY_DISABLED"
    )).toBe(false);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("stops an already paused Space gateway without waiting for handoff ack", async () => {
    const hub = createFakeHub({
      acknowledgeHandoff: false,
      spaceRuntime: { stage: "PAUSED", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: -1 },
    });
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "space",
      model: "test-model",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(main(["gateway", "stop", "research"], runtime)).resolves.toBe(0);

    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "HUGGINGCLAW_GATEWAY_DISABLED", "1"],
    });
    expect(hub.calls.some((call) =>
      call.name === "bucket.uploadFiles" &&
      Array.isArray(call.args[0]) &&
      call.args[0].includes("openclaw-state/runtime/handoff-request.json")
    )).toBe(false);
    expect(hub.calls).toContainEqual({ name: "pauseSpace", args: ["alice/research"] });
  });

  it("waits for a final Space snapshot while the Space is RUNNING_BUILDING", async () => {
    const hub = createFakeHub({
      spaceRuntime: { stage: "RUNNING_BUILDING", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: -1 },
    });
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "space",
      model: "test-model",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    hub.bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "research",
      runtimeId: "space-research",
      gatewayLocation: "space",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      startedAt: "2026-06-16T00:00:00.000Z",
      lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
    }) + "\n");

    await expect(main(["gateway", "stop", "research"], runtime)).resolves.toBe(0);

    const disableIndex = hub.calls.findIndex((call) =>
      call.name === "addSpaceVariable" &&
      call.args[1] === "HUGGINGCLAW_GATEWAY_DISABLED"
    );
    const handoffIndex = hub.calls.findIndex((call) =>
      call.name === "bucket.uploadFiles" &&
      Array.isArray(call.args[0]) &&
      call.args[0].includes("openclaw-state/runtime/handoff-request.json")
    );
    const pauseIndex = hub.calls.findIndex((call) => call.name === "pauseSpace");
    expect(disableIndex).toBeGreaterThanOrEqual(0);
    expect(handoffIndex).toBeGreaterThanOrEqual(0);
    expect(disableIndex).toBeGreaterThan(handoffIndex);
    expect(pauseIndex).toBeGreaterThan(disableIndex);
  });

  it("does not pause a Space gateway when the runtime lease is unreadable", async () => {
    const hub = createFakeHub({ downloadFileError: new Error("bucket read failed") });
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "space",
      model: "test-model",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(main(["gateway", "stop", "research"], runtime)).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("bucket read failed");
    expect(hub.calls.some((call) =>
      call.name === "addSpaceVariable" &&
      call.args[1] === "HUGGINGCLAW_GATEWAY_DISABLED"
    )).toBe(false);
    expect(hub.calls.some((call) => call.name === "pauseSpace")).toBe(false);
  });
});
