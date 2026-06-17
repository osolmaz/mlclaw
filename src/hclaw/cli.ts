#!/usr/bin/env node
import fs from "node:fs/promises";
import { realpathSync } from "node:fs";
import process from "node:process";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Command, CommanderError, InvalidArgumentError } from "commander";
import { cancel, confirm, intro, isCancel, note, outro, password, text } from "@clack/prompts";
import { readToken } from "./auth.js";
import { CliDockerRunner, containerNameFor, type DockerRunner, volumeNameFor } from "./docker.js";
import { parseGatewayLocation, type GatewayLocation } from "./gateway-location.js";
import { pushTemplateToSpace } from "./git.js";
import { HubApi, HubApiError } from "./hub-api.js";
import {
  assertNoLiveForeignLease,
  clearRuntimeHandoffRequest,
  readRuntimeHandoffAck,
  readRuntimeLease,
  runtimeLeaseIsLive,
  writeRuntimeHandoffRequest,
  type RuntimeHandoffAck,
} from "./lease.js";
import {
  defaultConfigRoot,
  manifestExists,
  readManifest,
  readSecretEnv,
  secretEnvPath,
  type DeploymentManifest,
  writeManifest,
  writeSecretEnv,
} from "./local-config.js";
import { namesFor, slugifyAgentName } from "./naming.js";
import { resolveRuntimeImage } from "./runtime-image.js";
import { getTelegramBot, type TelegramBot } from "./telegram.js";

export const DEFAULT_MODEL = "huggingface/Qwen/Qwen3-8B";
export const DEFAULT_HARDWARE = "cpu-basic";
export const TELEGRAM_HARDWARE = "cpu-upgrade";
export const TELEGRAM_SLEEP_TIME = -1;
export const DEFAULT_GATEWAY_LOCATION: GatewayLocation = "local";
export const DEFAULT_LOCAL_PORT = 7860;
export const LOCAL_VOLUME_MOUNT_PATH = "/tmp/huggingclaw-local";
export const LOCAL_LIVE_DIR = `${LOCAL_VOLUME_MOUNT_PATH}/openclaw-live`;
export const SPACE_HANDOFF_TIMEOUT_MS = 120_000;
export const SPACE_HANDOFF_POLL_MS = 5_000;

const STALE_PATH_VARS = ["OPENCLAW_STATE_DIR", "OPENCLAW_WORKSPACE_DIR", "OPENCLAW_CONFIG_PATH"];
const PAID_HARDWARE_COST_NOTE =
  "Telegram requires upgraded Hugging Face Space hardware today. The cheapest option is cpu-upgrade at $0.03/hour, about $22/month if kept always on.";

type BootstrapOptions = {
  owner?: string;
  name?: string;
  gateway?: string;
  telegramToken?: string;
  telegramTokenFile?: string;
  telegramUserId?: string;
  telegramApiRoot?: string;
  telegramProxy?: string;
  hardware?: string;
  sleepTime?: number;
  model?: string;
  runtimeImage?: string;
  gatewayToken?: string;
  pull?: boolean;
  takeover?: boolean;
  yes?: boolean;
};

type UpdateOptions = {
  force?: boolean;
  runtimeImage?: string;
};

type DoctorOptions = {
  fix?: boolean;
  bucket?: string;
};

type SettingsOptions = {
  gateway?: string;
  hardware?: string;
  sleepTime?: number;
  yes?: boolean;
};

type GatewayCommandOptions = {
  to?: string;
  hardware?: string;
  sleepTime?: number;
  runtimeImage?: string;
  pull?: boolean;
  takeover?: boolean;
  yes?: boolean;
  tail?: number;
};

type CliRuntime = {
  env?: NodeJS.ProcessEnv;
  stdout?: Pick<typeof console, "log">;
  stderr?: Pick<typeof console, "error">;
  readToken?: typeof readToken;
  hubFactory?: (token: string) => HubApi;
  pushTemplateToSpace?: typeof pushTemplateToSpace;
  getTelegramBot?: (token: string, apiRoot?: string) => Promise<TelegramBot>;
  dockerRunner?: DockerRunner;
  configRoot?: string;
  now?: () => Date;
  prompt?: PromptRuntime;
};

type PromptRuntime = {
  isInteractive: () => boolean;
  intro: (message: string) => void;
  outro: (message: string) => void;
  note: (message: string, title?: string) => void;
  text: (params: { message: string; placeholder?: string; initialValue?: string }) => Promise<string | symbol>;
  password: (params: { message: string; placeholder?: string }) => Promise<string | symbol>;
  confirm: (params: { message: string; initialValue?: boolean }) => Promise<boolean | symbol>;
  cancel: (message: string) => void;
};

const defaultPrompt: PromptRuntime = {
  isInteractive: () => Boolean(process.stdin.isTTY && process.stdout.isTTY),
  intro,
  outro,
  note,
  text,
  password,
  confirm,
  cancel,
};

function createRuntime(overrides: CliRuntime = {}): Required<CliRuntime> {
  return {
    env: overrides.env ?? process.env,
    stdout: overrides.stdout ?? console,
    stderr: overrides.stderr ?? console,
    readToken: overrides.readToken ?? readToken,
    hubFactory: overrides.hubFactory ?? ((token) => new HubApi({ token })),
    pushTemplateToSpace: overrides.pushTemplateToSpace ?? pushTemplateToSpace,
    getTelegramBot: overrides.getTelegramBot ?? getTelegramBot,
    dockerRunner: overrides.dockerRunner ?? new CliDockerRunner(),
    configRoot: overrides.configRoot ?? defaultConfigRoot(overrides.env ?? process.env),
    now: overrides.now ?? (() => new Date()),
    prompt: overrides.prompt ?? defaultPrompt,
  };
}

export function createProgram(runtimeOverrides: CliRuntime = {}): Command {
  const runtime = createRuntime(runtimeOverrides);
  const program = new Command();
  program
    .name("hclaw")
    .description("Deploy OpenClaw to a private Hugging Face Space and bucket")
    .showHelpAfterError()
    .exitOverride((err) => {
      throw err;
    });

  program
    .command("bootstrap", { isDefault: true })
    .description("Create or update a private Hugging Face OpenClaw deployment")
    .option("--owner <owner>", "Hugging Face user or organization")
    .option("--name <name>", "Agent, Space, and bucket base name")
    .option("--gateway <local|space>", "Where the live gateway runs", DEFAULT_GATEWAY_LOCATION)
    .option("--telegram-token <token>", "Telegram bot token")
    .option("--telegram-token-file <path>", "File containing TELEGRAM_BOT_TOKEN=... or a raw token")
    .option("--telegram-user-id <id>", "Allowed Telegram user ID")
    .option("--telegram-api-root <url>", "Telegram API root override")
    .option("--telegram-proxy <url>", "Telegram proxy URL override")
    .option("--hardware <flavor>", "Hugging Face Space hardware flavor")
    .option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger)
    .option("--model <model>", "OpenClaw model identifier", DEFAULT_MODEL)
    .option("--runtime-image <image>", "Hugging Claw runtime image")
    .option("--gateway-token <token>", "OpenClaw gateway token")
    .option("--no-pull", "Do not docker pull before starting a local gateway")
    .option("--takeover", "Start even if a stale runtime lease is present", false)
    .option("--yes", "Confirm paid hardware prompts for automation", false)
    .action(async (opts: BootstrapOptions) => {
      await bootstrap(opts, runtime);
    });

  program
    .command("update")
    .description("Regenerate and upload current HuggingClaw Space files")
    .argument("<owner/space>", "Hugging Face Space repo ID")
    .option("--runtime-image <image>", "Runtime image to write into the generated Space Dockerfile")
    .option("--force", "Update even if the Space does not look like HuggingClaw", false)
    .action(async (repoId: string, opts: UpdateOptions) => {
      const token = await runtime.readToken(runtime.env);
      const hub = runtime.hubFactory(token);
      await update(repoId, opts, hub, token, runtime);
    });

  program
    .command("doctor")
    .description("Check a HuggingClaw Space deployment")
    .argument("<owner/space>", "Hugging Face Space repo ID")
    .option("--fix", "Apply safe config repairs", false)
    .option("--bucket <owner/bucket>", "State bucket to set when missing")
    .action(async (repoId: string, opts: DoctorOptions) => {
      const token = await runtime.readToken(runtime.env);
      const hub = runtime.hubFactory(token);
      await doctor(repoId, opts, hub, runtime);
    });

  program
    .command("settings")
    .description("Update Hugging Face Space hardware and sleep settings")
    .argument("<owner/space>", "Hugging Face Space repo ID")
    .option("--gateway <local|space>", "Record gateway location in local manifest")
    .option("--hardware <flavor>", "Hugging Face Space hardware flavor")
    .option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger)
    .option("--yes", "Confirm paid hardware prompts for automation", false)
    .action(async (repoId: string, opts: SettingsOptions) => {
      const token = await runtime.readToken(runtime.env);
      const hub = runtime.hubFactory(token);
      await settings(repoId, opts, hub, runtime);
    });

  const gateway = program
    .command("gateway")
    .description("Operate a Hugging Claw gateway");

  gateway
    .command("start")
    .argument("<agent>", "Agent name")
    .option("--no-pull", "Do not docker pull before starting a local gateway")
    .option("--takeover", "Start even if another live runtime lease is present", false)
    .action(async (agent: string, opts: GatewayCommandOptions) => {
      await gatewayStart(agent, opts, runtime);
    });

  gateway
    .command("stop")
    .argument("<agent>", "Agent name")
    .action(async (agent: string) => {
      await gatewayStop(agent, runtime);
    });

  gateway
    .command("restart")
    .argument("<agent>", "Agent name")
    .option("--no-pull", "Do not docker pull before starting a local gateway")
    .option("--takeover", "Start even if another live runtime lease is present", false)
    .action(async (agent: string, opts: GatewayCommandOptions) => {
      await gatewayStop(agent, runtime);
      await gatewayStart(agent, opts, runtime);
    });

  gateway
    .command("status")
    .argument("<agent>", "Agent name")
    .action(async (agent: string) => {
      await gatewayStatus(agent, runtime);
    });

  gateway
    .command("logs")
    .argument("<agent>", "Agent name")
    .option("--tail <lines>", "Number of log lines", parseInteger, 200)
    .action(async (agent: string, opts: GatewayCommandOptions) => {
      await gatewayLogs(agent, opts, runtime);
    });

  gateway
    .command("migrate")
    .argument("<agent>", "Agent name")
    .requiredOption("--to <local|space>", "Target gateway location")
    .option("--hardware <flavor>", "Hugging Face Space hardware flavor", TELEGRAM_HARDWARE)
    .option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger, TELEGRAM_SLEEP_TIME)
    .option("--runtime-image <image>", "Hugging Claw runtime image")
    .option("--no-pull", "Do not docker pull before starting a local gateway")
    .option("--takeover", "Start even if another live runtime lease is present", false)
    .option("--yes", "Confirm paid hardware prompts for automation", false)
    .action(async (agent: string, opts: GatewayCommandOptions) => {
      await gatewayMigrate(agent, opts, runtime);
    });

  return program;
}

export async function main(argv = process.argv.slice(2), runtimeOverrides: CliRuntime = {}): Promise<number> {
  const program = createProgram(runtimeOverrides);
  try {
    await program.parseAsync(argv, { from: "user" });
    return typeof process.exitCode === "number" && process.exitCode !== 0 ? process.exitCode : 0;
  } catch (err) {
    if (err instanceof CommanderError) {
      return err.exitCode;
    }
    const runtime = createRuntime(runtimeOverrides);
    runtime.stderr.error(err instanceof Error ? err.message : String(err));
    return 1;
  }
}

async function bootstrap(opts: BootstrapOptions, runtime: Required<CliRuntime>): Promise<void> {
  runtime.prompt.intro("HuggingClaw bootstrap");
  const gatewayLocation = parseGatewayLocation(opts.gateway ?? DEFAULT_GATEWAY_LOCATION);
  const hfToken = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(hfToken);
  const me = await hub.whoami();
  const owner = opts.owner ?? me.name;
  const telegramToken = await readTelegramToken(opts, runtime);
  const bot = await runtime.getTelegramBot(telegramToken, opts.telegramApiRoot);
  const agentName = slugifyAgentName(opts.name ?? bot.username);
  const telegramUserId = opts.telegramUserId ?? runtime.env.TELEGRAM_ALLOWED_USERS
    ?? await promptRequired("Telegram allowed user ID", runtime);

  if (!telegramUserId) {
    throw new Error("Telegram allowed user ID is required");
  }

  const names = namesFor(owner, agentName);
  const model = opts.model ?? DEFAULT_MODEL;
  const runtimeImage = resolveRuntimeImage(opts.runtimeImage, runtime.env);
  const providedGatewayToken = opts.gatewayToken;
  const gatewayToken = providedGatewayToken ?? randomBytes(32).toString("base64url");
  const now = runtime.now().toISOString();
  const existingManifest = await readManifest(runtime.configRoot, agentName).catch(() => null);
  const existingSecrets = await readSecretEnv(runtime.configRoot, agentName).catch(() => ({}));
  const bucketPrefix = bootstrapBucketPrefix(existingManifest, existingSecrets, runtime);
  const localRuntimeId = existingManifest?.localRuntimeId ?? newLocalRuntimeId(agentName);

  runtime.stdout.log(`Creating private bucket ${names.bucket}`);
  await hub.createBucket(names.bucket, true);
  const manifest: DeploymentManifest = {
    version: 1,
    agent: agentName,
    owner,
    bucket: names.bucket,
    space: names.space,
    localRuntimeId,
    gatewayLocation,
    model,
    runtimeImage,
    createdAt: existingManifest?.createdAt ?? now,
    updatedAt: now,
  };
  const secrets = deploymentSecrets({
    hfToken,
    telegramToken,
    telegramUserId,
    gatewayToken,
    bucket: names.bucket,
    model,
    agentName,
    runtimeImage,
    gatewayLocation,
    runtimeId: gatewayLocation === "local" ? manifest.localRuntimeId : spaceRuntimeId(agentName),
    ...(bucketPrefix ? { bucketPrefix } : {}),
    ...(opts.telegramProxy ? { telegramProxy: opts.telegramProxy } : {}),
    ...(opts.telegramApiRoot ? { telegramApiRoot: opts.telegramApiRoot } : {}),
  });
  if (gatewayLocation === "space") {
    await assertNoLiveForeignLease({
      hub,
      bucket: names.bucket,
      bucketPrefix,
      runtimeId: spaceRuntimeId(agentName),
      takeover: Boolean(opts.takeover),
    });
    const paidHardware = await resolveHardware({
      ...(opts.hardware ? { requestedHardware: opts.hardware } : {}),
      ...(typeof opts.sleepTime === "number" ? { requestedSleepTime: opts.sleepTime } : {}),
      yes: Boolean(opts.yes),
      runtime,
    });
    await deploySpaceGateway({
      hub,
      runtime,
      hfToken,
      manifest,
      secrets,
      hardware: paidHardware.hardware,
      ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
    });
    await writeLocalDeployment(runtime.configRoot, manifest, secrets);
  } else {
    await assertNoLiveForeignLease({
      hub,
      bucket: names.bucket,
      bucketPrefix,
      runtimeId: manifest.localRuntimeId,
      takeover: Boolean(opts.takeover),
    });
    await writeLocalDeployment(runtime.configRoot, manifest, secrets);
    await startLocalGateway({
      manifest,
      runtime,
      pull: shouldPull(opts),
      refresh: true,
    });
  }

  runtime.stdout.log("");
  runtime.stdout.log(`Bucket: https://huggingface.co/buckets/${names.bucket}`);
  if (gatewayLocation === "space") {
    runtime.stdout.log(`Space:  https://huggingface.co/spaces/${names.space}`);
  } else {
    runtime.stdout.log(`Local:  ${containerNameFor(agentName)}`);
  }
  runtime.stdout.log(`Agent:  ${agentName}${bot ? ` (@${bot.username})` : ""}`);
  runtime.stdout.log(`Gateway: ${gatewayLocation}`);
  runtime.stdout.log(`Runtime image: ${runtimeImage}`);
  if (!providedGatewayToken) {
    runtime.stdout.log("");
    runtime.stdout.log("Generated OpenClaw gateway token:");
    runtime.stdout.log(`  ${gatewayToken}`);
    runtime.stdout.log("");
    runtime.stdout.log("Save this token now. Hugging Face stores it as a write-only Space Secret.");
  }
  runtime.prompt.outro(gatewayLocation === "space"
    ? "Restart requested. Build logs may take a few minutes to appear."
    : "Local gateway start requested.");
}

function deploymentSecrets(params: {
  hfToken: string;
  telegramToken: string;
  telegramUserId: string;
  gatewayToken: string;
  bucket: string;
  model: string;
  agentName: string;
  runtimeImage: string;
  gatewayLocation: GatewayLocation;
  runtimeId: string;
  bucketPrefix?: string;
  telegramProxy?: string;
  telegramApiRoot?: string;
}): Record<string, string> {
  return {
    HF_TOKEN: params.hfToken,
    TELEGRAM_BOT_TOKEN: params.telegramToken,
    TELEGRAM_ALLOWED_USERS: params.telegramUserId,
    OPENCLAW_GATEWAY_TOKEN: params.gatewayToken,
    OPENCLAW_HF_STATE_BUCKET: params.bucket,
    OPENCLAW_MODEL: params.model,
    OPENCLAW_AGENT_NAME: params.agentName,
    HUGGINGCLAW_GATEWAY_LOCATION: params.gatewayLocation,
    HUGGINGCLAW_RUNTIME_IMAGE: params.runtimeImage,
    HUGGINGCLAW_RUNTIME_ID: params.runtimeId,
    OPENCLAW_GATEWAY_PORT: String(DEFAULT_LOCAL_PORT),
    ...(params.bucketPrefix ? { OPENCLAW_HF_STATE_PREFIX: params.bucketPrefix } : {}),
    ...(params.telegramProxy ? { TELEGRAM_PROXY: params.telegramProxy } : {}),
    ...(params.telegramApiRoot ? { TELEGRAM_API_ROOT: params.telegramApiRoot } : {}),
  };
}

async function writeLocalDeployment(
  configRoot: string,
  manifest: DeploymentManifest,
  secrets: Record<string, string>,
): Promise<void> {
  await writeManifest(configRoot, manifest);
  await writeSecretEnv(configRoot, manifest.agent, secrets);
}

async function deploySpaceGateway(params: {
  hub: HubApi;
  runtime: Required<CliRuntime>;
  hfToken: string;
  manifest: DeploymentManifest;
  secrets: Record<string, string>;
  hardware: string;
  sleepTime?: number;
}): Promise<void> {
  const { hub, runtime, hfToken, manifest, secrets } = params;
  runtime.stdout.log(`Creating private Space ${manifest.space}`);
  await hub.createDockerSpace(manifest.space, {
    private: true,
    hardware: params.hardware,
    ...(typeof params.sleepTime === "number" ? { sleepTimeSeconds: params.sleepTime } : {}),
  });
  await hub.requestSpaceHardware(manifest.space, params.hardware, params.sleepTime);
  runtime.stdout.log("Generating Space files from huggingclaw runtime image");
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: manifest.space,
    token: hfToken,
    runtimeImage: manifest.runtimeImage,
  });

  await setDeploymentVariables(hub, manifest.space, {
    OPENCLAW_HF_STATE_BUCKET: manifest.bucket,
    ...(secrets.OPENCLAW_HF_STATE_PREFIX ? { OPENCLAW_HF_STATE_PREFIX: secrets.OPENCLAW_HF_STATE_PREFIX } : {}),
    OPENCLAW_HF_TEMPLATE_REV: templateRev,
    OPENCLAW_MODEL: manifest.model,
    OPENCLAW_AGENT_NAME: manifest.agent,
    HUGGINGCLAW_GATEWAY_LOCATION: "space",
    HUGGINGCLAW_RUNTIME_IMAGE: manifest.runtimeImage,
    HUGGINGCLAW_RUNTIME_ID: spaceRuntimeId(manifest.agent),
  });
  await clearSpaceGatewayDisabled(hub, manifest.space);
  await setDeploymentSecrets(hub, manifest.space, {
    OPENCLAW_GATEWAY_TOKEN: requiredSecret(secrets, "OPENCLAW_GATEWAY_TOKEN"),
    HF_TOKEN: requiredSecret(secrets, "HF_TOKEN"),
    TELEGRAM_BOT_TOKEN: requiredSecret(secrets, "TELEGRAM_BOT_TOKEN"),
    TELEGRAM_ALLOWED_USERS: requiredSecret(secrets, "TELEGRAM_ALLOWED_USERS"),
    ...(secrets.TELEGRAM_PROXY ? { TELEGRAM_PROXY: secrets.TELEGRAM_PROXY } : {}),
    ...(secrets.TELEGRAM_API_ROOT ? { TELEGRAM_API_ROOT: secrets.TELEGRAM_API_ROOT } : {}),
  });
  await hub.restartSpace(manifest.space, true);
}

async function startLocalGateway(params: {
  manifest: DeploymentManifest;
  runtime: Required<CliRuntime>;
  pull: boolean;
  refresh?: boolean;
  resetVolume?: boolean;
}): Promise<void> {
  const { manifest, runtime } = params;
  const containerName = containerNameFor(manifest.agent);
  const volumeName = volumeNameFor(manifest.agent);
  const existing = await runtime.dockerRunner.inspect(containerName);
  const shouldRefresh = Boolean(params.refresh || params.resetVolume);
  if (existing?.running) {
    if (!shouldRefresh) {
      runtime.stdout.log(`Local gateway already running: ${containerName}`);
      return;
    }
  }
  if (params.pull) {
    await runtime.dockerRunner.pull(manifest.runtimeImage);
  }
  if (existing?.running) {
    await runtime.dockerRunner.stop(containerName);
    runtime.stdout.log(`Local gateway stopped for config refresh: ${containerName}`);
  }
  if (existing) {
    await runtime.dockerRunner.rm(containerName);
    runtime.stdout.log(`Local gateway removed for config refresh: ${containerName}`);
  }
  if (params.resetVolume) {
    await runtime.dockerRunner.rmVolume(volumeName);
    runtime.stdout.log(`Local gateway volume reset for bucket restore: ${volumeName}`);
  }
  await runtime.dockerRunner.run({
    containerName,
    image: manifest.runtimeImage,
    envFile: secretEnvPath(runtime.configRoot, manifest.agent),
    volumeName,
    volumeMountPath: LOCAL_VOLUME_MOUNT_PATH,
    liveDir: LOCAL_LIVE_DIR,
  });
  runtime.stdout.log(`Local gateway created: ${containerName}`);
}

async function stopLocalGateway(manifest: DeploymentManifest, runtime: Required<CliRuntime>): Promise<void> {
  const containerName = containerNameFor(manifest.agent);
  const existing = await runtime.dockerRunner.inspect(containerName);
  if (!existing) {
    runtime.stdout.log(`Local gateway does not exist: ${containerName}`);
    return;
  }
  if (!existing.running) {
    runtime.stdout.log(`Local gateway already stopped: ${containerName}`);
    return;
  }
  await runtime.dockerRunner.stop(containerName);
  runtime.stdout.log(`Local gateway stopped: ${containerName}`);
}

async function gatewayStart(agent: string, opts: GatewayCommandOptions, runtime: Required<CliRuntime>): Promise<void> {
  const manifest = await readDeploymentManifest(runtime, agent);
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  await assertNoLiveForeignLease({
    hub,
    bucket: manifest.bucket,
    bucketPrefix,
    runtimeId: runtimeIdFor(manifest),
    takeover: Boolean(opts.takeover),
  });
  if (manifest.gatewayLocation === "local") {
    await startLocalGateway({ manifest, runtime, pull: shouldPull(opts) });
  } else {
    await clearSpaceGatewayDisabled(hub, manifest.space);
    await hub.restartSpace(manifest.space, true);
    runtime.stdout.log(`Space gateway restart requested: ${manifest.space}`);
  }
}

async function gatewayStop(agent: string, runtime: Required<CliRuntime>): Promise<void> {
  const manifest = await readDeploymentManifest(runtime, agent);
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  if (manifest.gatewayLocation === "local") {
    await stopLocalGateway(manifest, runtime);
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  await disableAndPauseSpaceGateway({ manifest, hub, runtime, bucketPrefix });
}

async function gatewayStatus(agent: string, runtime: Required<CliRuntime>): Promise<void> {
  const manifest = await readDeploymentManifest(runtime, agent);
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  runtime.stdout.log(`Agent: ${manifest.agent}`);
  runtime.stdout.log(`Gateway: ${manifest.gatewayLocation}`);
  runtime.stdout.log(`Bucket: ${manifest.bucket}`);
  runtime.stdout.log(`Space: ${manifest.space}`);
  if (manifest.gatewayLocation === "local") {
    const inspect = await runtime.dockerRunner.inspect(containerNameFor(manifest.agent));
    runtime.stdout.log(`Container: ${inspect ? inspect.status ?? "exists" : "missing"}`);
    runtime.stdout.log(`Running: ${inspect?.running ? "yes" : "no"}`);
  } else {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    const runtimeInfo = await hub.getSpaceRuntime(manifest.space);
    runtime.stdout.log(`Stage: ${runtimeInfo.stage ?? "unknown"}`);
    runtime.stdout.log(`Hardware: ${formatRuntimeValue(runtimeInfo.requested_hardware ?? runtimeInfo.hardware)}`);
  }
  try {
    const token = await runtime.readToken(runtime.env);
    const hub = runtime.hubFactory(token);
    const lease = await readRuntimeLease(hub, manifest.bucket, bucketPrefix);
    if (lease) {
      runtime.stdout.log(`Lease: ${lease.gatewayLocation} ${lease.runtimeId} heartbeat ${lease.lastHeartbeatAt}`);
    } else {
      runtime.stdout.log("Lease: missing");
    }
  } catch (err) {
    runtime.stdout.log(`Lease: unavailable (${err instanceof Error ? err.message : String(err)})`);
  }
}

async function gatewayLogs(agent: string, opts: GatewayCommandOptions, runtime: Required<CliRuntime>): Promise<void> {
  const manifest = await readDeploymentManifest(runtime, agent);
  if (manifest.gatewayLocation === "local") {
    runtime.stdout.log(await runtime.dockerRunner.logs(containerNameFor(manifest.agent), opts.tail));
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  runtime.stdout.log(await hub.fetchSpaceLogs(manifest.space, "run"));
}

async function gatewayMigrate(agent: string, opts: GatewayCommandOptions, runtime: Required<CliRuntime>): Promise<void> {
  const target = parseGatewayLocation(requiredOption(opts.to, "--to"));
  const current = await readDeploymentManifest(runtime, agent);
  if (current.gatewayLocation === target) {
    runtime.stdout.log(`Gateway already uses ${target}`);
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const secrets = await readSecretEnv(runtime.configRoot, agent);
  const bucketPrefix = persistedBucketPrefix(secrets);
  const updated: DeploymentManifest = {
    ...current,
    gatewayLocation: target,
    runtimeImage: resolveRuntimeImage(opts.runtimeImage ?? current.runtimeImage, runtime.env),
    updatedAt: runtime.now().toISOString(),
  };
  if (target === "space") {
    const paidHardware = await resolveHardware({
      requestedHardware: opts.hardware ?? TELEGRAM_HARDWARE,
      requestedSleepTime: typeof opts.sleepTime === "number" ? opts.sleepTime : TELEGRAM_SLEEP_TIME,
      yes: Boolean(opts.yes),
      runtime,
    });
    await assertNoLiveForeignLease({
      hub,
      bucket: current.bucket,
      bucketPrefix,
      runtimeId: current.localRuntimeId,
      takeover: Boolean(opts.takeover),
    });
    await handoffAndStopLocalGateway({ manifest: current, hub, runtime, bucketPrefix });
    await deploySpaceGateway({
      hub,
      runtime,
      hfToken: token,
      manifest: updated,
      secrets: {
        ...secrets,
        HUGGINGCLAW_GATEWAY_LOCATION: "space",
        HUGGINGCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      },
      hardware: paidHardware.hardware,
      ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
    });
    await writeSecretEnv(runtime.configRoot, agent, {
      ...secrets,
      HUGGINGCLAW_GATEWAY_LOCATION: "space",
      HUGGINGCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      HUGGINGCLAW_RUNTIME_ID: spaceRuntimeId(agent),
    });
  } else {
    await assertNoLiveForeignLease({
      hub,
      bucket: current.bucket,
      bucketPrefix,
      runtimeId: updated.localRuntimeId,
      allowedRuntimeIds: [spaceRuntimeId(current.agent)],
      takeover: Boolean(opts.takeover),
    });
    await disableAndPauseSpaceGateway({ manifest: current, hub, runtime, bucketPrefix });
    await assertNoLiveForeignLease({
      hub,
      bucket: current.bucket,
      bucketPrefix,
      runtimeId: updated.localRuntimeId,
      allowedRuntimeIds: [spaceRuntimeId(current.agent)],
      takeover: Boolean(opts.takeover),
    });
    await writeSecretEnv(runtime.configRoot, agent, {
      ...secrets,
      HUGGINGCLAW_GATEWAY_LOCATION: "local",
      HUGGINGCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      HUGGINGCLAW_RUNTIME_ID: updated.localRuntimeId,
    });
    await startLocalGateway({ manifest: updated, runtime, pull: shouldPull(opts), resetVolume: true });
  }
  await writeManifest(runtime.configRoot, updated);
  runtime.stdout.log(`Gateway migrated to ${target}`);
}

async function readDeploymentManifest(runtime: Required<CliRuntime>, agent: string): Promise<DeploymentManifest> {
  const manifest = await readManifest(runtime.configRoot, agent);
  if (manifest.localRuntimeId) {
    return manifest;
  }
  const updated = {
    ...manifest,
    localRuntimeId: newLocalRuntimeId(manifest.agent),
    updatedAt: runtime.now().toISOString(),
  };
  await writeManifest(runtime.configRoot, updated);
  return updated;
}

async function readDeploymentBucketPrefix(runtime: Required<CliRuntime>, agent: string): Promise<string | undefined> {
  const secrets = await readSecretEnv(runtime.configRoot, agent).catch(() => ({}));
  return persistedBucketPrefix(secrets);
}

function bootstrapBucketPrefix(
  existingManifest: DeploymentManifest | null,
  secrets: Record<string, string>,
  runtime: Required<CliRuntime>,
): string | undefined {
  return persistedBucketPrefix(secrets) ?? (existingManifest ? undefined : envBucketPrefix(runtime));
}

function persistedBucketPrefix(secrets: Record<string, string>): string | undefined {
  return nonEmpty(secrets.OPENCLAW_HF_STATE_PREFIX);
}

function envBucketPrefix(runtime: Required<CliRuntime>): string | undefined {
  return nonEmpty(runtime.env.OPENCLAW_HF_STATE_PREFIX);
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function newLocalRuntimeId(agent: string): string {
  return `local-${agent}-${randomBytes(8).toString("hex")}`;
}

function runtimeIdFor(manifest: DeploymentManifest): string {
  return manifest.gatewayLocation === "local" ? manifest.localRuntimeId : spaceRuntimeId(manifest.agent);
}

function spaceRuntimeId(agent: string): string {
  return `space-${agent}`;
}

async function handoffAndStopLocalGateway(params: {
  manifest: DeploymentManifest;
  hub: HubApi;
  runtime: Required<CliRuntime>;
  bucketPrefix?: string | undefined;
}): Promise<void> {
  const containerName = containerNameFor(params.manifest.agent);
  const existing = await params.runtime.dockerRunner.inspect(containerName);
  if (!existing) {
    params.runtime.stdout.log(`Local gateway does not exist: ${containerName}`);
    return;
  }
  if (!existing.running) {
    params.runtime.stdout.log(`Local gateway already stopped: ${containerName}`);
    return;
  }

  await params.runtime.dockerRunner.disableRestart(containerName);
  const handoffStartedAt = params.runtime.now();
  const requestId = randomBytes(16).toString("hex");
  await writeRuntimeHandoffRequest(params.hub, params.manifest.bucket, {
    schemaVersion: 1,
    requestId,
    agent: params.manifest.agent,
    runtimeId: params.manifest.localRuntimeId,
    requestedAt: handoffStartedAt.toISOString(),
    targetRuntimeId: spaceRuntimeId(params.manifest.agent),
  }, params.bucketPrefix);
  params.runtime.stdout.log("Waiting for local gateway to upload a final snapshot");
  await waitForRuntimeHandoffAck({
    hub: params.hub,
    bucket: params.manifest.bucket,
    bucketPrefix: params.bucketPrefix,
    requestId,
    runtimeId: params.manifest.localRuntimeId,
    timeoutMs: SPACE_HANDOFF_TIMEOUT_MS,
    pollMs: SPACE_HANDOFF_POLL_MS,
  });
  await clearRuntimeHandoffRequest(params.hub, params.manifest.bucket, params.bucketPrefix).catch(() => undefined);
  params.runtime.stdout.log("Local final snapshot observed");
  await stopLocalGateway(params.manifest, params.runtime);
}

async function disableAndPauseSpaceGateway(params: {
  manifest: DeploymentManifest;
  hub: HubApi;
  runtime: Required<CliRuntime>;
  bucketPrefix?: string | undefined;
}): Promise<void> {
  const handoffStartedAt = params.runtime.now();
  const requestId = randomBytes(16).toString("hex");
  const shouldWaitForHandoff = await spaceGatewayCanAcknowledgeHandoff(params);
  if (!shouldWaitForHandoff) {
    await params.hub.addSpaceVariable(params.manifest.space, "HUGGINGCLAW_GATEWAY_DISABLED", "1");
    await clearRuntimeHandoffRequest(params.hub, params.manifest.bucket, params.bucketPrefix).catch(() => undefined);
    await params.hub.pauseSpace(params.manifest.space);
    params.runtime.stdout.log(`Space pause requested: ${params.manifest.space}`);
    return;
  }
  await writeRuntimeHandoffRequest(params.hub, params.manifest.bucket, {
    schemaVersion: 1,
    requestId,
    agent: params.manifest.agent,
    runtimeId: spaceRuntimeId(params.manifest.agent),
    requestedAt: handoffStartedAt.toISOString(),
    targetRuntimeId: params.manifest.localRuntimeId,
  }, params.bucketPrefix);
  await params.hub.addSpaceVariable(params.manifest.space, "HUGGINGCLAW_GATEWAY_DISABLED", "1");
  params.runtime.stdout.log("Waiting for Space gateway to upload a final snapshot");
  await waitForRuntimeHandoffAck({
    hub: params.hub,
    bucket: params.manifest.bucket,
    bucketPrefix: params.bucketPrefix,
    requestId,
    runtimeId: spaceRuntimeId(params.manifest.agent),
    timeoutMs: SPACE_HANDOFF_TIMEOUT_MS,
    pollMs: SPACE_HANDOFF_POLL_MS,
  });
  await clearRuntimeHandoffRequest(params.hub, params.manifest.bucket, params.bucketPrefix).catch(() => undefined);
  params.runtime.stdout.log("Space final snapshot observed");
  await params.hub.pauseSpace(params.manifest.space);
  params.runtime.stdout.log(`Space pause requested: ${params.manifest.space}`);
}

async function spaceGatewayCanAcknowledgeHandoff(params: {
  manifest: DeploymentManifest;
  hub: HubApi;
  runtime: Required<CliRuntime>;
  bucketPrefix?: string | undefined;
}): Promise<boolean> {
  const expectedRuntimeId = spaceRuntimeId(params.manifest.agent);
  const [runtimeInfo, lease] = await Promise.all([
    params.hub.getSpaceRuntime(params.manifest.space).catch(() => null),
    readRuntimeLease(params.hub, params.manifest.bucket, params.bucketPrefix),
  ]);
  const stage = typeof runtimeInfo?.stage === "string" ? runtimeInfo.stage.toUpperCase() : "";
  const stageCanRunGateway = !stage || stage === "RUNNING" || stage === "RUNNING_BUILDING";
  const leaseIsCurrentSpace =
    lease?.runtimeId === expectedRuntimeId &&
    lease.gatewayLocation === "space" &&
    runtimeLeaseIsLive(lease, params.runtime.now());

  if (stageCanRunGateway && leaseIsCurrentSpace) {
    return true;
  }

  const stageDetail = stage ? `Space stage: ${stage}. ` : "";
  const leaseDetail = lease
    ? `Last lease: ${lease.gatewayLocation}/${lease.runtimeId} at ${lease.lastHeartbeatAt}.`
    : "No runtime lease found.";
  params.runtime.stdout.log(`${stageDetail}${leaseDetail} Skipping final snapshot handoff wait.`);
  return false;
}

async function waitForRuntimeHandoffAck(params: {
  hub: HubApi;
  bucket: string;
  bucketPrefix?: string | undefined;
  requestId: string;
  runtimeId: string;
  timeoutMs: number;
  pollMs: number;
}): Promise<RuntimeHandoffAck> {
  const started = Date.now();
  let lastError: string | undefined;
  while (true) {
    try {
      const ack = await readRuntimeHandoffAck(params.hub, params.bucket, params.bucketPrefix);
      if (
        ack?.requestId === params.requestId &&
        ack.runtimeId === params.runtimeId
      ) {
        return ack;
      }
      lastError = undefined;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    if (Date.now() - started >= params.timeoutMs) {
      const detail = lastError ? `; last ack read failed: ${lastError}` : "";
      throw new Error(`timed out waiting for ${params.runtimeId} to acknowledge handoff ${params.requestId}${detail}`);
    }
    await delay(params.pollMs);
  }
}

function requiredSecret(secrets: Record<string, string>, key: string): string {
  const value = secrets[key];
  if (!value) {
    throw new Error(`missing local secret ${key}; cannot configure gateway`);
  }
  return value;
}

function requiredOption(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function shouldPull(opts: { pull?: boolean }): boolean {
  return opts.pull !== false;
}

async function update(
  repoId: string,
  opts: UpdateOptions,
  hub: HubApi,
  hfToken: string,
  runtime: Required<CliRuntime>,
): Promise<void> {
  const variables = await hub.getSpaceVariables(repoId);
  if (!variables.has("OPENCLAW_HF_TEMPLATE_REV") && !opts.force) {
    throw new Error(`${repoId} does not look like a HuggingClaw deployment; pass --force to update anyway`);
  }
  const runtimeImage = resolveRuntimeImage(opts.runtimeImage, runtime.env);
  const agentName = variables.get("OPENCLAW_AGENT_NAME")?.value?.trim() || repoId.split("/")[1] || "openclaw";
  runtime.stdout.log(`Generating current Space files into ${repoId}`);
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: repoId,
    token: hfToken,
    runtimeImage,
  });
  await hub.addSpaceVariable(repoId, "OPENCLAW_HF_TEMPLATE_REV", templateRev);
  await hub.addSpaceVariable(repoId, "HUGGINGCLAW_RUNTIME_IMAGE", runtimeImage);
  await hub.addSpaceVariable(repoId, "HUGGINGCLAW_GATEWAY_LOCATION", "space");
  await hub.addSpaceVariable(repoId, "HUGGINGCLAW_RUNTIME_ID", spaceRuntimeId(agentName));
  await hub.restartSpace(repoId, true);
  await doctor(repoId, { fix: true }, hub, runtime);
}

async function doctor(repoId: string, opts: DoctorOptions, hub: HubApi, runtime: Required<CliRuntime>): Promise<void> {
  if (!repoId.includes("/") && await manifestExists(runtime.configRoot, repoId)) {
    await gatewayStatus(repoId, runtime);
    return;
  }
  const fix = Boolean(opts.fix);
  const variables = await hub.getSpaceVariables(repoId);
  const secrets = await hub.getSpaceSecrets(repoId);
  const issues: string[] = [];
  const fixed: string[] = [];

  const bucket = variables.get("OPENCLAW_HF_STATE_BUCKET")?.value ?? opts.bucket;
  if (!bucket) {
    issues.push("OPENCLAW_HF_STATE_BUCKET is missing");
  } else if (!variables.has("OPENCLAW_HF_STATE_BUCKET") && fix) {
    await hub.addSpaceVariable(repoId, "OPENCLAW_HF_STATE_BUCKET", bucket);
    fixed.push("set OPENCLAW_HF_STATE_BUCKET");
  }
  for (const key of STALE_PATH_VARS) {
    if (variables.has(key)) {
      if (fix) {
        await hub.deleteSpaceVariable(repoId, key);
        fixed.push(`deleted ${key}`);
      } else {
        issues.push(`${key} is set; runtime now derives it from OPENCLAW_LIVE_DIR`);
      }
    }
  }
  for (const key of ["OPENCLAW_GATEWAY_TOKEN", "HF_TOKEN"]) {
    if (!secrets.has(key)) {
      issues.push(`secret ${key} is missing`);
    }
  }
  if (!variables.has("OPENCLAW_HF_TEMPLATE_REV")) {
    issues.push("OPENCLAW_HF_TEMPLATE_REV is missing; updates cannot verify template lineage");
  }
  if ((variables.get("HUGGINGCLAW_GATEWAY_LOCATION")?.value ?? "") !== "space") {
    issues.push("HUGGINGCLAW_GATEWAY_LOCATION is not set to space");
  }
  if (!variables.has("HUGGINGCLAW_RUNTIME_IMAGE")) {
    issues.push("HUGGINGCLAW_RUNTIME_IMAGE is missing");
  }
  if (bucket) {
    await hub.assertBucketAccessible(bucket);
  }

  const runtimeInfo = await hub.getSpaceRuntime(repoId);
  let logs = "";
  try {
    logs = await hub.fetchSpaceLogs(repoId, "run");
  } catch {
    issues.push("run logs are not available yet");
  }
  const hasRestoreOutcome = /restored snapshot|fresh start/i.test(logs);
  const hasSnapshotOutcome = /snapshot .* uploaded/i.test(logs);
  if (logs && !hasRestoreOutcome) {
    issues.push("run logs do not show a restore or fresh-start outcome yet");
  }
  if (logs && !hasSnapshotOutcome) {
    issues.push("run logs do not show a recent uploaded snapshot yet");
  }

  runtime.stdout.log(`Space: ${repoId}`);
  runtime.stdout.log(`Stage: ${runtimeInfo.stage ?? "unknown"}`);
  runtime.stdout.log(`Hardware: ${formatRuntimeValue(runtimeInfo.requested_hardware ?? runtimeInfo.hardware)}`);
  if (typeof runtimeInfo.sleep_time === "number") {
    runtime.stdout.log(`Sleep time: ${runtimeInfo.sleep_time}`);
  }
  if (fixed.length > 0) {
    runtime.stdout.log(`Fixed: ${fixed.join(", ")}`);
  }
  if (issues.length === 0) {
    runtime.stdout.log("Doctor: clean");
  } else {
    runtime.stdout.log("Doctor findings:");
    for (const issue of issues) {
      runtime.stdout.log(`- ${issue}`);
    }
  }
}

async function settings(repoId: string, opts: SettingsOptions, hub: HubApi, runtime: Required<CliRuntime>): Promise<void> {
  if (opts.gateway) {
    throw new Error("gateway location changes must use `hclaw gateway migrate` to preserve state");
  }
  if (!opts.hardware && typeof opts.sleepTime !== "number") {
    throw new Error("usage: hclaw settings <owner/space> [--hardware flavor] [--sleep-time seconds]");
  }
  if (opts.hardware && isPaidHardware(opts.hardware)) {
    await confirmPaidHardware({
      hardware: opts.hardware,
      ...(typeof opts.sleepTime === "number" ? { sleepTime: opts.sleepTime } : {}),
      yes: Boolean(opts.yes),
      runtime,
    });
  }
  const result = opts.hardware
    ? await hub.requestSpaceHardware(repoId, opts.hardware, opts.sleepTime)
    : await hub.setSpaceSleepTime(repoId, opts.sleepTime as number);
  runtime.stdout.log("Space settings updated");
  runtime.stdout.log(`Space: ${repoId}`);
  runtime.stdout.log(`Hardware: ${formatRuntimeValue(result.requested_hardware ?? result.hardware)}`);
  if (typeof opts.sleepTime === "number") {
    runtime.stdout.log(`Sleep time: ${opts.sleepTime}`);
  }
}

function formatRuntimeValue(value: unknown): string {
  if (!value) {
    return "unknown";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && "current" in value && typeof value.current === "string") {
    return value.current;
  }
  if (typeof value === "object" && "requested" in value && typeof value.requested === "string") {
    return value.requested;
  }
  return JSON.stringify(value);
}

async function setDeploymentVariables(
  hub: HubApi,
  repoId: string,
  variables: Record<string, string>,
): Promise<void> {
  for (const [key, value] of Object.entries(variables)) {
    await hub.addSpaceVariable(repoId, key, value);
  }
}

async function setDeploymentSecrets(
  hub: HubApi,
  repoId: string,
  secrets: Record<string, string>,
): Promise<void> {
  for (const [key, value] of Object.entries(secrets)) {
    await hub.addSpaceSecret(repoId, key, value);
  }
}

async function clearSpaceGatewayDisabled(hub: HubApi, repoId: string): Promise<void> {
  try {
    await hub.deleteSpaceVariable(repoId, "HUGGINGCLAW_GATEWAY_DISABLED");
  } catch (err) {
    if (err instanceof HubApiError && err.status === 404) {
      return;
    }
    throw err;
  }
}

async function readTelegramToken(opts: BootstrapOptions, runtime: Required<CliRuntime>): Promise<string> {
  const direct = opts.telegramToken ?? runtime.env.TELEGRAM_BOT_TOKEN;
  if (direct) {
    return direct;
  }
  if (opts.telegramTokenFile) {
    const raw = await fs.readFile(opts.telegramTokenFile, "utf8");
    const match = raw.match(/(?:^|\n)\s*TELEGRAM_BOT_TOKEN\s*=\s*['"]?([^'"\n]+)['"]?/);
    return (match?.[1] ?? raw.trim()).trim();
  }
  if (!runtime.prompt.isInteractive()) {
    throw new Error("Telegram bot token is required; pass --telegram-token or --telegram-token-file");
  }
  const value = await runtime.prompt.password({
    message: "Telegram bot token",
    placeholder: "123456:ABC...",
  });
  return readPromptValue(value, "Telegram bot token");
}

async function resolveHardware(params: {
  requestedHardware?: string;
  requestedSleepTime?: number;
  yes: boolean;
  runtime: Required<CliRuntime>;
}): Promise<{ hardware: string; sleepTime?: number }> {
  const hardware = params.requestedHardware ?? TELEGRAM_HARDWARE;
  if (!isPaidHardware(hardware)) {
    throw new Error(`Telegram requires upgraded paid Space hardware today; use --hardware ${TELEGRAM_HARDWARE}`);
  }
  const sleepTime = params.requestedSleepTime ?? TELEGRAM_SLEEP_TIME;
  await confirmPaidHardware({
    hardware,
    sleepTime,
    yes: params.yes,
    runtime: params.runtime,
  });
  return { hardware, sleepTime };
}

async function confirmPaidHardware(params: {
  hardware: string;
  sleepTime?: number;
  yes: boolean;
  runtime: Required<CliRuntime>;
}): Promise<void> {
  if (params.yes) {
    return;
  }
  if (!params.runtime.prompt.isInteractive()) {
    throw new Error("paid Hugging Face Space hardware requires explicit consent; pass --yes to confirm");
  }
  params.runtime.prompt.note(
    `${PAID_HARDWARE_COST_NOTE}\n\nRequested hardware: ${params.hardware}${
      typeof params.sleepTime === "number" ? `\nRequested sleep-time: ${params.sleepTime}` : ""
    }`,
    "Cost warning",
  );
  const ok = await promptConfirm("Request paid Hugging Face Space hardware?", false, params.runtime);
  if (!ok) {
    throw new Error("paid hardware was not confirmed");
  }
}

async function promptRequired(label: string, runtime: Required<CliRuntime>): Promise<string> {
  if (!runtime.prompt.isInteractive()) {
    throw new Error(`${label} is required`);
  }
  const value = await runtime.prompt.text({ message: label });
  return readPromptValue(value, label);
}

async function promptConfirm(label: string, initialValue: boolean, runtime: Required<CliRuntime>): Promise<boolean> {
  const value = await runtime.prompt.confirm({ message: label, initialValue });
  if (isCancel(value)) {
    runtime.prompt.cancel("Cancelled");
    throw new Error("cancelled");
  }
  return Boolean(value);
}

function readPromptValue(value: string | symbol, label: string): string {
  if (isCancel(value)) {
    cancel("Cancelled");
    throw new Error("cancelled");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

function parseInteger(value: string): number {
  if (!/^-?\d+$/.test(value)) {
    throw new InvalidArgumentError("expected an integer");
  }
  return Number.parseInt(value, 10);
}

function isPaidHardware(hardware: string): boolean {
  return hardware !== DEFAULT_HARDWARE;
}

let invokedPath = "";
try {
  invokedPath = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : "";
} catch {
  invokedPath = "";
}
if (import.meta.url === invokedPath) {
  main().then((code) => process.exit(code));
}
