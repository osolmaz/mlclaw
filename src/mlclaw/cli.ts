#!/usr/bin/env node
import fs from "node:fs/promises";
import { realpathSync } from "node:fs";
import os from "node:os";
import process from "node:process";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { Command, CommanderError, InvalidArgumentError, Option } from "commander";
import { cancel, confirm, intro, isCancel, note, outro, password, select, text } from "@clack/prompts";
import { findSkillsRoot, handleSkillflag } from "skillflag";
import { ensureHfToken, readToken } from "./auth.js";
import {
  CliDockerRunner,
  CliPodmanRunner,
  containerNameFor,
  type ContainerEngine,
  type ContainerInspect,
  type ContainerRuntimeProbe,
  type ContainerRunner,
  volumeNameFor,
} from "./docker.js";
import { parseGatewayLocation, type GatewayLocation } from "./gateway-location.js";
import { pushTemplateToSpace } from "./git.js";
import { HubApi, HubApiError, type SpaceRuntime, type SpaceVolume } from "./hub-api.js";
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
import { DEFAULT_MODEL as DEFAULT_ROUTER_MODEL } from "../mlclaw-space-runtime/model-default.js";
import { deriveLocalAccessToken } from "../mlclaw-space-runtime/local-access.js";
import {
  defaultConfigRoot,
  manifestPath,
  manifestExists,
  parseSecretEnv,
  readManifest,
  readSecretEnv,
  secretEnvPath,
  type DeploymentManifest,
  type LocalGatewayBinding,
  type NetworkAccessBinding,
  writeManifest,
  writeSecretEnv,
} from "./local-config.js";
import { namesFor, slugifyAgentName } from "./naming.js";
import {
  bundledSpaceRuntimeRef,
  DEFAULT_RUNTIME_IMAGE,
  resolveRuntimeImage,
  resolveSpaceRuntimeImage,
} from "./runtime-image.js";
import { getTelegramBot, type TelegramBot } from "./telegram.js";
import { createSystemHfCli, type HfCliRuntime } from "./hf-cli.js";
import {
  CliTailscaleRunner,
  tailscaleAccessOrigin,
  type TailscaleRunner,
  type TailscaleServeMapping,
} from "./tailscale.js";

export const DEFAULT_MODEL = DEFAULT_ROUTER_MODEL;
export const DEFAULT_HARDWARE = "cpu-basic";
export const TELEGRAM_HARDWARE = "cpu-upgrade";
export const TELEGRAM_SLEEP_TIME = -1;
export const DEFAULT_GATEWAY_LOCATION: GatewayLocation = "space";
export const DEFAULT_LOCAL_PORT = 7860;
export const DEFAULT_SPACE_OPENCLAW_PORT = 7861;
export const LOCAL_VOLUME_MOUNT_PATH = "/tmp/mlclaw-local";
export const LOCAL_LIVE_DIR = `${LOCAL_VOLUME_MOUNT_PATH}/openclaw-live`;
export const SPACE_STATE_MOUNT_DIR = "/data/mlclaw-state";
export const SPACE_LIVE_DIR = "/home/node/.local/share/mlclaw/live";
export const SPACE_HANDOFF_TIMEOUT_MS = 120_000;
export const SPACE_HANDOFF_POLL_MS = 5_000;
export const LOCAL_START_SETTLE_MS = 500;

type ContainerRuntimePreference = "auto" | ContainerEngine;
type HostedFallbackChoice = "local" | "pro" | "cancel";

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
  bundledRuntime?: boolean;
  publicSpace?: boolean;
  gatewayToken?: string;
  routerToken?: string;
  routerTokenFile?: string;
  dockerContext?: string;
  containerRuntime?: string;
  localPort?: number;
  tailscale?: boolean;
  tailscalePort?: number;
  allowLocalFallback?: boolean;
  pull?: boolean;
  takeover?: boolean;
  yes?: boolean;
};

type UpdateOptions = {
  force?: boolean;
  runtimeImage?: string;
  bundledRuntime?: boolean;
  routerToken?: string;
  routerTokenFile?: string;
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
  restart?: boolean;
  to?: string;
  hardware?: string;
  sleepTime?: number;
  runtimeImage?: string;
  bundledRuntime?: boolean;
  routerToken?: string;
  routerTokenFile?: string;
  dockerContext?: string;
  containerRuntime?: string;
  localPort?: number;
  tailscale?: boolean;
  tailscalePort?: number;
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

type BootstrapBucketPlan = {
  bucket: string;
  exists: boolean;
  objectCount: number;
};

type BootstrapSpacePlan = {
  space: string;
  exists: boolean;
  visibility: "private" | "public";
};

type SpaceHardwareRequest =
  | {
      kind: "default";
      label: string;
      sleepTime?: number;
    }
  | {
      kind: "explicit";
      hardware: string;
      label: string;
      sleepTime?: number;
    };

type BootstrapResolvedPlan = {
  agentName: string;
  names: ReturnType<typeof namesFor>;
  hasExistingManifest: boolean;
  gatewayLocation: GatewayLocation;
  bucketPrefix?: string;
  bucketPlan: BootstrapBucketPlan;
  bucket: string;
  spacePlan?: BootstrapSpacePlan;
  manifest: DeploymentManifest;
  secrets: Record<string, string>;
};

type CliRuntime = {
  env?: NodeJS.ProcessEnv;
  stdout?: Pick<typeof console, "log">;
  stderr?: Pick<typeof console, "error">;
  readToken?: typeof readToken;
  hfCli?: HfCliRuntime;
  hubFactory?: (token: string) => HubApi;
  pushTemplateToSpace?: typeof pushTemplateToSpace;
  getTelegramBot?: (token: string, apiRoot?: string) => Promise<TelegramBot>;
  dockerRunner?: ContainerRunner;
  podmanRunner?: ContainerRunner;
  tailscaleRunner?: TailscaleRunner;
  configRoot?: string;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<unknown>;
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
  select: (params: {
    message: string;
    options: Array<{ value: string; label: string; hint?: string }>;
    initialValue?: string;
  }) => Promise<string | symbol>;
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
  select: async (params) => await select(params),
  cancel,
};

function createRuntime(overrides: CliRuntime = {}): Required<CliRuntime> {
  return {
    env: overrides.env ?? process.env,
    stdout: overrides.stdout ?? console,
    stderr: overrides.stderr ?? console,
    readToken: overrides.readToken ?? readToken,
    hfCli: overrides.hfCli ?? createSystemHfCli(overrides.env ?? process.env),
    hubFactory: overrides.hubFactory ?? ((token) => new HubApi({ token })),
    pushTemplateToSpace: overrides.pushTemplateToSpace ?? pushTemplateToSpace,
    getTelegramBot: overrides.getTelegramBot ?? getTelegramBot,
    dockerRunner: overrides.dockerRunner ?? new CliDockerRunner(),
    podmanRunner: overrides.podmanRunner ?? new CliPodmanRunner(),
    tailscaleRunner: overrides.tailscaleRunner ?? new CliTailscaleRunner(),
    configRoot: overrides.configRoot ?? defaultConfigRoot(overrides.env ?? process.env),
    now: overrides.now ?? (() => new Date()),
    sleep: overrides.sleep ?? delay,
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
    .option("--bundled-runtime", "Generate a bundled Space runtime instead of using the prebuilt ML Claw image", false)
    .option("--public-space", "Create the Hugging Face Space as public instead of private", false)
    .addOption(new Option("--gateway-token <token>").hideHelp())
    .option("--router-token <token>", "Hugging Face Router inference token for Space gateway model calls")
    .option(
      "--router-token-file <path>",
      "File containing MLCLAW_ROUTER_TOKEN=..., HF_ROUTER_TOKEN=..., or a raw token",
    )
    .option("--docker-context <name>", "Docker context for local gateway mode")
    .option("--container-runtime <auto|docker|podman>", "Local container runtime", "auto")
    .option("--local-port <port>", "Loopback port for a local gateway", parseLocalPort)
    .option("--tailscale", "Expose a local gateway privately with Tailscale Serve")
    .option("--no-tailscale", "Disable Tailscale Serve access for this gateway")
    .option("--tailscale-port <port>", "HTTPS port for Tailscale Serve", parseLocalPort)
    .option(
      "--allow-local-fallback",
      "Allow non-interactive Space bootstrap to fall back to a ready local runtime",
      false,
    )
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
    .option("--bundled-runtime", "Generate a bundled Space runtime instead of using the prebuilt ML Claw image", false)
    .option("--router-token <token>", "Dedicated Hugging Face Router inference token")
    .option(
      "--router-token-file <path>",
      "File containing MLCLAW_ROUTER_TOKEN=..., HF_ROUTER_TOKEN=..., or a raw token",
    )
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

  const gateway = program.command("gateway").description("Operate a ML Claw gateway");

  gateway
    .command("start")
    .argument("<agent>", "Agent name")
    .option("--docker-context <name>", "Set Docker context only when the deployment has no pinned context")
    .option("--local-port <port>", "Loopback port for the local gateway", parseLocalPort)
    .option("--tailscale", "Enable the persisted Tailscale Serve mapping")
    .option("--no-tailscale", "Disable Tailscale Serve access for this gateway")
    .option("--tailscale-port <port>", "HTTPS port for Tailscale Serve", parseLocalPort)
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
    .option("--local-port <port>", "Loopback port for the local gateway", parseLocalPort)
    .option("--tailscale", "Enable the persisted Tailscale Serve mapping")
    .option("--no-tailscale", "Disable Tailscale Serve access for this gateway")
    .option("--tailscale-port <port>", "HTTPS port for Tailscale Serve", parseLocalPort)
    .option("--takeover", "Start even if another live runtime lease is present", false)
    .action(async (agent: string, opts: GatewayCommandOptions) => {
      await gatewayRestart(agent, opts, runtime);
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
    .option("--bundled-runtime", "Generate a bundled Space runtime instead of using the prebuilt ML Claw image", false)
    .option("--public-space", "Create the Hugging Face Space as public instead of private", false)
    .option("--router-token <token>", "Hugging Face Router inference token for Space gateway model calls")
    .option(
      "--router-token-file <path>",
      "File containing MLCLAW_ROUTER_TOKEN=..., HF_ROUTER_TOKEN=..., or a raw token",
    )
    .option("--docker-context <name>", "Docker context for local gateway startup when migrating to local")
    .option("--container-runtime <auto|docker|podman>", "Local container runtime", "auto")
    .option("--local-port <port>", "Loopback port for the local gateway", parseLocalPort)
    .option("--tailscale", "Expose the local gateway privately with Tailscale Serve")
    .option("--no-tailscale", "Disable Tailscale Serve access for the local gateway")
    .option("--tailscale-port <port>", "HTTPS port for Tailscale Serve", parseLocalPort)
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

  const state = program.command("state").description("Operate ML Claw durable state");

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
  const hfToken = await ensureHfToken({
    readToken: async () => await runtime.readToken(runtime.env),
    hfCli: runtime.hfCli,
    prompt: {
      isInteractive: runtime.prompt.isInteractive,
      note: runtime.prompt.note,
      confirm: async (message, initialValue) => await promptConfirm(message, initialValue, runtime),
    },
  });
  const hub = runtime.hubFactory(hfToken);
  const me = await hub.whoami();
  const owner = opts.owner ?? me.name;
  const telegramToken = await readOptionalTelegramToken(opts, runtime);
  const bot = telegramToken ? await runtime.getTelegramBot(telegramToken, opts.telegramApiRoot) : undefined;
  let agentName = slugifyAgentName(opts.name ?? bot?.username ?? (await promptAgentName(runtime)));
  const telegramUserId = telegramToken
    ? (opts.telegramUserId ??
      runtime.env.TELEGRAM_ALLOWED_USERS ??
      (await promptRequired("Telegram allowed user ID", runtime)))
    : undefined;

  const model = opts.model ?? DEFAULT_MODEL;
  const runtimeImage = resolveRuntimeImage(opts.runtimeImage, runtime.env);
  const templateRuntimeImage = resolveSpaceRuntimeImage(opts, runtime.env);

  let plan: BootstrapResolvedPlan;
  for (;;) {
    plan = await resolveBootstrapPlan({
      opts,
      owner,
      agentName,
      hfToken,
      model,
      runtimeImage,
      hub,
      runtime,
      ...(requestedGatewayLocation ? { requestedGatewayLocation } : {}),
      ...(telegramToken ? { telegramToken } : {}),
      ...(telegramUserId ? { telegramUserId } : {}),
    });
    const alternative = await promptAlternativeBootstrapName({
      plan,
      explicitBucket: opts.bucket,
      yes: Boolean(opts.yes),
      runtime,
    });
    if (!alternative) {
      break;
    }
    agentName = alternative;
  }

  let activePlan = plan;
  let deployedSpaceRuntime: string | undefined;
  if (activePlan.gatewayLocation === "space") {
    if (opts.tailscale !== undefined || opts.tailscalePort !== undefined) {
      throw new Error("Tailscale Serve access requires --gateway local");
    }
    const spacePlan = activePlan.spacePlan;
    if (!spacePlan) {
      throw new Error("internal error: Space plan was not resolved");
    }
    const paidHardware = await resolveHardware({
      ...(opts.hardware ? { requestedHardware: opts.hardware } : {}),
      ...(typeof opts.sleepTime === "number"
        ? { requestedSleepTime: opts.sleepTime }
        : telegramToken
          ? { requestedSleepTime: TELEGRAM_SLEEP_TIME }
          : {}),
      defaultLabel: spacePlan.exists ? "unchanged Space hardware" : "default Space CPU",
      requiresMessagingEgress: Boolean(telegramToken),
      yes: Boolean(opts.yes),
      runtime,
    });
    await confirmBootstrapPlan({
      manifest: activePlan.manifest,
      bucketPlan: activePlan.bucketPlan,
      spacePlan,
      hasExistingManifest: activePlan.hasExistingManifest,
      hardware: paidHardware.label,
      ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
      yes: Boolean(opts.yes),
      runtime,
    });
    if (activePlan.bucketPlan.exists) {
      await assertNoLiveForeignLease({
        hub,
        bucket: activePlan.bucket,
        bucketPrefix: activePlan.bucketPrefix,
        runtimeId: spaceRuntimeId(agentName),
        takeover: Boolean(opts.takeover),
      });
    }
    try {
      await createOrAdoptSpace({
        hub,
        spacePlan,
        runtime,
        ...(paidHardware.kind === "explicit" ? { hardware: paidHardware.hardware } : {}),
        ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
      });
    } catch (err) {
      if (!isHostedComputePaymentRequired(err) || spacePlan.exists) {
        throw err;
      }
      activePlan = await resolveHostedBootstrapFallback({
        error: err,
        opts,
        owner,
        agentName,
        hfToken,
        model,
        runtimeImage,
        hub,
        runtime,
        ...(telegramToken ? { telegramToken } : {}),
        ...(telegramUserId ? { telegramUserId } : {}),
      });
    }
    if (activePlan.gatewayLocation === "space") {
      await createOrAdoptBucket({ hub, bucketPlan: activePlan.bucketPlan, runtime });
      await assertNoLiveForeignLease({
        hub,
        bucket: activePlan.bucket,
        bucketPrefix: activePlan.bucketPrefix,
        runtimeId: spaceRuntimeId(agentName),
        takeover: Boolean(opts.takeover),
      });
      const deployed = await deploySpaceGateway({
        hub,
        runtime,
        hfToken,
        manifest: activePlan.manifest,
        secrets: activePlan.secrets,
        allowedUsers: me.name,
        spaceExists: spacePlan.exists,
        spacePrepared: true,
        ...(paidHardware.kind === "explicit" ? { hardware: paidHardware.hardware } : {}),
        ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
        ...(templateRuntimeImage ? { templateRuntimeImage } : {}),
      });
      deployedSpaceRuntime = deployed.runtimeImage;
      await writeLocalDeployment(runtime.configRoot, activePlan.manifest, activePlan.secrets);
    }
  }
  if (activePlan.gatewayLocation === "local") {
    activePlan = await resolveBootstrapNetworkAccess(activePlan, opts, runtime);
    if (plan.gatewayLocation === "local") {
      await confirmBootstrapPlan({
        manifest: activePlan.manifest,
        bucketPlan: activePlan.bucketPlan,
        hasExistingManifest: activePlan.hasExistingManifest,
        hardware: localGatewayLabel(requiredLocalGateway(activePlan.manifest)),
        yes: Boolean(opts.yes),
        runtime,
      });
    }
    await createOrAdoptBucket({ hub, bucketPlan: activePlan.bucketPlan, runtime });
    await assertNoLiveForeignLease({
      hub,
      bucket: activePlan.bucket,
      bucketPrefix: activePlan.bucketPrefix,
      runtimeId: activePlan.manifest.localRuntimeId,
      takeover: Boolean(opts.takeover),
    });
    await deployLocalBootstrap(activePlan, opts, runtime);
  }

  runtime.stdout.log("");
  runtime.stdout.log(`Bucket: https://huggingface.co/buckets/${activePlan.bucket}`);
  if (activePlan.gatewayLocation === "space") {
    runtime.stdout.log(`Space:  https://huggingface.co/spaces/${activePlan.names.space}`);
    runtime.stdout.log(`Agent URL: ${spacePageUrl(activePlan.names.space)}`);
  } else {
    runtime.stdout.log(`Local:  ${containerNameFor(agentName)}`);
    logLocalGatewayUrls(activePlan.manifest, activePlan.secrets, runtime);
    runtime.stdout.log(localGatewayRemoteAccess(activePlan.manifest));
  }
  runtime.stdout.log(`Agent:  ${agentName}${bot ? ` (@${bot.username})` : ""}`);
  runtime.stdout.log(`Gateway: ${activePlan.gatewayLocation}`);
  if (activePlan.gatewayLocation === "local" && activePlan.manifest.localGateway) {
    runtime.stdout.log(`Container: ${localGatewayLabel(activePlan.manifest.localGateway)}`);
  }
  runtime.stdout.log(`Runtime image: ${runtimeImage}`);
  if (deployedSpaceRuntime) {
    runtime.stdout.log(`Space runtime: ${deployedSpaceRuntime}`);
  }
  if (activePlan.gatewayLocation === "space") {
    runtime.prompt.note(
      `Your agent is deploying and will be available shortly.\n\n${spacePageUrl(activePlan.names.space)}`,
      "HERE IS YOUR ML CLAW",
    );
    runtime.prompt.outro("Bootstrap complete");
  } else {
    runtime.prompt.note(
      localGatewayAccessSummary(activePlan.manifest, activePlan.secrets),
      "HERE IS YOUR ML CLAW",
    );
    runtime.prompt.outro("Bootstrap complete");
  }
}

function spacePageUrl(repoId: string): string {
  return `https://huggingface.co/spaces/${repoId}`;
}

async function resolveBootstrapPlan(params: {
  opts: BootstrapOptions;
  owner: string;
  agentName: string;
  requestedGatewayLocation?: GatewayLocation;
  hfToken: string;
  telegramToken?: string;
  telegramUserId?: string;
  model: string;
  runtimeImage: string;
  hub: HubApi;
  runtime: Required<CliRuntime>;
}): Promise<BootstrapResolvedPlan> {
  const {
    opts,
    owner,
    agentName,
    requestedGatewayLocation,
    hfToken,
    telegramToken,
    telegramUserId,
    model,
    runtimeImage,
    hub,
    runtime,
  } = params;
  const names = namesFor(owner, agentName);
  const now = runtime.now().toISOString();
  const existingManifest = await readManifest(runtime.configRoot, agentName).catch(() => null);
  const existingSecrets: Record<string, string> = await readSecretEnv(runtime.configRoot, agentName).catch(() => ({}));
  const sessionSecret = existingSecrets.MLCLAW_SESSION_SECRET ?? randomBytes(48).toString("base64url");
  const credentialKey = existingSecrets.MLCLAW_CREDENTIAL_KEY ?? randomBytes(32).toString("base64url");
  const gatewayLocation = requestedGatewayLocation ?? existingManifest?.gatewayLocation ?? DEFAULT_GATEWAY_LOCATION;
  const containerRuntime = parseContainerRuntimePreference(opts.containerRuntime);
  if (opts.dockerContext && gatewayLocation !== "local") {
    throw new Error("--docker-context only applies to local gateway mode");
  }
  if (opts.dockerContext && containerRuntime === "podman") {
    throw new Error("--docker-context cannot be used with --container-runtime podman");
  }
  const bucketPrefix = bootstrapBucketPrefix(existingManifest, existingSecrets, runtime);
  const localRuntimeId = existingManifest?.localRuntimeId ?? newLocalRuntimeId(agentName);
  const localPort = opts.localPort ?? existingManifest?.localPort ?? DEFAULT_LOCAL_PORT;
  const localGateway =
    gatewayLocation === "local"
      ? await resolveLocalGatewayBinding({
          manifest: existingManifest,
          requestedContext: opts.dockerContext,
          preference: containerRuntime,
          runtime,
          persist: false,
        })
      : existingManifest?.localGateway;
  const bucketPlan = await resolveBootstrapBucket({
    explicitBucket: opts.bucket,
    defaultBucket: names.bucket,
    existingManifest,
    bucketPrefix,
    hub,
  });
  const bucket = bucketPlan.bucket;
  const routerToken = await resolveRouterToken({
    opts,
    runtime,
    existingSecrets,
    model,
  });
  const spacePlan =
    gatewayLocation === "space"
      ? {
          space: names.space,
          exists: await hub.spaceExists(names.space),
          visibility: opts.publicSpace ? ("public" as const) : ("private" as const),
        }
      : undefined;

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
    ...(gatewayLocation === "local"
      ? { localPort }
      : existingManifest?.localPort
        ? { localPort: existingManifest.localPort }
        : {}),
    ...(localGateway ? { localGateway } : {}),
    ...(gatewayLocation === "local" && existingManifest?.networkAccess
      ? { networkAccess: existingManifest.networkAccess }
      : {}),
    createdAt: existingManifest?.createdAt ?? now,
    updatedAt: now,
  };
  const secrets = deploymentSecrets({
    hfToken,
    ...(telegramToken ? { telegramToken } : {}),
    ...(telegramUserId ? { telegramUserId } : {}),
    sessionSecret,
    credentialKey,
    owner,
    bucket,
    model,
    agentName,
    runtimeImage,
    gatewayLocation,
    localPort,
    runtimeId: gatewayLocation === "local" ? manifest.localRuntimeId : spaceRuntimeId(agentName),
    ...(bucketPrefix ? { bucketPrefix } : {}),
    ...(opts.telegramProxy ? { telegramProxy: opts.telegramProxy } : {}),
    ...(opts.telegramApiRoot ? { telegramApiRoot: opts.telegramApiRoot } : {}),
    ...(routerToken ? { routerToken } : {}),
  });
  return {
    agentName,
    names,
    hasExistingManifest: Boolean(existingManifest),
    gatewayLocation,
    ...(bucketPrefix ? { bucketPrefix } : {}),
    bucketPlan,
    bucket,
    ...(spacePlan ? { spacePlan } : {}),
    manifest,
    secrets,
  };
}

async function resolveBootstrapNetworkAccess(
  plan: BootstrapResolvedPlan,
  opts: Pick<BootstrapOptions, "tailscale" | "tailscalePort" | "yes">,
  runtime: Required<CliRuntime>,
): Promise<BootstrapResolvedPlan> {
  if (plan.gatewayLocation !== "local") {
    if (opts.tailscale !== undefined || opts.tailscalePort !== undefined) {
      throw new Error("Tailscale Serve access only applies to a local gateway");
    }
    return plan;
  }
  const existing = plan.manifest.networkAccess;
  if (opts.tailscale === false) {
    if (opts.tailscalePort !== undefined) {
      throw new Error("--tailscale-port cannot be used with --no-tailscale");
    }
    const networkAccess = existing ? { ...existing, enabled: false } : undefined;
    return withBootstrapNetworkAccess(plan, networkAccess);
  }

  let enable = opts.tailscale === true || existing?.enabled === true;
  let discovery = enable ? await runtime.tailscaleRunner.discover() : undefined;
  if (!enable && opts.tailscale === undefined && !opts.yes && runtime.prompt.isInteractive()) {
    discovery = await runtime.tailscaleRunner.discover();
    if (discovery.ready) {
      enable = await promptConfirm("Also expose this gateway privately through Tailscale?", false, runtime);
    }
  }
  if (!enable) {
    if (opts.tailscalePort !== undefined) {
      throw new Error("--tailscale-port requires --tailscale or an existing Tailscale mapping");
    }
    return withBootstrapNetworkAccess(plan, existing);
  }
  assertLocalNetworkAccessHost(plan.manifest);
  if (!discovery?.ready) {
    throw new Error(discovery?.reason ?? "Tailscale is unavailable");
  }
  const httpsPort = opts.tailscalePort ?? existing?.httpsPort ?? localGatewayPort(plan.manifest);
  const mapping: TailscaleServeMapping = {
    dnsName: discovery.dnsName,
    httpsPort,
    target: localGatewayUrl(plan.manifest),
  };
  const state = await runtime.tailscaleRunner.mappingState(mapping);
  if (state === "conflict") {
    throw new Error(`Tailscale Serve HTTPS port ${httpsPort} is already in use; choose --tailscale-port`);
  }
  return withBootstrapNetworkAccess(plan, {
    provider: "tailscale-serve",
    enabled: true,
    ...mapping,
    accessOrigin: tailscaleAccessOrigin(mapping),
  });
}

function withBootstrapNetworkAccess(
  plan: BootstrapResolvedPlan,
  networkAccess: NetworkAccessBinding | undefined,
): BootstrapResolvedPlan {
  const manifest: DeploymentManifest = {
    ...plan.manifest,
    ...(networkAccess ? { networkAccess } : {}),
  };
  return {
    ...plan,
    manifest,
    secrets: {
      ...plan.secrets,
      ...localAccessSecrets(manifest.owner, localGatewayPort(manifest), plan.secrets, networkAccess),
    },
  };
}

async function resolveBootstrapBucket(params: {
  explicitBucket?: string | undefined;
  defaultBucket: string;
  existingManifest: DeploymentManifest | null;
  bucketPrefix?: string | undefined;
  hub: HubApi;
}): Promise<BootstrapBucketPlan> {
  const explicitBucket = params.explicitBucket ? parseBucketId(params.explicitBucket) : undefined;
  const bucket = explicitBucket ?? params.existingManifest?.bucket ?? params.defaultBucket;
  const exists = await params.hub.bucketExists(bucket);
  const inspection = exists ? await inspectStateBucket(params.hub, bucket, params.bucketPrefix) : { objectCount: 0 };

  return {
    bucket,
    exists,
    objectCount: inspection.objectCount,
  };
}

async function promptAlternativeBootstrapName(params: {
  plan: BootstrapResolvedPlan;
  explicitBucket?: string | undefined;
  yes: boolean;
  runtime: Required<CliRuntime>;
}): Promise<string | undefined> {
  const existingDefaultBucket = !params.explicitBucket && params.plan.bucketPlan.exists;
  const existingSpace = params.plan.spacePlan?.exists === true;
  if ((!existingDefaultBucket && !existingSpace) || params.yes || !params.runtime.prompt.isInteractive()) {
    return undefined;
  }

  const current = params.plan.agentName;
  const suggestion = `${current}-2`;
  params.runtime.prompt.note(
    `The name ${current} maps to existing ML Claw resources. Enter another name for a fresh deployment, or leave this blank to update the existing one.`,
    "Existing resources",
  );
  const value = await params.runtime.prompt.text({
    message: "Alternative agent name",
    placeholder: suggestion,
  });
  if (isCancel(value)) {
    params.runtime.prompt.cancel("Cancelled");
    throw new Error("cancelled");
  }
  const raw = value.trim();
  if (!raw) {
    return undefined;
  }
  const alternative = slugifyAgentName(raw);
  return alternative === current ? undefined : alternative;
}

async function confirmBootstrapPlan(params: {
  manifest: DeploymentManifest;
  bucketPlan: BootstrapBucketPlan;
  spacePlan?: BootstrapSpacePlan;
  hasExistingManifest: boolean;
  hardware: string;
  sleepTime?: number;
  yes: boolean;
  runtime: Required<CliRuntime>;
}): Promise<void> {
  const lines = [
    `Agent: ${params.manifest.agent}`,
    `Gateway: ${params.manifest.gatewayLocation}`,
    `Bucket: ${params.bucketPlan.bucket} (${
      params.bucketPlan.exists
        ? `exists; keeping ${params.bucketPlan.objectCount} object(s)`
        : "will be created as private"
    })`,
  ];
  if (params.spacePlan) {
    lines.push(
      `Space: ${params.spacePlan.space} (${
        params.spacePlan.exists
          ? "exists; files, variables, secrets, and runtime will be updated"
          : `will be created as ${params.spacePlan.visibility}`
      })`,
    );
    lines.push(`Hardware: ${params.hardware}`);
    lines.push(`Bucket mount: ${SPACE_STATE_MOUNT_DIR}`);
    lines.push(`Live state: ${SPACE_LIVE_DIR}`);
    if (typeof params.sleepTime === "number") {
      lines.push(`Sleep time: ${params.sleepTime}`);
    }
  } else {
    lines.push(`Local runtime: ${containerNameFor(params.manifest.agent)} (${params.hardware})`);
    lines.push(`Gateway URL: ${localGatewayUrl(params.manifest)}`);
    if (params.manifest.networkAccess) {
      lines.push(`Tailnet URL: ${params.manifest.networkAccess.accessOrigin}`);
    }
  }
  if (params.bucketPlan.exists || params.spacePlan?.exists) {
    lines.push(`Fresh deployment: use a different name, for example --name ${params.manifest.agent}-2`);
  }
  lines.push(`Model: ${params.manifest.model}`);
  lines.push(`Runtime image: ${params.manifest.runtimeImage}`);

  params.runtime.prompt.note(lines.join("\n"), "Bootstrap plan");
  if (params.yes) {
    return;
  }
  if (!params.runtime.prompt.isInteractive()) {
    throw new Error("bootstrap confirmation required. Pass --yes to continue non-interactively.");
  }
  const ok = await promptConfirm("Continue with this bootstrap plan?", true, params.runtime);
  if (!ok) {
    throw new Error("bootstrap was not confirmed");
  }
}

async function createOrAdoptBucket(params: {
  hub: HubApi;
  bucketPlan: BootstrapBucketPlan;
  runtime: Required<CliRuntime>;
}): Promise<void> {
  if (params.bucketPlan.exists) {
    params.runtime.stdout.log(`Using existing private bucket ${params.bucketPlan.bucket}`);
    return;
  } else {
    params.runtime.stdout.log(`Creating private bucket ${params.bucketPlan.bucket}`);
  }
  await params.hub.createBucket(params.bucketPlan.bucket, true);
}

async function createOrAdoptSpace(params: {
  hub: HubApi;
  spacePlan: BootstrapSpacePlan;
  runtime: Required<CliRuntime>;
  hardware?: string;
  sleepTime?: number;
}): Promise<void> {
  if (params.spacePlan.exists) {
    params.runtime.stdout.log(`Updating existing Space ${params.spacePlan.space}`);
    return;
  }
  params.runtime.stdout.log(`Creating ${params.spacePlan.visibility} Space ${params.spacePlan.space}`);
  await params.hub.createDockerSpace(params.spacePlan.space, {
    private: params.spacePlan.visibility === "private",
    ...(params.hardware ? { hardware: params.hardware } : {}),
    ...(typeof params.sleepTime === "number" ? { sleepTimeSeconds: params.sleepTime } : {}),
  });
}

async function resolveHostedBootstrapFallback(params: {
  error: HubApiError;
  opts: BootstrapOptions;
  owner: string;
  agentName: string;
  hfToken: string;
  telegramToken?: string;
  telegramUserId?: string;
  model: string;
  runtimeImage: string;
  hub: HubApi;
  runtime: Required<CliRuntime>;
}): Promise<BootstrapResolvedPlan> {
  let localPlan: BootstrapResolvedPlan;
  try {
    localPlan = await resolveBootstrapPlan({
      opts: params.opts,
      owner: params.owner,
      agentName: params.agentName,
      requestedGatewayLocation: "local",
      hfToken: params.hfToken,
      model: params.model,
      runtimeImage: params.runtimeImage,
      hub: params.hub,
      runtime: params.runtime,
      ...(params.telegramToken ? { telegramToken: params.telegramToken } : {}),
      ...(params.telegramUserId ? { telegramUserId: params.telegramUserId } : {}),
    });
  } catch (localError) {
    throw new Error(
      `Hugging Face requires PRO for this Docker Space, and no local fallback is ready. ` +
        `${localError instanceof Error ? localError.message : String(localError)}. ` +
        `Subscribe at https://huggingface.co/pro`,
      { cause: params.error },
    );
  }

  if (!params.runtime.prompt.isInteractive()) {
    if (!params.opts.allowLocalFallback) {
      throw new Error(
        "Hugging Face requires PRO for this Docker Space. Re-run with --allow-local-fallback to use the detected local container runtime, or subscribe at https://huggingface.co/pro",
        { cause: params.error },
      );
    }
  } else {
    params.runtime.prompt.note(
      `Hugging Face requires PRO to host this Docker Space. ${localGatewayLabel(requiredLocalGateway(localPlan.manifest))} is ready on this machine.`,
      "Hosted gateway unavailable",
    );
    const choice = await params.runtime.prompt.select({
      message: "How should ML Claw continue?",
      options: [
        { value: "local", label: "Run the gateway locally" },
        { value: "pro", label: "Stop and use Hugging Face PRO", hint: "https://huggingface.co/pro" },
        { value: "cancel", label: "Cancel" },
      ],
      initialValue: "local",
    });
    if (isCancel(choice) || choice === "cancel") {
      params.runtime.prompt.cancel("Cancelled");
      throw new Error("bootstrap cancelled");
    }
    if (choice === "pro") {
      throw new Error("Subscribe at https://huggingface.co/pro, then run bootstrap again");
    }
  }

  await confirmBootstrapPlan({
    manifest: localPlan.manifest,
    bucketPlan: localPlan.bucketPlan,
    hasExistingManifest: localPlan.hasExistingManifest,
    hardware: localGatewayLabel(requiredLocalGateway(localPlan.manifest)),
    yes: Boolean(params.opts.yes),
    runtime: params.runtime,
  });
  return localPlan;
}

function isHostedComputePaymentRequired(err: unknown): err is HubApiError {
  if (!(err instanceof HubApiError) || err.status !== 402) {
    return false;
  }
  try {
    return new URL(err.url).pathname === "/api/repos/create";
  } catch {
    return false;
  }
}

function requiredLocalGateway(manifest: DeploymentManifest): LocalGatewayBinding {
  if (!manifest.localGateway) {
    throw new Error("internal error: local gateway binding was not resolved");
  }
  return manifest.localGateway;
}

async function stateAdopt(agent: string, opts: StateAdoptOptions, runtime: Required<CliRuntime>): Promise<void> {
  const bucket = parseBucketId(requiredOption(opts.bucket, "--bucket"));
  const current = await readDeploymentManifest(runtime, agent);
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const secrets = await readSecretEnv(runtime.configRoot, agent);
  const bucketPrefix = persistedBucketPrefix(secrets);
  const bucketChanged = current.bucket !== bucket;
  if (bucketChanged && current.gatewayLocation === "local") {
    assertDedicatedRouterToken(current.model, secrets);
  }

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

  let updated: DeploymentManifest = {
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
      MLCLAW_STATE_MOUNT_DIR: SPACE_STATE_MOUNT_DIR,
      OPENCLAW_LIVE_DIR: SPACE_LIVE_DIR,
      MLCLAW_RUNTIME_SETTINGS_FILE: `${SPACE_LIVE_DIR}/.mlclaw/settings.json`,
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_ID: spaceRuntimeId(updated.agent),
    });
    await ensureSpaceStateVolume(hub, updated.space, bucket);
    if (
      canDeleteBroadTokenSecrets({
        model: updated.model,
        routerTokenPresent: hasBrokerOrRouterTokenSecretRecord(secrets),
      })
    ) {
      await deleteStaleSpaceTokenSecrets(hub, updated.space);
    }
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

async function inspectStateBucket(hub: HubApi, bucket: string, bucketPrefix?: string): Promise<BucketStateInspection> {
  await hub.assertBucketAccessible(bucket);
  const client = hub.bucket(bucket);
  const entries = await client.listFiles();
  const fileEntries = entries.filter((entry) => entry.type === "file");
  const prefix = normalizeBucketPrefix(bucketPrefix);
  const prefixWithSlash = `${prefix}/`;
  const manifestPath = `${prefixWithSlash}${SNAPSHOT_MANIFEST_REMOTE_NAME}`;
  const stateEntries = fileEntries.filter(
    (entry) =>
      entry.path === manifestPath ||
      entry.path.startsWith(`${prefixWithSlash}snapshots/`) ||
      entry.path.startsWith(`${prefixWithSlash}runtime/`),
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
  routerToken?: string;
  telegramToken?: string;
  telegramUserId?: string;
  sessionSecret: string;
  credentialKey: string;
  owner: string;
  bucket: string;
  model: string;
  agentName: string;
  runtimeImage: string;
  gatewayLocation: GatewayLocation;
  localPort: number;
  runtimeId: string;
  bucketPrefix?: string;
  telegramProxy?: string;
  telegramApiRoot?: string;
}): Record<string, string> {
  return {
    MLCLAW_BROKER_HF_TOKEN: params.hfToken,
    ...(params.routerToken ? { MLCLAW_ROUTER_TOKEN: params.routerToken } : {}),
    OPENCLAW_HF_STATE_BUCKET: params.bucket,
    OPENCLAW_MODEL: params.model,
    OPENCLAW_AGENT_NAME: params.agentName,
    MLCLAW_GATEWAY_LOCATION: params.gatewayLocation,
    MLCLAW_RUNTIME_IMAGE: params.runtimeImage,
    MLCLAW_RUNTIME_ID: params.runtimeId,
    MLCLAW_SESSION_SECRET: params.sessionSecret,
    MLCLAW_CREDENTIAL_KEY: params.credentialKey,
    MLCLAW_OPENCLAW_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    OPENCLAW_GATEWAY_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    ...(params.gatewayLocation === "local" ? localAccessSecrets(params.owner, params.localPort, {}) : {}),
    ...(params.telegramToken ? { TELEGRAM_BOT_TOKEN: params.telegramToken } : {}),
    ...(params.telegramUserId ? { TELEGRAM_ALLOWED_USERS: params.telegramUserId } : {}),
    ...(params.bucketPrefix ? { OPENCLAW_HF_STATE_PREFIX: params.bucketPrefix } : {}),
    ...(params.telegramProxy ? { TELEGRAM_PROXY: params.telegramProxy } : {}),
    ...(params.telegramApiRoot ? { TELEGRAM_API_ROOT: params.telegramApiRoot } : {}),
  };
}

function localAccessSecrets(
  owner: string,
  port: number,
  existing: Record<string, string>,
  networkAccess?: NetworkAccessBinding,
): Record<string, string> {
  const localOrigin = `http://127.0.0.1:${port}`;
  return {
    MLCLAW_PUBLIC_URL: localOrigin,
    MLCLAW_ACCESS_ORIGINS: [
      localOrigin,
      ...(networkAccess?.enabled ? [networkAccess.accessOrigin] : []),
    ].join(","),
    MLCLAW_LOCAL_ACCESS_USER: owner,
    MLCLAW_ALLOWED_USERS: appendCsvValue(existing.MLCLAW_ALLOWED_USERS, owner),
    MLCLAW_ADMINS: appendCsvValue(existing.MLCLAW_ADMINS, owner),
  };
}

function appendCsvValue(existing: string | undefined, value: string): string {
  return [
    ...new Set([
      ...(existing ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      value,
    ]),
  ].join(",");
}

async function writeLocalDeployment(
  configRoot: string,
  manifest: DeploymentManifest,
  secrets: Record<string, string>,
): Promise<void> {
  await writeManifest(configRoot, manifest);
  await writeSecretEnv(configRoot, manifest.agent, secrets);
}

async function deployLocalBootstrap(
  plan: BootstrapResolvedPlan,
  opts: Pick<BootstrapOptions, "pull">,
  runtime: Required<CliRuntime>,
): Promise<void> {
  const previousManifest = await readManifest(runtime.configRoot, plan.agentName).catch(() => null);
  const previousSecrets = await readSecretEnv(runtime.configRoot, plan.agentName).catch(() => null);
  const previousContainer =
    previousManifest?.gatewayLocation === "local"
      ? await localRunnerFor(previousManifest, runtime).inspect(
          containerNameFor(previousManifest.agent),
          localConnectionFor(previousManifest),
        )
      : null;
  const networkAccessChanged =
    JSON.stringify(previousManifest?.networkAccess) !== JSON.stringify(plan.manifest.networkAccess);
  const previousNetworkState =
    networkAccessChanged && previousManifest?.networkAccess
      ? await runtime.tailscaleRunner.mappingState(networkAccessMapping(previousManifest.networkAccess))
      : undefined;

  let startupAttempted = false;
  try {
    if (previousNetworkState === "owned" && previousManifest?.networkAccess) {
      await removeOwnedNetworkAccess(previousManifest.networkAccess, runtime);
    }
    await writeSecretEnv(runtime.configRoot, plan.agentName, plan.secrets);
    startupAttempted = true;
    await startLocalGateway({
      manifest: plan.manifest,
      runtime,
      pull: shouldPull(opts),
      refresh: true,
      existing: previousContainer,
    });
    await writeManifest(runtime.configRoot, plan.manifest);
  } catch (error) {
    try {
      if (networkAccessChanged && plan.manifest.networkAccess) {
        await disableNetworkAccess(plan.manifest, runtime);
      }
      if (previousSecrets) {
        await writeSecretEnv(runtime.configRoot, plan.agentName, previousSecrets);
      } else {
        await fs.rm(secretEnvPath(runtime.configRoot, plan.agentName), { force: true });
      }
      if (previousContainer?.running && previousManifest) {
        await startLocalGateway({ manifest: previousManifest, runtime, pull: false, refresh: true });
        runtime.stdout.log(`Previous local gateway restored: ${containerNameFor(previousManifest.agent)}`);
      } else if (previousContainer && previousManifest && startupAttempted) {
        await startLocalGateway({ manifest: previousManifest, runtime, pull: false, refresh: true });
        await localRunnerFor(previousManifest, runtime).stop(
          containerNameFor(previousManifest.agent),
          localConnectionFor(previousManifest),
        );
        if (previousNetworkState !== "owned") {
          await disableNetworkAccess(previousManifest, runtime);
        }
        runtime.stdout.log(`Previous stopped local gateway restored: ${containerNameFor(previousManifest.agent)}`);
      } else {
        if (startupAttempted) {
          await removeFailedBootstrapContainer(plan.manifest, runtime, !previousManifest);
        }
      }
      if (previousNetworkState === "owned" && previousManifest?.networkAccess) {
        await runtime.tailscaleRunner.ensureMapping(networkAccessMapping(previousManifest.networkAccess));
      }
      if (!previousManifest) {
        await fs.rm(manifestPath(runtime.configRoot, plan.agentName), { force: true });
      }
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], "local bootstrap and rollback both failed");
    }
    throw error;
  }
}

async function removeFailedBootstrapContainer(
  manifest: DeploymentManifest,
  runtime: Required<CliRuntime>,
  removeVolume: boolean,
): Promise<void> {
  const runner = localRunnerFor(manifest, runtime);
  const connection = localConnectionFor(manifest);
  const containerName = containerNameFor(manifest.agent);
  const existing = await runner.inspect(containerName, connection);
  if (existing?.running) {
    await runner.stop(containerName, connection);
  }
  if (existing) {
    await runner.rm(containerName, connection);
  }
  if (removeVolume) {
    await runner.rmVolume(volumeNameFor(manifest.agent), connection);
  }
}

async function deploySpaceGateway(params: {
  hub: HubApi;
  runtime: Required<CliRuntime>;
  hfToken: string;
  manifest: DeploymentManifest;
  secrets: Record<string, string>;
  allowedUsers: string;
  hardware?: string;
  sleepTime?: number;
  templateRuntimeImage?: string;
  publicSpace?: boolean;
  spaceExists?: boolean;
  spacePrepared?: boolean;
}): Promise<{ runtimeImage: string }> {
  const { hub, runtime, hfToken, manifest, secrets } = params;
  if (!params.spacePrepared) {
    runtime.stdout.log(
      params.spaceExists
        ? `Updating existing Space ${manifest.space}`
        : `Creating ${params.publicSpace ? "public" : "private"} Space ${manifest.space}`,
    );
    await hub.createDockerSpace(manifest.space, {
      private: !params.publicSpace,
      ...(params.hardware && !params.spaceExists ? { hardware: params.hardware } : {}),
      ...(typeof params.sleepTime === "number" ? { sleepTimeSeconds: params.sleepTime } : {}),
    });
  }
  if (params.hardware && params.spaceExists) {
    await hub.requestSpaceHardware(manifest.space, params.hardware, params.sleepTime);
  } else if (!params.hardware && params.spaceExists && typeof params.sleepTime === "number") {
    await hub.setSpaceSleepTime(manifest.space, params.sleepTime);
  }
  runtime.stdout.log(
    params.templateRuntimeImage
      ? "Generating Space files from prebuilt runtime image"
      : "Generating bundled Space runtime files",
  );
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: manifest.space,
    token: hfToken,
    ...(params.templateRuntimeImage ? { runtimeImage: params.templateRuntimeImage } : {}),
  });
  const spaceRuntimeRef = params.templateRuntimeImage ?? bundledSpaceRuntimeRef(templateRev);

  await setDeploymentVariables(hub, manifest.space, {
    OPENCLAW_HF_STATE_BUCKET: manifest.bucket,
    MLCLAW_STATE_MOUNT_DIR: SPACE_STATE_MOUNT_DIR,
    OPENCLAW_LIVE_DIR: SPACE_LIVE_DIR,
    MLCLAW_RUNTIME_SETTINGS_FILE: `${SPACE_LIVE_DIR}/.mlclaw/settings.json`,
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
  await ensureSpaceStateVolume(hub, manifest.space, manifest.bucket, { allowMissingVolumes: !params.spaceExists });
  await clearSpaceGatewayDisabled(hub, manifest.space);
  await setDeploymentSecrets(hub, manifest.space, {
    MLCLAW_SESSION_SECRET: requiredSecret(secrets, "MLCLAW_SESSION_SECRET"),
    MLCLAW_CREDENTIAL_KEY: requiredSecret(secrets, "MLCLAW_CREDENTIAL_KEY"),
    MLCLAW_BROKER_HF_TOKEN: hfToken,
    ...(secrets.MLCLAW_ROUTER_TOKEN ? { MLCLAW_ROUTER_TOKEN: secrets.MLCLAW_ROUTER_TOKEN } : {}),
    ...(secrets.TELEGRAM_BOT_TOKEN ? { TELEGRAM_BOT_TOKEN: secrets.TELEGRAM_BOT_TOKEN } : {}),
    ...(secrets.TELEGRAM_ALLOWED_USERS ? { TELEGRAM_ALLOWED_USERS: secrets.TELEGRAM_ALLOWED_USERS } : {}),
    ...(secrets.TELEGRAM_PROXY ? { TELEGRAM_PROXY: secrets.TELEGRAM_PROXY } : {}),
    ...(secrets.TELEGRAM_API_ROOT ? { TELEGRAM_API_ROOT: secrets.TELEGRAM_API_ROOT } : {}),
  });
  if (
    canDeleteBroadTokenSecrets({
      model: manifest.model,
      routerTokenPresent: hasBrokerOrRouterTokenSecretRecord(secrets),
    })
  ) {
    await deleteStaleSpaceTokenSecrets(hub, manifest.space);
  } else {
    runtime.stdout.log("Keeping legacy broad Hub token secrets until an HF Broker or Router credential is configured");
  }
  runtime.stdout.log(`Space deployment triggered: ${manifest.space}`);
  return { runtimeImage: spaceRuntimeRef };
}

async function startLocalGateway(params: {
  manifest: DeploymentManifest;
  runtime: Required<CliRuntime>;
  pull: boolean;
  refresh?: boolean;
  resetVolume?: boolean;
  existing?: ContainerInspect | null;
}): Promise<void> {
  const { manifest, runtime } = params;
  let secrets = await ensureDeploymentCredentialKey(runtime, manifest.agent);
  if (!secrets.MLCLAW_SESSION_SECRET) {
    secrets = { ...secrets, MLCLAW_SESSION_SECRET: randomBytes(48).toString("base64url") };
    await writeSecretEnv(runtime.configRoot, manifest.agent, secrets);
  }
  const accessSecrets = localAccessSecrets(
    manifest.owner,
    localGatewayPort(manifest),
    secrets,
    manifest.networkAccess,
  );
  if (Object.entries(accessSecrets).some(([key, value]) => secrets[key] !== value)) {
    secrets = { ...secrets, ...accessSecrets };
    await writeSecretEnv(runtime.configRoot, manifest.agent, secrets);
  }
  assertDedicatedRouterToken(manifest.model, secrets);
  const containerName = containerNameFor(manifest.agent);
  const volumeName = volumeNameFor(manifest.agent);
  const runner = localRunnerFor(manifest, runtime);
  const connection = localConnectionFor(manifest);
  const existing = "existing" in params ? params.existing : await runner.inspect(containerName, connection);
  const shouldRefresh = Boolean(params.refresh || params.resetVolume);
  if (existing?.running) {
    if (!shouldRefresh) {
      await syncNetworkAccess(manifest, runtime);
      runtime.stdout.log(`Local gateway already running: ${containerName}`);
      logLocalGatewayUrls(manifest, secrets, runtime);
      return;
    }
  }
  if (params.pull) {
    await runner.pull(manifest.runtimeImage, connection);
  }
  if (existing?.running) {
    await runner.stop(containerName, connection);
    runtime.stdout.log(`Local gateway stopped for config refresh: ${containerName}`);
  }
  if (existing) {
    await runner.rm(containerName, connection);
    runtime.stdout.log(`Local gateway removed for config refresh: ${containerName}`);
  }
  if (params.resetVolume) {
    await runner.rmVolume(volumeName, connection);
    runtime.stdout.log(`Local gateway volume reset for bucket restore: ${volumeName}`);
  }
  await runner.run({
    containerName,
    image: manifest.runtimeImage,
    envFile: secretEnvPath(runtime.configRoot, manifest.agent),
    volumeName,
    volumeMountPath: LOCAL_VOLUME_MOUNT_PATH,
    liveDir: LOCAL_LIVE_DIR,
    hostAddress: "127.0.0.1",
    hostPort: localGatewayPort(manifest),
    containerPort: DEFAULT_LOCAL_PORT,
    ...(connection ? { context: connection } : {}),
  });
  await runtime.sleep(LOCAL_START_SETTLE_MS);
  const started = await runner.inspect(containerName, connection);
  if (!started?.running) {
    throw new Error(`local gateway exited during startup. Inspect it with \`mlclaw gateway logs ${manifest.agent}\``);
  }
  await syncNetworkAccess(manifest, runtime);
  runtime.stdout.log(`Local gateway created: ${containerName}`);
  logLocalGatewayUrls(manifest, secrets, runtime);
}

async function stopLocalGateway(manifest: DeploymentManifest, runtime: Required<CliRuntime>): Promise<void> {
  try {
    await disableNetworkAccess(manifest, runtime);
  } catch (error) {
    runtime.stdout.log(
      `Tailscale Serve cleanup unavailable; the stopped gateway will not accept traffic (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  const containerName = containerNameFor(manifest.agent);
  const runner = localRunnerFor(manifest, runtime);
  const connection = localConnectionFor(manifest);
  const existing = await runner.inspect(containerName, connection);
  if (!existing) {
    runtime.stdout.log(`Local gateway does not exist: ${containerName}`);
    return;
  }
  if (!existing.running) {
    runtime.stdout.log(`Local gateway already stopped: ${containerName}`);
    return;
  }
  await runner.stop(containerName, connection);
  runtime.stdout.log(`Local gateway stopped: ${containerName}`);
}

async function gatewayStart(agent: string, opts: GatewayCommandOptions, runtime: Required<CliRuntime>): Promise<void> {
  const previousManifest = await readDeploymentManifest(runtime, agent, { requestedDockerContext: opts.dockerContext });
  let manifest = previousManifest;
  const requestedLocalPort = opts.localPort ?? localGatewayPort(manifest);
  const localPortChanged = manifest.gatewayLocation === "local" && manifest.localPort !== requestedLocalPort;
  if (localPortChanged) {
    manifest = { ...manifest, localPort: requestedLocalPort, updatedAt: runtime.now().toISOString() };
  }
  if (manifest.gatewayLocation === "local") {
    manifest = await resolveGatewayNetworkAccess(manifest, opts, runtime);
  }
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
    const previousSecrets = await readSecretEnv(runtime.configRoot, manifest.agent);
    const accessSecrets = localAccessSecrets(
      manifest.owner,
      localGatewayPort(manifest),
      previousSecrets,
      manifest.networkAccess,
    );
    const accessSecretsChanged = Object.entries(accessSecrets).some(([key, value]) => previousSecrets[key] !== value);
    const networkAccessChanged = JSON.stringify(previousManifest.networkAccess) !== JSON.stringify(manifest.networkAccess);
    const refresh = Boolean(opts.restart || localPortChanged || accessSecretsChanged || networkAccessChanged);
    const previousContainer = refresh
      ? await localRunnerFor(previousManifest, runtime).inspect(
          containerNameFor(previousManifest.agent),
          localConnectionFor(previousManifest),
        )
      : undefined;
    const previousNetworkState =
      networkAccessChanged && previousManifest.networkAccess
        ? await runtime.tailscaleRunner.mappingState(networkAccessMapping(previousManifest.networkAccess))
        : undefined;
    try {
      if (networkAccessChanged && previousNetworkState === "owned" && previousManifest.networkAccess) {
        await removeOwnedNetworkAccess(previousManifest.networkAccess, runtime);
      }
      if (accessSecretsChanged) {
        await writeSecretEnv(runtime.configRoot, manifest.agent, { ...previousSecrets, ...accessSecrets });
      }
      await startLocalGateway({
        manifest,
        runtime,
        pull: shouldPull(opts),
        refresh,
        ...(refresh ? { existing: previousContainer ?? null } : {}),
      });
    } catch (error) {
      if (accessSecretsChanged) {
        await writeSecretEnv(runtime.configRoot, manifest.agent, previousSecrets);
      }
      try {
        if (networkAccessChanged && manifest.networkAccess) {
          await disableNetworkAccess(manifest, runtime);
        }
        if (previousContainer?.running) {
          await startLocalGateway({ manifest: previousManifest, runtime, pull: false, refresh: true });
          runtime.stdout.log(`Previous local gateway restored: ${containerNameFor(previousManifest.agent)}`);
        } else if (previousNetworkState === "owned" && previousManifest.networkAccess) {
          await runtime.tailscaleRunner.ensureMapping(networkAccessMapping(previousManifest.networkAccess));
        }
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], "local gateway update and rollback both failed");
      }
      throw error;
    }
    if (refresh) {
      await writeManifest(runtime.configRoot, manifest);
    }
  } else {
    await clearSpaceGatewayDisabled(hub, manifest.space);
    await hub.restartSpace(manifest.space, true);
    runtime.stdout.log(`Space gateway restart requested: ${manifest.space}`);
  }
}

async function gatewayRestart(
  agent: string,
  opts: GatewayCommandOptions,
  runtime: Required<CliRuntime>,
): Promise<void> {
  const manifest = await readDeploymentManifest(runtime, agent, { requestedDockerContext: opts.dockerContext });
  if (manifest.gatewayLocation === "local") {
    assertDedicatedRouterToken(manifest.model, await readSecretEnv(runtime.configRoot, agent).catch(() => ({})));
  }
  await gatewayStart(agent, { ...opts, restart: true }, runtime);
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
    const secrets = await readSecretEnv(runtime.configRoot, manifest.agent).catch(() => ({}));
    if (manifest.localGateway) {
      runtime.stdout.log(`Container: ${localGatewayLabel(manifest.localGateway)}`);
      const endpoint = localGatewayEndpoint(manifest.localGateway);
      if (endpoint) {
        runtime.stdout.log(`Endpoint: ${endpoint}`);
      }
    }
    runtime.stdout.log(`Gateway URL: ${localGatewayAccessUrl(manifest, secrets)}`);
    if (manifest.networkAccess?.enabled) {
      runtime.stdout.log(`Tailnet URL: ${networkAccessUrl(manifest.networkAccess, manifest.agent, secrets)}`);
      try {
        runtime.stdout.log(
          `Tailscale Serve: ${await runtime.tailscaleRunner.mappingState(networkAccessMapping(manifest.networkAccess))}`,
        );
      } catch (error) {
        runtime.stdout.log(`Tailscale Serve: unavailable (${error instanceof Error ? error.message : String(error)})`);
      }
    }
    runtime.stdout.log(localGatewayRemoteAccess(manifest));
    const inspect = await localRunnerFor(manifest, runtime).inspect(
      containerNameFor(manifest.agent),
      localConnectionFor(manifest),
    );
    runtime.stdout.log(`Container: ${inspect ? (inspect.status ?? "exists") : "missing"}`);
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
    runtime.stdout.log(
      await localRunnerFor(manifest, runtime).logs(
        containerNameFor(manifest.agent),
        opts.tail,
        localConnectionFor(manifest),
      ),
    );
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  runtime.stdout.log(await hub.fetchSpaceLogs(manifest.space, "run"));
}

async function gatewayMigrate(
  agent: string,
  opts: GatewayCommandOptions,
  runtime: Required<CliRuntime>,
): Promise<void> {
  const target = parseGatewayLocation(requiredOption(opts.to, "--to"));
  if (target === "space" && (opts.tailscale !== undefined || opts.tailscalePort !== undefined)) {
    throw new Error("Tailscale Serve access only applies when migrating to a local gateway");
  }
  const requestedContainerRuntime =
    target === "local" ? parseContainerRuntimePreference(opts.containerRuntime) : undefined;
  if (target === "local" && opts.dockerContext && requestedContainerRuntime === "podman") {
    throw new Error("--docker-context cannot be used with --container-runtime podman");
  }
  const current = await readDeploymentManifest(runtime, agent, {
    requestedDockerContext: target === "space" ? opts.dockerContext : undefined,
  });
  if (current.gatewayLocation === target) {
    runtime.stdout.log(`Gateway already uses ${target}`);
    return;
  }
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const secrets = await ensureDeploymentCredentialKey(runtime, agent);
  const bucketPrefix = persistedBucketPrefix(secrets);
  let updated: DeploymentManifest = {
    ...current,
    gatewayLocation: target,
    runtimeImage: resolveRuntimeImage(opts.runtimeImage ?? current.runtimeImage, runtime.env),
    updatedAt: runtime.now().toISOString(),
    ...(target === "local" ? { localPort: opts.localPort ?? current.localPort ?? DEFAULT_LOCAL_PORT } : {}),
    ...(target === "space" && current.networkAccess
      ? { networkAccess: { ...current.networkAccess, enabled: false } }
      : {}),
  };
  const routerToken = await resolveRouterToken({
    opts,
    runtime,
    existingSecrets: secrets,
    model: updated.model,
  });
  if (target === "space") {
    const deploymentSecrets = {
      ...secrets,
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      ...(routerToken ? { MLCLAW_ROUTER_TOKEN: routerToken } : {}),
    };
    const paidHardware = await resolveHardware({
      ...(opts.hardware ? { requestedHardware: opts.hardware } : {}),
      ...(typeof opts.sleepTime === "number"
        ? { requestedSleepTime: opts.sleepTime }
        : secrets.TELEGRAM_BOT_TOKEN
          ? { requestedSleepTime: TELEGRAM_SLEEP_TIME }
          : {}),
      defaultLabel: "unchanged Space hardware",
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
    const templateRuntimeImage = resolveSpaceRuntimeImage(opts, runtime.env);
    const spaceExists = await hub.spaceExists(updated.space);
    await deploySpaceGateway({
      hub,
      runtime,
      hfToken: token,
      manifest: updated,
      secrets: deploymentSecrets,
      allowedUsers: me.name,
      publicSpace: Boolean(opts.publicSpace),
      spaceExists,
      ...(paidHardware.kind === "explicit" ? { hardware: paidHardware.hardware } : {}),
      ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
      ...(templateRuntimeImage ? { templateRuntimeImage } : {}),
    });
    await writeSecretEnv(runtime.configRoot, agent, {
      ...deploymentSecrets,
      MLCLAW_GATEWAY_LOCATION: "space",
      MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      MLCLAW_RUNTIME_ID: spaceRuntimeId(agent),
    });
  } else {
    const containerRuntime = requestedContainerRuntime ?? "auto";
    const reuseLocalBinding =
      !opts.dockerContext && (containerRuntime === "auto" || current.localGateway?.engine === containerRuntime);
    updated.localGateway = await resolveLocalGatewayBinding({
      manifest: reuseLocalBinding && current.localGateway ? current : undefined,
      requestedContext: opts.dockerContext,
      preference: containerRuntime,
      runtime,
      persist: false,
      agent: current.agent,
    });
    updated = await resolveGatewayNetworkAccess(updated, opts, runtime);
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
      ...(routerToken ? { MLCLAW_ROUTER_TOKEN: routerToken } : {}),
      MLCLAW_GATEWAY_LOCATION: "local",
      MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
      MLCLAW_RUNTIME_ID: updated.localRuntimeId,
      ...localAccessSecrets(updated.owner, localGatewayPort(updated), secrets, updated.networkAccess),
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
  assertDedicatedRouterToken(current.model, await readSecretEnv(runtime.configRoot, agent).catch(() => ({})));

  const targetBinding = await resolveLocalGatewayBinding({
    manifest: undefined,
    requestedContext: targetContext,
    runtime,
    persist: false,
    agent,
  });
  if (targetBinding.engine !== "docker") {
    throw new Error("internal error: Docker rebind resolved a non-Docker runtime");
  }
  if (current.localGateway?.engine === "podman") {
    throw new Error("Docker context rebind cannot move a Podman deployment; migrate the gateway through Space first");
  }
  const currentContext = current.localGateway?.dockerContext;
  if (currentContext === targetBinding.dockerContext) {
    runtime.stdout.log(`Local gateway already uses Docker context ${targetBinding.dockerContext}`);
    return;
  }

  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  if (currentContext && (await runtime.dockerRunner.contextExists(currentContext))) {
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
      runtime.stdout.log(
        `Old Docker context handoff failed; rebinding with --takeover: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else if (!opts.takeover) {
    const missing = currentContext
      ? `Docker context ${currentContext} is not available`
      : "Deployment has no pinned Docker context";
    throw new Error(`${missing}. Run with --takeover to rebind without a final snapshot from the old context.`);
  } else {
    runtime.stdout.log(
      "Old Docker context unavailable; rebinding with --takeover and using the latest bucket snapshot.",
    );
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
  let updated: DeploymentManifest = manifest.localRuntimeId
    ? manifest
    : {
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
  preference?: ContainerRuntimePreference | undefined;
  runtime: Required<CliRuntime>;
  persist: boolean;
  agent?: string | undefined;
}): Promise<LocalGatewayBinding> {
  const requestedContext = params.requestedContext?.trim();
  const existing = params.manifest?.localGateway;
  const agent = params.agent ?? params.manifest?.agent ?? "deployment";
  if (existing && params.preference && params.preference !== "auto" && existing.engine !== params.preference) {
    throw new Error(`local gateway ${agent} is pinned to ${displayContainerEngine(existing.engine)}`);
  }
  if (existing?.engine === "podman" && requestedContext) {
    throw new Error("--docker-context cannot be used with a Podman local gateway");
  }
  if (existing?.engine === "docker" && requestedContext && existing.dockerContext !== requestedContext) {
    throw new Error(
      `local gateway ${agent} is pinned to Docker context ${existing.dockerContext}. ` +
        `Run \`mlclaw gateway rebind ${agent} --docker-context ${requestedContext}\` to move it.`,
    );
  }
  const binding = existing
    ? await probeExistingLocalGateway(existing, params.runtime)
    : await selectLocalGatewayBinding({
        preference: params.preference ?? "auto",
        ...(requestedContext ? { requestedDockerContext: requestedContext } : {}),
        runtime: params.runtime,
      });
  if (binding.engine === "docker" && existing) {
    await warnOnDockerContextMismatch(binding.dockerContext, params.runtime);
  }
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
    runtime.stdout.log(
      `Using Docker context ${pinnedContext} from the deployment manifest. Current shell context is ${currentContext}.`,
    );
  }
}

function sameLocalGatewayBinding(a: LocalGatewayBinding | undefined, b: LocalGatewayBinding | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function dockerContextFor(manifest: DeploymentManifest): string | undefined {
  return manifest.localGateway?.engine === "docker" ? manifest.localGateway.dockerContext : undefined;
}

function localConnectionFor(manifest: DeploymentManifest): string | undefined {
  const binding = manifest.localGateway;
  if (!binding) {
    return undefined;
  }
  return binding.engine === "docker" ? binding.dockerContext : binding.podmanConnection;
}

function localRunnerFor(manifest: DeploymentManifest, runtime: Required<CliRuntime>): ContainerRunner {
  return runnerForEngine(manifest.localGateway?.engine ?? "docker", runtime);
}

function parseContainerRuntimePreference(value: string | undefined): ContainerRuntimePreference {
  const normalized = value?.trim().toLowerCase() || "auto";
  if (normalized === "auto" || normalized === "docker" || normalized === "podman") {
    return normalized;
  }
  throw new InvalidArgumentError(`expected container runtime auto, docker, or podman; got ${value}`);
}

function displayContainerEngine(engine: ContainerEngine): string {
  return engine === "docker" ? "Docker" : "Podman";
}

function runnerForEngine(engine: ContainerEngine, runtime: Required<CliRuntime>): ContainerRunner {
  return engine === "docker" ? runtime.dockerRunner : runtime.podmanRunner;
}

function localGatewayLabel(binding: LocalGatewayBinding): string {
  return binding.engine === "docker"
    ? `Docker context ${binding.dockerContext}`
    : binding.podmanConnection === "local"
      ? "Podman default connection"
      : `Podman connection ${binding.podmanConnection}`;
}

function localGatewayEndpoint(binding: LocalGatewayBinding): string | undefined {
  return binding.engine === "docker" ? binding.dockerEndpoint : binding.podmanEndpoint;
}

function localGatewayPort(manifest: DeploymentManifest): number {
  return manifest.localPort ?? DEFAULT_LOCAL_PORT;
}

function localGatewayUrl(manifest: DeploymentManifest): string {
  return `http://127.0.0.1:${localGatewayPort(manifest)}`;
}

function localGatewayAccessUrl(manifest: DeploymentManifest, secrets: Record<string, string>): string {
  return localAccessUrl(localGatewayUrl(manifest), manifest.agent, secrets);
}

function networkAccessUrl(
  networkAccess: NetworkAccessBinding,
  agent: string,
  secrets: Record<string, string>,
): string {
  return localAccessUrl(networkAccess.accessOrigin, agent, secrets);
}

function localAccessUrl(origin: string, agent: string, secrets: Record<string, string>): string {
  const sessionSecret = secrets.MLCLAW_SESSION_SECRET;
  if (!sessionSecret) {
    return `${origin}/mlclaw/local-login (run mlclaw gateway restart ${agent} to initialize local access)`;
  }
  const token = deriveLocalAccessToken(sessionSecret);
  return `${origin}/mlclaw/local-login#${token}`;
}

function logLocalGatewayUrls(
  manifest: DeploymentManifest,
  secrets: Record<string, string>,
  runtime: Required<CliRuntime>,
): void {
  runtime.stdout.log(`Gateway URL: ${localGatewayAccessUrl(manifest, secrets)}`);
  if (manifest.networkAccess?.enabled) {
    runtime.stdout.log(`Tailnet URL: ${networkAccessUrl(manifest.networkAccess, manifest.agent, secrets)}`);
  }
}

function localGatewayAccessSummary(manifest: DeploymentManifest, secrets: Record<string, string>): string {
  const lines = ["Open the gateway on this machine:", "", localGatewayAccessUrl(manifest, secrets)];
  if (manifest.networkAccess?.enabled) {
    lines.push(
      "",
      "Open it from another device on your tailnet:",
      "",
      networkAccessUrl(manifest.networkAccess, manifest.agent, secrets),
    );
  }
  lines.push("", localGatewayRemoteAccess(manifest));
  return lines.join("\n");
}

function networkAccessMapping(binding: NetworkAccessBinding): TailscaleServeMapping {
  return {
    dnsName: binding.dnsName,
    httpsPort: binding.httpsPort,
    target: binding.target,
  };
}

async function syncNetworkAccess(manifest: DeploymentManifest, runtime: Required<CliRuntime>): Promise<void> {
  const binding = manifest.networkAccess;
  if (!binding) {
    return;
  }
  if (!binding.enabled) {
    await disableNetworkAccess(manifest, runtime);
    return;
  }
  const result = await runtime.tailscaleRunner.ensureMapping(networkAccessMapping(binding));
  runtime.stdout.log(`Tailscale Serve ${result}: ${binding.accessOrigin}`);
}

async function disableNetworkAccess(manifest: DeploymentManifest, runtime: Required<CliRuntime>): Promise<void> {
  const binding = manifest.networkAccess;
  if (!binding) {
    return;
  }
  const result = await runtime.tailscaleRunner.removeMapping(networkAccessMapping(binding));
  if (result === "drifted") {
    runtime.stdout.log(
      `Tailscale Serve mapping drifted on HTTPS port ${binding.httpsPort}; preserving the unrelated live handler`,
    );
  } else if (result === "removed") {
    runtime.stdout.log(`Tailscale Serve disabled: ${binding.accessOrigin}`);
  }
}

async function removeOwnedNetworkAccess(
  binding: NetworkAccessBinding,
  runtime: Required<CliRuntime>,
): Promise<void> {
  const result = await runtime.tailscaleRunner.removeMapping(networkAccessMapping(binding));
  if (result !== "removed" && result !== "missing") {
    throw new Error(
      `Tailscale Serve mapping changed on HTTPS port ${binding.httpsPort}; preserving the live handler`,
    );
  }
}

async function resolveGatewayNetworkAccess(
  manifest: DeploymentManifest,
  opts: Pick<GatewayCommandOptions, "tailscale" | "tailscalePort">,
  runtime: Required<CliRuntime>,
): Promise<DeploymentManifest> {
  const existing = manifest.networkAccess;
  if (opts.tailscale === undefined && opts.tailscalePort === undefined && !existing?.enabled) {
    return manifest;
  }
  if (opts.tailscale === false) {
    if (opts.tailscalePort !== undefined) {
      throw new Error("--tailscale-port cannot be used with --no-tailscale");
    }
    return existing
      ? { ...manifest, networkAccess: { ...existing, enabled: false }, updatedAt: runtime.now().toISOString() }
      : manifest;
  }
  const enable = opts.tailscale === true || existing?.enabled === true;
  if (!enable) {
    throw new Error("--tailscale-port requires --tailscale or an existing Tailscale mapping");
  }
  assertLocalNetworkAccessHost(manifest);
  const discovery = await runtime.tailscaleRunner.discover();
  if (!discovery.ready) {
    throw new Error(discovery.reason);
  }
  const httpsPort = opts.tailscalePort ?? existing?.httpsPort ?? localGatewayPort(manifest);
  const mapping: TailscaleServeMapping = {
    dnsName: discovery.dnsName,
    httpsPort,
    target: localGatewayUrl(manifest),
  };
  const state = await runtime.tailscaleRunner.mappingState(mapping);
  if (state === "conflict") {
    throw new Error(`Tailscale Serve HTTPS port ${httpsPort} is already in use; choose --tailscale-port`);
  }
  return {
    ...manifest,
    networkAccess: {
      provider: "tailscale-serve",
      enabled: true,
      ...mapping,
      accessOrigin: tailscaleAccessOrigin(mapping),
    },
    updatedAt: runtime.now().toISOString(),
  };
}

function assertLocalNetworkAccessHost(manifest: DeploymentManifest): void {
  const endpoint = manifest.localGateway ? localGatewayEndpoint(manifest.localGateway) : undefined;
  if (
    endpoint &&
    !endpoint.startsWith("unix:") &&
    !endpoint.startsWith("npipe:") &&
    !endpointIsLoopback(endpoint)
  ) {
    throw new Error("Tailscale Serve access requires the container runtime to run on this machine");
  }
}

function localGatewayRemoteAccess(manifest: DeploymentManifest): string {
  const command = localGatewayTunnelCommand(manifest);
  return command
    ? `Remote access: ${command}`
    : `Remote access: forward 127.0.0.1:${localGatewayPort(manifest)} from the container host, then open the gateway URL above.`;
}

function localGatewayTunnelCommand(manifest: DeploymentManifest): string | undefined {
  const port = localGatewayPort(manifest);
  const endpoint = manifest.localGateway ? localGatewayEndpoint(manifest.localGateway) : undefined;
  if (!endpoint || endpoint.startsWith("unix:") || endpoint.startsWith("npipe:") || endpointIsLoopback(endpoint)) {
    return `ssh -N -L ${port}:127.0.0.1:${port} ${os.userInfo().username}@${os.hostname()}`;
  }
  if (!endpoint.startsWith("ssh://")) {
    return undefined;
  }
  const target = new URL(endpoint);
  const destination = `${target.username ? `${target.username}@` : ""}${target.hostname}`;
  return `ssh ${target.port ? `-p ${target.port} ` : ""}-N -L ${port}:127.0.0.1:${port} ${destination}`;
}

function endpointIsLoopback(endpoint: string): boolean {
  try {
    const hostname = new URL(endpoint).hostname;
    return hostname === "127.0.0.1" || hostname === "::1" || hostname === "localhost";
  } catch {
    return false;
  }
}

async function probeExistingLocalGateway(
  binding: LocalGatewayBinding,
  runtime: Required<CliRuntime>,
): Promise<LocalGatewayBinding> {
  const runner = runnerForEngine(binding.engine, runtime);
  const connection = binding.engine === "docker" ? binding.dockerContext : binding.podmanConnection;
  const probe = await runner.probe(connection);
  if (probe.status !== "ready") {
    throw new Error(`${localGatewayLabel(binding)} is not ready: ${probe.detail}`);
  }
  return bindingFromProbe(probe);
}

async function selectLocalGatewayBinding(params: {
  preference: ContainerRuntimePreference;
  requestedDockerContext?: string;
  runtime: Required<CliRuntime>;
}): Promise<LocalGatewayBinding> {
  const engines: ContainerEngine[] = params.requestedDockerContext
    ? ["docker"]
    : params.preference === "auto"
      ? ["docker", "podman"]
      : [params.preference];
  const probes: ContainerRuntimeProbe[] = [];
  for (const engine of engines) {
    const runner = runnerForEngine(engine, params.runtime);
    const probe = await runner.probe(engine === "docker" ? params.requestedDockerContext : undefined);
    probes.push(probe);
    if (probe.status === "ready") {
      return bindingFromProbe(probe);
    }
  }
  throw new Error(`no usable local container runtime found. ${probes.map((probe) => probe.detail).join("; ")}`);
}

function bindingFromProbe(probe: ContainerRuntimeProbe): LocalGatewayBinding {
  if (probe.status !== "ready") {
    throw new Error(`container runtime is not ready: ${probe.detail}`);
  }
  if (probe.engine === "docker") {
    if (!probe.context) {
      throw new Error("Docker readiness probe did not report its context");
    }
    return {
      engine: "docker",
      dockerContext: probe.context,
      ...(probe.endpoint ? { dockerEndpoint: probe.endpoint } : {}),
    };
  }
  return {
    engine: "podman",
    podmanConnection: probe.context ?? "local",
    ...(probe.endpoint ? { podmanEndpoint: probe.endpoint } : {}),
  };
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
  const runner = localRunnerFor(params.manifest, params.runtime);
  const connection = localConnectionFor(params.manifest);
  const existing = await runner.inspect(containerName, connection);
  if (!existing) {
    params.runtime.stdout.log(`Local gateway does not exist: ${containerName}`);
    return;
  }
  if (!existing.running) {
    params.runtime.stdout.log(`Local gateway already stopped: ${containerName}`);
    return;
  }

  await runner.disableRestart(containerName, connection);
  const handoffStartedAt = params.runtime.now();
  const requestId = randomBytes(16).toString("hex");
  await writeRuntimeHandoffRequest(
    params.hub,
    params.manifest.bucket,
    {
      schemaVersion: 1,
      requestId,
      agent: params.manifest.agent,
      runtimeId: params.manifest.localRuntimeId,
      requestedAt: handoffStartedAt.toISOString(),
      targetRuntimeId: params.targetRuntimeId ?? spaceRuntimeId(params.manifest.agent),
    },
    params.bucketPrefix,
  );
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
  await writeRuntimeHandoffRequest(
    params.hub,
    params.manifest.bucket,
    {
      schemaVersion: 1,
      requestId,
      agent: params.manifest.agent,
      runtimeId: spaceRuntimeId(params.manifest.agent),
      requestedAt: handoffStartedAt.toISOString(),
      targetRuntimeId: params.targetRuntimeId ?? params.manifest.localRuntimeId,
    },
    params.bucketPrefix,
  );
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
      if (ack?.requestId === params.requestId && ack.runtimeId === params.runtimeId) {
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

async function ensureDeploymentCredentialKey(
  runtime: Required<CliRuntime>,
  agent: string,
  existing?: Record<string, string>,
): Promise<Record<string, string>> {
  const secrets: Record<string, string> =
    existing ?? (await readSecretEnv(runtime.configRoot, agent).catch(() => ({})));
  if (secrets.MLCLAW_CREDENTIAL_KEY) {
    return secrets;
  }
  const updated = {
    ...secrets,
    MLCLAW_CREDENTIAL_KEY: randomBytes(32).toString("base64url"),
  };
  await writeSecretEnv(runtime.configRoot, agent, updated);
  return updated;
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
  if (
    !canonicalTemplate &&
    !variables.has("MLCLAW_TEMPLATE_REV") &&
    !variables.has("OPENCLAW_HF_TEMPLATE_REV") &&
    !opts.force
  ) {
    throw new Error(`${repoId} does not look like a ML Claw deployment; pass --force to update anyway`);
  }
  const runtimeImage = resolveSpaceRuntimeImage(opts, runtime.env);
  const agentName = variables.get("OPENCLAW_AGENT_NAME")?.value?.trim() || repoId.split("/")[1] || "openclaw";
  if (!canonicalTemplate) {
    await ensureUpdateRouterToken({
      repoId,
      agentName,
      model: variables.get("OPENCLAW_MODEL")?.value ?? DEFAULT_MODEL,
      opts,
      hub,
      runtime,
    });
  }
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
    runtime.stdout.log(`Space deployment triggered: ${repoId}`);
    return;
  }
  await hub.addSpaceVariable(repoId, "MLCLAW_GATEWAY_LOCATION", "space");
  await hub.addSpaceVariable(repoId, "MLCLAW_RUNTIME_ID", spaceRuntimeId(agentName));
  await hub.addSpaceVariable(repoId, "MLCLAW_OPENCLAW_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
  await hub.addSpaceVariable(repoId, "OPENCLAW_GATEWAY_PORT", String(DEFAULT_SPACE_OPENCLAW_PORT));
  const bucket = variables.get("OPENCLAW_HF_STATE_BUCKET")?.value;
  if (bucket) {
    await hub.addSpaceVariable(repoId, "MLCLAW_STATE_MOUNT_DIR", SPACE_STATE_MOUNT_DIR);
    await hub.addSpaceVariable(repoId, "OPENCLAW_LIVE_DIR", SPACE_LIVE_DIR);
    await hub.addSpaceVariable(repoId, "MLCLAW_RUNTIME_SETTINGS_FILE", `${SPACE_LIVE_DIR}/.mlclaw/settings.json`);
    await ensureSpaceStateVolume(hub, repoId, bucket);
  }
  await doctor(repoId, { fix: true }, hub, runtime);
  runtime.stdout.log(`Space deployment triggered: ${repoId}`);
}

async function ensureUpdateRouterToken(params: {
  repoId: string;
  agentName: string;
  model: string;
  opts: UpdateOptions;
  hub: HubApi;
  runtime: Required<CliRuntime>;
}): Promise<void> {
  if (!isHuggingFaceRouterModel(params.model)) {
    return;
  }
  const spaceSecrets = await params.hub.getSpaceSecrets(params.repoId);
  const hasExplicitOverride = params.opts.routerToken !== undefined || params.opts.routerTokenFile !== undefined;
  if (hasBrokerOrRouterTokenSecretMap(spaceSecrets) && !hasExplicitOverride) {
    return;
  }
  const hasManifest = await manifestExists(params.runtime.configRoot, params.agentName);
  const localSecrets = hasManifest
    ? await readSecretEnv(params.runtime.configRoot, params.agentName).catch(() => ({}))
    : {};
  const routerToken = hasExplicitOverride
    ? await resolveRouterToken({
        opts: params.opts,
        runtime: params.runtime,
        existingSecrets: localSecrets,
        model: params.model,
      })
    : undefined;
  const brokerToken = routerToken ? undefined : await params.runtime.readToken(params.runtime.env);
  const credential = routerToken ?? brokerToken;
  if (!credential) {
    throw new Error("Hugging Face broker credential is unavailable");
  }
  await params.hub.addSpaceSecret(
    params.repoId,
    routerToken ? "MLCLAW_ROUTER_TOKEN" : "MLCLAW_BROKER_HF_TOKEN",
    credential,
  );
  if (hasManifest) {
    await writeSecretEnv(params.runtime.configRoot, params.agentName, {
      ...localSecrets,
      ...(routerToken ? { MLCLAW_ROUTER_TOKEN: routerToken } : { MLCLAW_BROKER_HF_TOKEN: brokerToken as string }),
    });
  }
}

async function doctor(repoId: string, opts: DoctorOptions, hub: HubApi, runtime: Required<CliRuntime>): Promise<void> {
  if (!repoId.includes("/") && (await manifestExists(runtime.configRoot, repoId))) {
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
    addRuntimeImageFindings(variables.get("MLCLAW_RUNTIME_IMAGE")?.value, issues);
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
  if ((variables.get("MLCLAW_STATE_MOUNT_DIR")?.value ?? "") !== SPACE_STATE_MOUNT_DIR) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "MLCLAW_STATE_MOUNT_DIR", SPACE_STATE_MOUNT_DIR);
      fixed.push("set MLCLAW_STATE_MOUNT_DIR");
    } else {
      issues.push(`MLCLAW_STATE_MOUNT_DIR is not ${SPACE_STATE_MOUNT_DIR}`);
    }
  }
  if ((variables.get("OPENCLAW_LIVE_DIR")?.value ?? "") !== SPACE_LIVE_DIR) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "OPENCLAW_LIVE_DIR", SPACE_LIVE_DIR);
      fixed.push("set OPENCLAW_LIVE_DIR");
    } else {
      issues.push(`OPENCLAW_LIVE_DIR is not ${SPACE_LIVE_DIR}`);
    }
  }
  const expectedRuntimeSettingsFile = `${SPACE_LIVE_DIR}/.mlclaw/settings.json`;
  if ((variables.get("MLCLAW_RUNTIME_SETTINGS_FILE")?.value ?? "") !== expectedRuntimeSettingsFile) {
    if (fix) {
      await hub.addSpaceVariable(repoId, "MLCLAW_RUNTIME_SETTINGS_FILE", expectedRuntimeSettingsFile);
      fixed.push("set MLCLAW_RUNTIME_SETTINGS_FILE");
    } else {
      issues.push(`MLCLAW_RUNTIME_SETTINGS_FILE is not ${expectedRuntimeSettingsFile}`);
    }
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
  if (!secrets.has("MLCLAW_BROKER_HF_TOKEN")) {
    if (fix) {
      await hub.addSpaceSecret(repoId, "MLCLAW_BROKER_HF_TOKEN", await runtime.readToken(runtime.env));
      secrets.set("MLCLAW_BROKER_HF_TOKEN", { key: "MLCLAW_BROKER_HF_TOKEN" });
      fixed.push("set secret MLCLAW_BROKER_HF_TOKEN");
    } else {
      issues.push("secret MLCLAW_BROKER_HF_TOKEN is missing");
    }
  }
  const staleTokenSecrets = ["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN"].filter((key) => secrets.has(key));
  if (staleTokenSecrets.length > 0) {
    const model = variables.get("OPENCLAW_MODEL")?.value ?? DEFAULT_MODEL;
    const canDelete = canDeleteBroadTokenSecrets({
      model,
      routerTokenPresent: hasBrokerOrRouterTokenSecretMap(secrets),
    });
    if (fix && canDelete) {
      await deleteStaleSpaceTokenSecrets(hub, repoId);
      fixed.push(`deleted stale secret${staleTokenSecrets.length === 1 ? "" : "s"} ${staleTokenSecrets.join(", ")}`);
    } else if (fix) {
      issues.push(
        `stale broad Hub token secret${staleTokenSecrets.length === 1 ? "" : "s"} present: ${staleTokenSecrets.join(", ")}; add MLCLAW_BROKER_HF_TOKEN before removing`,
      );
    } else {
      issues.push(
        `stale broad Hub token secret${staleTokenSecrets.length === 1 ? "" : "s"} present: ${staleTokenSecrets.join(", ")}`,
      );
    }
  }
  if (!secrets.has("MLCLAW_SESSION_SECRET")) {
    if (fix) {
      await hub.addSpaceSecret(repoId, "MLCLAW_SESSION_SECRET", randomBytes(48).toString("base64url"));
      fixed.push("set secret MLCLAW_SESSION_SECRET");
    } else {
      issues.push("secret MLCLAW_SESSION_SECRET is missing");
    }
  }
  if (!secrets.has("MLCLAW_CREDENTIAL_KEY")) {
    if (fix) {
      const agent = variables.get("OPENCLAW_AGENT_NAME")?.value?.trim() || repoId.split("/")[1] || "openclaw";
      const credentialKey = (await manifestExists(runtime.configRoot, agent))
        ? requiredSecret(await ensureDeploymentCredentialKey(runtime, agent), "MLCLAW_CREDENTIAL_KEY")
        : randomBytes(32).toString("base64url");
      await hub.addSpaceSecret(repoId, "MLCLAW_CREDENTIAL_KEY", credentialKey);
      fixed.push("set secret MLCLAW_CREDENTIAL_KEY");
    } else {
      issues.push("secret MLCLAW_CREDENTIAL_KEY is missing");
    }
  }
  if (!variables.has("MLCLAW_TEMPLATE_REV") && !variables.has("OPENCLAW_HF_TEMPLATE_REV")) {
    issues.push("MLCLAW_TEMPLATE_REV is missing; updates cannot verify template lineage");
  }
  if ((variables.get("MLCLAW_GATEWAY_LOCATION")?.value ?? "") !== "space") {
    issues.push("MLCLAW_GATEWAY_LOCATION is not set to space");
  }
  addRuntimeImageFindings(variables.get("MLCLAW_RUNTIME_IMAGE")?.value, issues);
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
  if (bucket && !hasStateVolume(runtimeInfo.volumes, bucket)) {
    if (fix) {
      await hub.setSpaceVolumes(repoId, mergeStateVolume(requireRuntimeVolumes(runtimeInfo, repoId), bucket));
      fixed.push(`mounted bucket ${bucket} at ${SPACE_STATE_MOUNT_DIR}`);
    } else {
      issues.push(`bucket ${bucket} is not mounted read-write at ${SPACE_STATE_MOUNT_DIR}`);
    }
  }
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

function addRuntimeImageFindings(value: string | undefined, issues: string[]): void {
  const runtimeImage = value?.trim();
  if (!runtimeImage) {
    issues.push("MLCLAW_RUNTIME_IMAGE is missing; run `mlclaw update` to refresh the Space runtime");
    return;
  }
  if (runtimeImage.startsWith("ghcr.io/osolmaz/mlclaw-runtime:")) {
    issues.push(
      `MLCLAW_RUNTIME_IMAGE points at the legacy mlclaw-runtime package; run \`mlclaw update\` to use ${DEFAULT_RUNTIME_IMAGE}`,
    );
    return;
  }
  if (runtimeImage.startsWith("bundled:")) {
    issues.push(`MLCLAW_RUNTIME_IMAGE uses a bundled runtime; run \`mlclaw update\` to use ${DEFAULT_RUNTIME_IMAGE}`);
  }
}

async function settings(
  repoId: string,
  opts: SettingsOptions,
  hub: HubApi,
  runtime: Required<CliRuntime>,
): Promise<void> {
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

async function setDeploymentVariables(hub: HubApi, repoId: string, variables: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(variables)) {
    await hub.addSpaceVariable(repoId, key, value);
  }
}

async function setDeploymentSecrets(hub: HubApi, repoId: string, secrets: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(secrets)) {
    await hub.addSpaceSecret(repoId, key, value);
  }
}

async function deleteStaleSpaceTokenSecrets(hub: HubApi, repoId: string): Promise<void> {
  await Promise.all([
    hub.deleteSpaceSecret(repoId, "HF_TOKEN"),
    hub.deleteSpaceSecret(repoId, "HUGGINGFACE_HUB_TOKEN"),
  ]);
}

function canDeleteBroadTokenSecrets(params: { model: string; routerTokenPresent: boolean }): boolean {
  return params.routerTokenPresent || !isHuggingFaceRouterModel(params.model);
}

function hasRouterTokenSecretRecord(secrets: Record<string, string>): boolean {
  return Boolean(secrets.MLCLAW_ROUTER_TOKEN || secrets.HF_ROUTER_TOKEN);
}

function hasRouterTokenSecretMap(secrets: Map<string, { key: string }>): boolean {
  return secrets.has("MLCLAW_ROUTER_TOKEN") || secrets.has("HF_ROUTER_TOKEN");
}

function hasBrokerOrRouterTokenSecretRecord(secrets: Record<string, string>): boolean {
  return Boolean(secrets.MLCLAW_BROKER_HF_TOKEN) || hasRouterTokenSecretRecord(secrets);
}

function hasBrokerOrRouterTokenSecretMap(secrets: Map<string, { key: string }>): boolean {
  return secrets.has("MLCLAW_BROKER_HF_TOKEN") || hasRouterTokenSecretMap(secrets);
}

function assertDedicatedRouterToken(model: string, secrets: Record<string, string>): void {
  if (isHuggingFaceRouterModel(model) && !hasBrokerOrRouterTokenSecretRecord(secrets)) {
    throw new Error("Hugging Face Router models require MLCLAW_BROKER_HF_TOKEN or a dedicated inference token");
  }
}

async function ensureSpaceStateVolume(
  hub: HubApi,
  repoId: string,
  bucket: string,
  opts: { allowMissingVolumes?: boolean } = {},
): Promise<void> {
  const runtime = await hub.getSpaceRuntime(repoId);
  const volumes = Array.isArray(runtime.volumes)
    ? runtime.volumes
    : opts.allowMissingVolumes
      ? []
      : requireRuntimeVolumes(runtime, repoId);
  await hub.setSpaceVolumes(repoId, mergeStateVolume(volumes, bucket));
}

function requireRuntimeVolumes(runtime: SpaceRuntime, repoId: string): SpaceVolume[] {
  if (!Array.isArray(runtime.volumes)) {
    throw new Error(`Space runtime metadata for ${repoId} did not include volumes; refusing to replace mounts`);
  }
  return runtime.volumes;
}

export function mergeStateVolume(existing: SpaceVolume[], bucket: string): SpaceVolume[] {
  return [
    ...existing.filter((volume) => volumeMountPath(volume) !== SPACE_STATE_MOUNT_DIR).map(normalizeSpaceVolume),
    {
      type: "bucket",
      source: bucket,
      mountPath: SPACE_STATE_MOUNT_DIR,
      readOnly: false,
    },
  ];
}

function hasStateVolume(volumes: SpaceVolume[] | null | undefined, bucket: string): boolean {
  return Boolean(
    volumes?.some(
      (volume) =>
        volume.type === "bucket" &&
        volume.source === bucket &&
        volumeMountPath(volume) === SPACE_STATE_MOUNT_DIR &&
        volumeReadOnly(volume) !== true,
    ),
  );
}

function normalizeSpaceVolume(volume: SpaceVolume): SpaceVolume {
  const normalized = { ...volume };
  const mountPath = volumeMountPath(volume);
  if (mountPath) {
    normalized.mountPath = mountPath;
  }
  const readOnly = volumeReadOnly(volume);
  if (typeof readOnly === "boolean") {
    normalized.readOnly = readOnly;
  }
  return normalized;
}

function volumeMountPath(volume: SpaceVolume): string | undefined {
  return volume.mountPath ?? volume.mount_path;
}

function volumeReadOnly(volume: SpaceVolume): boolean | undefined {
  return volume.readOnly ?? volume.read_only;
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

async function readOptionalTelegramToken(
  opts: BootstrapOptions,
  runtime: Required<CliRuntime>,
): Promise<string | undefined> {
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

async function resolveRouterToken(params: {
  opts: { routerToken?: string; routerTokenFile?: string };
  runtime: Required<CliRuntime>;
  existingSecrets?: Record<string, string>;
  model: string;
}): Promise<string | undefined> {
  const explicit =
    nonEmpty(params.opts.routerToken) ?? (await readOptionalRouterTokenFile(params.opts.routerTokenFile));
  const direct =
    explicit ??
    params.runtime.env.MLCLAW_ROUTER_TOKEN ??
    params.runtime.env.HF_ROUTER_TOKEN ??
    params.existingSecrets?.MLCLAW_ROUTER_TOKEN ??
    params.existingSecrets?.HF_ROUTER_TOKEN;
  const existing = nonEmpty(direct);
  if (existing) {
    return existing;
  }
  if (!isHuggingFaceRouterModel(params.model)) {
    return undefined;
  }
  return undefined;
}

async function readOptionalRouterTokenFile(file: string | undefined): Promise<string | undefined> {
  if (!file) {
    return undefined;
  }
  const raw = await fs.readFile(file, "utf8");
  const parsed = parseSecretEnv(raw);
  return nonEmpty(parsed.MLCLAW_ROUTER_TOKEN) ?? nonEmpty(parsed.HF_ROUTER_TOKEN) ?? nonEmpty(raw);
}

function isHuggingFaceRouterModel(model: string): boolean {
  return model.trim().startsWith("huggingface/");
}

async function promptAgentName(runtime: Required<CliRuntime>): Promise<string> {
  if (!runtime.prompt.isInteractive()) {
    return "mlclaw";
  }
  const value = await runtime.prompt.text({
    message: "Agent name",
    placeholder: "mlclaw",
    initialValue: "mlclaw",
  });
  return readPromptValue(value, "Agent name");
}

async function resolveHardware(params: {
  requestedHardware?: string;
  requestedSleepTime?: number;
  defaultLabel?: string;
  requiresMessagingEgress?: boolean;
  yes: boolean;
  runtime: Required<CliRuntime>;
}): Promise<SpaceHardwareRequest> {
  const hardware = params.requestedHardware ?? (params.requiresMessagingEgress ? TELEGRAM_HARDWARE : undefined);
  if (!hardware) {
    const label = params.defaultLabel ?? "default Space CPU";
    return typeof params.requestedSleepTime === "number"
      ? { kind: "default", label, sleepTime: params.requestedSleepTime }
      : { kind: "default", label };
  }
  const sleepTime = isPaidHardware(hardware)
    ? (params.requestedSleepTime ?? TELEGRAM_SLEEP_TIME)
    : params.requestedSleepTime;
  if (params.requiresMessagingEgress && !isPaidHardware(hardware)) {
    throw new Error(
      `Telegram requires upgraded paid Space hardware today; use --hardware ${TELEGRAM_HARDWARE} or --gateway local`,
    );
  }
  if (isPaidHardware(hardware)) {
    const paidSleepTime = params.requestedSleepTime ?? TELEGRAM_SLEEP_TIME;
    await confirmPaidHardware({
      hardware,
      sleepTime: paidSleepTime,
      yes: params.yes,
      runtime: params.runtime,
    });
    return { kind: "explicit", hardware, label: hardware, sleepTime: paidSleepTime };
  }
  return typeof sleepTime === "number"
    ? { kind: "explicit", hardware, label: hardware, sleepTime }
    : { kind: "explicit", hardware, label: hardware };
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

function parseLocalPort(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new InvalidArgumentError("expected an unprivileged port between 1024 and 65535");
  }
  const port = parseInteger(value);
  if (port < 1024 || port > 65_535) {
    throw new InvalidArgumentError("expected an unprivileged port between 1024 and 65535");
  }
  return port;
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
