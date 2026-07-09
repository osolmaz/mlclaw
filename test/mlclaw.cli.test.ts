import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, LOCAL_LIVE_DIR, LOCAL_VOLUME_MOUNT_PATH, main } from "../src/mlclaw/cli.js";
import { DEFAULT_RUNTIME_IMAGE } from "../src/mlclaw/runtime-image.js";
import { readManifest, readSecretEnv, writeManifest, writeSecretEnv, type DeploymentManifest } from "../src/mlclaw/local-config.js";
import type { HubApi, SpaceRuntime } from "../src/mlclaw/hub-api.js";
import type { DockerRunner, DockerInspect, DockerRunParams } from "../src/mlclaw/docker.js";
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
      confirm: async () => answers.length === 0 ? true : Boolean(answers.shift()),
      cancel: () => undefined,
    },
  };
}

function createFakeHub(opts: {
  acknowledgeHandoff?: boolean;
  ackCompletedAt?: string;
  downloadFileError?: Error;
  spaceRuntime?: SpaceRuntime;
  existingBuckets?: string[];
  existingSpaces?: string[];
} = {}) {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const variables = new Map<string, { value?: string }>();
  const secrets = new Map<string, { key: string }>();
  const bucketObjects = new Map<string, string>();
  const existingBuckets = new Set(opts.existingBuckets ?? []);
  const existingSpaces = new Set(opts.existingSpaces ?? []);
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
    async listFiles(prefix = "") {
      calls.push({ name: "bucket.listFiles", args: [prefix] });
      return [...bucketObjects.keys()].map((path) => ({ path, size: 0, type: "file" as const })) satisfies BucketEntry[];
    },
    async assertBucketAccessible() {
      calls.push({ name: "bucket.assertBucketAccessible", args: [] });
    },
  };
  const hub = {
    calls,
    bucketObjects,
    bucket(bucket: string) {
      calls.push({ name: "bucket", args: [bucket] });
      return bucketClient;
    },
    async whoami() {
      calls.push({ name: "whoami", args: [] });
      return { name: "alice" };
    },
    async createBucket(...args: unknown[]) {
      calls.push({ name: "createBucket", args });
      existingBuckets.add(String(args[0]));
    },
    async createDockerSpace(...args: unknown[]) {
      calls.push({ name: "createDockerSpace", args });
      existingSpaces.add(String(args[0]));
    },
    async bucketExists(bucket: string) {
      calls.push({ name: "bucketExists", args: [bucket] });
      return existingBuckets.has(bucket);
    },
    async spaceExists(repoId: string) {
      calls.push({ name: "spaceExists", args: [repoId] });
      return existingSpaces.has(repoId);
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
        runtimeId: variables.get("MLCLAW_RUNTIME_ID")?.value ?? `space-${agent}`,
        gatewayLocation: variables.get("MLCLAW_GATEWAY_LOCATION")?.value ?? "space",
        runtimeImage: variables.get("MLCLAW_RUNTIME_IMAGE")?.value ?? DEFAULT_RUNTIME_IMAGE,
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

function seedValidStateSnapshot(hub: ReturnType<typeof createFakeHub>, prefix = "openclaw-state") {
  const snapshotPath = `${prefix}/snapshots/state-adopted.tar.zst`;
  hub.bucketObjects.set(`${prefix}/manifest.json`, JSON.stringify({
    version: 1,
    current: {
      id: "state-adopted",
      path: snapshotPath,
      createdAt: "2026-06-16T00:00:00.000Z",
      sha256: "a".repeat(64),
      sizeBytes: 12,
      runId: "run-adopted",
      bootTime: "2026-06-16T00:00:00.000Z",
    },
    previous: [],
  }) + "\n");
  hub.bucketObjects.set(snapshotPath, "snapshot-bytes");
}

async function createRuntime(hub: HubApi, prompt: ReturnType<typeof createPrompt>["prompt"], stderr: string[] = []) {
  const docker = createFakeDocker();
  const configRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-cli-test-"));
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

function createFakeDocker(): DockerRunner & {
  calls: Array<{ name: string; args: unknown[] }>;
  currentContextValue: string;
  contexts: Map<string, string>;
  inspectValue: DockerInspect | null;
} {
  return {
    calls: [],
    currentContextValue: "desktop-linux",
    contexts: new Map([["desktop-linux", "unix:///docker-desktop.sock"], ["colima", "unix:///colima.sock"]]),
    inspectValue: null,
    async currentContext() {
      return this.currentContextValue;
    },
    async contextExists(context: string) {
      return this.contexts.has(context);
    },
    async contextEndpoint(context: string) {
      return this.contexts.get(context);
    },
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

describe("mlclaw CLI", () => {
  it("runs bootstrap as an explicit local gateway", async () => {
    const hub = createFakeHub();
    const { prompt, notes } = createPrompt([]);

    const runtime = await createRuntime(hub, prompt);
    const code = await main(["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime);

    expect(code).toBe(0);
    expect(notes).toEqual([
      expect.objectContaining({
        title: "Bootstrap plan",
        message: expect.stringContaining("Bucket: alice/research-data (will be created as private)"),
      }),
    ]);
    expect(hub.calls).toContainEqual({ name: "createBucket", args: ["alice/research-data", true] });
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    expect(runtime.dockerRunner.calls).toContainEqual({
      name: "run",
      args: [
        expect.objectContaining({
          containerName: "mlclaw-research",
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
      MLCLAW_RUNTIME_ID: manifest.localRuntimeId,
      HF_TOKEN: "hf_test_token",
      OPENCLAW_MODEL: DEFAULT_MODEL,
    });
  });

  it("pulls the runtime image by default for a new local gateway", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);

    const code = await main(["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token"], runtime);

    expect(code).toBe(0);
    expect(runtime.dockerRunner.calls).toContainEqual({
      name: "pull",
      args: [DEFAULT_RUNTIME_IMAGE, "desktop-linux"],
    });
  });

  it("pins the current Docker context during local bootstrap", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    runtime.dockerRunner.currentContextValue = "colima";

    const code = await main(["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime);

    expect(code).toBe(0);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: {
        engine: "docker",
        dockerContext: "colima",
        dockerEndpoint: "unix:///colima.sock",
      },
    });
    expect(runtime.dockerRunner.calls).toContainEqual({
      name: "run",
      args: [
        expect.objectContaining({
          context: "colima",
        }),
      ],
    });
  });

  it("honors an explicit Docker context during local bootstrap", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);

    const code = await main([
      "--gateway",
      "local",
      "--name",
      "research",
      "--docker-context",
      "colima",
      "--gateway-token",
      "gateway-token",
      "--no-pull",
    ], runtime);

    expect(code).toBe(0);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: {
        dockerContext: "colima",
      },
    });
    expect(runtime.dockerRunner.calls).toContainEqual({
      name: "run",
      args: [
        expect.objectContaining({
          context: "colima",
        }),
      ],
    });
  });

  it("warns on shell Docker context mismatch but uses the pinned context", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stdout: string[] = [];
    const runtime = {
      ...await createRuntime(hub, prompt),
      stdout: { log: (message: unknown) => stdout.push(String(message)) },
    };
    runtime.dockerRunner.currentContextValue = "colima";
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
      localGateway: {
        engine: "docker",
        dockerContext: "desktop-linux",
        dockerEndpoint: "unix:///docker-desktop.sock",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(main(["gateway", "status", "research"], runtime)).resolves.toBe(0);

    expect(stdout.join("\n")).toContain("Using Docker context desktop-linux from the deployment manifest. Current shell context is colima.");
    expect(stdout.join("\n")).toContain("Docker: desktop-linux");
    expect(runtime.dockerRunner.calls).toContainEqual({
      name: "inspect",
      args: ["mlclaw-research", "desktop-linux"],
    });
  });

  it("refuses to silently change a pinned Docker context during start", async () => {
    const hub = createFakeHub();
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
      gatewayLocation: "local",
      model: "test-model",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      localGateway: {
        engine: "docker",
        dockerContext: "desktop-linux",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    const code = await main(["gateway", "start", "research", "--docker-context", "colima"], runtime);

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("Run `mlclaw gateway rebind research --docker-context colima`");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("uses an explicit bootstrap bucket as the durable state pointer", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);

    const code = await main([
      "--gateway",
      "local",
      "--name",
      "research",
      "--bucket",
      "alice/research-archive-data",
      "--gateway-token",
      "gateway-token",
      "--no-pull",
    ], runtime);

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({ name: "createBucket", args: ["alice/research-archive-data", true] });
    expect(hub.calls).not.toContainEqual({ name: "createBucket", args: ["alice/research-data", true] });
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      bucket: "alice/research-archive-data",
      space: "alice/research",
    });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      OPENCLAW_HF_STATE_BUCKET: "alice/research-archive-data",
    });
  });

  it("pins an existing manifest bucket during repeated bootstrap", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "1234567890"]);
    const runtime = await createRuntime(hub, prompt);
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/archive-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "local",
      model: "old-model",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
    });

    const code = await main([
      "bootstrap",
      "--name",
      "research",
      "--telegram-token",
      "telegram-token",
      "--telegram-user-id",
      "1234567890",
      "--gateway-token",
      "gateway-token",
      "--no-pull",
    ], runtime);

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({ name: "createBucket", args: ["alice/archive-data", true] });
    expect(hub.calls).not.toContainEqual({ name: "createBucket", args: ["alice/research-data", true] });
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      bucket: "alice/archive-data",
      localRuntimeId: "local-research-existing",
    });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      OPENCLAW_HF_STATE_BUCKET: "alice/archive-data",
      MLCLAW_RUNTIME_ID: "local-research-existing",
    });
  });

  it("requires confirmation before bootstrap changes a pinned bucket", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    const original: DeploymentManifest = {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/archive-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "local",
      model: "old-model",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-15T00:00:00.000Z",
      updatedAt: "2026-06-15T00:00:00.000Z",
    };
    await writeManifest(runtime.configRoot, original);

    const code = await main([
      "bootstrap",
      "--name",
      "research",
      "--bucket",
      "alice/new-data",
      "--telegram-token",
      "telegram-token",
      "--telegram-user-id",
      "1234567890",
      "--gateway-token",
      "gateway-token",
      "--no-pull",
    ], runtime);

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("bootstrap confirmation required. Pass --yes to continue non-interactively.");
    await expect(readManifest(runtime.configRoot, "research")).resolves.toEqual(original);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("refreshes a running local gateway without changing its runtime id", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);

    await expect(main(["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
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
      MLCLAW_RUNTIME_ID: original.localRuntimeId,
    });
  });

  it("does not rewrite local config when bootstrap is blocked by a live Space lease", async () => {
    const hub = createFakeHub();
    hub.bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "research",
      runtimeId: "space-someone-else",
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
      "1234567890",
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
      "1234567890",
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
    const { prompt, notes } = createPrompt([true]);

    const code = await main([
      "bootstrap",
      "--gateway",
      "space",
      "--name",
      "research",
      "--telegram-token",
      "telegram-token",
      "--telegram-user-id",
      "1234567890",
    ], await createRuntime(hub, prompt));

    expect(code).toBe(0);
    expect(notes).toEqual([
      expect.objectContaining({
        title: "Cost warning",
        message: expect.stringContaining("cpu-upgrade at $0.03/hour"),
      }),
      expect.objectContaining({
        title: "Bootstrap plan",
        message: expect.stringContaining("Space: alice/research (will be created as private)"),
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
      args: ["alice/research", "MLCLAW_GATEWAY_LOCATION", "space"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "TELEGRAM_BOT_TOKEN", "telegram-token"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "TELEGRAM_ALLOWED_USERS", "1234567890"],
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
      "1234567890",
      "--gateway-token",
      "gateway-token",
    ], await createRuntime(hub, prompt, stderr));

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("paid Hugging Face Space hardware requires explicit consent");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("rejects free Space hardware when Telegram is configured", async () => {
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
      "1234567890",
      "--hardware",
      "cpu-basic",
    ], await createRuntime(hub, prompt, stderr));

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("Telegram requires upgraded paid Space hardware");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("runs non-interactive browser Space bootstrap without Telegram", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const output: string[] = [];
    const runtime = {
      ...await createRuntime(hub, prompt, stderr),
      stdout: { log: (message: unknown) => output.push(String(message)) },
      prompt: {
        ...prompt,
        outro: (message: string) => output.push(message),
      },
    };

    const code = await main([
      "bootstrap",
      "--name",
      "research",
      "--yes",
    ], runtime);

    expect(code).toBe(0);
    expect(stderr.join("\n")).toBe("");
    expect(output.join("\n")).toContain("Agent URL: https://alice-research.hf.space");
    expect(output.join("\n")).toContain("Your agent will soon be available at https://alice-research.hf.space.");
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["alice/research", { private: true, hardware: "cpu-basic" }],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_ALLOWED_USERS", "alice"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_ADMINS", "alice"],
    });
    expect(hub.calls.some((call) => call.name === "addSpaceSecret" && call.args[1] === "TELEGRAM_BOT_TOKEN")).toBe(false);
  });

  it("shows existing bucket and Space actions before bootstrap updates resources", async () => {
    const hub = createFakeHub({
      existingBuckets: ["alice/mlclaw-data"],
      existingSpaces: ["alice/mlclaw"],
    });
    hub.bucketObjects.set("openclaw-state/runtime/status.json", JSON.stringify({
      schemaVersion: 1,
      agent: "mlclaw",
      runtimeId: "space-mlclaw",
      gatewayLocation: "space",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      startedAt: "2026-06-16T00:00:00.000Z",
      lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
    }) + "\n");
    const { prompt, notes } = createPrompt([]);
    const stdout: string[] = [];

    const code = await main([
      "bootstrap",
      "--name",
      "mlclaw",
    ], {
      ...await createRuntime(hub, prompt),
      stdout: { log: (message: unknown) => stdout.push(String(message)) },
    });

    expect(code).toBe(0);
    expect(notes).toContainEqual(expect.objectContaining({
      title: "Bootstrap plan",
      message: expect.stringContaining("Bucket: alice/mlclaw-data (exists; keeping 1 object(s))"),
    }));
    expect(notes).toContainEqual(expect.objectContaining({
      title: "Bootstrap plan",
      message: expect.stringContaining("Space: alice/mlclaw (exists; files, variables, secrets, and runtime will be updated)"),
    }));
    expect(notes).toContainEqual(expect.objectContaining({
      title: "Bootstrap plan",
      message: expect.stringContaining("Fresh deployment: use a different name, for example --name mlclaw-2"),
    }));
    expect(stdout.join("\n")).toContain("Using existing private bucket alice/mlclaw-data");
    expect(stdout.join("\n")).toContain("Updating existing Space alice/mlclaw");
    expect(hub.calls).toContainEqual({ name: "bucketExists", args: ["alice/mlclaw-data"] });
    expect(hub.calls).toContainEqual({ name: "spaceExists", args: ["alice/mlclaw"] });
    expect(hub.calls).not.toContainEqual({ name: "createBucket", args: ["alice/mlclaw-data", true] });
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["alice/mlclaw", { private: true, hardware: "cpu-basic" }],
    });
  });

  it("lets the user enter an alternative name when bootstrap resources already exist", async () => {
    const hub = createFakeHub({
      existingBuckets: ["alice/mlclaw-data"],
      existingSpaces: ["alice/mlclaw"],
    });
    const { prompt, notes } = createPrompt(["mlclaw-fresh"]);
    const runtime = await createRuntime(hub, prompt);

    const code = await main([
      "bootstrap",
      "--name",
      "mlclaw",
    ], runtime);

    expect(code).toBe(0);
    expect(notes).toContainEqual(expect.objectContaining({
      title: "Existing resources",
      message: expect.stringContaining("Enter another name for a fresh deployment"),
    }));
    expect(notes).toContainEqual(expect.objectContaining({
      title: "Bootstrap plan",
      message: expect.stringContaining("Agent: mlclaw-fresh"),
    }));
    expect(hub.calls).toContainEqual({ name: "bucketExists", args: ["alice/mlclaw-data"] });
    expect(hub.calls).toContainEqual({ name: "spaceExists", args: ["alice/mlclaw"] });
    expect(hub.calls).toContainEqual({ name: "bucketExists", args: ["alice/mlclaw-fresh-data"] });
    expect(hub.calls).toContainEqual({ name: "spaceExists", args: ["alice/mlclaw-fresh"] });
    expect(hub.calls).toContainEqual({ name: "createBucket", args: ["alice/mlclaw-fresh-data", true] });
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["alice/mlclaw-fresh", { private: true, hardware: "cpu-basic" }],
    });
    await expect(readManifest(runtime.configRoot, "mlclaw-fresh")).resolves.toMatchObject({
      agent: "mlclaw-fresh",
      bucket: "alice/mlclaw-fresh-data",
      space: "alice/mlclaw-fresh",
    });
  });

  it("can create a public browser Space when requested", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);

    const code = await main([
      "bootstrap",
      "--name",
      "research",
      "--public-space",
      "--yes",
    ], await createRuntime(hub, prompt));

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["alice/research", { private: false, hardware: "cpu-basic" }],
    });
  });

  it("allowlists the authenticated user for org-owned browser Spaces", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);

    const code = await main([
      "bootstrap",
      "--name",
      "research",
      "--owner",
      "research-org",
      "--yes",
    ], await createRuntime(hub, prompt));

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["research-org/research", { private: true, hardware: "cpu-basic" }],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["research-org/research", "MLCLAW_ALLOWED_USERS", "alice"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["research-org/research", "MLCLAW_ADMINS", "alice"],
    });
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
    expect(stderr.join("\n")).toContain("gateway location changes must use `mlclaw gateway migrate`");
  });

  it("uses the prebuilt runtime image during update by default", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_TEMPLATE_REV", "old-template");
    await hub.addSpaceVariable("alice/research", "MLCLAW_RUNTIME_IMAGE", "registry.example/mlclaw:test");
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
      args: ["alice/research", "MLCLAW_RUNTIME_IMAGE", DEFAULT_RUNTIME_IMAGE],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_GATEWAY_LOCATION", "space"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_RUNTIME_ID", "space-research"],
    });
    const allowedUsersIndex = hub.calls.findIndex((call) =>
      call.name === "addSpaceVariable" &&
      call.args[0] === "alice/research" &&
      call.args[1] === "MLCLAW_ALLOWED_USERS"
    );
    const adminsIndex = hub.calls.findIndex((call) =>
      call.name === "addSpaceVariable" &&
      call.args[0] === "alice/research" &&
      call.args[1] === "MLCLAW_ADMINS"
    );
    const restartIndex = hub.calls.findIndex((call) => call.name === "restartSpace");
    expect(allowedUsersIndex).toBeGreaterThanOrEqual(0);
    expect(adminsIndex).toBeGreaterThanOrEqual(0);
    expect(restartIndex).toBeGreaterThan(allowedUsersIndex);
    expect(restartIndex).toBeGreaterThan(adminsIndex);
  });

  it("can bundle the current Space runtime during update when requested", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_TEMPLATE_REV", "old-template");
    await hub.addSpaceVariable("alice/research", "MLCLAW_RUNTIME_IMAGE", "registry.example/mlclaw:test");
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

    const code = await main(["update", "alice/research", "--bundled-runtime"], runtime);

    expect(code).toBe(0);
    expect(pushed).toEqual([{ runtimeImage: undefined }]);
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_RUNTIME_IMAGE", "bundled:test-template"],
    });
  });

  it("honors an explicit runtime image override during update", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_TEMPLATE_REV", "old-template");
    await hub.addSpaceVariable("alice/research", "MLCLAW_RUNTIME_IMAGE", "registry.example/mlclaw:old");
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

    const code = await main(["update", "alice/research", "--runtime-image", "registry.example/mlclaw:new"], runtime);

    expect(code).toBe(0);
    expect(pushed).toEqual([{ runtimeImage: "registry.example/mlclaw:new" }]);
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_RUNTIME_IMAGE", "registry.example/mlclaw:new"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_GATEWAY_LOCATION", "space"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_RUNTIME_ID", "space-research"],
    });
  });

  it("updates the canonical template Space without deployment-only repairs", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const baseRuntime = await createRuntime(hub, prompt);
    const runtime = {
      ...baseRuntime,
      env: { MLCLAW_CANONICAL_SPACE_ID: "alice/mlclaw-template" },
      pushTemplateToSpace: async () => ({ templateRev: "test-template" }),
    };

    const code = await main(["update", "alice/mlclaw-template"], runtime);

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/mlclaw-template", "MLCLAW_TEMPLATE_REV", "test-template"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/mlclaw-template", "MLCLAW_RUNTIME_IMAGE", DEFAULT_RUNTIME_IMAGE],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/mlclaw-template", "MLCLAW_CANONICAL_SPACE_ID", "alice/mlclaw-template"],
    });
    expect(hub.calls).not.toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/mlclaw-template", "MLCLAW_GATEWAY_LOCATION", "space"],
    });
    expect(hub.calls.some((call) =>
      call.name === "addSpaceVariable" &&
      call.args[0] === "alice/mlclaw-template" &&
      (call.args[1] === "MLCLAW_ALLOWED_USERS" || call.args[1] === "MLCLAW_ADMINS")
    )).toBe(false);
    expect(hub.calls).not.toContainEqual({
      name: "assertBucketAccessible",
      args: [expect.anything()],
    });
    expect(hub.calls.some((call) => call.name === "fetchSpaceLogs")).toBe(false);
    expect(hub.calls).toContainEqual({
      name: "restartSpace",
      args: ["alice/mlclaw-template", true],
    });
  });

  it("runs template-aware doctor checks for the canonical template Space", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/mlclaw-template", "MLCLAW_TEMPLATE_REV", "test-template");
    await hub.addSpaceVariable("alice/mlclaw-template", "MLCLAW_RUNTIME_IMAGE", DEFAULT_RUNTIME_IMAGE);
    await hub.addSpaceVariable("alice/mlclaw-template", "MLCLAW_CANONICAL_SPACE_ID", "alice/mlclaw-template");
    const { prompt } = createPrompt([]);
    const output: string[] = [];
    const runtime = {
      ...await createRuntime(hub, prompt),
      env: { MLCLAW_CANONICAL_SPACE_ID: "alice/mlclaw-template" },
      stdout: { log: (message: unknown) => output.push(String(message)) },
    };

    const code = await main(["doctor", "alice/mlclaw-template"], runtime);

    expect(code).toBe(0);
    expect(output).toContain("Mode: template");
    expect(output).toContain("Doctor: clean");
    expect(output.join("\n")).not.toContain("OPENCLAW_HF_STATE_BUCKET");
    expect(output.join("\n")).not.toContain("secret HF_TOKEN");
    expect(hub.calls.some((call) => call.name === "fetchSpaceLogs")).toBe(false);
    expect(hub.calls.some((call) => call.name === "assertBucketAccessible")).toBe(false);
  });

  it("migrates local to Space and back without starting both gateways", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "1234567890"]);
    const runtime = await createRuntime(hub, prompt);

    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
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
      call.args[1] === "MLCLAW_GATEWAY_DISABLED" &&
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

  it("rejects free Space hardware when migrating a Telegram-enabled local gateway", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(0);
    await writeSecretEnv(runtime.configRoot, "research", {
      ...await readSecretEnv(runtime.configRoot, "research"),
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_ALLOWED_USERS: "1234567890",
    });
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(main([
      "gateway",
      "migrate",
      "research",
      "--to",
      "space",
      "--hardware",
      "cpu-basic",
    ], runtime)).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("Telegram requires upgraded paid Space hardware");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
  });

  it("migrates from Space to an explicit local Docker context when the previous context is stale", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    runtime.dockerRunner.contexts.delete("desktop-linux");
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
      localGateway: {
        engine: "docker",
        dockerContext: "desktop-linux",
        dockerEndpoint: "unix:///docker-desktop.sock",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    await writeSecretEnv(runtime.configRoot, "research", {
      OPENCLAW_HF_STATE_BUCKET: "alice/research-data",
      OPENCLAW_AGENT_NAME: "research",
      OPENCLAW_MODEL: "test-model",
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_IMAGE: DEFAULT_RUNTIME_IMAGE,
      MLCLAW_RUNTIME_ID: "space-research",
    });

    await expect(main([
      "gateway",
      "migrate",
      "research",
      "--to",
      "local",
      "--docker-context",
      "colima",
      "--no-pull",
    ], runtime)).resolves.toBe(0);

    const runCall = runtime.dockerRunner.calls.find((call) => call.name === "run");
    expect(runCall).toEqual({
      name: "run",
      args: [
        expect.objectContaining({
          context: "colima",
        }),
      ],
    });
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      gatewayLocation: "local",
      localGateway: {
        dockerContext: "colima",
        dockerEndpoint: "unix:///colima.sock",
      },
    });
  });

  it("adopts a state bucket for a local deployment and resets stale live disk", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "1234567890"]);
    const runtime = await createRuntime(hub, prompt);

    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
    seedValidStateSnapshot(hub);
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(main([
      "state",
      "adopt",
      "research",
      "--bucket",
      "alice/research-archive-data",
      "--yes",
      "--no-pull",
    ], runtime)).resolves.toBe(0);

    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      bucket: "alice/research-archive-data",
      gatewayLocation: "local",
    });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      OPENCLAW_HF_STATE_BUCKET: "alice/research-archive-data",
    });
    const stopIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "stop");
    const removeIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "rm");
    const removeVolumeIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "rmVolume");
    const runIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "run");
    expect(stopIndex).toBeGreaterThanOrEqual(0);
    expect(removeIndex).toBeGreaterThan(stopIndex);
    expect(removeVolumeIndex).toBeGreaterThan(removeIndex);
    expect(runIndex).toBeGreaterThan(removeVolumeIndex);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "start")).toBe(false);
  });

  it("rebinds a local gateway to another Docker context through bucket handoff", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    runtime.dockerRunner.inspectValue = {
      exists: true,
      running: true,
      status: "running",
      image: DEFAULT_RUNTIME_IMAGE,
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
      localGateway: {
        engine: "docker",
        dockerContext: "desktop-linux",
        dockerEndpoint: "unix:///docker-desktop.sock",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(main([
      "gateway",
      "rebind",
      "research",
      "--docker-context",
      "colima",
      "--no-pull",
    ], runtime)).resolves.toBe(0);

    const disableRestartIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "disableRestart");
    const stopIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "stop");
    const removeIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "rm");
    const removeVolumeIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "rmVolume");
    const runIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "run");
    expect(disableRestartIndex).toBeGreaterThanOrEqual(0);
    expect(runtime.dockerRunner.calls[disableRestartIndex]).toEqual({
      name: "disableRestart",
      args: ["mlclaw-research", "desktop-linux"],
    });
    expect(stopIndex).toBeGreaterThan(disableRestartIndex);
    expect(runtime.dockerRunner.calls[stopIndex]).toEqual({
      name: "stop",
      args: ["mlclaw-research", "desktop-linux"],
    });
    expect(removeIndex).toBeGreaterThan(stopIndex);
    expect(removeVolumeIndex).toBeGreaterThan(removeIndex);
    expect(runIndex).toBeGreaterThan(removeVolumeIndex);
    expect(runtime.dockerRunner.calls[runIndex]).toEqual({
      name: "run",
      args: [
        expect.objectContaining({
          context: "colima",
        }),
      ],
    });
    expect(hub.calls.some((call) =>
      call.name === "bucket.uploadFiles" &&
      Array.isArray(call.args[0]) &&
      call.args[0].includes("openclaw-state/runtime/handoff-request.json")
    )).toBe(true);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: {
        dockerContext: "colima",
        dockerEndpoint: "unix:///colima.sock",
      },
    });
  });

  it("rebinds with takeover when the previous Docker context is unavailable", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    runtime.dockerRunner.contexts.delete("desktop-linux");
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
      localGateway: {
        engine: "docker",
        dockerContext: "desktop-linux",
        dockerEndpoint: "unix:///docker-desktop.sock",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(main([
      "gateway",
      "rebind",
      "research",
      "--docker-context",
      "colima",
      "--takeover",
      "--no-pull",
    ], runtime)).resolves.toBe(0);

    expect(runtime.dockerRunner.calls.some((call) => call.name === "disableRestart")).toBe(false);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
    expect(hub.calls.some((call) =>
      call.name === "bucket.uploadFiles" &&
      Array.isArray(call.args[0]) &&
      call.args[0].includes("openclaw-state/runtime/handoff-request.json")
    )).toBe(false);
    const runCall = runtime.dockerRunner.calls.find((call) => call.name === "run");
    expect(runCall).toEqual({
      name: "run",
      args: [
        expect.objectContaining({
          context: "colima",
        }),
      ],
    });
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: {
        dockerContext: "colima",
        dockerEndpoint: "unix:///colima.sock",
      },
    });
  });

  it("does not persist a rebind until the target gateway starts", async () => {
    const hub = createFakeHub();
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
      gatewayLocation: "local",
      model: "test-model",
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      localGateway: {
        engine: "docker",
        dockerContext: "desktop-linux",
        dockerEndpoint: "unix:///docker-desktop.sock",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    const originalRun = runtime.dockerRunner.run.bind(runtime.dockerRunner);
    let failRun = true;
    runtime.dockerRunner.run = async (params) => {
      if (failRun) {
        throw new Error("target Docker startup failed");
      }
      await originalRun(params);
    };

    await expect(main([
      "gateway",
      "rebind",
      "research",
      "--docker-context",
      "colima",
      "--no-pull",
    ], runtime)).resolves.toBe(1);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: {
        dockerContext: "desktop-linux",
      },
    });

    failRun = false;
    runtime.dockerRunner.calls.length = 0;
    await expect(main([
      "gateway",
      "rebind",
      "research",
      "--docker-context",
      "colima",
      "--no-pull",
    ], runtime)).resolves.toBe(0);

    expect(runtime.dockerRunner.calls.find((call) => call.name === "run")).toEqual({
      name: "run",
      args: [
        expect.objectContaining({
          context: "colima",
        }),
      ],
    });
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: {
        dockerContext: "colima",
        dockerEndpoint: "unix:///colima.sock",
      },
    });
  });

  it("stops the old local gateway before takeover continues after handoff failure", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    runtime.dockerRunner.inspectValue = {
      exists: true,
      running: true,
      status: "running",
      image: DEFAULT_RUNTIME_IMAGE,
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
      localGateway: {
        engine: "docker",
        dockerContext: "desktop-linux",
        dockerEndpoint: "unix:///docker-desktop.sock",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    runtime.dockerRunner.disableRestart = async (...args: unknown[]) => {
      runtime.dockerRunner.calls.push({ name: "disableRestart", args });
      throw new Error("handoff setup failed");
    };

    await expect(main([
      "gateway",
      "rebind",
      "research",
      "--docker-context",
      "colima",
      "--takeover",
      "--no-pull",
    ], runtime)).resolves.toBe(0);

    const stopIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "stop");
    const runIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "run");
    expect(stopIndex).toBeGreaterThanOrEqual(0);
    expect(runtime.dockerRunner.calls[stopIndex]).toEqual({
      name: "stop",
      args: ["mlclaw-research", "desktop-linux"],
    });
    expect(runIndex).toBeGreaterThan(stopIndex);
    expect(runtime.dockerRunner.calls[runIndex]).toEqual({
      name: "run",
      args: [
        expect.objectContaining({
          context: "colima",
        }),
      ],
    });
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
    const { prompt } = createPrompt(["telegram-token", "1234567890"]);
    const runtime = await createRuntime(hub, prompt);

    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
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
    const { prompt } = createPrompt(["telegram-token", "1234567890"]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
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
    const { prompt } = createPrompt(["telegram-token", "1234567890"]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime)).resolves.toBe(0);
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
      call.args[1] === "MLCLAW_GATEWAY_DISABLED"
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
      args: ["alice/research", "MLCLAW_GATEWAY_DISABLED", "1"],
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
      call.args[1] === "MLCLAW_GATEWAY_DISABLED"
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

  it("waits for a final Space snapshot before migrating a running Space without a lease", async () => {
    const hub = createFakeHub({
      spaceRuntime: { stage: "RUNNING", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: -1 },
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
    await writeSecretEnv(runtime.configRoot, "research", {
      HF_TOKEN: "hf-token",
      OPENCLAW_HF_STATE_BUCKET: "alice/research-data",
      OPENCLAW_AGENT_NAME: "research",
      OPENCLAW_MODEL: "test-model",
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_ID: "space-research",
      MLCLAW_RUNTIME_IMAGE: DEFAULT_RUNTIME_IMAGE,
      MLCLAW_SESSION_SECRET: "session-secret",
    });

    await expect(main(["gateway", "migrate", "research", "--to", "local", "--no-pull"], runtime)).resolves.toBe(0);

    const handoffIndex = hub.calls.findIndex((call) =>
      call.name === "bucket.uploadFiles" &&
      Array.isArray(call.args[0]) &&
      call.args[0].includes("openclaw-state/runtime/handoff-request.json")
    );
    const disableIndex = hub.calls.findIndex((call) =>
      call.name === "addSpaceVariable" &&
      call.args[1] === "MLCLAW_GATEWAY_DISABLED"
    );
    const pauseIndex = hub.calls.findIndex((call) => call.name === "pauseSpace");
    const startIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "run");
    expect(handoffIndex).toBeGreaterThanOrEqual(0);
    expect(disableIndex).toBeGreaterThan(handoffIndex);
    expect(pauseIndex).toBeGreaterThan(disableIndex);
    expect(startIndex).toBeGreaterThanOrEqual(0);
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
      call.args[1] === "MLCLAW_GATEWAY_DISABLED"
    )).toBe(false);
    expect(hub.calls.some((call) => call.name === "pauseSpace")).toBe(false);
  });
});
