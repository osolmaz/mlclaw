import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, LOCAL_LIVE_DIR, LOCAL_VOLUME_MOUNT_PATH, main } from "../src/mlclaw/cli.js";
import { newOperation, updateOperation } from "../src/mlclaw/deployment-state.js";
import { DEFAULT_RUNTIME_IMAGE } from "../src/mlclaw/runtime-image.js";
import {
  readManifest,
  readSecretEnv,
  writeManifest,
  writeSecretEnv,
  type DeploymentManifest,
} from "../src/mlclaw/local-config.js";
import { HubApiError, type HubApi, type SpaceRuntime, type SpaceVolume } from "../src/mlclaw/hub-api.js";
import type { ContainerEngine, ContainerInspect, ContainerRunner, ContainerRunParams } from "../src/mlclaw/docker.js";
import type { BucketEntry } from "../src/hf-bucket-client/client.js";
import type {
  TailscaleDiscovery,
  TailscaleRunner,
  TailscaleServeMapping,
  TailscaleServeState,
} from "../src/mlclaw/tailscale.js";
import { TailscaleApprovalRequiredError } from "../src/mlclaw/tailscale.js";

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
      confirm: async () => (answers.length === 0 ? true : Boolean(answers.shift())),
      select: async () => String(answers.shift() ?? "cancel"),
      cancel: () => undefined,
    },
  };
}

function createFakeHub(
  opts: {
    acknowledgeHandoff?: boolean;
    ackCompletedAt?: string;
    downloadFileError?: Error;
    getSpaceRuntimeError?: Error;
    spaceRuntime?: SpaceRuntime;
    existingBuckets?: string[];
    existingSpaces?: string[];
    spaceVisibilities?: Record<string, "private" | "public">;
    createDockerSpaceError?: Error;
    failFirstTombstoneUpload?: boolean;
    onDeploymentClaimAcquired?: (bucketObjects: Map<string, string>) => void;
  } = {},
) {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const variables = new Map<string, { value?: string }>();
  const secrets = new Map<string, { key: string }>();
  const volumes: SpaceVolume[] = [];
  const bucketObjects = new Map<string, string>();
  let controlValue: unknown | null = null;
  let controlRevision = 0;
  let tombstoneUploadFailed = false;
  const existingBuckets = new Set(opts.existingBuckets ?? []);
  const existingSpaces = new Set(opts.existingSpaces ?? []);
  const spaceVisibilities = new Map(
    [...existingSpaces].map((repoId) => [repoId, opts.spaceVisibilities?.[repoId] ?? "private"] as const),
  );
  const bucketClient = {
    async uploadFiles(files: Array<{ path: string; content: Blob }>) {
      if (
        opts.failFirstTombstoneUpload &&
        !tombstoneUploadFailed &&
        files.some((file) => file.path === ".mlclaw/tombstone.json")
      ) {
        tombstoneUploadFailed = true;
        throw new Error("simulated tombstone upload failure");
      }
      calls.push({ name: "bucket.uploadFiles", args: [files.map((file) => file.path)] });
      for (const file of files) {
        const text = await file.content.text();
        bucketObjects.set(file.path, text);
        if (file.path.endsWith("/runtime/handoff-request.json") && opts.acknowledgeHandoff !== false) {
          const prefix = file.path.slice(0, -"/runtime/handoff-request.json".length);
          const request = JSON.parse(text) as { requestId: string; agent: string; runtimeId: string };
          bucketObjects.set(
            `${prefix}/runtime/handoff-ack.json`,
            JSON.stringify({
              schemaVersion: 1,
              requestId: request.requestId,
              agent: request.agent,
              runtimeId: request.runtimeId,
              gatewayLocation: request.runtimeId.startsWith("local-") ? "local" : "space",
              completedAt: opts.ackCompletedAt ?? "2026-06-16T00:00:01.000Z",
              lastSnapshotId: `${prefix}/snapshots/state-test.tar.zst`,
            }),
          );
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
      return [...bucketObjects.keys()].map((path) => ({
        path,
        size: 0,
        type: "file" as const,
      })) satisfies BucketEntry[];
    },
    async assertBucketAccessible() {
      calls.push({ name: "bucket.assertBucketAccessible", args: [] });
    },
  };
  const hub = {
    calls,
    bucketObjects,
    existingSpaces,
    variables,
    volumes,
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
      if (opts.createDockerSpaceError) {
        throw opts.createDockerSpaceError;
      }
      const repoId = String(args[0]);
      existingSpaces.add(repoId);
      const options = args[1] as { private?: boolean } | undefined;
      spaceVisibilities.set(repoId, options?.private === false ? "public" : "private");
    },
    async bucketExists(bucket: string) {
      calls.push({ name: "bucketExists", args: [bucket] });
      return existingBuckets.has(bucket);
    },
    async listBuckets(namespace?: string) {
      calls.push({ name: "listBuckets", args: namespace ? [namespace] : [] });
      return [...existingBuckets];
    },
    async deploymentControlStore(owner: string, deploymentId: string) {
      calls.push({ name: "deploymentControlStore", args: [owner, deploymentId] });
      return controlStore("deploymentControlStore");
    },
    async deploymentClaimStore(owner: string) {
      calls.push({ name: "deploymentClaimStore", args: [owner] });
      return controlStore("deploymentClaimStore");
    },
    async spaceExists(repoId: string) {
      calls.push({ name: "spaceExists", args: [repoId] });
      return existingSpaces.has(repoId);
    },
    async getSpaceVisibility(repoId: string) {
      calls.push({ name: "getSpaceVisibility", args: [repoId] });
      return spaceVisibilities.get(repoId) ?? "private";
    },
    async updateSpaceVisibility(repoId: string, visibility: "private" | "public") {
      calls.push({ name: "updateSpaceVisibility", args: [repoId, visibility] });
      spaceVisibilities.set(repoId, visibility);
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
    async deleteSpaceSecret(repoId: string, key: string) {
      calls.push({ name: "deleteSpaceSecret", args: [repoId, key] });
      secrets.delete(key);
    },
    async restartSpace(...args: unknown[]) {
      calls.push({ name: "restartSpace", args });
      const agent = variables.get("OPENCLAW_AGENT_NAME")?.value ?? "research";
      const bucket = variables.get("OPENCLAW_HF_STATE_BUCKET")?.value ?? "alice/research-data";
      const prefix = variables.get("OPENCLAW_HF_STATE_PREFIX")?.value ?? "openclaw-state";
      bucketObjects.set(
        `${prefix}/runtime/status.json`,
        JSON.stringify({
          schemaVersion: 1,
          agent,
          runtimeId: variables.get("MLCLAW_RUNTIME_ID")?.value ?? `space-${agent}`,
          gatewayLocation: variables.get("MLCLAW_GATEWAY_LOCATION")?.value ?? "space",
          runtimeImage: variables.get("MLCLAW_RUNTIME_IMAGE")?.value ?? DEFAULT_RUNTIME_IMAGE,
          startedAt: "2026-06-16T00:00:00.000Z",
          lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
          lastSnapshotId: `${bucket}/snapshot.tar.zst`,
        }),
      );
    },
    async pauseSpace(...args: unknown[]) {
      calls.push({ name: "pauseSpace", args });
      return { stage: "PAUSED", hardware: "cpu-upgrade", requested_hardware: "cpu-upgrade", sleep_time: -1 };
    },
    async getSpaceRuntime(): Promise<SpaceRuntime> {
      calls.push({ name: "getSpaceRuntime", args: [] });
      if (opts.getSpaceRuntimeError) {
        throw opts.getSpaceRuntimeError;
      }
      return (
        opts.spaceRuntime ?? {
          stage: "RUNNING",
          hardware: "cpu-upgrade",
          requested_hardware: "cpu-upgrade",
          sleep_time: -1,
          volumes,
        }
      );
    },
    async setSpaceVolumes(repoId: string, nextVolumes: typeof volumes) {
      calls.push({ name: "setSpaceVolumes", args: [repoId, nextVolumes] });
      volumes.splice(0, volumes.length, ...nextVolumes);
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
      return {
        stage: "RUNNING",
        hardware: "cpu-upgrade",
        requested_hardware: "cpu-upgrade",
        sleep_time: args[1] as number,
      };
    },
  };

  function controlStore(kind: "deploymentControlStore" | "deploymentClaimStore") {
    return {
      async read() {
        calls.push({ name: "control.read", args: [] });
        return { value: controlValue, revision: String(controlRevision) };
      },
      async compareAndSwap(expectedRevision: string, value: unknown | null) {
        calls.push({ name: "control.compareAndSwap", args: [expectedRevision, value] });
        if (expectedRevision !== String(controlRevision))
          throw new Error("deployment control lease changed concurrently");
        const wasUnclaimed = controlValue === null;
        controlValue = value;
        controlRevision += 1;
        if (kind === "deploymentClaimStore" && wasUnclaimed && value !== null) {
          opts.onDeploymentClaimAcquired?.(bucketObjects);
        }
        return String(controlRevision);
      },
    };
  }
  return hub as typeof hub & HubApi;
}

function seedValidStateSnapshot(hub: ReturnType<typeof createFakeHub>, prefix = "openclaw-state") {
  const snapshotPath = `${prefix}/snapshots/state-adopted.tar.zst`;
  hub.bucketObjects.set(
    `${prefix}/manifest.json`,
    JSON.stringify({
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
    }) + "\n",
  );
  hub.bucketObjects.set(snapshotPath, "snapshot-bytes");
}

async function createRuntime(hub: HubApi, prompt: ReturnType<typeof createPrompt>["prompt"], stderr: string[] = []) {
  const docker = createFakeDocker();
  const podman = createFakeDocker("podman");
  const configRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-cli-test-"));
  return {
    env: { MLCLAW_ROUTER_TOKEN: "hf_router_test" },
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
    podmanRunner: podman,
    tailscaleRunner: createFakeTailscale(),
    configRoot,
    now: () => new Date("2026-06-16T00:00:00.000Z"),
    sleep: async () => undefined,
    prompt,
  };
}

function createFakeTailscale(): TailscaleRunner & {
  calls: Array<{ name: string; mapping?: TailscaleServeMapping }>;
  discovery: TailscaleDiscovery;
  state: TailscaleServeState;
  ensureErrors: Error[];
} {
  return {
    calls: [],
    discovery: { ready: false, reason: "Tailscale is not installed" },
    state: "free",
    ensureErrors: [],
    async discover() {
      this.calls.push({ name: "discover" });
      return this.discovery;
    },
    async mappingState(mapping) {
      this.calls.push({ name: "mappingState", mapping });
      return this.state;
    },
    async ensureMapping(mapping) {
      this.calls.push({ name: "ensureMapping", mapping });
      const error = this.ensureErrors.shift();
      if (error) throw error;
      const result = this.state === "owned" ? "unchanged" : "created";
      this.state = "owned";
      return result;
    },
    async removeMapping(mapping) {
      this.calls.push({ name: "removeMapping", mapping });
      if (this.state === "conflict") return "drifted";
      if (this.state === "free") return "missing";
      this.state = "free";
      return "removed";
    },
  };
}

function createFakeDocker(engine: ContainerEngine = "docker"): ContainerRunner & {
  calls: Array<{ name: string; args: unknown[] }>;
  currentContextValue: string;
  contexts: Map<string, string>;
  inspectValue: ContainerInspect | null;
  runErrors: Error[];
} {
  return {
    engine,
    calls: [],
    currentContextValue: engine === "docker" ? "desktop-linux" : "local",
    contexts: new Map(
      engine === "docker"
        ? [
            ["desktop-linux", "unix:///docker-desktop.sock"],
            ["colima", "unix:///colima.sock"],
          ]
        : [["local", "unix:///run/user/1000/podman/podman.sock"]],
    ),
    inspectValue: null,
    runErrors: [],
    async probe(context?: string) {
      const selected = context ?? this.currentContextValue;
      const endpoint = this.contexts.get(selected);
      return endpoint
        ? { engine: this.engine, status: "ready" as const, context: selected, endpoint, detail: `${this.engine} ready` }
        : {
            engine: this.engine,
            status: "unavailable" as const,
            context: selected,
            detail: `${this.engine} unavailable`,
          };
    },
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
    async run(params: ContainerRunParams) {
      this.calls.push({ name: "run", args: [params] });
      const error = this.runErrors.shift();
      if (error) {
        this.inspectValue = { exists: true, running: false, status: "created", image: params.image };
        throw error;
      }
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
    const code = await main(
      ["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"],
      runtime,
    );

    expect(code).toBe(0);
    expect(notes[0]).toEqual(
      expect.objectContaining({
        title: "Bootstrap plan",
        message: expect.stringContaining("Bucket: alice/research-data (will be created as private)"),
      }),
    );
    expect(notes[0]?.message).toContain("Model: huggingface/zai-org/GLM-5.2:fireworks-ai");
    expect(notes[0]?.message).toContain("Gateway URL: http://127.0.0.1:7860");
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "HERE IS YOUR ML CLAW",
        message: expect.stringContaining("http://127.0.0.1:7860"),
      }),
    );
    expect(notes.find((item) => item.title === "HERE IS YOUR ML CLAW")?.message).toMatch(
      /\/mlclaw\/local-login#[A-Za-z0-9_-]+/,
    );
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
          publishedPorts: [{ hostAddress: "127.0.0.1", hostPort: 7860, containerPort: 7860 }],
        }),
      ],
    });
    const manifest = await readManifest(runtime.configRoot, "research");
    expect(manifest.localRuntimeId).toMatch(/^local-research-[a-f0-9]{16}$/);
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_BROKER_HF_TOKEN: "hf_test_token",
      MLCLAW_RUNTIME_ID: manifest.localRuntimeId,
      OPENCLAW_MODEL: DEFAULT_MODEL,
    });
    expect(hub.calls).toContainEqual({ name: "deploymentClaimStore", args: ["alice"] });
  });

  it("stops a first bootstrap when another controller claims the bucket identity", async () => {
    const hub = createFakeHub({
      existingBuckets: ["alice/research-data"],
      onDeploymentClaimAcquired: (objects) => {
        objects.set(
          ".mlclaw/deployment.json",
          JSON.stringify({
            schemaVersion: 1,
            deploymentId: "33333333-3333-5333-a333-333333333333",
            agent: "research",
            owner: "alice",
            bucket: "alice/research-data",
            statePrefix: "openclaw-state",
            credentialKeySha256: "a".repeat(64),
            createdAt: "2026-07-16T00:00:00.000Z",
          }),
        );
      },
    });
    const errors: string[] = [];
    const runtime = await createRuntime(hub, createPrompt([]).prompt, errors);

    await expect(main(["bootstrap", "--name", "research", "--gateway", "space", "--yes"], runtime)).resolves.toBe(1);

    expect(errors.join("\n")).toContain("different canonical deployment identity");
    expect(hub.calls).toContainEqual({ name: "deploymentClaimStore", args: ["alice"] });
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("exposes a local gateway through an explicitly approved Tailscale Serve mapping", async () => {
    const hub = createFakeHub();
    const { prompt, notes } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    runtime.tailscaleRunner.discovery = { ready: true, ipv4: "100.100.100.100", dnsName: "gateway.example.ts.net" };

    await expect(
      main(
        [
          "--gateway",
          "local",
          "--name",
          "research",
          "--gateway-token",
          "gateway-token",
          "--tailscale=serve",
          "--tailscale-port",
          "17860",
          "--no-pull",
        ],
        runtime,
      ),
    ).resolves.toBe(0);

    const manifest = await readManifest(runtime.configRoot, "research");
    expect(manifest.networkAccess).toEqual({
      provider: "tailscale-serve",
      enabled: true,
      dnsName: "gateway.example.ts.net",
      httpsPort: 17860,
      target: "http://127.0.0.1:7860",
      accessOrigin: "https://gateway.example.ts.net:17860",
    });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_ACCESS_ORIGINS: "http://127.0.0.1:7860,https://gateway.example.ts.net:17860",
    });
    expect(runtime.tailscaleRunner.calls).toContainEqual({
      name: "ensureMapping",
      mapping: {
        dnsName: "gateway.example.ts.net",
        httpsPort: 17860,
        target: "http://127.0.0.1:7860",
      },
    });
    expect(notes.find((item) => item.title === "HERE IS YOUR ML CLAW")?.message).toContain(
      "https://gateway.example.ts.net:17860/mlclaw/local-login#",
    );

    await expect(main(["gateway", "stop", "research"], runtime)).resolves.toBe(0);
    expect(runtime.tailscaleRunner.calls).toContainEqual({
      name: "removeMapping",
      mapping: {
        dnsName: "gateway.example.ts.net",
        httpsPort: 17860,
        target: "http://127.0.0.1:7860",
      },
    });

    runtime.tailscaleRunner.calls.length = 0;
    await expect(main(["gateway", "start", "research", "--no-pull"], runtime)).resolves.toBe(0);
    expect(runtime.tailscaleRunner.calls.some((call) => call.name === "ensureMapping")).toBe(true);
    expect(runtime.tailscaleRunner.state).toBe("owned");

    await expect(main(["gateway", "start", "research", "--tailscale=off", "--no-pull"], runtime)).resolves.toBe(0);
    await expect(readManifest(runtime.configRoot, "research")).resolves.not.toHaveProperty("networkAccess");
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_ACCESS_ORIGINS: "http://127.0.0.1:7860",
    });
    expect(runtime.tailscaleRunner.state).toBe("free");
  });

  it("publishes direct tailnet access only on loopback and the exact Tailscale address", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    runtime.tailscaleRunner.discovery = {
      ready: true,
      ipv4: "100.100.100.100",
      dnsName: "gateway.example.ts.net",
    };

    await expect(
      main(
        [
          "--gateway",
          "local",
          "--name",
          "research",
          "--gateway-token",
          "gateway-token",
          "--tailscale=direct",
          "--tailscale-port",
          "17860",
          "--no-pull",
        ],
        runtime,
      ),
    ).resolves.toBe(0);

    expect(runtime.dockerRunner.calls.find((call) => call.name === "run")?.args[0]).toMatchObject({
      publishedPorts: [
        { hostAddress: "127.0.0.1", hostPort: 7860, containerPort: 7860 },
        { hostAddress: "100.100.100.100", hostPort: 17860, containerPort: 7860 },
      ],
    });
    expect(runtime.tailscaleRunner.calls.some((call) => call.name === "ensureMapping")).toBe(false);
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_ACCESS_ORIGINS: "http://127.0.0.1:7860,http://100.100.100.100:17860",
    });

    await expect(main(["gateway", "stop", "research"], runtime)).resolves.toBe(0);
    runtime.dockerRunner.calls.length = 0;
    runtime.tailscaleRunner.discovery = {
      ready: true,
      ipv4: "100.100.100.101",
      dnsName: "gateway.example.ts.net",
    };
    await expect(main(["gateway", "start", "research", "--no-pull"], runtime)).resolves.toBe(0);
    expect(runtime.dockerRunner.calls.find((call) => call.name === "run")?.args[0]).toMatchObject({
      publishedPorts: expect.arrayContaining([
        { hostAddress: "100.100.100.101", hostPort: 17860, containerPort: 7860 },
      ]),
    });
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      networkAccess: { provider: "tailscale-direct", ipv4: "100.100.100.101" },
    });
  });

  it("selects the only local deployment when bootstrap is rerun without a name", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    await expect(
      main(["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime),
    ).resolves.toBe(0);

    expect(await main(["--gateway", "local", "--no-pull"], runtime), stderr.join("\n")).toBe(0);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      agent: "research",
      desiredGeneration: 1,
    });
    expect(hub.bucketObjects.has(".mlclaw/deployment.json")).toBe(true);
    expect(hub.bucketObjects.get(".mlclaw/desired-state.json")).not.toContain("hf_test_token");
  });

  it("preserves Telegram configuration on an automatic bootstrap rerun", async () => {
    const hub = createFakeHub();
    const runtime = await createRuntime(hub, createPrompt([]).prompt);
    await expect(
      main(
        [
          "bootstrap",
          "--gateway",
          "local",
          "--name",
          "research",
          "--telegram-token",
          "telegram-token",
          "--telegram-user-id",
          "1234567890",
          "--telegram-proxy",
          "http://proxy.example",
          "--telegram-api-root",
          "https://telegram.example",
          "--no-pull",
        ],
        runtime,
      ),
    ).resolves.toBe(0);

    await expect(main(["bootstrap", "--gateway", "local", "--no-pull"], runtime)).resolves.toBe(0);
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_ALLOWED_USERS: "1234567890",
      TELEGRAM_PROXY: "http://proxy.example",
      TELEGRAM_API_ROOT: "https://telegram.example",
    });
  });

  it("preserves an organization owner when selecting its only local deployment", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);
    await expect(
      main(
        [
          "--gateway",
          "local",
          "--owner",
          "research-org",
          "--name",
          "research",
          "--gateway-token",
          "gateway-token",
          "--no-pull",
        ],
        runtime,
      ),
    ).resolves.toBe(0);

    await expect(main(["--gateway", "local", "--no-pull"], runtime)).resolves.toBe(0);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      owner: "research-org",
      bucket: "research-org/research-data",
      space: "research-org/research",
    });
  });

  it("does not auto-select a local deployment from a different explicit owner", async () => {
    const hub = createFakeHub();
    const runtime = await createRuntime(hub, createPrompt(["new-agent"]).prompt);
    await writeManifest(runtime.configRoot, {
      version: 2,
      deploymentId: "11111111-1111-5111-a111-111111111111",
      desiredGeneration: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "local",
      model: DEFAULT_MODEL,
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-07-16T00:00:00.000Z",
      updatedAt: "2026-07-16T00:00:00.000Z",
    });

    await expect(
      main(
        ["bootstrap", "--owner", "research-org", "--gateway", "local", "--gateway-token", "gateway-token", "--no-pull"],
        runtime,
      ),
    ).resolves.toBe(0);

    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      owner: "alice",
      bucket: "alice/research-data",
    });
    await expect(readManifest(runtime.configRoot, "new-agent")).resolves.toMatchObject({
      owner: "research-org",
      bucket: "research-org/new-agent-data",
    });
    expect(hub.calls).toContainEqual({ name: "listBuckets", args: ["research-org"] });
  });

  it("recovers the only trusted remote deployment when local state is absent", async () => {
    const hub = createFakeHub({ existingBuckets: ["alice/research-data"] });
    hub.bucketObjects.set(
      ".mlclaw/deployment.json",
      JSON.stringify({
        schemaVersion: 1,
        deploymentId: "33333333-3333-5333-a333-333333333333",
        agent: "research",
        owner: "alice",
        bucket: "alice/research-data",
        statePrefix: "custom-state-prefix",
        credentialKeySha256: "c9357e9e93a12c0d388d115eb3a62a5e4683807b1526e83716fcaafac2761539",
        createdAt: "2026-07-16T00:00:00.000Z",
      }),
    );
    hub.bucketObjects.set(
      ".mlclaw/desired-state.json",
      JSON.stringify({
        schemaVersion: 1,
        deploymentId: "33333333-3333-5333-a333-333333333333",
        generation: 2,
        updatedAt: "2026-07-16T00:10:00.000Z",
        gateway: { location: "local", port: 7860, tailscaleMode: "direct" },
        model: DEFAULT_MODEL,
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        space: {
          repo: "alice/research",
          visibility: "public",
          hardware: "cpu-upgrade",
          sleepTime: -1,
        },
      }),
    );
    const { prompt } = createPrompt([true]);
    const runtime = await createRuntime(hub, prompt);
    Object.assign(runtime.env, { MLCLAW_CREDENTIAL_KEY: "restored-test-credential-key" });
    runtime.dockerRunner.contexts.clear();
    runtime.tailscaleRunner.discovery = {
      ready: true,
      ipv4: "100.100.100.100",
      dnsName: "gateway.example.ts.net",
    };

    await expect(main(["--gateway", "local", "--no-pull"], runtime)).resolves.toBe(0);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      deploymentId: "33333333-3333-5333-a333-333333333333",
      desiredGeneration: 2,
      bucket: "alice/research-data",
      localGateway: { engine: "podman", podmanConnection: "local" },
      tailscaleMode: "direct",
      spaceVisibility: "public",
      spaceHardware: "cpu-upgrade",
      spaceSleepTime: -1,
      networkAccess: { provider: "tailscale-direct", ipv4: "100.100.100.100" },
    });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      OPENCLAW_HF_STATE_PREFIX: "custom-state-prefix",
    });
    expect(runtime.podmanRunner.calls.some((call) => call.name === "run")).toBe(true);
  });

  it("refuses remote recovery without the existing credential key", async () => {
    const hub = createFakeHub({ existingBuckets: ["alice/research-data"] });
    hub.bucketObjects.set(
      ".mlclaw/deployment.json",
      JSON.stringify({
        schemaVersion: 1,
        deploymentId: "44444444-4444-5444-a444-444444444444",
        agent: "research",
        owner: "alice",
        bucket: "alice/research-data",
        statePrefix: "openclaw-state",
        credentialKeySha256: "a".repeat(64),
        createdAt: "2026-07-16T00:00:00.000Z",
      }),
    );
    hub.bucketObjects.set(
      ".mlclaw/desired-state.json",
      JSON.stringify({
        schemaVersion: 1,
        deploymentId: "44444444-4444-5444-a444-444444444444",
        generation: 1,
        updatedAt: "2026-07-16T00:10:00.000Z",
        gateway: { location: "local", port: 7860, tailscaleMode: "off" },
        model: DEFAULT_MODEL,
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        space: { repo: "alice/research", visibility: "private" },
      }),
    );
    const errors: string[] = [];
    const runtime = await createRuntime(hub, createPrompt([true]).prompt, errors);

    await expect(main(["--gateway", "local", "--no-pull"], runtime)).resolves.toBe(1);
    expect(errors.join("\n")).toContain("requires its existing MLCLAW_CREDENTIAL_KEY");
  });

  it("rejects a mismatched credential key through non-bootstrap reconciliation", async () => {
    const hub = createFakeHub();
    const errors: string[] = [];
    const runtime = await createRuntime(hub, createPrompt([]).prompt, errors);
    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    await writeSecretEnv(runtime.configRoot, "research", {
      ...(await readSecretEnv(runtime.configRoot, "research")),
      MLCLAW_CREDENTIAL_KEY: "replacement-key",
    });
    runtime.dockerRunner.calls.length = 0;

    await expect(main(["gateway", "start", "research", "--no-pull"], runtime)).resolves.toBe(1);
    expect(errors.join("\n")).toContain("does not match the canonical deployment identity");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("offers Tailscale access interactively but never enables it implicitly for automation", async () => {
    const hub = createFakeHub();
    const interactive = createPrompt([true, "direct"]);
    const interactiveRuntime = await createRuntime(hub, interactive.prompt);
    interactiveRuntime.tailscaleRunner.discovery = {
      ready: true,
      ipv4: "100.100.100.100",
      dnsName: "gateway.example.ts.net",
    };

    await expect(
      main(
        ["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"],
        interactiveRuntime,
      ),
    ).resolves.toBe(0);
    await expect(readManifest(interactiveRuntime.configRoot, "research")).resolves.toMatchObject({
      networkAccess: { provider: "tailscale-direct", enabled: true, ipv4: "100.100.100.100" },
    });

    const automated = createPrompt([], false);
    const automatedRuntime = await createRuntime(createFakeHub(), automated.prompt);
    automatedRuntime.tailscaleRunner.discovery = {
      ready: true,
      ipv4: "100.100.100.100",
      dnsName: "gateway.example.ts.net",
    };
    await expect(
      main(
        ["--gateway", "local", "--name", "automated", "--gateway-token", "gateway-token", "--yes", "--no-pull"],
        automatedRuntime,
      ),
    ).resolves.toBe(0);
    await expect(readManifest(automatedRuntime.configRoot, "automated")).resolves.not.toHaveProperty("networkAccess");
    expect(automatedRuntime.tailscaleRunner.calls).toEqual([]);
  });

  it("refuses to overwrite a conflicting Tailscale Serve handler", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    runtime.tailscaleRunner.discovery = { ready: true, ipv4: "100.100.100.100", dnsName: "gateway.example.ts.net" };
    runtime.tailscaleRunner.state = "conflict";

    await expect(
      main(
        [
          "--gateway",
          "local",
          "--name",
          "research",
          "--gateway-token",
          "gateway-token",
          "--tailscale=serve",
          "--no-pull",
        ],
        runtime,
      ),
    ).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("already in use");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
    expect(runtime.tailscaleRunner.calls.some((call) => call.name === "ensureMapping")).toBe(false);
  });

  it("refuses host Tailscale Serve for a remote container runtime", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    runtime.dockerRunner.contexts.set("remote", "ssh://deploy@example.com");
    runtime.tailscaleRunner.discovery = { ready: true, ipv4: "100.100.100.100", dnsName: "gateway.example.ts.net" };

    await expect(
      main(
        [
          "--gateway",
          "local",
          "--name",
          "research",
          "--gateway-token",
          "gateway-token",
          "--docker-context",
          "remote",
          "--tailscale=serve",
          "--no-pull",
        ],
        runtime,
      ),
    ).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("requires the container runtime to run on this machine");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("rolls back a new local bootstrap when Tailscale Serve setup fails", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    runtime.tailscaleRunner.discovery = { ready: true, ipv4: "100.100.100.100", dnsName: "gateway.example.ts.net" };
    runtime.tailscaleRunner.ensureErrors.push(new Error("enable Serve in the Tailscale admin console"));

    await expect(
      main(
        [
          "--gateway",
          "local",
          "--name",
          "research",
          "--gateway-token",
          "gateway-token",
          "--tailscale=serve",
          "--no-pull",
        ],
        runtime,
      ),
    ).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("enable Serve in the Tailscale admin console");
    await expect(readManifest(runtime.configRoot, "research")).rejects.toThrow();
    await expect(readSecretEnv(runtime.configRoot, "research")).rejects.toThrow();
    expect(runtime.dockerRunner.inspectValue).toBeNull();
    expect(runtime.dockerRunner.calls.some((call) => call.name === "rmVolume")).toBe(true);
    expect(runtime.tailscaleRunner.calls.map((call) => call.name)).toContain("removeMapping");
    expect(runtime.tailscaleRunner.state).toBe("free");
  });

  it("keeps a healthy loopback gateway while Tailscale Serve approval is pending", async () => {
    const hub = createFakeHub();
    const { prompt, notes } = createPrompt([]);
    const output: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt)),
      stdout: { log: (message: unknown) => output.push(String(message)) },
    };
    runtime.tailscaleRunner.discovery = {
      ready: true,
      ipv4: "100.100.100.100",
      dnsName: "gateway.example.ts.net",
    };
    runtime.tailscaleRunner.ensureErrors.push(
      new TailscaleApprovalRequiredError(
        "https://login.tailscale.com/f/serve?node=example",
        "Tailscale Serve requires administrator approval",
      ),
    );

    await expect(
      main(
        [
          "--gateway",
          "local",
          "--name",
          "research",
          "--gateway-token",
          "gateway-token",
          "--tailscale=serve",
          "--no-pull",
        ],
        runtime,
      ),
    ).resolves.toBe(0);

    expect(runtime.dockerRunner.inspectValue?.running).toBe(true);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      networkAccess: { provider: "tailscale-serve", pendingApproval: true },
    });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_ACCESS_ORIGINS: "http://127.0.0.1:7860",
    });
    expect(output.some((line) => line.startsWith("Tailnet URL:"))).toBe(false);
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "TAILSCALE SERVE APPROVAL REQUIRED",
        message: "https://login.tailscale.com/f/serve?node=example",
      }),
    );
    expect([...hub.bucketObjects.values()].some((value) => value.includes('"state": "waiting_for_approval"'))).toBe(
      true,
    );

    output.length = 0;
    await expect(main(["gateway", "status", "research"], runtime)).resolves.toBe(0);
    expect(output).toContain("Tailscale Serve: pending administrator approval");
    expect(output.some((line) => line.startsWith("Tailnet URL:"))).toBe(false);

    await expect(
      main(["--gateway", "local", "--name", "research", "--tailscale=serve", "--no-pull"], runtime),
    ).resolves.toBe(0);
    expect([...hub.bucketObjects.keys()].filter((key) => key.startsWith(".mlclaw/operations/"))).toHaveLength(1);
    expect([...hub.bucketObjects.values()].some((value) => value.includes('"state": "completed"'))).toBe(true);
  });

  it("publishes a requested local gateway port on loopback", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);

    const code = await main(
      [
        "--gateway",
        "local",
        "--name",
        "research",
        "--local-port",
        "17860",
        "--gateway-token",
        "gateway-token",
        "--no-pull",
      ],
      runtime,
    );

    expect(code).toBe(0);
    expect(runtime.dockerRunner.calls.find((call) => call.name === "run")).toEqual({
      name: "run",
      args: [
        expect.objectContaining({
          publishedPorts: [{ hostAddress: "127.0.0.1", hostPort: 17860, containerPort: 7860 }],
        }),
      ],
    });
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({ localPort: 17860 });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_PUBLIC_URL: "http://127.0.0.1:17860",
      MLCLAW_LOCAL_ACCESS_USER: "alice",
      MLCLAW_ALLOWED_USERS: "alice",
      MLCLAW_ADMINS: "alice",
    });
  });

  it("restores a running local gateway when a port change fails", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    await expect(
      main(["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime),
    ).resolves.toBe(0);
    runtime.dockerRunner.calls.length = 0;
    runtime.dockerRunner.runErrors.push(new Error("port is already allocated"));

    await expect(main(["gateway", "start", "research", "--local-port", "17860", "--no-pull"], runtime)).resolves.toBe(
      1,
    );

    expect(stderr.join("\n")).toContain("port is already allocated");
    expect(runtime.dockerRunner.inspectValue?.running).toBe(true);
    expect(
      runtime.dockerRunner.calls
        .filter((call) => call.name === "run")
        .map((call) => (call.args[0] as ContainerRunParams).publishedPorts[0]?.hostPort),
    ).toEqual([17860, 7860]);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({ localPort: 7860 });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_PUBLIC_URL: "http://127.0.0.1:7860",
    });
  });

  it("fails bootstrap when the local container exits during startup", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    runtime.dockerRunner.run = async (params) => {
      runtime.dockerRunner.calls.push({ name: "run", args: [params] });
      runtime.dockerRunner.inspectValue = { exists: true, running: false, status: "exited" };
    };

    const code = await main(
      ["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"],
      runtime,
    );

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("local gateway exited during startup");
    expect(stderr.join("\n")).toContain("mlclaw gateway logs research");
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

    const code = await main(
      ["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"],
      runtime,
    );

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

    const code = await main(
      [
        "--gateway",
        "local",
        "--name",
        "research",
        "--docker-context",
        "colima",
        "--gateway-token",
        "gateway-token",
        "--no-pull",
      ],
      runtime,
    );

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
      ...(await createRuntime(hub, prompt)),
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

    expect(stdout.join("\n")).toContain(
      "Using Docker context desktop-linux from the deployment manifest. Current shell context is colima.",
    );
    expect(stdout.join("\n")).toContain("Container: Docker context desktop-linux");
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

  it("does not stop a legacy local gateway before Router credential validation", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = { ...(await createRuntime(hub, prompt, stderr)), env: {} };
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "local",
      model: DEFAULT_MODEL,
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      localGateway: { engine: "docker", dockerContext: "desktop-linux" },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    await writeSecretEnv(runtime.configRoot, "research", {
      HF_TOKEN: "hf_legacy_broad",
      HUGGINGFACE_HUB_TOKEN: "hf_legacy_broad",
    });
    runtime.dockerRunner.inspectValue = { exists: true, running: true, status: "running" };

    const code = await main(["gateway", "restart", "research", "--no-pull"], runtime);

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("dedicated inference token");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
  });

  it("uses an explicit bootstrap bucket as the durable state pointer", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);

    const code = await main(
      [
        "--gateway",
        "local",
        "--name",
        "research",
        "--bucket",
        "alice/research-archive-data",
        "--gateway-token",
        "gateway-token",
        "--no-pull",
      ],
      runtime,
    );

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

    const code = await main(
      [
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
      ],
      runtime,
    );

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

  it("routes bootstrap bucket changes through state adoption", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    const original: DeploymentManifest = {
      version: 2,
      deploymentId: "11111111-1111-5111-a111-111111111111",
      desiredGeneration: 1,
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

    const code = await main(
      [
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
      ],
      runtime,
    );

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("bootstrap cannot move state");
    expect(stderr.join("\n")).toContain("mlclaw state adopt research --bucket alice/new-data");
    await expect(readManifest(runtime.configRoot, "research")).resolves.toEqual(original);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("verifies a no-op bootstrap without restarting the running local gateway", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);

    await expect(
      main(["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime),
    ).resolves.toBe(0);
    const original = await readManifest(runtime.configRoot, "research");
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: original.localRuntimeId,
        gatewayLocation: "local",
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        startedAt: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
      }) + "\n",
    );
    runtime.dockerRunner.calls.length = 0;

    await expect(main(["bootstrap", "--name", "research", "--gateway-token", "gateway-token"], runtime)).resolves.toBe(
      0,
    );

    const refreshed = await readManifest(runtime.configRoot, "research");
    expect(refreshed.localRuntimeId).toBe(original.localRuntimeId);
    expect(runtime.dockerRunner.calls.map((call) => call.name)).toEqual(["inspect"]);
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_RUNTIME_ID: original.localRuntimeId,
    });
  });

  it("recreates a local gateway when its running image drifts from desired state", async () => {
    const hub = createFakeHub();
    const runtime = await createRuntime(hub, createPrompt([]).prompt);
    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    runtime.dockerRunner.inspectValue = {
      exists: true,
      running: true,
      status: "running",
      image: "registry.example/mlclaw:drifted",
    };
    runtime.dockerRunner.calls.length = 0;

    await expect(main(["bootstrap", "--name", "research", "--no-pull"], runtime)).resolves.toBe(0);

    expect(runtime.dockerRunner.calls.some((call) => call.name === "rm")).toBe(true);
    expect(runtime.dockerRunner.calls).toContainEqual({
      name: "run",
      args: [expect.objectContaining({ image: DEFAULT_RUNTIME_IMAGE })],
    });
  });

  it("resumes an interrupted target generation without applying a new generation", async () => {
    const hub = createFakeHub();
    const runtime = await createRuntime(hub, createPrompt([]).prompt);
    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    const current = await readManifest(runtime.configRoot, "research");
    const interrupted: DeploymentManifest = {
      ...current,
      desiredGeneration: current.desiredGeneration + 1,
      model: "test-provider/interrupted-model",
      updatedAt: "2026-07-16T00:01:00.000Z",
    };
    await writeManifest(runtime.configRoot, interrupted);
    const operation = newOperation(interrupted, new Date("2026-07-16T00:01:00.000Z"));
    await updateOperation(
      runtime.configRoot,
      hub.bucket(interrupted.bucket),
      operation,
      "applying",
      new Date("2026-07-16T00:01:00.000Z"),
    );

    await expect(main(["bootstrap", "--name", "research", "--gateway", "local", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    expect(JSON.parse(hub.bucketObjects.get(".mlclaw/desired-state.json") ?? "null")).toMatchObject({
      generation: interrupted.desiredGeneration,
      model: "test-provider/interrupted-model",
    });
    expect([...hub.bucketObjects.keys()].filter((key) => key.startsWith(".mlclaw/operations/"))).toHaveLength(2);
  });

  it("fails closed when canonical desired state is newer than the local cache", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    await expect(
      main(["--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"], runtime),
    ).resolves.toBe(0);
    const desired = JSON.parse(hub.bucketObjects.get(".mlclaw/desired-state.json") ?? "null") as Record<
      string,
      unknown
    >;
    hub.bucketObjects.set(
      ".mlclaw/desired-state.json",
      JSON.stringify({ ...desired, generation: 5, model: "huggingface/example/newer-model:provider" }),
    );
    runtime.dockerRunner.calls.length = 0;

    await expect(main(["gateway", "stop", "research"], runtime)).resolves.toBe(1);
    expect(stderr.join("\n")).toContain("canonical desired state generation 5 is newer");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
  });

  it("refuses to reconcile a deployment through its tombstoned bucket", async () => {
    const hub = createFakeHub();
    const errors: string[] = [];
    const runtime = await createRuntime(hub, createPrompt([]).prompt, errors);
    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    const manifest = await readManifest(runtime.configRoot, "research");
    hub.bucketObjects.set(
      ".mlclaw/tombstone.json",
      JSON.stringify({
        schemaVersion: 1,
        deploymentId: manifest.deploymentId,
        movedTo: "alice/research-archive-data",
        tombstonedAt: "2026-07-16T00:00:00.000Z",
      }),
    );
    runtime.dockerRunner.calls.length = 0;

    await expect(main(["gateway", "stop", "research"], runtime)).resolves.toBe(1);

    expect(errors.join("\n")).toContain("was moved to alice/research-archive-data and cannot be reconciled");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
  });

  it("refuses to reconcile a bucket through a different owner identity", async () => {
    const hub = createFakeHub();
    const errors: string[] = [];
    const runtime = await createRuntime(hub, createPrompt([]).prompt, errors);
    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    runtime.dockerRunner.calls.length = 0;

    await expect(
      main(["bootstrap", "--gateway", "local", "--name", "research", "--owner", "research-org", "--no-pull"], runtime),
    ).resolves.toBe(1);

    expect(errors.join("\n")).toContain("different canonical deployment identity");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("does not rewrite local config when bootstrap is blocked by a live Space lease", async () => {
    const hub = createFakeHub();
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: "space-someone-else",
        gatewayLocation: "space",
        runtimeImage: "example/runtime:old",
        startedAt: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
      }) + "\n",
    );
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    const original: DeploymentManifest = {
      version: 2,
      deploymentId: "22222222-2222-5222-a222-222222222222",
      desiredGeneration: 1,
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

    const code = await main(
      [
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
      ],
      runtime,
    );

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("another gateway appears active");
    await expect(readManifest(runtime.configRoot, "research")).resolves.toEqual(original);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
  });

  it("blocks Space bootstrap when a local gateway lease is live", async () => {
    const hub = createFakeHub({ existingBuckets: ["alice/research-data"] });
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: "local-research-existing",
        gatewayLocation: "local",
        runtimeImage: "example/runtime:old",
        startedAt: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
      }) + "\n",
    );
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    const code = await main(
      [
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
      ],
      runtime,
    );

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("another gateway appears active");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    await expect(readManifest(runtime.configRoot, "research")).rejects.toThrow();
  });

  it("runs bootstrap as Space gateway when requested and prompts for paid hardware", async () => {
    const hub = createFakeHub();
    const { prompt, notes } = createPrompt([true]);

    const code = await main(
      [
        "bootstrap",
        "--gateway",
        "space",
        "--name",
        "research",
        "--telegram-token",
        "telegram-token",
        "--telegram-user-id",
        "1234567890",
      ],
      await createRuntime(hub, prompt),
    );

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
      {
        title: "HERE IS YOUR ML CLAW",
        message:
          "Your agent is deploying and will be available shortly.\n\nhttps://huggingface.co/spaces/alice/research",
      },
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
    expect(hub.calls.some((call) => call.name === "requestSpaceHardware")).toBe(false);
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

    const code = await main(
      [
        "bootstrap",
        "--gateway",
        "space",
        "--telegram-token",
        "telegram-token",
        "--telegram-user-id",
        "1234567890",
        "--gateway-token",
        "gateway-token",
      ],
      await createRuntime(hub, prompt, stderr),
    );

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("paid Hugging Face Space hardware requires explicit consent");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("rejects free Space hardware when Telegram is configured", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];

    const code = await main(
      [
        "bootstrap",
        "--gateway",
        "space",
        "--telegram-token",
        "telegram-token",
        "--telegram-user-id",
        "1234567890",
        "--hardware",
        "cpu-basic",
      ],
      await createRuntime(hub, prompt, stderr),
    );

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("Telegram requires upgraded paid Space hardware");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("runs non-interactive browser Space bootstrap without Telegram", async () => {
    const hub = createFakeHub();
    const { prompt, notes } = createPrompt([], false);
    const stderr: string[] = [];
    const output: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt, stderr)),
      stdout: { log: (message: unknown) => output.push(String(message)) },
      prompt: {
        ...prompt,
        outro: (message: string) => output.push(message),
      },
    };

    const code = await main(["bootstrap", "--name", "research", "--yes"], runtime);

    expect(code).toBe(0);
    expect(stderr.join("\n")).toBe("");
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "Bootstrap plan",
        message: expect.stringContaining("Hardware: default Space CPU"),
      }),
    );
    expect(output.join("\n")).toContain("Agent URL: https://huggingface.co/spaces/alice/research");
    expect(output.join("\n")).toContain("Space deployment triggered: alice/research");
    expect(notes).toContainEqual({
      title: "HERE IS YOUR ML CLAW",
      message: "Your agent is deploying and will be available shortly.\n\nhttps://huggingface.co/spaces/alice/research",
    });
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["alice/research", { private: true }],
    });
    expect(hub.calls.findIndex((call) => call.name === "createDockerSpace")).toBeLessThan(
      hub.calls.findIndex((call) => call.name === "createBucket"),
    );
    expect(hub.calls.some((call) => call.name === "requestSpaceHardware")).toBe(false);
    expect(hub.calls.some((call) => call.name === "restartSpace")).toBe(false);
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_ALLOWED_USERS", "alice"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_ADMINS", "alice"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_STATE_MOUNT_DIR", "/data/mlclaw-state"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "OPENCLAW_LIVE_DIR", "/home/node/.local/share/mlclaw/live"],
    });
    expect(hub.calls).toContainEqual({
      name: "setSpaceVolumes",
      args: [
        "alice/research",
        [{ type: "bucket", source: "alice/research-data", mountPath: "/data/mlclaw-state", readOnly: false }],
      ],
    });
    expect(
      hub.calls.some(
        (call) =>
          call.name === "addSpaceSecret" && ["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN"].includes(String(call.args[1])),
      ),
    ).toBe(false);
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_ROUTER_TOKEN", "hf_router_test"],
    });
    expect(hub.calls).toContainEqual({ name: "deleteSpaceSecret", args: ["alice/research", "HF_TOKEN"] });
    expect(hub.calls).toContainEqual({ name: "deleteSpaceSecret", args: ["alice/research", "HUGGINGFACE_HUB_TOKEN"] });
    expect(hub.calls.some((call) => call.name === "addSpaceSecret" && call.args[1] === "TELEGRAM_BOT_TOKEN")).toBe(
      false,
    );
    for (const [index, call] of hub.calls.entries()) {
      if (
        call.name === "addSpaceVariable" ||
        call.name === "addSpaceSecret" ||
        call.name === "deleteSpaceSecret" ||
        call.name === "setSpaceVolumes"
      ) {
        expect(hub.calls[index - 1]?.name).toBe("control.read");
      }
    }
  });

  it("offers a ready local runtime when Docker Space creation requires PRO", async () => {
    const hub = createFakeHub({
      createDockerSpaceError: new HubApiError(402, "https://huggingface.co/api/repos/create", "PRO required"),
    });
    const { prompt, notes } = createPrompt([true, "local", true]);
    const runtime = await createRuntime(hub, prompt);

    const code = await main(["bootstrap", "--name", "research", "--no-pull"], runtime);

    expect(code).toBe(0);
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "Hosted gateway unavailable",
        message: expect.stringContaining("Docker context desktop-linux is ready"),
      }),
    );
    expect(hub.calls).toContainEqual({ name: "createBucket", args: ["alice/research-data", true] });
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(true);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      gatewayLocation: "local",
      localGateway: { engine: "docker", dockerContext: "desktop-linux" },
    });
  });

  it("does not create the bucket before a hosted eligibility failure", async () => {
    const hub = createFakeHub({
      createDockerSpaceError: new HubApiError(402, "https://huggingface.co/api/repos/create", "PRO required"),
    });
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];

    const code = await main(["bootstrap", "--name", "research", "--yes"], await createRuntime(hub, prompt, stderr));

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("--allow-local-fallback");
    expect(hub.calls.some((call) => call.name === "createBucket")).toBe(false);
  });

  it("supports explicit non-interactive local fallback", async () => {
    const hub = createFakeHub({
      createDockerSpaceError: new HubApiError(402, "https://huggingface.co/api/repos/create", "PRO required"),
    });
    const { prompt } = createPrompt([], false);
    const runtime = await createRuntime(hub, prompt);

    const code = await main(
      ["bootstrap", "--name", "research", "--yes", "--allow-local-fallback", "--no-pull"],
      runtime,
    );

    expect(code).toBe(0);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(true);
  });

  it("reports both local runtime failures after hosted eligibility failure", async () => {
    const hub = createFakeHub({
      createDockerSpaceError: new HubApiError(402, "https://huggingface.co/api/repos/create", "PRO required"),
    });
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    runtime.dockerRunner.contexts.clear();
    runtime.podmanRunner.contexts.clear();

    const code = await main(["bootstrap", "--name", "research", "--yes", "--allow-local-fallback"], runtime);

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("no local fallback is ready");
    expect(stderr.join("\n")).toContain("docker unavailable");
    expect(stderr.join("\n")).toContain("podman unavailable");
    expect(hub.calls.some((call) => call.name === "createBucket")).toBe(false);
  });

  it("can bootstrap a local gateway with Podman", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const runtime = await createRuntime(hub, prompt);

    const code = await main(
      ["bootstrap", "--gateway", "local", "--container-runtime", "podman", "--name", "research", "--yes", "--no-pull"],
      runtime,
    );

    expect(code).toBe(0);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(false);
    expect(runtime.podmanRunner.calls.some((call) => call.name === "run")).toBe(true);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: { engine: "podman", podmanConnection: "local" },
    });
    runtime.podmanRunner.calls.length = 0;
    await expect(main(["gateway", "status", "research"], runtime)).resolves.toBe(0);
    expect(runtime.podmanRunner.calls).toContainEqual({
      name: "inspect",
      args: ["mlclaw-research", "local"],
    });
  });

  it("rejects a Docker context with an explicit Podman runtime", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];

    const code = await main(
      [
        "bootstrap",
        "--gateway",
        "local",
        "--container-runtime",
        "podman",
        "--docker-context",
        "desktop-linux",
        "--name",
        "research",
        "--yes",
      ],
      await createRuntime(hub, prompt, stderr),
    );

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("--docker-context cannot be used with --container-runtime podman");
    expect(hub.calls.some((call) => call.name === "createBucket")).toBe(false);
  });

  it("uses the active broad token behind HF Broker for non-interactive Space bootstrap", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt, stderr)),
      env: {},
    };

    const code = await main(["bootstrap", "--name", "research", "--yes"], runtime);

    expect(code).toBe(0);
    expect(stderr.join("\n")).toBe("");
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_BROKER_HF_TOKEN", "hf_test_token"],
    });
  });

  it("uses the active broad token behind HF Broker for a non-interactive local gateway", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt, stderr)),
      env: {},
    };

    const code = await main(
      [
        "bootstrap",
        "--gateway",
        "local",
        "--name",
        "research",
        "--gateway-token",
        "gateway-token",
        "--no-pull",
        "--yes",
      ],
      runtime,
    );

    expect(code).toBe(0);
    expect(stderr.join("\n")).toBe("");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(true);
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_BROKER_HF_TOKEN: "hf_test_token",
    });
  });

  it("reuses a persisted Router token for non-interactive Space bootstrap", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt, stderr)),
      env: {},
    };
    await writeSecretEnv(runtime.configRoot, "research", {
      HF_TOKEN: "hf_test_token",
      OPENCLAW_HF_STATE_BUCKET: "alice/research-data",
      OPENCLAW_AGENT_NAME: "research",
      OPENCLAW_MODEL: DEFAULT_MODEL,
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_ID: "space-research",
      MLCLAW_RUNTIME_IMAGE: DEFAULT_RUNTIME_IMAGE,
      MLCLAW_SESSION_SECRET: "session-secret",
      MLCLAW_ROUTER_TOKEN: "hf_router_saved",
    });

    const code = await main(["bootstrap", "--name", "research", "--yes"], runtime);

    expect(code).toBe(0);
    expect(stderr.join("\n")).toBe("");
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_ROUTER_TOKEN", "hf_router_saved"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_CREDENTIAL_KEY", expect.any(String)],
    });
  });

  it("does not overwrite Space volumes when runtime volume metadata cannot be read", async () => {
    const hub = createFakeHub({
      getSpaceRuntimeError: new Error("runtime metadata unavailable"),
    });
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    const code = await main(["bootstrap", "--name", "research", "--yes"], runtime);

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("runtime metadata unavailable");
    expect(hub.calls.some((call) => call.name === "setSpaceVolumes")).toBe(false);
  });

  it("does not overwrite Space volumes when runtime volume metadata is omitted", async () => {
    const hub = createFakeHub({
      spaceRuntime: { stage: "RUNNING", hardware: "cpu-basic", requested_hardware: "cpu-basic", sleep_time: -1 },
      existingSpaces: ["alice/research"],
    });
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    const code = await main(["bootstrap", "--name", "research", "--yes"], runtime);

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("did not include volumes");
    expect(hub.calls.some((call) => call.name === "setSpaceVolumes")).toBe(false);
  });

  it("sets the first Space volume when a new Space omits runtime volume metadata", async () => {
    const hub = createFakeHub({
      spaceRuntime: { stage: "RUNNING", hardware: "cpu-basic", requested_hardware: "cpu-basic", sleep_time: -1 },
    });
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    const code = await main(["bootstrap", "--name", "research", "--yes"], runtime);

    expect(code).toBe(0);
    expect(stderr.join("\n")).toBe("");
    expect(hub.calls).toContainEqual({
      name: "setSpaceVolumes",
      args: [
        "alice/research",
        [{ type: "bucket", source: "alice/research-data", mountPath: "/data/mlclaw-state", readOnly: false }],
      ],
    });
  });

  it("shows existing bucket and Space actions before bootstrap updates resources", async () => {
    const hub = createFakeHub({
      existingBuckets: ["alice/mlclaw-data"],
      existingSpaces: ["alice/mlclaw"],
    });
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "mlclaw",
        runtimeId: "space-mlclaw",
        gatewayLocation: "space",
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        startedAt: "2026-06-16T00:00:00.000Z",
        lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
      }) + "\n",
    );
    const { prompt, notes } = createPrompt([]);
    const stdout: string[] = [];

    const code = await main(["bootstrap", "--name", "mlclaw"], {
      ...(await createRuntime(hub, prompt)),
      stdout: { log: (message: unknown) => stdout.push(String(message)) },
    });

    expect(code).toBe(0);
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "Bootstrap plan",
        message: expect.stringContaining("Bucket: alice/mlclaw-data (exists; keeping 1 object(s))"),
      }),
    );
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "Bootstrap plan",
        message: expect.stringContaining(
          "Space: alice/mlclaw (exists; files, variables, secrets, and runtime will be updated)",
        ),
      }),
    );
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "Bootstrap plan",
        message: expect.stringContaining("Hardware: unchanged Space hardware"),
      }),
    );
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "Bootstrap plan",
        message: expect.stringContaining("Fresh deployment: use a different name, for example --name mlclaw-2"),
      }),
    );
    expect(stdout.join("\n")).toContain("Using existing private bucket alice/mlclaw-data");
    expect(stdout.join("\n")).toContain("Updating existing Space alice/mlclaw");
    expect(hub.calls).toContainEqual({ name: "bucketExists", args: ["alice/mlclaw-data"] });
    expect(hub.calls).toContainEqual({ name: "spaceExists", args: ["alice/mlclaw"] });
    expect(hub.calls).not.toContainEqual({ name: "createBucket", args: ["alice/mlclaw-data", true] });
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    expect(hub.calls.some((call) => call.name === "requestSpaceHardware")).toBe(false);
  });

  it("lets the user enter an alternative name when bootstrap resources already exist", async () => {
    const hub = createFakeHub({
      existingBuckets: ["alice/mlclaw-data"],
      existingSpaces: ["alice/mlclaw"],
    });
    const { prompt, notes } = createPrompt(["mlclaw-fresh"]);
    const runtime = await createRuntime(hub, prompt);

    const code = await main(["bootstrap", "--name", "mlclaw"], runtime);

    expect(code).toBe(0);
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "Existing resources",
        message: expect.stringContaining("Enter another name for a fresh deployment"),
      }),
    );
    expect(notes).toContainEqual(
      expect.objectContaining({
        title: "Bootstrap plan",
        message: expect.stringContaining("Agent: mlclaw-fresh"),
      }),
    );
    expect(hub.calls).toContainEqual({ name: "bucketExists", args: ["alice/mlclaw-data"] });
    expect(hub.calls).toContainEqual({ name: "spaceExists", args: ["alice/mlclaw"] });
    expect(hub.calls).toContainEqual({ name: "bucketExists", args: ["alice/mlclaw-fresh-data"] });
    expect(hub.calls).toContainEqual({ name: "spaceExists", args: ["alice/mlclaw-fresh"] });
    expect(hub.calls).toContainEqual({ name: "createBucket", args: ["alice/mlclaw-fresh-data", true] });
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["alice/mlclaw-fresh", { private: true }],
    });
    expect(hub.calls.some((call) => call.name === "requestSpaceHardware")).toBe(false);
    await expect(readManifest(runtime.configRoot, "mlclaw-fresh")).resolves.toMatchObject({
      agent: "mlclaw-fresh",
      bucket: "alice/mlclaw-fresh-data",
      space: "alice/mlclaw-fresh",
    });
  });

  it("can create a public browser Space when requested", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);

    const code = await main(
      ["bootstrap", "--name", "research", "--public-space", "--yes"],
      await createRuntime(hub, prompt),
    );

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["alice/research", { private: false }],
    });
    expect(hub.calls.some((call) => call.name === "requestSpaceHardware")).toBe(false);
  });

  it("updates an existing private Space when public visibility is requested", async () => {
    const hub = createFakeHub({ existingSpaces: ["alice/research"] });
    const runtime = await createRuntime(hub, createPrompt([], false).prompt);

    await expect(main(["bootstrap", "--name", "research", "--public-space", "--yes"], runtime)).resolves.toBe(0);

    expect(hub.calls).toContainEqual({
      name: "updateSpaceVisibility",
      args: ["alice/research", "public"],
    });
    expect(hub.calls.findIndex((call) => call.name === "updateSpaceVisibility")).toBeGreaterThan(
      hub.calls.findIndex((call) => call.name === "control.compareAndSwap"),
    );
    expect(JSON.parse(hub.bucketObjects.get(".mlclaw/desired-state.json") ?? "null")).toMatchObject({
      space: { visibility: "public" },
    });
  });

  it("preserves the actual visibility of a legacy Space manifest", async () => {
    const hub = createFakeHub({
      existingSpaces: ["alice/research"],
      spaceVisibilities: { "alice/research": "public" },
    });
    const runtime = await createRuntime(hub, createPrompt([], false).prompt);
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "space",
      model: DEFAULT_MODEL,
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(main(["bootstrap", "--name", "research", "--yes"], runtime)).resolves.toBe(0);

    expect(hub.calls.some((call) => call.name === "updateSpaceVisibility")).toBe(false);
    expect(JSON.parse(hub.bucketObjects.get(".mlclaw/desired-state.json") ?? "null")).toMatchObject({
      space: { visibility: "public" },
    });
  });

  it("preserves portable Space settings when rerun flags are omitted", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const runtime = await createRuntime(hub, prompt);
    await expect(
      main(
        [
          "bootstrap",
          "--name",
          "research",
          "--public-space",
          "--hardware",
          "cpu-upgrade",
          "--sleep-time",
          "42",
          "--yes",
        ],
        runtime,
      ),
    ).resolves.toBe(0);

    await expect(main(["bootstrap", "--yes"], runtime)).resolves.toBe(0);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      spaceVisibility: "public",
      spaceHardware: "cpu-upgrade",
      spaceSleepTime: 42,
    });
    expect(JSON.parse(hub.bucketObjects.get(".mlclaw/desired-state.json") ?? "null")).toMatchObject({
      space: { visibility: "public", hardware: "cpu-upgrade", sleepTime: 42 },
    });
  });

  it("verifies an unchanged Space without redeploying it", async () => {
    const hub = createFakeHub();
    const runtime = await createRuntime(hub, createPrompt([], false).prompt);
    await expect(main(["bootstrap", "--name", "research", "--yes"], runtime)).resolves.toBe(0);
    hub.calls.length = 0;

    await expect(main(["bootstrap", "--yes"], runtime)).resolves.toBe(0);
    expect(hub.calls.some((call) => call.name === "getSpaceRuntime")).toBe(true);
    expect(
      hub.calls.some((call) =>
        ["addSpaceVariable", "addSpaceSecret", "requestSpaceHardware", "setSpaceSleepTime", "restartSpace"].includes(
          call.name,
        ),
      ),
    ).toBe(false);
  });

  it("fully redeploys a Space that was deleted outside ML Claw", async () => {
    const hub = createFakeHub();
    const baseRuntime = await createRuntime(hub, createPrompt([], false).prompt);
    let pushes = 0;
    const runtime = {
      ...baseRuntime,
      pushTemplateToSpace: async () => {
        pushes += 1;
        return { templateRev: "test-template" };
      },
    };
    await expect(main(["bootstrap", "--name", "research", "--yes"], runtime)).resolves.toBe(0);
    hub.existingSpaces.delete("alice/research");
    pushes = 0;

    await expect(main(["bootstrap", "--yes"], runtime)).resolves.toBe(0);

    expect(pushes).toBe(1);
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["alice/research", { private: true }],
    });
  });

  it("repairs drifted Space variables and bucket mounts", async () => {
    const hub = createFakeHub();
    const baseRuntime = await createRuntime(hub, createPrompt([], false).prompt);
    let pushes = 0;
    const runtime = {
      ...baseRuntime,
      pushTemplateToSpace: async () => {
        pushes += 1;
        return { templateRev: "test-template" };
      },
    };
    await expect(main(["bootstrap", "--name", "research", "--yes"], runtime)).resolves.toBe(0);
    hub.variables.delete("OPENCLAW_MODEL");
    hub.volumes.length = 0;
    pushes = 0;

    await expect(main(["bootstrap", "--yes"], runtime)).resolves.toBe(0);

    expect(pushes).toBe(1);
    expect(hub.variables.get("OPENCLAW_MODEL")?.value).toBe(DEFAULT_MODEL);
    expect(hub.volumes).toContainEqual(
      expect.objectContaining({
        type: "bucket",
        source: "alice/research-data",
        mountPath: "/data/mlclaw-state",
      }),
    );
  });

  it("persists a newer canonical generation during an unchanged Space bootstrap", async () => {
    const hub = createFakeHub();
    const runtime = await createRuntime(hub, createPrompt([], false).prompt);
    await expect(main(["bootstrap", "--name", "research", "--yes"], runtime)).resolves.toBe(0);
    const desired = JSON.parse(hub.bucketObjects.get(".mlclaw/desired-state.json") ?? "null") as Record<
      string,
      unknown
    >;
    hub.bucketObjects.set(".mlclaw/desired-state.json", JSON.stringify({ ...desired, generation: 7 }));

    await expect(main(["bootstrap", "--yes"], runtime)).resolves.toBe(0);

    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({ desiredGeneration: 7 });
  });

  it("applies rotated credentials to an unchanged Space without redeploying it", async () => {
    const hub = createFakeHub();
    const baseRuntime = await createRuntime(hub, createPrompt([], false).prompt);
    let pushes = 0;
    const runtime = {
      ...baseRuntime,
      pushTemplateToSpace: async () => {
        pushes += 1;
        return { templateRev: "test-template" };
      },
    };
    await expect(main(["bootstrap", "--name", "research", "--yes"], runtime)).resolves.toBe(0);
    pushes = 0;
    hub.calls.length = 0;

    await expect(main(["bootstrap", "--yes", "--router-token", "hf_router_rotated"], runtime)).resolves.toBe(0);

    expect(pushes).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_ROUTER_TOKEN", "hf_router_rotated"],
    });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_ROUTER_TOKEN: "hf_router_rotated",
    });
  });

  it("preserves a deployment's custom runtime image during a Space update", async () => {
    const hub = createFakeHub();
    const baseRuntime = await createRuntime(hub, createPrompt([], false).prompt);
    const pushed: Array<string | undefined> = [];
    const runtime = {
      ...baseRuntime,
      pushTemplateToSpace: async (params: { runtimeImage?: string }) => {
        pushed.push(params.runtimeImage);
        return { templateRev: "test-template" };
      },
    };
    await expect(
      main(["bootstrap", "--name", "research", "--runtime-image", "registry.example/mlclaw:custom", "--yes"], runtime),
    ).resolves.toBe(0);
    pushed.length = 0;

    await expect(main(["bootstrap", "--model", "example/provider-model", "--yes"], runtime)).resolves.toBe(0);

    expect(pushed).toEqual(["registry.example/mlclaw:custom"]);
  });

  it("restarts a paused Space during an unchanged bootstrap", async () => {
    const hub = createFakeHub({
      spaceRuntime: {
        stage: "PAUSED",
        hardware: "cpu-basic",
        requested_hardware: "cpu-basic",
        volumes: [
          {
            type: "bucket",
            source: "alice/research-data",
            mountPath: "/data/mlclaw-state",
            readOnly: false,
          },
        ],
      },
    });
    const runtime = await createRuntime(hub, createPrompt([], false).prompt);
    await expect(main(["bootstrap", "--name", "research", "--yes"], runtime)).resolves.toBe(0);
    hub.calls.length = 0;

    await expect(main(["bootstrap", "--yes"], runtime)).resolves.toBe(0);
    expect(hub.calls).toContainEqual({ name: "restartSpace", args: ["alice/research", true] });
    expect(hub.calls.some((call) => call.name === "addSpaceVariable" || call.name === "addSpaceSecret")).toBe(false);
  });

  it("allowlists the authenticated user for org-owned browser Spaces", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);

    const code = await main(
      ["bootstrap", "--name", "research", "--owner", "research-org", "--yes"],
      await createRuntime(hub, prompt),
    );

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["research-org/research", { private: true }],
    });
    expect(hub.calls.some((call) => call.name === "requestSpaceHardware")).toBe(false);
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
    const runtime = await createRuntime(hub, prompt);
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "space",
      model: DEFAULT_MODEL,
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    await writeSecretEnv(runtime.configRoot, "research", {
      OPENCLAW_HF_STATE_BUCKET: "alice/research-data",
    });

    const code = await main(
      ["settings", "alice/research", "--hardware", "cpu-upgrade", "--sleep-time", "-1", "--yes"],
      runtime,
    );

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "requestSpaceHardware",
      args: ["alice/research", "cpu-upgrade", -1],
    });
    expect(JSON.parse(hub.bucketObjects.get(".mlclaw/desired-state.json") ?? "null")).toMatchObject({
      space: { repo: "alice/research", hardware: "cpu-upgrade", sleepTime: -1 },
    });
  });

  it("requests explicit bootstrap hardware when updating an existing Space", async () => {
    const hub = createFakeHub({
      existingBuckets: ["alice/research-data"],
      existingSpaces: ["alice/research"],
    });
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: "space-research",
        gatewayLocation: "space",
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        startedAt: "2026-06-16T00:00:00.000Z",
        lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
      }) + "\n",
    );
    const { prompt } = createPrompt([], false);

    const code = await main(
      ["bootstrap", "--name", "research", "--hardware", "cpu-upgrade", "--yes"],
      await createRuntime(hub, prompt),
    );

    expect(code).toBe(0);
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    expect(hub.calls).toContainEqual({
      name: "requestSpaceHardware",
      args: ["alice/research", "cpu-upgrade", -1],
    });
  });

  it("updates explicit bootstrap sleep time without requesting hardware", async () => {
    const hub = createFakeHub({
      existingBuckets: ["alice/research-data"],
      existingSpaces: ["alice/research"],
    });
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: "space-research",
        gatewayLocation: "space",
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        startedAt: "2026-06-16T00:00:00.000Z",
        lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
      }) + "\n",
    );
    const { prompt } = createPrompt([], false);

    const code = await main(
      ["bootstrap", "--name", "research", "--sleep-time", "-1", "--yes"],
      await createRuntime(hub, prompt),
    );

    expect(code).toBe(0);
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    expect(hub.calls.some((call) => call.name === "requestSpaceHardware")).toBe(false);
    expect(hub.calls).toContainEqual({
      name: "setSpaceSleepTime",
      args: ["alice/research", -1],
    });
  });

  it("rejects settings gateway changes so migrations stay state-safe", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];

    const code = await main(["settings", "research", "--gateway", "local"], await createRuntime(hub, prompt, stderr));

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
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_BROKER_HF_TOKEN", "hf_test_token"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_GATEWAY_LOCATION", "space"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_RUNTIME_ID", "space-research"],
    });
    const allowedUsersIndex = hub.calls.findIndex(
      (call) =>
        call.name === "addSpaceVariable" &&
        call.args[0] === "alice/research" &&
        call.args[1] === "MLCLAW_ALLOWED_USERS",
    );
    const adminsIndex = hub.calls.findIndex(
      (call) =>
        call.name === "addSpaceVariable" && call.args[0] === "alice/research" && call.args[1] === "MLCLAW_ADMINS",
    );
    expect(allowedUsersIndex).toBeGreaterThanOrEqual(0);
    expect(adminsIndex).toBeGreaterThanOrEqual(0);
    expect(hub.calls.some((call) => call.name === "restartSpace")).toBe(false);
  });

  it("upgrades a legacy Router Space to the broker credential during update", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_TEMPLATE_REV", "old-template");
    await hub.addSpaceVariable("alice/research", "OPENCLAW_MODEL", DEFAULT_MODEL);
    await hub.addSpaceSecret("alice/research", "HF_TOKEN", "hf_legacy_broad");
    hub.calls.length = 0;
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const baseRuntime = await createRuntime(hub, prompt, stderr);
    let pushed = false;
    const runtime = {
      ...baseRuntime,
      env: {},
      pushTemplateToSpace: async () => {
        pushed = true;
        return { templateRev: "test-template" };
      },
    };

    const code = await main(["update", "alice/research"], runtime);

    expect(code).toBe(0);
    expect(stderr.join("\n")).toBe("");
    expect(pushed).toBe(true);
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_BROKER_HF_TOKEN", "hf_test_token"],
    });
    expect(hub.calls.some((call) => call.name === "restartSpace")).toBe(false);
  });

  it("replaces an existing Router token when update receives an explicit override", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_TEMPLATE_REV", "old-template");
    await hub.addSpaceVariable("alice/research", "OPENCLAW_MODEL", DEFAULT_MODEL);
    await hub.addSpaceSecret("alice/research", "MLCLAW_ROUTER_TOKEN", "hf_router_revoked");
    hub.calls.length = 0;
    const { prompt } = createPrompt([], false);
    const runtime = await createRuntime(hub, prompt);
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "space",
      model: DEFAULT_MODEL,
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    await writeSecretEnv(runtime.configRoot, "research", {
      MLCLAW_ROUTER_TOKEN: "hf_router_revoked",
    });

    const code = await main(["update", "alice/research", "--router-token", "hf_router_replacement"], runtime);

    expect(code).toBe(0);
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_ROUTER_TOKEN", "hf_router_replacement"],
    });
    await expect(readSecretEnv(runtime.configRoot, "research")).resolves.toMatchObject({
      MLCLAW_ROUTER_TOKEN: "hf_router_replacement",
    });
    expect(hub.calls.some((call) => call.name === "restartSpace")).toBe(false);
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
    expect(
      hub.calls.some(
        (call) =>
          call.name === "addSpaceVariable" &&
          call.args[0] === "alice/mlclaw-template" &&
          (call.args[1] === "MLCLAW_ALLOWED_USERS" || call.args[1] === "MLCLAW_ADMINS"),
      ),
    ).toBe(false);
    expect(hub.calls).not.toContainEqual({
      name: "assertBucketAccessible",
      args: [expect.anything()],
    });
    expect(hub.calls.some((call) => call.name === "fetchSpaceLogs")).toBe(false);
    expect(hub.calls.some((call) => call.name === "restartSpace")).toBe(false);
  });

  it("runs template-aware doctor checks for the canonical template Space", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/mlclaw-template", "MLCLAW_TEMPLATE_REV", "test-template");
    await hub.addSpaceVariable("alice/mlclaw-template", "MLCLAW_RUNTIME_IMAGE", DEFAULT_RUNTIME_IMAGE);
    await hub.addSpaceVariable("alice/mlclaw-template", "MLCLAW_CANONICAL_SPACE_ID", "alice/mlclaw-template");
    const { prompt } = createPrompt([]);
    const output: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt)),
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

  it("repairs app Space mounted state and removes stale broad Hub token secrets", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_STATE_BUCKET", "alice/research-data");
    await hub.addSpaceVariable("alice/research", "MLCLAW_TEMPLATE_REV", "test-template");
    await hub.addSpaceVariable("alice/research", "MLCLAW_GATEWAY_LOCATION", "space");
    await hub.addSpaceVariable("alice/research", "MLCLAW_RUNTIME_IMAGE", DEFAULT_RUNTIME_IMAGE);
    await hub.addSpaceVariable("alice/research", "MLCLAW_OPENCLAW_PORT", "7861");
    await hub.addSpaceVariable("alice/research", "OPENCLAW_GATEWAY_PORT", "7861");
    await hub.addSpaceVariable("alice/research", "MLCLAW_ALLOWED_USERS", "alice");
    await hub.addSpaceVariable("alice/research", "MLCLAW_ADMINS", "alice");
    await hub.addSpaceSecret("alice/research", "HF_TOKEN", "hf_old");
    await hub.addSpaceSecret("alice/research", "HUGGINGFACE_HUB_TOKEN", "hf_old");
    await hub.addSpaceSecret("alice/research", "MLCLAW_ROUTER_TOKEN", "hf_router");
    await hub.addSpaceSecret("alice/research", "MLCLAW_SESSION_SECRET", "session");
    hub.calls.length = 0;

    const { prompt } = createPrompt([]);
    const output: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt)),
      stdout: { log: (message: unknown) => output.push(String(message)) },
    };

    const code = await main(["doctor", "alice/research", "--fix"], runtime);

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("deleted stale secrets HF_TOKEN, HUGGINGFACE_HUB_TOKEN");
    expect(output.join("\n")).toContain("mounted bucket alice/research-data at /data/mlclaw-state");
    expect(output.join("\n")).toContain("set secret MLCLAW_CREDENTIAL_KEY");
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "MLCLAW_STATE_MOUNT_DIR", "/data/mlclaw-state"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceVariable",
      args: ["alice/research", "OPENCLAW_LIVE_DIR", "/home/node/.local/share/mlclaw/live"],
    });
    expect(hub.calls).toContainEqual({ name: "deleteSpaceSecret", args: ["alice/research", "HF_TOKEN"] });
    expect(hub.calls).toContainEqual({ name: "deleteSpaceSecret", args: ["alice/research", "HUGGINGFACE_HUB_TOKEN"] });
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_CREDENTIAL_KEY", expect.any(String)],
    });
    expect(hub.calls).toContainEqual({
      name: "setSpaceVolumes",
      args: [
        "alice/research",
        [{ type: "bucket", source: "alice/research-data", mountPath: "/data/mlclaw-state", readOnly: false }],
      ],
    });
  });

  it("recognizes snake_case Space volume metadata returned by the Hub", async () => {
    const hub = createFakeHub({
      spaceRuntime: {
        stage: "RUNNING",
        hardware: "cpu-basic",
        requested_hardware: "cpu-basic",
        sleep_time: 172800,
        volumes: [
          {
            type: "bucket",
            source: "alice/research-data",
            mount_path: "/data/mlclaw-state",
            read_only: false,
          },
        ],
      },
    });
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_STATE_BUCKET", "alice/research-data");
    await hub.addSpaceVariable("alice/research", "MLCLAW_STATE_MOUNT_DIR", "/data/mlclaw-state");
    await hub.addSpaceVariable("alice/research", "OPENCLAW_LIVE_DIR", "/home/node/.local/share/mlclaw/live");
    await hub.addSpaceVariable(
      "alice/research",
      "MLCLAW_RUNTIME_SETTINGS_FILE",
      "/home/node/.local/share/mlclaw/live/.mlclaw/settings.json",
    );
    await hub.addSpaceVariable("alice/research", "MLCLAW_TEMPLATE_REV", "test-template");
    await hub.addSpaceVariable("alice/research", "MLCLAW_GATEWAY_LOCATION", "space");
    await hub.addSpaceVariable("alice/research", "MLCLAW_RUNTIME_IMAGE", DEFAULT_RUNTIME_IMAGE);
    await hub.addSpaceVariable("alice/research", "MLCLAW_OPENCLAW_PORT", "7861");
    await hub.addSpaceVariable("alice/research", "OPENCLAW_GATEWAY_PORT", "7861");
    await hub.addSpaceVariable("alice/research", "MLCLAW_ALLOWED_USERS", "alice");
    await hub.addSpaceVariable("alice/research", "MLCLAW_ADMINS", "alice");
    await hub.addSpaceSecret("alice/research", "MLCLAW_SESSION_SECRET", "session");
    await hub.addSpaceSecret("alice/research", "MLCLAW_CREDENTIAL_KEY", "credential-key");
    await hub.addSpaceSecret("alice/research", "MLCLAW_BROKER_HF_TOKEN", "hf_broker");
    hub.calls.length = 0;

    const { prompt } = createPrompt([]);
    const output: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt)),
      stdout: { log: (message: unknown) => output.push(String(message)) },
    };

    const code = await main(["doctor", "alice/research"], runtime);

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("Doctor: clean");
    expect(hub.calls.some((call) => call.name === "setSpaceVolumes")).toBe(false);
  });

  it("installs the broker credential before deleting legacy broad Hub tokens", async () => {
    const hub = createFakeHub();
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_STATE_BUCKET", "alice/research-data");
    await hub.addSpaceVariable("alice/research", "OPENCLAW_MODEL", DEFAULT_MODEL);
    await hub.addSpaceVariable("alice/research", "MLCLAW_TEMPLATE_REV", "test-template");
    await hub.addSpaceVariable("alice/research", "MLCLAW_GATEWAY_LOCATION", "space");
    await hub.addSpaceVariable("alice/research", "MLCLAW_RUNTIME_IMAGE", DEFAULT_RUNTIME_IMAGE);
    await hub.addSpaceVariable("alice/research", "MLCLAW_OPENCLAW_PORT", "7861");
    await hub.addSpaceVariable("alice/research", "OPENCLAW_GATEWAY_PORT", "7861");
    await hub.addSpaceVariable("alice/research", "MLCLAW_ALLOWED_USERS", "alice");
    await hub.addSpaceVariable("alice/research", "MLCLAW_ADMINS", "alice");
    await hub.addSpaceSecret("alice/research", "HF_TOKEN", "hf_old");
    await hub.addSpaceSecret("alice/research", "MLCLAW_SESSION_SECRET", "session");
    await hub.addSpaceSecret("alice/research", "MLCLAW_CREDENTIAL_KEY", "credential-key");
    hub.calls.length = 0;

    const { prompt } = createPrompt([]);
    const output: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt)),
      stdout: { log: (message: unknown) => output.push(String(message)) },
    };

    const code = await main(["doctor", "alice/research", "--fix"], runtime);

    expect(code).toBe(0);
    expect(output.join("\n")).toContain("set secret MLCLAW_BROKER_HF_TOKEN");
    expect(output.join("\n")).toContain("deleted stale secret HF_TOKEN");
    expect(hub.calls).toContainEqual({ name: "deleteSpaceSecret", args: ["alice/research", "HF_TOKEN"] });
  });

  it("does not overwrite Space volumes during doctor --fix when runtime volume metadata is omitted", async () => {
    const hub = createFakeHub({
      spaceRuntime: { stage: "RUNNING", hardware: "cpu-basic", requested_hardware: "cpu-basic", sleep_time: -1 },
    });
    await hub.addSpaceVariable("alice/research", "OPENCLAW_HF_STATE_BUCKET", "alice/research-data");
    await hub.addSpaceVariable("alice/research", "OPENCLAW_MODEL", "openai/gpt-4.1-mini");
    await hub.addSpaceVariable("alice/research", "MLCLAW_TEMPLATE_REV", "test-template");
    await hub.addSpaceVariable("alice/research", "MLCLAW_GATEWAY_LOCATION", "space");
    await hub.addSpaceVariable("alice/research", "MLCLAW_RUNTIME_IMAGE", DEFAULT_RUNTIME_IMAGE);
    await hub.addSpaceVariable("alice/research", "MLCLAW_OPENCLAW_PORT", "7861");
    await hub.addSpaceVariable("alice/research", "OPENCLAW_GATEWAY_PORT", "7861");
    await hub.addSpaceVariable("alice/research", "MLCLAW_ALLOWED_USERS", "alice");
    await hub.addSpaceVariable("alice/research", "MLCLAW_ADMINS", "alice");
    await hub.addSpaceSecret("alice/research", "MLCLAW_SESSION_SECRET", "session");
    await hub.addSpaceSecret("alice/research", "MLCLAW_CREDENTIAL_KEY", "credential-key");
    hub.calls.length = 0;

    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    const code = await main(["doctor", "alice/research", "--fix"], runtime);

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("did not include volumes");
    expect(hub.calls.some((call) => call.name === "setSpaceVolumes")).toBe(false);
  });

  it("migrates local to Space and back without starting both gateways", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "1234567890"]);
    const runtime = await createRuntime(hub, prompt);
    runtime.tailscaleRunner.discovery = { ready: true, ipv4: "100.100.100.100", dnsName: "gateway.example.ts.net" };

    await expect(
      main(
        [
          "bootstrap",
          "--gateway",
          "local",
          "--name",
          "research",
          "--gateway-token",
          "gateway-token",
          "--tailscale=serve",
          "--no-pull",
        ],
        runtime,
      ),
    ).resolves.toBe(0);
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(main(["gateway", "migrate", "research", "--to", "space", "--yes"], runtime)).resolves.toBe(0);

    const disableRestartIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "disableRestart");
    const stopIndex = runtime.dockerRunner.calls.findIndex((call) => call.name === "stop");
    const localHandoffIndex = hub.calls.findIndex(
      (call) =>
        call.name === "bucket.uploadFiles" &&
        Array.isArray(call.args[0]) &&
        call.args[0].includes("openclaw-state/runtime/handoff-request.json"),
    );
    const createSpaceIndex = hub.calls.findIndex((call) => call.name === "createDockerSpace");
    expect(disableRestartIndex).toBeGreaterThanOrEqual(0);
    expect(stopIndex).toBeGreaterThanOrEqual(0);
    expect(stopIndex).toBeGreaterThan(disableRestartIndex);
    expect(localHandoffIndex).toBeGreaterThanOrEqual(0);
    expect(createSpaceIndex).toBeGreaterThan(localHandoffIndex);
    expect(hub.calls).toContainEqual({ name: "createDockerSpace", args: ["alice/research", expect.any(Object)] });
    expect(hub.calls.some((call) => call.name === "restartSpace")).toBe(false);
    expect(runtime.tailscaleRunner.state).toBe("free");
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      networkAccess: { enabled: false },
    });

    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(main(["gateway", "migrate", "research", "--to", "local", "--no-pull"], runtime)).resolves.toBe(0);

    const disableIndex = hub.calls.findIndex(
      (call) => call.name === "addSpaceVariable" && call.args[1] === "MLCLAW_GATEWAY_DISABLED" && call.args[2] === "1",
    );
    const handoffIndex = hub.calls.findIndex(
      (call) =>
        call.name === "bucket.uploadFiles" &&
        Array.isArray(call.args[0]) &&
        call.args[0].includes("openclaw-state/runtime/handoff-request.json"),
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
    expect(runtime.tailscaleRunner.state).toBe("owned");
  });

  it("reuses a persisted Router token when migrating local to Space", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = {
      ...(await createRuntime(hub, prompt, stderr)),
      env: {},
    };
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "local",
      model: DEFAULT_MODEL,
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    await writeSecretEnv(runtime.configRoot, "research", {
      HF_TOKEN: "hf_test_token",
      OPENCLAW_HF_STATE_BUCKET: "alice/research-data",
      OPENCLAW_AGENT_NAME: "research",
      OPENCLAW_MODEL: DEFAULT_MODEL,
      MLCLAW_GATEWAY_LOCATION: "local",
      MLCLAW_RUNTIME_ID: "local-research-existing",
      MLCLAW_RUNTIME_IMAGE: DEFAULT_RUNTIME_IMAGE,
      MLCLAW_SESSION_SECRET: "session-secret",
      MLCLAW_ROUTER_TOKEN: "hf_router_saved",
    });

    const code = await main(["gateway", "migrate", "research", "--to", "space", "--yes"], runtime);

    expect(code).toBe(0);
    expect(stderr.join("\n")).toBe("");
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_ROUTER_TOKEN", "hf_router_saved"],
    });
    expect(hub.calls).toContainEqual({
      name: "addSpaceSecret",
      args: ["alice/research", "MLCLAW_CREDENTIAL_KEY", expect.any(String)],
    });
  });

  it("rejects free Space hardware when migrating a Telegram-enabled local gateway", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    await writeSecretEnv(runtime.configRoot, "research", {
      ...(await readSecretEnv(runtime.configRoot, "research")),
      TELEGRAM_BOT_TOKEN: "telegram-token",
      TELEGRAM_ALLOWED_USERS: "1234567890",
    });
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(
      main(["gateway", "migrate", "research", "--to", "space", "--hardware", "cpu-basic"], runtime),
    ).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("Telegram requires upgraded paid Space hardware");
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
  });

  it("requests explicit hardware when migrating back to an existing Space", async () => {
    const hub = createFakeHub({ existingSpaces: ["alice/research"] });
    const { prompt } = createPrompt([]);
    const runtime = await createRuntime(hub, prompt);

    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(
      main(["gateway", "migrate", "research", "--to", "space", "--hardware", "cpu-upgrade", "--yes"], runtime),
    ).resolves.toBe(0);

    expect(hub.calls).toContainEqual({ name: "spaceExists", args: ["alice/research"] });
    expect(hub.calls).toContainEqual({
      name: "createDockerSpace",
      args: ["alice/research", { private: true, sleepTimeSeconds: -1 }],
    });
    expect(hub.calls).toContainEqual({
      name: "requestSpaceHardware",
      args: ["alice/research", "cpu-upgrade", -1],
    });
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

    await expect(
      main(["gateway", "migrate", "research", "--to", "local", "--docker-context", "colima", "--no-pull"], runtime),
    ).resolves.toBe(0);

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

  it("rejects conflicting local migration runtime flags before changing the deployment", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
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

    const code = await main(
      [
        "gateway",
        "migrate",
        "research",
        "--to",
        "local",
        "--container-runtime",
        "podman",
        "--docker-context",
        "colima",
      ],
      runtime,
    );

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("--docker-context cannot be used with --container-runtime podman");
    expect(hub.calls).toEqual([]);
    expect(runtime.dockerRunner.calls).toEqual([]);
    expect(runtime.podmanRunner.calls).toEqual([]);
  });

  it("adopts a state bucket for a local deployment and resets stale live disk", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "1234567890"]);
    const runtime = await createRuntime(hub, prompt);

    await expect(
      main(
        ["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"],
        runtime,
      ),
    ).resolves.toBe(0);
    seedValidStateSnapshot(hub);
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(
      main(["state", "adopt", "research", "--bucket", "alice/research-archive-data", "--yes", "--no-pull"], runtime),
    ).resolves.toBe(0);

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
    expect(JSON.parse(hub.bucketObjects.get(".mlclaw/tombstone.json") ?? "null")).toMatchObject({
      movedTo: "alice/research-archive-data",
    });
  });

  it("retries an interrupted old-bucket tombstone", async () => {
    const hub = createFakeHub({ failFirstTombstoneUpload: true });
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, createPrompt([]).prompt, stderr);
    await expect(
      main(
        ["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"],
        runtime,
      ),
    ).resolves.toBe(0);
    seedValidStateSnapshot(hub);

    const command = ["state", "adopt", "research", "--bucket", "alice/research-archive-data", "--yes", "--no-pull"];
    await expect(main(command, runtime)).resolves.toBe(1);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      bucket: "alice/research-archive-data",
      pendingTombstoneBucket: "alice/research-data",
    });

    await expect(main(command, runtime)).resolves.toBe(0);
    expect((await readManifest(runtime.configRoot, "research")).pendingTombstoneBucket).toBeUndefined();
    expect(JSON.parse(hub.bucketObjects.get(".mlclaw/tombstone.json") ?? "null")).toMatchObject({
      movedTo: "alice/research-archive-data",
    });
  });

  it("restarts the target gateway before completing an interrupted bucket adoption", async () => {
    const hub = createFakeHub();
    const errors: string[] = [];
    const runtime = await createRuntime(hub, createPrompt([]).prompt, errors);
    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    seedValidStateSnapshot(hub);
    runtime.dockerRunner.runErrors.push(new Error("simulated target startup failure"));
    const command = ["state", "adopt", "research", "--bucket", "alice/research-archive-data", "--yes", "--no-pull"];

    await expect(main(command, runtime)).resolves.toBe(1);
    expect(errors.join("\n")).toContain("simulated target startup failure");
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      bucket: "alice/research-archive-data",
      pendingTombstoneBucket: "alice/research-data",
    });
    expect(runtime.dockerRunner.inspectValue?.running).toBe(false);
    runtime.dockerRunner.calls.length = 0;

    await expect(main(command, runtime)).resolves.toBe(0);

    expect(runtime.dockerRunner.calls.some((call) => call.name === "run")).toBe(true);
    expect(runtime.dockerRunner.inspectValue?.running).toBe(true);
    expect((await readManifest(runtime.configRoot, "research")).pendingTombstoneBucket).toBeUndefined();
    expect(JSON.parse(hub.bucketObjects.get(".mlclaw/tombstone.json") ?? "null")).toMatchObject({
      movedTo: "alice/research-archive-data",
    });
  });

  it("refuses to adopt a bucket that has already been tombstoned", async () => {
    const hub = createFakeHub();
    const errors: string[] = [];
    const runtime = await createRuntime(hub, createPrompt([]).prompt, errors);
    await expect(main(["bootstrap", "--gateway", "local", "--name", "research", "--no-pull"], runtime)).resolves.toBe(
      0,
    );
    seedValidStateSnapshot(hub);
    hub.bucketObjects.set(
      ".mlclaw/tombstone.json",
      JSON.stringify({
        schemaVersion: 1,
        deploymentId: (await readManifest(runtime.configRoot, "research")).deploymentId,
        movedTo: "alice/current-data",
        tombstonedAt: "2026-07-16T00:00:00.000Z",
      }),
    );

    await expect(
      main(["state", "adopt", "research", "--bucket", "alice/retired-data", "--yes", "--no-pull"], runtime),
    ).resolves.toBe(1);
    expect(errors.join("\n")).toContain("was moved to alice/current-data and cannot be adopted again");
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      bucket: "alice/research-data",
    });
  });

  it("does not hand off a legacy local gateway before Router credential validation", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([], false);
    const stderr: string[] = [];
    const runtime = { ...(await createRuntime(hub, prompt, stderr)), env: {} };
    await writeManifest(runtime.configRoot, {
      version: 1,
      agent: "research",
      owner: "alice",
      bucket: "alice/research-data",
      space: "alice/research",
      localRuntimeId: "local-research-existing",
      gatewayLocation: "local",
      model: DEFAULT_MODEL,
      runtimeImage: DEFAULT_RUNTIME_IMAGE,
      localGateway: { engine: "docker", dockerContext: "desktop-linux" },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });
    await writeSecretEnv(runtime.configRoot, "research", {
      HF_TOKEN: "hf_legacy_broad",
      HUGGINGFACE_HUB_TOKEN: "hf_legacy_broad",
    });
    runtime.dockerRunner.inspectValue = { exists: true, running: true, status: "running" };

    const code = await main(
      ["state", "adopt", "research", "--bucket", "alice/research-archive-data", "--yes", "--no-pull"],
      runtime,
    );

    expect(code).toBe(1);
    expect(stderr.join("\n")).toContain("dedicated inference token");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
    expect(hub.calls.some((call) => call.name === "bucket.uploadFiles")).toBe(false);
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

    await expect(
      main(["gateway", "rebind", "research", "--docker-context", "colima", "--no-pull"], runtime),
    ).resolves.toBe(0);

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
    expect(
      hub.calls.some(
        (call) =>
          call.name === "bucket.uploadFiles" &&
          Array.isArray(call.args[0]) &&
          call.args[0].includes("openclaw-state/runtime/handoff-request.json"),
      ),
    ).toBe(true);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: {
        dockerContext: "colima",
        dockerEndpoint: "unix:///colima.sock",
      },
    });
  });

  it("rejects a remote rebind before touching a Tailscale-enabled gateway", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt([]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);
    runtime.dockerRunner.contexts.set("remote", "ssh://deploy@example.com");
    runtime.dockerRunner.inspectValue = {
      exists: true,
      running: true,
      status: "running",
      image: DEFAULT_RUNTIME_IMAGE,
    };
    runtime.tailscaleRunner.state = "owned";
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
      networkAccess: {
        provider: "tailscale-serve",
        enabled: true,
        dnsName: "gateway.example.ts.net",
        httpsPort: 17860,
        target: "http://127.0.0.1:7860",
        accessOrigin: "https://gateway.example.ts.net:17860",
      },
      createdAt: "2026-06-16T00:00:00.000Z",
      updatedAt: "2026-06-16T00:00:00.000Z",
    });

    await expect(
      main(["gateway", "rebind", "research", "--docker-context", "remote", "--no-pull"], runtime),
    ).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("requires the container runtime to run on this machine");
    expect(runtime.dockerRunner.calls).toEqual([]);
    expect(runtime.tailscaleRunner.calls).toEqual([]);
    expect(hub.calls).toEqual([]);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: { dockerContext: "desktop-linux" },
      networkAccess: { enabled: true },
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

    await expect(
      main(["gateway", "rebind", "research", "--docker-context", "colima", "--takeover", "--no-pull"], runtime),
    ).resolves.toBe(0);

    expect(runtime.dockerRunner.calls.some((call) => call.name === "disableRestart")).toBe(false);
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
    expect(
      hub.calls.some(
        (call) =>
          call.name === "bucket.uploadFiles" &&
          Array.isArray(call.args[0]) &&
          call.args[0].includes("openclaw-state/runtime/handoff-request.json"),
      ),
    ).toBe(false);
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

    await expect(
      main(["gateway", "rebind", "research", "--docker-context", "colima", "--no-pull"], runtime),
    ).resolves.toBe(1);
    await expect(readManifest(runtime.configRoot, "research")).resolves.toMatchObject({
      localGateway: {
        dockerContext: "desktop-linux",
      },
    });

    failRun = false;
    runtime.dockerRunner.calls.length = 0;
    await expect(
      main(["gateway", "rebind", "research", "--docker-context", "colima", "--no-pull"], runtime),
    ).resolves.toBe(0);

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

    await expect(
      main(["gateway", "rebind", "research", "--docker-context", "colima", "--takeover", "--no-pull"], runtime),
    ).resolves.toBe(0);

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
      ...(await createRuntime(hub, prompt)),
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
    hub.bucketObjects.set(
      "custom/prefix/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: "local-research-existing",
        gatewayLocation: "local",
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        startedAt: "2026-06-16T00:00:00.000Z",
        lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
      }) + "\n",
    );

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
      ...(await createRuntime(hub, prompt)),
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
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: "local-research-existing",
        gatewayLocation: "local",
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        startedAt: "2026-06-16T00:00:00.000Z",
        lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
      }) + "\n",
    );

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

    await expect(
      main(
        ["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"],
        runtime,
      ),
    ).resolves.toBe(0);
    await writeSecretEnv(runtime.configRoot, "research", {
      ...(await readSecretEnv(runtime.configRoot, "research")),
      OPENCLAW_HF_STATE_PREFIX: "custom/prefix",
    });
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;

    await expect(main(["gateway", "migrate", "research", "--to", "space", "--yes"], runtime)).resolves.toBe(0);

    expect(
      hub.calls.some(
        (call) =>
          call.name === "bucket.uploadFiles" &&
          Array.isArray(call.args[0]) &&
          call.args[0].includes("custom/prefix/runtime/handoff-request.json"),
      ),
    ).toBe(true);
    expect(
      hub.calls.some(
        (call) => call.name === "bucket.downloadFile" && call.args[0] === "openclaw-state/runtime/handoff-ack.json",
      ),
    ).toBe(false);
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

    await expect(
      main(
        ["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"],
        runtime,
      ),
    ).resolves.toBe(0);
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: "space-someone-else",
        gatewayLocation: "space",
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        startedAt: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
      }) + "\n",
    );

    await expect(main(["gateway", "migrate", "research", "--to", "space", "--yes"], runtime)).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("another gateway appears active");
    expect(runtime.dockerRunner.calls.some((call) => call.name === "stop")).toBe(false);
    expect(hub.calls.some((call) => call.name === "createDockerSpace")).toBe(false);
  });

  it("blocks Space to local migration when another live runtime owns the lease", async () => {
    const hub = createFakeHub();
    const { prompt } = createPrompt(["telegram-token", "1234567890"]);
    const stderr: string[] = [];
    const runtime = await createRuntime(hub, prompt, stderr);

    await expect(
      main(
        ["bootstrap", "--gateway", "local", "--name", "research", "--gateway-token", "gateway-token", "--no-pull"],
        runtime,
      ),
    ).resolves.toBe(0);
    await expect(main(["gateway", "migrate", "research", "--to", "space", "--yes"], runtime)).resolves.toBe(0);
    hub.calls.length = 0;
    runtime.dockerRunner.calls.length = 0;
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: "space-someone-else",
        gatewayLocation: "space",
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        startedAt: new Date().toISOString(),
        lastHeartbeatAt: new Date().toISOString(),
      }) + "\n",
    );

    await expect(main(["gateway", "migrate", "research", "--to", "local", "--no-pull"], runtime)).resolves.toBe(1);

    expect(stderr.join("\n")).toContain("another gateway appears active");
    expect(
      hub.calls.some((call) => call.name === "addSpaceVariable" && call.args[1] === "MLCLAW_GATEWAY_DISABLED"),
    ).toBe(false);
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
    expect(
      hub.calls.some(
        (call) =>
          call.name === "bucket.uploadFiles" &&
          Array.isArray(call.args[0]) &&
          call.args[0].includes("openclaw-state/runtime/handoff-request.json"),
      ),
    ).toBe(false);
    expect(hub.calls).toContainEqual({ name: "pauseSpace", args: ["alice/research"] });
  });

  it("waits for a final Space snapshot while the Space is RUNNING_BUILDING", async () => {
    const hub = createFakeHub({
      spaceRuntime: {
        stage: "RUNNING_BUILDING",
        hardware: "cpu-upgrade",
        requested_hardware: "cpu-upgrade",
        sleep_time: -1,
      },
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
    hub.bucketObjects.set(
      "openclaw-state/runtime/status.json",
      JSON.stringify({
        schemaVersion: 1,
        agent: "research",
        runtimeId: "space-research",
        gatewayLocation: "space",
        runtimeImage: DEFAULT_RUNTIME_IMAGE,
        startedAt: "2026-06-16T00:00:00.000Z",
        lastHeartbeatAt: "2026-06-16T00:00:01.000Z",
      }) + "\n",
    );

    await expect(main(["gateway", "stop", "research"], runtime)).resolves.toBe(0);

    const disableIndex = hub.calls.findIndex(
      (call) => call.name === "addSpaceVariable" && call.args[1] === "MLCLAW_GATEWAY_DISABLED",
    );
    const handoffIndex = hub.calls.findIndex(
      (call) =>
        call.name === "bucket.uploadFiles" &&
        Array.isArray(call.args[0]) &&
        call.args[0].includes("openclaw-state/runtime/handoff-request.json"),
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

    const handoffIndex = hub.calls.findIndex(
      (call) =>
        call.name === "bucket.uploadFiles" &&
        Array.isArray(call.args[0]) &&
        call.args[0].includes("openclaw-state/runtime/handoff-request.json"),
    );
    const disableIndex = hub.calls.findIndex(
      (call) => call.name === "addSpaceVariable" && call.args[1] === "MLCLAW_GATEWAY_DISABLED",
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
    expect(
      hub.calls.some((call) => call.name === "addSpaceVariable" && call.args[1] === "MLCLAW_GATEWAY_DISABLED"),
    ).toBe(false);
    expect(hub.calls.some((call) => call.name === "pauseSpace")).toBe(false);
  });
});
