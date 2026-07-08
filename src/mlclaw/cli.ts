#!/usr/bin/env node
import fs from "node:fs/promises";
import { realpathSync } from "node:fs";
import process from "node:process";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Command, CommanderError, InvalidArgumentError, Option } from "commander";
import { cancel, confirm, intro, isCancel, note, outro, password, text } from "@clack/prompts";
import { findSkillsRoot, handleSkillflag } from "skillflag";
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
import { normalizeBucketPrefix } from "../hf-state-sync/paths.js";
import {
  defaultConfigRoot,
  manifestExists,
  readManifest,
  readSecretEnv,
  secretEnvPath,
  type DeploymentManifest,
  type LocalGatewayBinding,
  writeManifest,
  writeSecretEnv,
} from "./local-config.js";
import { namesFor, slugifyAgentName } from "./naming.js";
import { bundledSpaceRuntimeRef, resolveRuntimeImage, resolveRuntimeImageOverride } from "./runtime-image.js";
import { getTelegramBot, type TelegramBot } from "./telegram.js";

export const DEFAULT_MODEL = "huggingface/google/gemma-4-26B-A4B-it";
export const DEFAULT_HARDWARE = "cpu-basic";
export const TELEGRAM_HARDWARE = "cpu-upgrade";
export const TELEGRAM_SLEEP_TIME = -1;
export const DEFAULT_GATEWAY_LOCATION: GatewayLocation = "space";
export const DEFAULT_LOCAL_PORT = 7860;
export const DEFAULT_SPACE_OPENCLAW_PORT = 7861;
export const LOCAL_VOLUME_MOUNT_PATH = "/tmp/mlclaw-local";
export const LOCAL_LIVE_DIR = `${LOCAL_VOLUME_MOUNT_PATH}/openclaw-live`;
export const SPACE_HANDOFF_TIMEOUT_MS = 120_000;
export const SPACE_HANDOFF_POLL_MS = 5_000;

const STALE_PATH_VARS = ["OPENCLAW_STATE_DIR", "OPENCLAW_WORKSPACE_DIR", "OPENCLAW_CONFIG_PATH"];
const SNAPSHOT_MANIFEST_REMOTE_NAME = "manifest.json";
const DEFAULT_CANONICAL_TEMPLATE_SPACE = "osolmaz/mlclaw";
const PAID_HARDWARE_COST_NOTE =
  "Paid Hugging Face Space hardware costs money while allocated. The cheapest option is cpu-upgrade at $0.03/hour, about $22/month if kept always on.";

type BootstrapOptions = {
  owner?: string;
  name?: string;
  bucket?: string;
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
  publicSpace?: boolean;
  gatewayToken?: string;
  dockerContext?: string;
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
  dockerContext?: string;
  pull?: boolean;
  takeover?: boolean;
  publicSpace?: boolean;
  yes?: boolean;
  tail?: number;
};

type GatewayRebindOptions = {
  dockerContext?: string;
  pull?: boolean;
  takeover?: boolean;
};

type StateAdoptOptions = {
  bucket?: string;
  pull?: boolean;
  takeover?: boolean;
  yes?: boolean;
};

type BucketStateInspection = {
  objectCount: number;
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
    .name("mlclaw")
    .description("Deploy OpenClaw to a Hugging Face Space and private bucket")
    .showHelpAfterError()
    .exitOverride((err) => {
      throw err;
    });

  program
    .command("bootstrap", { isDefault: true })
    .description("Create or update a Hugging Face OpenClaw deployment")
    .option("--owner <owner>", "Hugging Face user or organization")
    .option("--name <name>", "Agent and runtime resource base name")
    .option("--bucket <owner/bucket>", "State bucket to create or adopt")
    .option("--gateway <local|space>", "Where the live gateway runs")
    .option("--telegram-token <token>", "Optional Telegram bot token")
    .option("--telegram-token-file <path>", "File containing TELEGRAM_BOT_TOKEN=... or a raw token")
    .option("--telegram-user-id <id>", "Allowed Telegram user ID")
    .option("--telegram-api-root <url>", "Telegram API root override")
    .option("--telegram-proxy <url>", "Telegram proxy URL override")
    .option("--hardware <flavor>", "Hugging Face Space hardware flavor")
    .option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger)
    .option("--model <model>", "OpenClaw model identifier", DEFAULT_MODEL)
    .option("--runtime-image <image>", "ML Claw runtime image")
    .option("--public-space", "Create the Hugging Face Space as public instead of private", false)
    .addOption(new Option("--gateway-token <token>").hideHelp())
    .option("--docker-context <name>", "Docker context for local gateway mode")
    .option("--no-pull", "Do not docker pull before starting a local gateway")
    .option("--takeover", "Start even if a stale runtime lease is present", false)
    .option("--yes", "Confirm paid hardware prompts for automation", false)
    .action(async (opts: BootstrapOptions) => {
      await bootstrap(opts, runtime);
    });

  program
    .command("update")
    .description("Regenerate and upload current ML Claw Space files")
    .argument("<owner/space>", "Hugging Face Space repo ID")
    .option("--runtime-image <image>", "Runtime image to write into the generated Space Dockerfile")
    .option("--force", "Update even if the Space does not look like ML Claw", false)
    .action(async (repoId: string, opts: UpdateOptions) => {
      const token = await runtime.readToken(runtime.env);
      const hub = runtime.hubFactory(token);
      await update(repoId, opts, hub, token, runtime);
    });

  program
    .command("doctor")
    .description("Check a ML Claw Space deployment")
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
    .description("Operate a ML Claw gateway");

  gateway
    .command("start")
    .argument("<agent>", "Agent name")
    .option("--docker-context <name>", "Set Docker context only when the deployment has no pinned context")
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
    .option("--hardware <flavor>", "Hugging Face Space hardware flavor")
    .option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger)
    .option("--runtime-image <image>", "ML Claw runtime image")
    .option("--public-space", "Create the Hugging Face Space as public instead of private", false)
    .option("--docker-context <name>", "Docker context for local gateway startup when migrating to local")
    .option("--no-pull", "Do not docker pull before starting a local gateway")
    .option("--takeover", "Start even if another live runtime lease is present", false)
    .option("--yes", "Confirm paid hardware prompts for automation", false)
    .action(async (agent: string, opts: GatewayCommandOptions) => {
      await gatewayMigrate(agent, opts, runtime);
    });

  gateway
    .command("rebind")
    .argument("<agent>", "Agent name")
    .requiredOption("--docker-context <name>", "Target Docker context")
    .option("--no-pull", "Do not docker pull before starting the rebound local gateway")
    .option("--takeover", "Rebind even if the old Docker context is unavailable", false)
    .action(async (agent: string, opts: GatewayRebindOptions) => {
      await gatewayRebind(agent, opts, runtime);
    });

  const state = program
    .command("state")
    .description("Operate ML Claw durable state");

  state
    .command("adopt")
    .description("Point an existing deployment at a state bucket")
    .argument("<agent>", "Agent name")
    .requiredOption("--bucket <owner/bucket>", "State bucket to adopt")
    .option("--no-pull", "Do not docker pull before restarting a local gateway")
    .option("--takeover", "Adopt even if another live runtime lease is present", false)
    .option("--yes", "Confirm adoption prompts for automation", false)
    .action(async (agent: string, opts: StateAdoptOptions) => {
      await stateAdopt(agent, opts, runtime);
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
  runtime.prompt.intro("ML Claw bootstrap");
  const requestedGatewayLocation = opts.gateway ? parseGatewayLocation(opts.gateway) : undefined;
  const hfToken = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(hfToken);
  const me = await hub.whoami();
  const owner = opts.owner ?? me.name;
  const telegramToken = await readOptionalTelegramToken(opts, runtime);
  const bot = telegramToken ? await runtime.getTelegramBot(telegramToken, opts.telegramApiRoot) : undefined;
  const agentName = slugifyAgentName(opts.name ?? bot?.username ?? await promptAgentName(runtime));
  const telegramUserId = telegramToken
    ? opts.telegramUserId ?? runtime.env.TELEGRAM_ALLOWED_USERS ?? await promptRequired("Telegram allowed user ID", runtime)
    : undefined;

  const names = namesFor(owner, agentName);
  const model = opts.model ?? DEFAULT_MODEL;
  const runtimeImage = resolveRuntimeImage(opts.runtimeImage, runtime.env);
  const templateRuntimeImage = resolveRuntimeImageOverride(opts.runtimeImage, runtime.env);
  const sessionSecret = randomBytes(48).toString("base64url");
  const now = runtime.now().toISOString();
  const existingManifest = await readManifest(runtime.configRoot, agentName).catch(() => null);
  const existingSecrets = await readSecretEnv(runtime.configRoot, agentName).catch(() => ({}));
  const gatewayLocation = requestedGatewayLocation ?? existingManifest?.gatewayLocation ?? DEFAULT_GATEWAY_LOCATION;
  if (opts.dockerContext && gatewayLocation !== "local") {
    throw new Error("--docker-context only applies to local gateway mode");
  }
  const bucketPrefix = bootstrapBucketPrefix(existingManifest, existingSecrets, runtime);
  const localRuntimeId = existingManifest?.localRuntimeId ?? newLocalRuntimeId(agentName);
  const localGateway = gatewayLocation === "local"
    ? await resolveLocalGatewayBinding({
      manifest: existingManifest,
      requestedContext: opts.dockerContext,
      runtime,
      persist: false,
    })
    : existingManifest?.localGateway;
  const bucket = await resolveBootstrapBucket({
    explicitBucket: opts.bucket,
    defaultBucket: names.bucket,
    existingManifest,
    bucketPrefix,
    hub,
    yes: Boolean(opts.yes),
    runtime,
  });

  const manifest: DeploymentManifest = {
    version: 1,
    agent: agentName,
    owner,
    bucket,
    space: names.space,
    localRuntimeId,
    gatewayLocation,
    model,
    runtimeImage,
    ...(localGateway ? { localGateway } : {}),
    createdAt: existingManifest?.createdAt ?? now,
    updatedAt: now,
  };
  const secrets = deploymentSecrets({
    hfToken,
    ...(telegramToken ? { telegramToken } : {}),
    ...(telegramUserId ? { telegramUserId } : {}),
    sessionSecret,
    bucket,
    model,
    agentName,
    runtimeImage,
    gatewayLocation,
    runtimeId: gatewayLocation === "local" ? manifest.localRuntimeId : spaceRuntimeId(agentName),
    ...(bucketPrefix ? { bucketPrefix } : {}),
    ...(opts.telegramProxy ? { telegramProxy: opts.telegramProxy } : {}),
    ...(opts.telegramApiRoot ? { telegramApiRoot: opts.telegramApiRoot } : {}),
  });
  let deployedSpaceRuntime: string | undefined;
  if (gatewayLocation === "space") {
    await assertNoLiveForeignLease({
      hub,
      bucket,
      bucketPrefix,
      runtimeId: spaceRuntimeId(agentName),
      takeover: Boolean(opts.takeover),
    });
    const paidHardware = await resolveHardware({
      requestedHardware: opts.hardware ?? (telegramToken ? TELEGRAM_HARDWARE : DEFAULT_HARDWARE),
      ...(typeof opts.sleepTime === "number"
        ? { requestedSleepTime: opts.sleepTime }
        : telegramToken ? { requestedSleepTime: TELEGRAM_SLEEP_TIME } : {}),
      requiresMessagingEgress: Boolean(telegramToken),
      yes: Boolean(opts.yes),
      runtime,
    });
    const deployed = await deploySpaceGateway({
      hub,
      runtime,
      hfToken,
      manifest,
      secrets,
      allowedUsers: me.name,
      hardware: paidHardware.hardware,
      publicSpace: Boolean(opts.publicSpace),
      ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
      ...(templateRuntimeImage ? { templateRuntimeImage } : {}),
    });
    deployedSpaceRuntime = deployed.runtimeImage;
    await writeLocalDeployment(runtime.configRoot, manifest, secrets);
  } else {
    await assertNoLiveForeignLease({
      hub,
      bucket,
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
  runtime.stdout.log(`Bucket: https://huggingface.co/buckets/${bucket}`);
  if (gatewayLocation === "space") {
    runtime.stdout.log(`Space:  https://huggingface.co/spaces/${names.space}`);
  } else {
    runtime.stdout.log(`Local:  ${containerNameFor(agentName)}`);
  }
  runtime.stdout.log(`Agent:  ${agentName}${bot ? ` (@${bot.username})` : ""}`);
  runtime.stdout.log(`Gateway: ${gatewayLocation}`);
  if (gatewayLocation === "local" && manifest.localGateway) {
    runtime.stdout.log(`Docker:  ${manifest.localGateway.dockerContext}`);
  }
  runtime.stdout.log(`Runtime image: ${runtimeImage}`);
  if (deployedSpaceRuntime) {
    runtime.stdout.log(`Space runtime: ${deployedSpaceRuntime}`);
  }
  runtime.prompt.outro(gatewayLocation === "space"
    ? "Restart requested. Build logs may take a few minutes to appear."
    : "Local gateway start requested.");
}

async function resolveBootstrapBucket(params: {
  explicitBucket?: string | undefined;
  defaultBucket: string;
  existingManifest: DeploymentManifest | null;
  bucketPrefix?: string | undefined;
  hub: HubApi;
  yes: boolean;
  runtime: Required<CliRuntime>;
}): Promise<string> {
  const explicitBucket = params.explicitBucket ? parseBucketId(params.explicitBucket) : undefined;
  const bucket = explicitBucket ?? params.existingManifest?.bucket ?? params.defaultBucket;
  params.runtime.stdout.log(`Creating or adopting private bucket ${bucket}`);
  await params.hub.createBucket(bucket, true);
  const inspection = await inspectStateBucket(params.hub, bucket, params.bucketPrefix);

  const existingBucket = params.existingManifest?.bucket;
  if (explicitBucket && existingBucket && existingBucket !== explicitBucket) {
    await confirmBucketChange({
      message: `Change ${params.existingManifest?.agent ?? "deployment"} state bucket from ${existingBucket} to ${explicitBucket}?`,
      yes: params.yes,
      runtime: params.runtime,
    });
  } else if (explicitBucket && !existingBucket && inspection.objectCount > 0) {
    await confirmBucketChange({
      message: `Adopt existing state bucket ${explicitBucket} with ${inspection.objectCount} object(s)?`,
      yes: params.yes,
      runtime: params.runtime,
    });
  }
  return bucket;
}

async function stateAdopt(agent: string, opts: StateAdoptOptions, runtime: Required<CliRuntime>): Promise<void> {
  const bucket = parseBucketId(requiredOption(opts.bucket, "--bucket"));
  const current = await readDeploymentManifest(runtime, agent);
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const secrets = await readSecretEnv(runtime.configRoot, agent);
  const bucketPrefix = persistedBucketPrefix(secrets);

  runtime.stdout.log(`Creating or adopting private bucket ${bucket}`);
  await hub.createBucket(bucket, true);
  await inspectStateBucket(hub, bucket, bucketPrefix);
  await assertNoLiveForeignLease({
    hub,
    bucket,
    bucketPrefix,
    runtimeId: runtimeIdFor(current),
    takeover: Boolean(opts.takeover),
  });

  const bucketChanged = current.bucket !== bucket;
  if (bucketChanged) {
    await confirmBucketChange({
      message: `Adopt state bucket ${bucket} for ${agent}, replacing ${current.bucket}?`,
      yes: Boolean(opts.yes),
      runtime,
    });
  }

  if (bucketChanged) {
    if (current.gatewayLocation === "local") {
      await handoffAndStopLocalGateway({
        manifest: current,
        hub,
        runtime,
        bucketPrefix,
        targetRuntimeId: current.localRuntimeId,
      });
    } else {
      await disableAndPauseSpaceGateway({
        manifest: current,
        hub,
        runtime,
        bucketPrefix,
        targetRuntimeId: spaceRuntimeId(current.agent),
      });
    }
  }

  const updated: DeploymentManifest = {
    ...current,
    bucket,
    updatedAt: runtime.now().toISOString(),
  };
  const updatedSecrets = {
    ...secrets,
    OPENCLAW_HF_STATE_BUCKET: bucket,
    OPENCLAW_AGENT_NAME: updated.agent,
    OPENCLAW_MODEL: updated.model,
    MLCLAW_GATEWAY_LOCATION: updated.gatewayLocation,
    MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
    MLCLAW_RUNTIME_ID: runtimeIdFor(updated),
  };
  await writeLocalDeployment(runtime.configRoot, updated, updatedSecrets);

  if (updated.gatewayLocation === "local") {
    if (bucketChanged) {
      await startLocalGateway({ manifest: updated, runtime, pull: shouldPull(opts), resetVolume: true });
    } else {
      runtime.stdout.log(`Deployment already uses bucket ${bucket}`);
    }
  } else {
    await setDeploymentVariables(hub, updated.space, {
      OPENCLAW_HF_STATE_BUCKET: bucket,
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_ID: spaceRuntimeId(updated.agent),
    });
    await clearSpaceGatewayDisabled(hub, updated.space);
    if (bucketChanged) {
      await hub.restartSpace(updated.space, true);
      runtime.stdout.log(`Space gateway restart requested: ${updated.space}`);
    } else {
      runtime.stdout.log(`Deployment already uses bucket ${bucket}`);
    }
  }
  runtime.stdout.log(`State bucket: ${bucket}`);
}

async function inspectStateBucket(
  hub: HubApi,
  bucket: string,
  bucketPrefix?: string,
): Promise<BucketStateInspection> {
  await hub.assertBucketAccessible(bucket);
  const client = hub.bucket(bucket);
  const entries = await client.listFiles();
  const fileEntries = entries.filter((entry) => entry.type === "file");
  const prefix = normalizeBucketPrefix(bucketPrefix);
  const prefixWithSlash = `${prefix}/`;
  const manifestPath = `${prefixWithSlash}${SNAPSHOT_MANIFEST_REMOTE_NAME}`;
  const stateEntries = fileEntries.filter((entry) =>
    entry.path === manifestPath ||
    entry.path.startsWith(`${prefixWithSlash}snapshots/`) ||
    entry.path.startsWith(`${prefixWithSlash}runtime/`)
  );

  if (fileEntries.length > 0 && stateEntries.length === 0) {
    throw new Error(`bucket ${bucket} contains objects but no ML Claw state under ${prefix}`);
  }

  const hasSnapshotManifest = stateEntries.some((entry) => entry.path === manifestPath);
  if (hasSnapshotManifest) {
    const blob = await client.downloadFile(manifestPath);
    if (!blob) {
      throw new Error(`bucket ${bucket} listed ${manifestPath}, but it could not be downloaded`);
    }
    const currentSnapshotPath = parseCurrentSnapshotPath(await blob.text(), bucket, manifestPath);
    const filePaths = new Set(fileEntries.map((entry) => entry.path));
    if (!filePaths.has(currentSnapshotPath)) {
      throw new Error(`bucket ${bucket} state manifest points to missing snapshot ${currentSnapshotPath}`);
    }
  }

  return {
    objectCount: fileEntries.length,
  };
}

function parseCurrentSnapshotPath(raw: string, bucket: string, manifestPath: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`bucket ${bucket} has an invalid state manifest ${manifestPath}: ${String(err)}`);
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    parsed.version !== 1 ||
    !("current" in parsed) ||
    typeof parsed.current !== "object" ||
    parsed.current === null ||
    !("path" in parsed.current) ||
    typeof parsed.current.path !== "string" ||
    parsed.current.path.length === 0
  ) {
    throw new Error(`bucket ${bucket} has an invalid state manifest ${manifestPath}: missing current snapshot path`);
  }
  return parsed.current.path;
}

async function confirmBucketChange(params: {
  message: string;
  yes: boolean;
  runtime: Required<CliRuntime>;
}): Promise<void> {
  if (params.yes) {
    return;
  }
  if (!params.runtime.prompt.isInteractive()) {
    throw new Error(`${params.message} Pass --yes to confirm.`);
  }
  params.runtime.prompt.note("The bucket is the durable OpenClaw identity and state pointer.", "State bucket");
  const ok = await promptConfirm(params.message, false, params.runtime);
  if (!ok) {
    throw new Error("state bucket adoption was not confirmed");
  }
}

function parseBucketId(raw: string): string {
  const bucket = raw.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(bucket)) {
    throw new Error(`expected bucket id as owner/name, got ${raw}`);
  }
  return bucket;
}

function deploymentSecrets(params: {
  hfToken: string;
  telegramToken?: string;
  telegramUserId?: string;
  sessionSecret: string;
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
    HUGGINGFACE_HUB_TOKEN: params.hfToken,
    OPENCLAW_HF_STATE_BUCKET: params.bucket,
    OPENCLAW_MODEL: params.model,
    OPENCLAW_AGENT_NAME: params.agentName,
    MLCLAW_GATEWAY_LOCATION: params.gatewayLocation,
    MLCLAW_RUNTIME_IMAGE: params.runtimeImage,
    MLCLAW_RUNTIME_ID: params.runtimeId,
    MLCLAW_SESSION_SECRET: params.sessionSecret,
    MLCLAW_OPENCLAW_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    OPENCLAW_GATEWAY_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    ...(params.telegramToken ? { TELEGRAM_BOT_TOKEN: params.telegramToken } : {}),
    ...(params.telegramUserId ? { TELEGRAM_ALLOWED_USERS: params.telegramUserId } : {}),
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
  allowedUsers: string;
  hardware: string;
  sleepTime?: number;
  templateRuntimeImage?: string;
  publicSpace?: boolean;
}): Promise<{ runtimeImage: string }> {
  const { hub, runtime, hfToken, manifest, secrets } = params;
  runtime.stdout.log(`Creating ${params.publicSpace ? "public" : "private"} Space ${manifest.space}`);
  await hub.createDockerSpace(manifest.space, {
    private: !params.publicSpace,
    hardware: params.hardware,
    ...(typeof params.sleepTime === "number" ? { sleepTimeSeconds: params.sleepTime } : {}),
  });
  await hub.requestSpaceHardware(manifest.space, params.hardware, params.sleepTime);
  runtime.stdout.log(params.templateRuntimeImage
    ? "Generating Space files from explicit runtime image"
    : "Generating bundled Space runtime files");
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: manifest.space,
    token: hfToken,
    ...(params.templateRuntimeImage ? { runtimeImage: params.templateRuntimeImage } : {}),
  });
  const spaceRuntimeRef = params.templateRuntimeImage ?? bundledSpaceRuntimeRef(templateRev);

  await setDeploymentVariables(hub, manifest.space, {
    OPENCLAW_HF_STATE_BUCKET: manifest.bucket,
    ...(secrets.OPENCLAW_HF_STATE_PREFIX ? { OPENCLAW_HF_STATE_PREFIX: secrets.OPENCLAW_HF_STATE_PREFIX } : {}),
    MLCLAW_TEMPLATE_REV: templateRev,
    OPENCLAW_MODEL: manifest.model,
    OPENCLAW_AGENT_NAME: manifest.agent,
    MLCLAW_GATEWAY_LOCATION: "space",
    MLCLAW_RUNTIME_IMAGE: spaceRuntimeRef,
    MLCLAW_RUNTIME_ID: spaceRuntimeId(manifest.agent),
    MLCLAW_ALLOWED_USERS: params.allowedUsers,
    MLCLAW_ADMINS: params.allowedUsers,
    MLCLAW_CANONICAL_SPACE_ID: "osolmaz/mlclaw",
    MLCLAW_OPENCLAW_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    OPENCLAW_GATEWAY_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
  });
  await clearSpaceGatewayDisabled(hub, manifest.space);
  await setDeploymentSecrets(hub, manifest.space, {
    HF_TOKEN: requiredSecret(secrets, "HF_TOKEN"),
    HUGGINGFACE_HUB_TOKEN: requiredSecret(secrets, "HF_TOKEN"),
    MLCLAW_SESSION_SECRET: requiredSecret(secrets, "MLCLAW_SESSION_SECRET"),
    ...(secrets.TELEGRAM_BOT_TOKEN ? { TELEGRAM_BOT_TOKEN: secrets.TELEGRAM_BOT_TOKEN } : {}),
    ...(secrets.TELEGRAM_ALLOWED_USERS ? { TELEGRAM_ALLOWED_USERS: secrets.TELEGRAM_ALLOWED_USERS } : {}),
    ...(secrets.TELEGRAM_PROXY ? { TELEGRAM_PROXY: secrets.TELEGRAM_PROXY } : {}),
    ...(secrets.TELEGRAM_API_ROOT ? { TELEGRAM_API_ROOT: secrets.TELEGRAM_API_ROOT } : {}),
  });
  await hub.restartSpace(manifest.space, true);
  return { runtimeImage: spaceRuntimeRef };
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
  const dockerContext = dockerContextFor(manifest);
  const existing = await runtime.dockerRunner.inspect(containerName, dockerContext);
  const shouldRefresh = Boolean(params.refresh || params.resetVolume);
  if (existing?.running) {
    if (!shouldRefresh) {
      runtime.stdout.log(`Local gateway already running: ${containerName}`);
      return;
    }
  }
  if (params.pull) {
    await runtime.dockerRunner.pull(manifest.runtimeImage, dockerContext);
  }
  if (existing?.running) {
    await runtime.dockerRunner.stop(containerName, dockerContext);
    runtime.stdout.log(`Local gateway stopped for config refresh: ${containerName}`);
  }
  if (existing) {
    await runtime.dockerRunner.rm(containerName, dockerContext);
    runtime.stdout.log(`Local gateway removed for config refresh: ${containerName}`);
  }
  if (params.resetVolume) {
    await runtime.dockerRunner.rmVolume(volumeName, dockerContext);
    runtime.stdout.log(`Local gateway volume reset for bucket restore: ${volumeName}`);
  }
  await runtime.dockerRunner.run({
    containerName,
    image: manifest.runtimeImage,
    envFile: secretEnvPath(runtime.configRoot, manifest.agent),
    volumeName,
    volumeMountPath: LOCAL_VOLUME_MOUNT_PATH,
    liveDir: LOCAL_LIVE_DIR,
    ...(dockerContext ? { context: dockerContext } : {}),
  });
  runtime.stdout.log(`Local gateway created: ${containerName}`);
}

async function stopLocalGateway(manifest: DeploymentManifest, runtime: Required<CliRuntime>): Promise<void> {
  const containerName = containerNameFor(manifest.agent);
  const dockerContext = dockerContextFor(manifest);
  const existing = await runtime.dockerRunner.inspect(containerName, dockerContext);
  if (!existing) {
    runtime.stdout.log(`Local gateway does not exist: ${containerName}`);
    return;
  }
  if (!existing.running) {
    runtime.stdout.log(`Local gateway already stopped: ${containerName}`);
    return;
  }
  await runtime.dockerRunner.stop(containerName, dockerContext);
  runtime.stdout.log(`Local gateway stopped: ${containerName}`);
}

async function gatewayStart(agent: string, opts: GatewayCommandOptions, runtime: Required<CliRuntime>): Promise<void> {
  const manifest = await readDeploymentManifest(runtime, agent, { requestedDockerContext: opts.dockerContext });
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
    if (manifest.localGateway) {
      runtime.stdout.log(`Docker: ${manifest.localGateway.dockerContext}`);
      if (manifest.localGateway.dockerEndpoint) {
        runtime.stdout.log(`Endpoint: ${manifest.localGateway.dockerEndpoint}`);
      }
    }
    const inspect = await runtime.dockerRunner.inspect(containerNameFor(manifest.agent), dockerContextFor(manifest));
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
    runtime.stdout.log(await runtime.dockerRunner.logs(containerNameFor(manifest.agent), opts.tail, dockerContextFor(manifest)));
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  runtime.stdout.log(await hub.fetchSpaceLogs(manifest.space, "run"));
}

async function gatewayMigrate(agent: string, opts: GatewayCommandOptions, runtime: Required<CliRuntime>): Promise<void> {
  const target = parseGatewayLocation(requiredOption(opts.to, "--to"));
  const current = await readDeploymentManifest(runtime, agent, { requestedDockerContext: target === "space" ? opts.dockerContext : undefined });
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
      requestedHardware: opts.hardware ?? (secrets.TELEGRAM_BOT_TOKEN ? TELEGRAM_HARDWARE : DEFAULT_HARDWARE),
      ...(typeof opts.sleepTime === "number"
        ? { requestedSleepTime: opts.sleepTime }
        : secrets.TELEGRAM_BOT_TOKEN ? { requestedSleepTime: TELEGRAM_SLEEP_TIME } : {}),
      requiresMessagingEgress: Boolean(secrets.TELEGRAM_BOT_TOKEN),
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
    const me = await hub.whoami();
    const templateRuntimeImage = resolveRuntimeImageOverride(opts.runtimeImage, runtime.env);
    await deploySpaceGateway({
      hub,
      runtime,
      hfToken: token,
      manifest: updated,
      secrets: {
        ...secrets,
        MLCLAW_GATEWAY_LOCATION: "space",
        MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      },
      allowedUsers: me.name,
      hardware: paidHardware.hardware,
      publicSpace: Boolean(opts.publicSpace),
      ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
      ...(templateRuntimeImage ? { templateRuntimeImage } : {}),
    });
    await writeSecretEnv(runtime.configRoot, agent, {
      ...secrets,
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      MLCLAW_RUNTIME_ID: spaceRuntimeId(agent),
    });
  } else {
    updated.localGateway = await resolveLocalGatewayBinding({
      manifest: opts.dockerContext ? undefined : current.localGateway ? current : undefined,
      requestedContext: opts.dockerContext,
      runtime,
      persist: false,
      agent: current.agent,
    });
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
      MLCLAW_GATEWAY_LOCATION: "local",
      MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      MLCLAW_RUNTIME_ID: updated.localRuntimeId,
    });
    await startLocalGateway({ manifest: updated, runtime, pull: shouldPull(opts), resetVolume: true });
  }
  await writeManifest(runtime.configRoot, updated);
  runtime.stdout.log(`Gateway migrated to ${target}`);
}

async function gatewayRebind(agent: string, opts: GatewayRebindOptions, runtime: Required<CliRuntime>): Promise<void> {
  const targetContext = requiredOption(opts.dockerContext, "--docker-context").trim();
  const current = await readDeploymentManifest(runtime, agent, { validateLocalGateway: false });
  if (current.gatewayLocation !== "local") {
    throw new Error("Docker context rebind only applies to local gateway deployments");
  }

  const targetBinding = await resolveLocalGatewayBinding({
    manifest: undefined,
    requestedContext: targetContext,
    runtime,
    persist: false,
    agent,
  });
  const currentContext = current.localGateway?.dockerContext;
  if (currentContext === targetBinding.dockerContext) {
    runtime.stdout.log(`Local gateway already uses Docker context ${targetBinding.dockerContext}`);
    return;
  }

  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  if (currentContext && await runtime.dockerRunner.contextExists(currentContext)) {
    try {
      await handoffAndStopLocalGateway({
        manifest: current,
        hub,
        runtime,
        bucketPrefix,
        targetRuntimeId: current.localRuntimeId,
      });
    } catch (err) {
      if (!opts.takeover) {
        throw err;
      }
      await clearRuntimeHandoffRequest(hub, current.bucket, bucketPrefix).catch(() => undefined);
      await stopLocalGateway(current, runtime);
      runtime.stdout.log(`Old Docker context handoff failed; rebinding with --takeover: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else if (!opts.takeover) {
    const missing = currentContext ? `Docker context ${currentContext} is not available` : "Deployment has no pinned Docker context";
    throw new Error(`${missing}. Run with --takeover to rebind without a final snapshot from the old context.`);
  } else {
    runtime.stdout.log("Old Docker context unavailable; rebinding with --takeover and using the latest bucket snapshot.");
  }

  const updated: DeploymentManifest = {
    ...current,
    localGateway: targetBinding,
    updatedAt: runtime.now().toISOString(),
  };
  await startLocalGateway({ manifest: updated, runtime, pull: shouldPull(opts), resetVolume: true });
  await writeManifest(runtime.configRoot, updated);
  runtime.stdout.log(`Local gateway rebound to Docker context ${targetBinding.dockerContext}`);
}

async function readDeploymentManifest(
  runtime: Required<CliRuntime>,
  agent: string,
  opts: { requestedDockerContext?: string | undefined; validateLocalGateway?: boolean | undefined } = {},
): Promise<DeploymentManifest> {
  const manifest = await readManifest(runtime.configRoot, agent);
  let updated: DeploymentManifest = manifest.localRuntimeId ? manifest : {
    ...manifest,
    localRuntimeId: newLocalRuntimeId(manifest.agent),
    updatedAt: runtime.now().toISOString(),
  };
  if (updated.gatewayLocation === "local" && opts.validateLocalGateway !== false) {
    const localGateway = await resolveLocalGatewayBinding({
      manifest: updated,
      requestedContext: opts.requestedDockerContext,
      runtime,
      persist: false,
      agent: updated.agent,
    });
    if (!sameLocalGatewayBinding(updated.localGateway, localGateway)) {
      updated = {
        ...updated,
        localGateway,
        updatedAt: runtime.now().toISOString(),
      };
    }
  } else if (opts.requestedDockerContext) {
    throw new Error("--docker-context only applies when the local gateway is used");
  }
  if (updated !== manifest) {
    await writeManifest(runtime.configRoot, updated);
  }
  return updated;
}

async function resolveLocalGatewayBinding(params: {
  manifest?: DeploymentManifest | null | undefined;
  requestedContext?: string | undefined;
  runtime: Required<CliRuntime>;
  persist: boolean;
  agent?: string | undefined;
}): Promise<LocalGatewayBinding> {
  const requestedContext = params.requestedContext?.trim();
  const existing = params.manifest?.localGateway;
  const agent = params.agent ?? params.manifest?.agent ?? "deployment";
  if (existing && requestedContext && existing.dockerContext !== requestedContext) {
    throw new Error(
      `local gateway ${agent} is pinned to Docker context ${existing.dockerContext}. ` +
      `Run \`mlclaw gateway rebind ${agent} --docker-context ${requestedContext}\` to move it.`,
    );
  }

  const dockerContext = existing?.dockerContext ?? requestedContext ?? await params.runtime.dockerRunner.currentContext();
  if (!dockerContext) {
    throw new Error("could not determine Docker context");
  }
  if (!await params.runtime.dockerRunner.contextExists(dockerContext)) {
    throw new Error(
      `Docker context ${dockerContext} is not available. ` +
      `Run \`mlclaw gateway rebind ${agent} --docker-context <context>\` to move this local gateway to another Docker engine.`,
    );
  }

  if (existing) {
    await warnOnDockerContextMismatch(dockerContext, params.runtime);
  }
  const endpoint = await params.runtime.dockerRunner.contextEndpoint(dockerContext);
  const binding: LocalGatewayBinding = {
    engine: "docker",
    dockerContext,
    ...(endpoint ? { dockerEndpoint: endpoint } : {}),
  };
  if (params.persist && params.manifest && !sameLocalGatewayBinding(params.manifest.localGateway, binding)) {
    await writeManifest(params.runtime.configRoot, {
      ...params.manifest,
      localGateway: binding,
      updatedAt: params.runtime.now().toISOString(),
    });
  }
  return binding;
}

async function warnOnDockerContextMismatch(pinnedContext: string, runtime: Required<CliRuntime>): Promise<void> {
  const currentContext = await runtime.dockerRunner.currentContext().catch(() => undefined);
  if (currentContext && currentContext !== pinnedContext) {
    runtime.stdout.log(`Using Docker context ${pinnedContext} from the deployment manifest. Current shell context is ${currentContext}.`);
  }
}

function sameLocalGatewayBinding(a: LocalGatewayBinding | undefined, b: LocalGatewayBinding | undefined): boolean {
  return a?.engine === b?.engine &&
    a?.dockerContext === b?.dockerContext &&
    a?.dockerEndpoint === b?.dockerEndpoint;
}

function dockerContextFor(manifest: DeploymentManifest): string | undefined {
  return manifest.localGateway?.dockerContext;
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
  targetRuntimeId?: string | undefined;
}): Promise<void> {
  const containerName = containerNameFor(params.manifest.agent);
  const dockerContext = dockerContextFor(params.manifest);
  const existing = await params.runtime.dockerRunner.inspect(containerName, dockerContext);
  if (!existing) {
    params.runtime.stdout.log(`Local gateway does not exist: ${containerName}`);
    return;
  }
  if (!existing.running) {
    params.runtime.stdout.log(`Local gateway already stopped: ${containerName}`);
    return;
  }

  await params.runtime.dockerRunner.disableRestart(containerName, dockerContext);
  const handoffStartedAt = params.runtime.now();
  const requestId = randomBytes(16).toString("hex");
  await writeRuntimeHandoffRequest(params.hub, params.manifest.bucket, {
    schemaVersion: 1,
    requestId,
    agent: params.manifest.agent,
    runtimeId: params.manifest.localRuntimeId,
    requestedAt: handoffStartedAt.toISOString(),
    targetRuntimeId: params.targetRuntimeId ?? spaceRuntimeId(params.manifest.agent),
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
  targetRuntimeId?: string | undefined;
}): Promise<void> {
  const handoffStartedAt = params.runtime.now();
  const requestId = randomBytes(16).toString("hex");
  const shouldWaitForHandoff = await spaceGatewayShouldWaitForHandoff(params);
  if (!shouldWaitForHandoff) {
    await params.hub.addSpaceVariable(params.manifest.space, "MLCLAW_GATEWAY_DISABLED", "1");
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
    targetRuntimeId: params.targetRuntimeId ?? params.manifest.localRuntimeId,
  }, params.bucketPrefix);
  await params.hub.addSpaceVariable(params.manifest.space, "MLCLAW_GATEWAY_DISABLED", "1");
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

async function spaceGatewayShouldWaitForHandoff(params: {
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

  if (stageCanRunGateway || leaseIsCurrentSpace) {
    if (stageCanRunGateway && !leaseIsCurrentSpace) {
      const leaseDetail = lease
        ? `last lease is ${lease.gatewayLocation}/${lease.runtimeId} at ${lease.lastHeartbeatAt}`
        : "no runtime lease found";
      params.runtime.stdout.log(
        `Space may still be running (${stage || "unknown"}; ${leaseDetail}); waiting for final snapshot handoff.`,
      );
    }
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
  const canonicalTemplate = isCanonicalTemplateSpace(repoId, runtime.env);
  if (!canonicalTemplate && !variables.has("MLCLAW_TEMPLATE_REV") && !variables.has("OPENCLAW_HF_TEMPLATE_REV") && !opts.force) {
    throw new Error(`${repoId} does not look like a ML Claw deployment; pass --force to update anyway`);
  }
  const runtimeImage = resolveRuntimeImageOverride(opts.runtimeImage, runtime.env);
  const agentName = variables.get("OPENCLAW_AGENT_NAME")?.value?.trim() || repoId.split("/")[1] || "openclaw";
  runtime.stdout.log(`Generating current Space files into ${repoId}`);
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: repoId,
    token: hfToken,
    ...(runtimeImage ? { runtimeImage } : {}),
  });
  await hub.addSpaceVariable(repoId, "MLCLAW_TEMPLATE_REV", templateRev);
  await hub.addSpaceVariable(repoId, "MLCLAW_RUNTIME_IMAGE", runtimeImage ?? bundledSpaceRuntimeRef(templateRev));
  if (canonicalTemplate) {
    await hub.addSpaceVariable(repoId, "MLCLAW_CANONICAL_SPACE_ID", canonicalTemplateSpaceId(runtime.env));
    await doctor(repoId, { fix: true }, hub, runtime);
    await hub.restartSpace(repoId, true);
    return;
  }
  await hub.addSpaceVariable(repoId, "MLCLAW_GATEWAY_LOCATION", "space");
  await hub.addSpaceVariable(repoId, "MLCLAW_RUNTIME_ID", spaceRuntimeId(agentName));
  await hub.addSpaceVariable(repoId, "MLCLAW_OPENCLAW_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
  await hub.addSpaceVariable(repoId, "OPENCLAW_GATEWAY_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
  await doctor(repoId, { fix: true }, hub, runtime);
  await hub.restartSpace(repoId, true);
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
  const canonicalTemplate = isCanonicalTemplateSpace(repoId, runtime.env);

  if (canonicalTemplate) {
    const expectedCanonicalSpace = canonicalTemplateSpaceId(runtime.env);
    if ((variables.get("MLCLAW_CANONICAL_SPACE_ID")?.value ?? "") !== expectedCanonicalSpace) {
      if (fix) {
        await hub.addSpaceVariable(repoId, "MLCLAW_CANONICAL_SPACE_ID", expectedCanonicalSpace);
        fixed.push("set MLCLAW_CANONICAL_SPACE_ID");
      } else {
        issues.push(`MLCLAW_CANONICAL_SPACE_ID is not ${expectedCanonicalSpace}`);
      }
    }
    if (!variables.has("MLCLAW_TEMPLATE_REV") && !variables.has("OPENCLAW_HF_TEMPLATE_REV")) {
      issues.push("MLCLAW_TEMPLATE_REV is missing; run `mlclaw update` to refresh the template Space");
    }
    if (!variables.has("MLCLAW_RUNTIME_IMAGE")) {
      issues.push("MLCLAW_RUNTIME_IMAGE is missing; run `mlclaw update` to refresh the template Space");
    }
    const runtimeInfo = await hub.getSpaceRuntime(repoId);
    runtime.stdout.log(`Space: ${repoId}`);
    runtime.stdout.log("Mode: template");
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
    return;
  }

  const bucket = variables.get("OPENCLAW_HF_STATE_BUCKET")?.value ?? opts.bucket;
  let signedInUser: string | undefined;
  const currentUsername = async () => {
    signedInUser ??= (await hub.whoami()).name;
    return signedInUser;
  };
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
  if (!secrets.has("HF_TOKEN")) {
    issues.push("secret HF_TOKEN is missing");
  }
  if (!secrets.has("MLCLAW_SESSION_SECRET")) {
    if (fix) {
      await hub.addSpaceSecret(repoId, "MLCLAW_SESSION_SECRET", randomBytes(48).toString("base64url"));
      fixed.push("set secret MLCLAW_SESSION_SECRET");
    } else {
      issues.push("secret MLCLAW_SESSION_SECRET is missing");
    }
  }
  if (!variables.has("MLCLAW_TEMPLATE_REV") && !variables.has("OPENCLAW_HF_TEMPLATE_REV")) {
    issues.push("MLCLAW_TEMPLATE_REV is missing; updates cannot verify template lineage");
  }
  if ((variables.get("MLCLAW_GATEWAY_LOCATION")?.value ?? "") !== "space") {
    issues.push("MLCLAW_GATEWAY_LOCATION is not set to space");
  }
  if (!variables.has("MLCLAW_RUNTIME_IMAGE")) {
    issues.push("MLCLAW_RUNTIME_IMAGE is missing");
  }
  if ((variables.get("MLCLAW_OPENCLAW_PORT")?.value ?? "") !== String(DEFAULT_SPACE_OPENCLAW_PORT) && fix) {
    await hub.addSpaceVariable(repoId, "MLCLAW_OPENCLAW_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
    fixed.push("set MLCLAW_OPENCLAW_PORT");
  } else if ((variables.get("MLCLAW_OPENCLAW_PORT")?.value ?? "") !== String(DEFAULT_SPACE_OPENCLAW_PORT)) {
    issues.push(`MLCLAW_OPENCLAW_PORT is not ${DEFAULT_SPACE_OPENCLAW_PORT}`);
  }
  if ((variables.get("OPENCLAW_GATEWAY_PORT")?.value ?? "") !== String(DEFAULT_SPACE_OPENCLAW_PORT) && fix) {
    await hub.addSpaceVariable(repoId, "OPENCLAW_GATEWAY_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
    fixed.push("set OPENCLAW_GATEWAY_PORT");
  } else if ((variables.get("OPENCLAW_GATEWAY_PORT")?.value ?? "") !== String(DEFAULT_SPACE_OPENCLAW_PORT)) {
    issues.push(`OPENCLAW_GATEWAY_PORT is not ${DEFAULT_SPACE_OPENCLAW_PORT}`);
  }
  if (!variables.has("MLCLAW_ALLOWED_USERS")) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "MLCLAW_ALLOWED_USERS", await currentUsername());
      fixed.push("set MLCLAW_ALLOWED_USERS");
    } else {
      issues.push("MLCLAW_ALLOWED_USERS is missing");
    }
  }
  if (!variables.has("MLCLAW_ADMINS")) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "MLCLAW_ADMINS", await currentUsername());
      fixed.push("set MLCLAW_ADMINS");
    } else {
      issues.push("MLCLAW_ADMINS is missing");
    }
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

function canonicalTemplateSpaceId(env: NodeJS.ProcessEnv): string {
  return nonEmpty(env.MLCLAW_CANONICAL_SPACE_ID) ?? DEFAULT_CANONICAL_TEMPLATE_SPACE;
}

function isCanonicalTemplateSpace(repoId: string, env: NodeJS.ProcessEnv): boolean {
  return repoId === canonicalTemplateSpaceId(env);
}

async function settings(repoId: string, opts: SettingsOptions, hub: HubApi, runtime: Required<CliRuntime>): Promise<void> {
  if (opts.gateway) {
    throw new Error("gateway location changes must use `mlclaw gateway migrate` to preserve state");
  }
  if (!opts.hardware && typeof opts.sleepTime !== "number") {
    throw new Error("usage: mlclaw settings <owner/space> [--hardware flavor] [--sleep-time seconds]");
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
    await hub.deleteSpaceVariable(repoId, "MLCLAW_GATEWAY_DISABLED");
  } catch (err) {
    if (err instanceof HubApiError && err.status === 404) {
      return;
    }
    throw err;
  }
}

async function readOptionalTelegramToken(opts: BootstrapOptions, runtime: Required<CliRuntime>): Promise<string | undefined> {
  const direct = opts.telegramToken ?? runtime.env.TELEGRAM_BOT_TOKEN;
  if (direct) {
    return direct;
  }
  if (opts.telegramTokenFile) {
    const raw = await fs.readFile(opts.telegramTokenFile, "utf8");
    const match = raw.match(/(?:^|\n)\s*TELEGRAM_BOT_TOKEN\s*=\s*['"]?([^'"\n]+)['"]?/);
    return (match?.[1] ?? raw.trim()).trim();
  }
  return undefined;
}

async function promptAgentName(runtime: Required<CliRuntime>): Promise<string> {
  if (!runtime.prompt.isInteractive()) {
    return "mlclaw";
  }
  const value = await runtime.prompt.text({
    message: "Agent name",
    placeholder: "bob",
    initialValue: "mlclaw",
  });
  return readPromptValue(value, "Agent name");
}

async function resolveHardware(params: {
  requestedHardware: string;
  requestedSleepTime?: number;
  requiresMessagingEgress?: boolean;
  yes: boolean;
  runtime: Required<CliRuntime>;
}): Promise<{ hardware: string; sleepTime?: number }> {
  const hardware = params.requestedHardware;
  const sleepTime = params.requestedSleepTime ?? TELEGRAM_SLEEP_TIME;
  if (params.requiresMessagingEgress && !isPaidHardware(hardware)) {
    throw new Error(`Telegram requires upgraded paid Space hardware today; use --hardware ${TELEGRAM_HARDWARE} or --gateway local`);
  }
  if (isPaidHardware(hardware)) {
    await confirmPaidHardware({
      hardware,
      sleepTime,
      yes: params.yes,
      runtime: params.runtime,
    });
    return { hardware, sleepTime };
  }
  return typeof params.requestedSleepTime === "number" ? { hardware, sleepTime: params.requestedSleepTime } : { hardware };
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

async function runCli(): Promise<number> {
  if (process.argv.includes("--skill")) {
    return handleSkillflag(process.argv, {
      skillsRoot: findSkillsRoot(import.meta.url),
      includeBundledSkill: false,
    });
  }
  return main();
}

let invokedPath = "";
try {
  invokedPath = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : "";
} catch {
  invokedPath = "";
}
if (import.meta.url === invokedPath) {
  runCli().then((code) => process.exit(code));
}
