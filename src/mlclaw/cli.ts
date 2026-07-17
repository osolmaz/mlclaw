#!/usr/bin/env node
import fs from "node:fs/promises";
import { realpathSync } from "node:fs";
import os from "node:os";
import process from "node:process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
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
import { HubApi, HubApiError, type HubIdentity, type SpaceRuntime, type SpaceVolume } from "./hub-api.js";
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
  listManifests,
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
import {
  acquireControlLease,
  assertControlLease,
  deploymentDesiredState,
  deploymentIdentity,
  newOperation,
  readDeploymentIdentity,
  readDeploymentTombstone,
  readDesiredState,
  readResumableOperation,
  releaseControlLease,
  renewControlLease,
  updateOperation,
  withDeploymentLock,
  writeCanonicalState,
  writeDeploymentIdentity,
  writeDeploymentTombstone,
} from "./deployment-state.js";
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
  assessBrokerCredential,
  buildBrokerTokenUrl,
  type BrokerCredentialAssessment,
} from "./hf-broker-credential.js";
import {
  CliTailscaleRunner,
  TailscaleApprovalRequiredError,
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
const REMOTE_DISCOVERY_PROBE_TIMEOUT_MS = 5_000;
const REMOTE_DISCOVERY_TIMEOUT_MS = 20_000;

type ContainerRuntimePreference = "auto" | ContainerEngine;
type HostedFallbackChoice = "local" | "pro" | "cancel";
type TailscaleMode = "off" | "direct" | "serve";

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
  brokerHfTokenFile?: string;
  dockerContext?: string;
  containerRuntime?: string;
  localPort?: number;
  tailscale?: TailscaleMode;
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
  tailscale?: TailscaleMode;
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
  currentVisibility?: "private" | "public";
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
  previousManifest?: DeploymentManifest;
  gatewayLocation: GatewayLocation;
  bucketPrefix?: string;
  bucketPlan: BootstrapBucketPlan;
  bucket: string;
  spacePlan?: BootstrapSpacePlan;
  manifest: DeploymentManifest;
  secrets: Record<string, string>;
  waitingForApprovalUrl?: string;
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
    .alias("configure")
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
    .option("--model <model>", "OpenClaw model identifier")
    .option("--runtime-image <image>", "ML Claw runtime image")
    .option("--bundled-runtime", "Generate a bundled Space runtime instead of using the prebuilt ML Claw image", false)
    .option("--public-space", "Create the Hugging Face Space as public instead of private", false)
    .addOption(new Option("--gateway-token <token>").hideHelp())
    .option("--router-token <token>", "Hugging Face Router inference token for Space gateway model calls")
    .option(
      "--router-token-file <path>",
      "File containing MLCLAW_ROUTER_TOKEN=..., HF_ROUTER_TOKEN=..., or a raw token",
    )
    .option("--broker-hf-token-file <path>", "File containing MLCLAW_BROKER_HF_TOKEN=... or a raw Hugging Face token")
    .option("--docker-context <name>", "Docker context for local gateway mode")
    .option("--container-runtime <auto|docker|podman>", "Local container runtime", "auto")
    .option("--local-port <port>", "Loopback port for a local gateway", parseLocalPort)
    .option("--tailscale <off|direct|serve>", "Tailnet access mode", parseTailscaleMode)
    .option("--tailscale-port <port>", "Tailnet listener or Serve HTTPS port", parseLocalPort)
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
    .option("--tailscale <off|direct|serve>", "Tailnet access mode", parseTailscaleMode)
    .option("--tailscale-port <port>", "Tailnet listener or Serve HTTPS port", parseLocalPort)
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
    .option("--tailscale <off|direct|serve>", "Tailnet access mode", parseTailscaleMode)
    .option("--tailscale-port <port>", "Tailnet listener or Serve HTTPS port", parseLocalPort)
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
    .option("--tailscale <off|direct|serve>", "Tailnet access mode", parseTailscaleMode)
    .option("--tailscale-port <port>", "Tailnet listener or Serve HTTPS port", parseLocalPort)
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

async function resolveBootstrapAgentName(params: {
  requestedName?: string;
  requestedOwner?: string;
  owner: string;
  hub: HubApi;
  runtime: Required<CliRuntime>;
}): Promise<string> {
  if (params.requestedName) return slugifyAgentName(params.requestedName);
  const local = (await listManifests(params.runtime.configRoot)).filter(
    (manifest) => !params.requestedOwner || manifest.owner === params.requestedOwner,
  );
  if (local.length === 1) {
    const deployment = local[0] as DeploymentManifest;
    params.runtime.stdout.log(`Existing deployment found: ${deployment.agent}`);
    return deployment.agent;
  }
  if (local.length > 1) {
    if (!params.runtime.prompt.isInteractive()) {
      throw new Error("multiple deployments found; specify --name");
    }
    return slugifyAgentName(
      await promptSelect(
        "Which deployment should ML Claw configure?",
        local.map((manifest) => ({ value: manifest.agent, label: manifest.agent, hint: manifest.bucket })),
        (local[0] as DeploymentManifest).agent,
        params.runtime,
      ),
    );
  }

  const remote = await discoverRemoteDeployments(params.owner, params.hub);
  if (remote.length === 1 && params.runtime.prompt.isInteractive()) {
    const deployment = remote[0] as (typeof remote)[number];
    const recovered = await promptConfirm(
      `Recover deployment ${deployment.identity.agent} from ${deployment.identity.bucket}?`,
      true,
      params.runtime,
    );
    if (recovered) {
      await cacheRecoveredDeployment(deployment, params.runtime);
      return deployment.identity.agent;
    }
  } else if (remote.length > 1) {
    if (!params.runtime.prompt.isInteractive()) throw new Error("multiple remote deployments found; specify --name");
    const selected = await promptSelect(
      "Which remote deployment should ML Claw recover?",
      remote.map(({ identity }) => ({ value: identity.deploymentId, label: identity.agent, hint: identity.bucket })),
      (remote[0] as (typeof remote)[number]).identity.deploymentId,
      params.runtime,
    );
    const deployment = remote.find(({ identity }) => identity.deploymentId === selected);
    if (!deployment) throw new Error("selected remote deployment disappeared");
    await cacheRecoveredDeployment(deployment, params.runtime);
    return deployment.identity.agent;
  }
  if (!params.runtime.prompt.isInteractive()) throw new Error("no deployment found; specify --name");
  return slugifyAgentName(await promptAgentName(params.runtime));
}

async function discoverRemoteDeployments(
  owner: string,
  hub: HubApi,
): Promise<
  Array<{
    identity: NonNullable<Awaited<ReturnType<typeof readDeploymentIdentity>>>;
    desired: NonNullable<Awaited<ReturnType<typeof readDesiredState>>>;
  }>
> {
  const deadline = Date.now() + REMOTE_DISCOVERY_TIMEOUT_MS;
  const buckets = (await withDeadline(hub.listBuckets(owner), REMOTE_DISCOVERY_TIMEOUT_MS, [] as string[])).filter(
    (bucket) => bucket.startsWith(`${owner}/`),
  );
  const found: Array<{
    identity: NonNullable<Awaited<ReturnType<typeof readDeploymentIdentity>>>;
    desired: NonNullable<Awaited<ReturnType<typeof readDesiredState>>>;
  }> = [];
  for (let offset = 0; offset < buckets.length; offset += 4) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const page = await Promise.all(
      buckets.slice(offset, offset + 4).map(async (bucket) => {
        return await withDeadline(
          (async () => {
            try {
              const client = hub.bucket(bucket);
              if (await readDeploymentTombstone(client)) return null;
              const identity = await readDeploymentIdentity(client);
              if (!identity || identity.owner !== owner || identity.bucket !== bucket) return null;
              const desired = await readDesiredState(client);
              if (!desired || desired.deploymentId !== identity.deploymentId) return null;
              return { identity, desired };
            } catch {
              return null;
            }
          })(),
          Math.min(REMOTE_DISCOVERY_PROBE_TIMEOUT_MS, remaining),
          null,
        );
      }),
    );
    found.push(...page.filter((item): item is NonNullable<typeof item> => item !== null));
  }
  return found.sort((a, b) => a.identity.agent.localeCompare(b.identity.agent));
}

async function withDeadline<T>(promise: Promise<T>, milliseconds: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), Math.max(0, milliseconds));
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function cacheRecoveredDeployment(
  deployment: {
    identity: NonNullable<Awaited<ReturnType<typeof readDeploymentIdentity>>>;
    desired: NonNullable<Awaited<ReturnType<typeof readDesiredState>>>;
  },
  runtime: Required<CliRuntime>,
): Promise<void> {
  const { identity, desired } = deployment;
  const now = runtime.now().toISOString();
  await writeManifest(runtime.configRoot, {
    version: 2,
    deploymentId: identity.deploymentId,
    desiredGeneration: desired.generation,
    agent: identity.agent,
    owner: identity.owner,
    bucket: identity.bucket,
    space: desired.space.repo,
    localRuntimeId: newLocalRuntimeId(identity.agent),
    gatewayLocation: desired.gateway.location,
    model: desired.model,
    runtimeImage: desired.runtimeImage,
    tailscaleMode: desired.gateway.tailscaleMode,
    spaceVisibility: desired.space.visibility,
    ...(desired.space.hardware ? { spaceHardware: desired.space.hardware } : {}),
    ...(typeof desired.space.sleepTime === "number" ? { spaceSleepTime: desired.space.sleepTime } : {}),
    localPort: desired.gateway.port,
    credentialKeySha256: identity.credentialKeySha256,
    recoveredWithoutCredentialKey: true,
    createdAt: identity.createdAt,
    updatedAt: now,
  });
  if (identity.statePrefix !== "openclaw-state") {
    await writeSecretEnv(runtime.configRoot, identity.agent, {
      OPENCLAW_HF_STATE_PREFIX: identity.statePrefix,
    });
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
  const selectionOwner = opts.owner ?? me.name;
  const suppliedTelegramToken = await readOptionalTelegramToken(opts, runtime);
  let bot = suppliedTelegramToken
    ? await runtime.getTelegramBot(suppliedTelegramToken, opts.telegramApiRoot)
    : undefined;
  const requestedAgentName = opts.name ?? bot?.username;
  let agentName = await resolveBootstrapAgentName({
    ...(requestedAgentName ? { requestedName: requestedAgentName } : {}),
    ...(opts.owner ? { requestedOwner: opts.owner } : {}),
    owner: selectionOwner,
    hub,
    runtime,
  });
  const selectedManifest = await readManifest(runtime.configRoot, agentName).catch(() => null);
  const selectedSecrets: Record<string, string> = await readSecretEnv(runtime.configRoot, agentName).catch(() => ({}));
  const owner = opts.owner ?? selectedManifest?.owner ?? selectionOwner;
  const telegramToken = suppliedTelegramToken ?? selectedSecrets.TELEGRAM_BOT_TOKEN;
  if (!bot && telegramToken) {
    bot = await runtime.getTelegramBot(telegramToken, opts.telegramApiRoot ?? selectedSecrets.TELEGRAM_API_ROOT);
  }
  const telegramUserId = telegramToken
    ? (opts.telegramUserId ??
      runtime.env.TELEGRAM_ALLOWED_USERS ??
      selectedSecrets.TELEGRAM_ALLOWED_USERS ??
      (await promptRequired("Telegram allowed user ID", runtime)))
    : undefined;

  const model = opts.model ?? DEFAULT_MODEL;
  const runtimeImage = resolveRuntimeImage(opts.runtimeImage, runtime.env);
  resolveSpaceRuntimeImage(opts, runtime.env);

  let plan: BootstrapResolvedPlan;
  let reviewedBrokerHfToken: string | undefined;
  for (;;) {
    plan = await resolveBootstrapPlan({
      opts,
      owner,
      agentName,
      hfToken,
      hfIdentity: me,
      model,
      runtimeImage,
      hub,
      runtime,
      ...(reviewedBrokerHfToken
        ? { providedBrokerHfToken: reviewedBrokerHfToken, brokerCredentialReviewed: true }
        : {}),
      ...(requestedGatewayLocation ? { requestedGatewayLocation } : {}),
      ...(telegramToken ? { telegramToken } : {}),
      ...(telegramUserId ? { telegramUserId } : {}),
    });
    reviewedBrokerHfToken = plan.secrets.MLCLAW_BROKER_HF_TOKEN;
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
    activePlan.manifest = {
      ...activePlan.manifest,
      spaceVisibility: spacePlan.visibility,
      ...(paidHardware.kind === "explicit" ? { spaceHardware: paidHardware.hardware } : {}),
      ...(typeof paidHardware.sleepTime === "number" ? { spaceSleepTime: paidHardware.sleepTime } : {}),
    };
    await confirmBootstrapPlan({
      manifest: activePlan.manifest,
      ...(activePlan.previousManifest ? { previousManifest: activePlan.previousManifest } : {}),
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
      await claimInitialBootstrap(activePlan, hub, runtime, async (assertLease) => {
        await createOrAdoptSpace({
          hub,
          spacePlan,
          runtime,
          ...(paidHardware.kind === "explicit" ? { hardware: paidHardware.hardware } : {}),
          ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
        });
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
        hfIdentity: me,
        brokerHfToken: activePlan.secrets.MLCLAW_BROKER_HF_TOKEN ?? hfToken,
        model,
        runtimeImage,
        hub,
        runtime,
        ...(telegramToken ? { telegramToken } : {}),
        ...(telegramUserId ? { telegramUserId } : {}),
      });
    }
    if (activePlan.gatewayLocation === "space") {
      await assertNoLiveForeignLease({
        hub,
        bucket: activePlan.bucket,
        bucketPrefix: activePlan.bucketPrefix,
        runtimeId: spaceRuntimeId(agentName),
        takeover: Boolean(opts.takeover),
      });
      await reconcileDeployment(activePlan, hub, runtime, async (changed, assertLease) => {
        let observed: { runtime: SpaceRuntime; variables: Map<string, { key: string; value?: string }> } | undefined;
        let requiresDeployment = !spacePlan.exists;
        if (!changed && !requiresDeployment) {
          const [spaceRuntime, variables] = await Promise.all([
            hub.getSpaceRuntime(activePlan.manifest.space),
            hub.getSpaceVariables(activePlan.manifest.space),
          ]);
          observed = { runtime: spaceRuntime, variables };
          requiresDeployment = spaceGatewayNeedsRepair(activePlan.manifest, variables, spaceRuntime, me.name);
        }
        if (spacePlan.currentVisibility !== spacePlan.visibility) {
          await assertLease();
          await hub.updateSpaceVisibility(spacePlan.space, spacePlan.visibility);
        }
        if (changed || requiresDeployment) {
          await assertLease();
          const deployed = await deploySpaceGateway({
            hub,
            runtime,
            hfToken,
            manifest: activePlan.manifest,
            secrets: activePlan.secrets,
            allowedUsers: me.name,
            spaceExists: spacePlan.exists,
            spacePrepared: true,
            assertLease,
            ...(paidHardware.kind === "explicit" ? { hardware: paidHardware.hardware } : {}),
            ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
            ...(!opts.bundledRuntime && !activePlan.manifest.runtimeImage.startsWith("bundled:")
              ? { templateRuntimeImage: activePlan.manifest.runtimeImage }
              : {}),
          });
          deployedSpaceRuntime = deployed.runtimeImage;
          await assertLease();
          await writeLocalDeployment(runtime.configRoot, activePlan.manifest, activePlan.secrets);
          return;
        }
        if (observed) {
          const previousSecrets = await readSecretEnv(runtime.configRoot, activePlan.agentName).catch(() => ({}));
          const secretsChanged = JSON.stringify(previousSecrets) !== JSON.stringify(activePlan.secrets);
          if (secretsChanged) {
            await assertLease();
            await setSpaceGatewaySecrets(hub, activePlan.manifest.space, hfToken, activePlan.secrets, assertLease);
            if (
              canDeleteBroadTokenSecrets({
                model: activePlan.manifest.model,
                routerTokenPresent: hasBrokerOrRouterTokenSecretRecord(activePlan.secrets),
              })
            ) {
              await assertLease();
              await deleteStaleSpaceTokenSecrets(hub, activePlan.manifest.space, assertLease);
            }
            await assertLease();
            await writeLocalDeployment(runtime.configRoot, activePlan.manifest, activePlan.secrets);
          }
          const stage = typeof observed.runtime.stage === "string" ? observed.runtime.stage.toUpperCase() : "";
          const disabled = observed.variables.has("MLCLAW_GATEWAY_DISABLED");
          const stopped = disabled || stage === "PAUSED" || stage === "STOPPED" || stage === "SLEEPING";
          if (stopped) {
            await assertLease();
            if (disabled) await clearSpaceGatewayDisabled(hub, activePlan.manifest.space);
            await assertLease();
            await hub.restartSpace(activePlan.manifest.space, true);
            runtime.stdout.log(`Space gateway restart requested: ${activePlan.manifest.space}`);
          } else {
            runtime.stdout.log(`Space deployment already matches desired state: ${activePlan.manifest.space}`);
          }
          await assertLease();
          await writeManifest(runtime.configRoot, activePlan.manifest);
          return;
        }
        throw new Error("internal error: Space reconciliation had no observed or changed state");
      });
    }
  }
  if (activePlan.gatewayLocation === "local") {
    activePlan = await resolveBootstrapNetworkAccess(activePlan, opts, runtime);
    if (plan.gatewayLocation === "local") {
      await confirmBootstrapPlan({
        manifest: activePlan.manifest,
        ...(activePlan.previousManifest ? { previousManifest: activePlan.previousManifest } : {}),
        bucketPlan: activePlan.bucketPlan,
        hasExistingManifest: activePlan.hasExistingManifest,
        hardware: localGatewayLabel(requiredLocalGateway(activePlan.manifest)),
        yes: Boolean(opts.yes),
        runtime,
      });
    }
    await claimInitialBootstrap(activePlan, hub, runtime, async () => undefined);
    await assertNoLiveForeignLease({
      hub,
      bucket: activePlan.bucket,
      bucketPrefix: activePlan.bucketPrefix,
      runtimeId: activePlan.manifest.localRuntimeId,
      takeover: Boolean(opts.takeover),
    });
    await reconcileDeployment(
      activePlan,
      hub,
      runtime,
      async (changed, assertLease) => await deployLocalBootstrap(activePlan, opts, runtime, changed, assertLease),
    );
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
    runtime.prompt.note(localGatewayAccessSummary(activePlan.manifest, activePlan.secrets), "HERE IS YOUR ML CLAW");
    runtime.prompt.outro(
      activePlan.waitingForApprovalUrl
        ? "Local gateway ready; run mlclaw bootstrap again after approving Tailscale Serve"
        : "Bootstrap complete",
    );
  }
}

async function reconcileDeployment(
  plan: BootstrapResolvedPlan,
  hub: HubApi,
  runtime: Required<CliRuntime>,
  apply: (changed: boolean, assertLease: () => Promise<void>) => Promise<{ waitingForApproval?: string } | void>,
): Promise<void> {
  const result = await reconcileManifest({
    manifest: plan.manifest,
    bucketPrefix: plan.bucketPrefix,
    visibility: plan.spacePlan?.visibility,
    credentialKey: requiredSecret(plan.secrets, "MLCLAW_CREDENTIAL_KEY"),
    initialIdentityClaimed: !plan.hasExistingManifest,
    hub,
    runtime,
    apply: async ({ manifest, changed, assertLease }) => {
      plan.manifest = manifest;
      return await apply(changed, assertLease);
    },
  });
  if (!result.waitingForApproval) plan.manifest = result.manifest;
}

async function claimInitialBootstrap(
  plan: BootstrapResolvedPlan,
  hub: HubApi,
  runtime: Required<CliRuntime>,
  provision: (assertLease: () => Promise<void>) => Promise<void>,
): Promise<void> {
  if (plan.hasExistingManifest) {
    await createOrAdoptBucket({ hub, bucketPlan: plan.bucketPlan, runtime });
    await provision(async () => undefined);
    return;
  }
  const control = await hub.deploymentClaimStore(plan.manifest.owner);
  const operation = newOperation(plan.manifest, runtime.now());
  const lease = await acquireControlLease(control, plan.manifest, operation, runtime.now());
  const assertLease = async (): Promise<void> => {
    await assertControlLease(control, lease, runtime.now());
  };
  try {
    await assertLease();
    let identity = plan.bucketPlan.exists ? await readClaimedBootstrapIdentity(plan, hub) : null;
    if (identity) {
      assertBootstrapIdentityMatches(plan, identity);
    }
    await provision(assertLease);
    await assertLease();
    await createOrAdoptBucket({ hub, bucketPlan: plan.bucketPlan, runtime });
    await assertLease();
    const client = hub.bucket(plan.manifest.bucket);
    identity ??= await readClaimedBootstrapIdentity(plan, hub);
    if (identity) {
      assertBootstrapIdentityMatches(plan, identity);
    } else {
      await writeDeploymentIdentity(client, deploymentIdentity(plan.manifest, plan.bucketPrefix));
    }
    await assertLease();
  } finally {
    await releaseControlLease(control, lease);
  }
}

async function readClaimedBootstrapIdentity(plan: BootstrapResolvedPlan, hub: HubApi) {
  const client = hub.bucket(plan.manifest.bucket);
  const tombstone = await readDeploymentTombstone(client);
  if (tombstone) {
    throw new Error(`state bucket ${plan.manifest.bucket} was moved to ${tombstone.movedTo} and cannot be claimed`);
  }
  return await readDeploymentIdentity(client);
}

function assertBootstrapIdentityMatches(
  plan: BootstrapResolvedPlan,
  identity: NonNullable<Awaited<ReturnType<typeof readClaimedBootstrapIdentity>>>,
): void {
  if (
    identity.deploymentId !== plan.manifest.deploymentId ||
    identity.owner !== plan.manifest.owner ||
    identity.agent !== plan.manifest.agent ||
    identity.bucket !== plan.manifest.bucket
  ) {
    throw new Error(`bucket ${plan.manifest.bucket} has a different canonical deployment identity`);
  }
}

type ReconcileManifestContext = {
  manifest: DeploymentManifest;
  changed: boolean;
  assertLease: () => Promise<void>;
};

type ReconcileManifestFinalizer = (context: {
  manifest: DeploymentManifest;
  assertLease: () => Promise<void>;
}) => Promise<DeploymentManifest | void>;

async function reconcileManifest(params: {
  manifest: DeploymentManifest;
  bucketPrefix?: string | undefined;
  visibility?: "private" | "public" | undefined;
  credentialKey?: string | undefined;
  initialIdentityClaimed?: boolean | undefined;
  previousIdentityBucket?: string | undefined;
  hub: HubApi;
  runtime: Required<CliRuntime>;
  apply: (context: ReconcileManifestContext) => Promise<{ waitingForApproval?: string } | void>;
  finalize?: ReconcileManifestFinalizer;
}): Promise<{ manifest: DeploymentManifest; waitingForApproval?: string }> {
  const { hub, runtime } = params;
  const localLockKey = createHash("sha256").update(`${params.manifest.owner}\0${params.manifest.agent}`).digest("hex");
  return await withDeploymentLock(runtime.configRoot, localLockKey, async () => {
    let requestedManifest = params.manifest;
    const client = hub.bucket(requestedManifest.bucket);
    const tombstone = await readDeploymentTombstone(client);
    if (tombstone) {
      throw new Error(
        `state bucket ${requestedManifest.bucket} was moved to ${tombstone.movedTo} and cannot be reconciled`,
      );
    }
    const currentIdentity = await readDeploymentIdentity(client);
    const identityMatches =
      currentIdentity?.deploymentId === requestedManifest.deploymentId &&
      currentIdentity.owner === requestedManifest.owner &&
      currentIdentity.agent === requestedManifest.agent &&
      currentIdentity.bucket === requestedManifest.bucket;
    const permittedBucketTransition =
      currentIdentity?.deploymentId === requestedManifest.deploymentId &&
      currentIdentity.owner === requestedManifest.owner &&
      currentIdentity.agent === requestedManifest.agent &&
      currentIdentity.bucket === params.previousIdentityBucket &&
      currentIdentity.bucket !== requestedManifest.bucket;
    if (currentIdentity && !identityMatches && !permittedBucketTransition) {
      throw new Error(`bucket ${requestedManifest.bucket} has a different canonical deployment identity`);
    }
    if (currentIdentity) {
      if (
        requestedManifest.credentialKeySha256 &&
        requestedManifest.credentialKeySha256 !== currentIdentity.credentialKeySha256
      ) {
        throw new Error("local credential key fingerprint does not match canonical deployment identity");
      }
      const verifiedManifest: DeploymentManifest = {
        ...requestedManifest,
        credentialKeySha256: currentIdentity.credentialKeySha256,
      };
      delete verifiedManifest.recoveredWithoutCredentialKey;
      requestedManifest = verifiedManifest;
    }
    if (requestedManifest.credentialKeySha256) {
      await restoreMatchingDeploymentCredentialKey(
        runtime,
        requestedManifest.agent,
        requestedManifest.credentialKeySha256,
        params.credentialKey,
        (Boolean(currentIdentity) && !params.initialIdentityClaimed) || !params.credentialKey,
      );
    } else {
      const secrets = await ensureDeploymentCredentialKey(runtime, requestedManifest.agent);
      requestedManifest = {
        ...requestedManifest,
        credentialKeySha256: createHash("sha256")
          .update(requiredSecret(secrets, "MLCLAW_CREDENTIAL_KEY"))
          .digest("hex"),
      };
    }
    const currentDesired = await readDesiredState(client);
    if (currentDesired && currentDesired.deploymentId !== requestedManifest.deploymentId) {
      throw new Error(`bucket ${requestedManifest.bucket} desired state belongs to another deployment`);
    }
    const visibility = params.visibility ?? requestedManifest.spaceVisibility ?? "private";
    const candidate = deploymentDesiredState(requestedManifest, visibility);
    const sameDesired =
      currentDesired &&
      JSON.stringify({ ...currentDesired, generation: 0, updatedAt: "" }) ===
        JSON.stringify({ ...candidate, generation: 0, updatedAt: "" });
    if (currentDesired && currentDesired.generation > requestedManifest.desiredGeneration && !sameDesired) {
      throw new Error(
        `canonical desired state generation ${currentDesired.generation} is newer than local generation ${requestedManifest.desiredGeneration}; recover the deployment before applying changes`,
      );
    }
    const interruptedOperation =
      !sameDesired && requestedManifest.desiredGeneration > (currentDesired?.generation ?? -1)
        ? await readResumableOperation(
            runtime.configRoot,
            requestedManifest.deploymentId,
            requestedManifest.desiredGeneration,
          )
        : null;
    const generation = sameDesired
      ? currentDesired.generation
      : (interruptedOperation?.targetGeneration ??
        Math.max(currentDesired?.generation ?? 0, requestedManifest.desiredGeneration) + 1);
    let manifest: DeploymentManifest = {
      ...requestedManifest,
      spaceVisibility: visibility,
      desiredGeneration: generation,
      updatedAt: runtime.now().toISOString(),
    };
    let operation =
      interruptedOperation ??
      (await readResumableOperation(runtime.configRoot, manifest.deploymentId, manifest.desiredGeneration)) ??
      newOperation(manifest, runtime.now());
    const control = currentIdentity
      ? await hub.deploymentControlStore(requestedManifest.owner, requestedManifest.deploymentId)
      : await hub.deploymentClaimStore(requestedManifest.owner);
    let lease = await acquireControlLease(control, manifest, operation, runtime.now());
    let renewalError: unknown;
    let renewal = Promise.resolve();
    const renewalTimer = setInterval(() => {
      renewal = renewal.then(async () => {
        if (renewalError) return;
        try {
          lease = await renewControlLease(control, lease, runtime.now());
        } catch (error) {
          renewalError = error;
        }
      });
    }, 45_000);
    const assertLease = async (): Promise<void> => {
      await renewal;
      if (renewalError) throw renewalError;
      await assertControlLease(control, lease, runtime.now());
      if (renewalError) throw renewalError;
    };
    try {
      const [claimedTombstone, claimedIdentity, claimedDesired] = await Promise.all([
        readDeploymentTombstone(client),
        readDeploymentIdentity(client),
        readDesiredState(client),
      ]);
      if (
        JSON.stringify(claimedTombstone) !== JSON.stringify(tombstone) ||
        JSON.stringify(claimedIdentity) !== JSON.stringify(currentIdentity) ||
        JSON.stringify(claimedDesired) !== JSON.stringify(currentDesired)
      ) {
        throw new Error("canonical deployment state changed while acquiring control; rerun the command");
      }
      await writeOperationState("planned");
      await writeOperationState("applying");
      await assertLease();
      const outcome = await params.apply({ manifest, changed: !sameDesired, assertLease });
      await assertLease();
      if (!sameDesired || !identityMatches) {
        await writeCanonicalState(
          client,
          identityMatches ? currentIdentity : deploymentIdentity(manifest, params.bucketPrefix),
          deploymentDesiredState(manifest, visibility),
        );
        await assertLease();
      }
      if (outcome?.waitingForApproval) {
        await writeOperationState("waiting_for_approval", "Tailscale Serve administrator approval is required");
        runtime.prompt.note(outcome.waitingForApproval, "TAILSCALE SERVE APPROVAL REQUIRED");
        return { manifest, waitingForApproval: outcome.waitingForApproval };
      }
      await writeOperationState("verifying");
      await assertLease();
      const verified = await readDesiredState(client);
      if (verified?.deploymentId !== manifest.deploymentId || verified.generation !== generation) {
        throw new Error("canonical deployment state could not be verified after reconciliation");
      }
      if (params.finalize) {
        await assertLease();
        manifest = (await params.finalize({ manifest, assertLease })) ?? manifest;
        await assertLease();
      }
      await writeOperationState("completed");
      return { manifest };
    } catch (error) {
      await writeOperationState("failed", "Reconciliation failed; inspect local CLI diagnostics").catch(
        () => undefined,
      );
      throw error;
    } finally {
      clearInterval(renewalTimer);
      await renewal;
      await releaseControlLease(control, lease);
    }

    async function writeOperationState(state: Parameters<typeof updateOperation>[3], detail?: string): Promise<void> {
      operation = await updateOperation(
        runtime.configRoot,
        client,
        operation,
        state,
        runtime.now(),
        ...(detail ? [detail] : []),
      );
    }
  });
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
  hfIdentity: HubIdentity;
  providedBrokerHfToken?: string;
  brokerCredentialReviewed?: boolean;
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
    hfIdentity,
    providedBrokerHfToken,
    brokerCredentialReviewed,
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
  const effectiveBrokerHfToken = await resolveBrokerHfToken({
    opts,
    owner,
    hfToken,
    hfIdentity,
    ...(providedBrokerHfToken ? { preferredToken: providedBrokerHfToken } : {}),
    skipReview: Boolean(brokerCredentialReviewed),
    existingSecrets,
    runtime,
  });
  const sessionSecret = existingSecrets.MLCLAW_SESSION_SECRET ?? randomBytes(48).toString("base64url");
  const restoredCredentialKey = existingSecrets.MLCLAW_CREDENTIAL_KEY ?? runtime.env.MLCLAW_CREDENTIAL_KEY;
  if (existingManifest?.recoveredWithoutCredentialKey && !restoredCredentialKey) {
    throw new Error(
      "recovered deployment requires its existing MLCLAW_CREDENTIAL_KEY; restore it in the environment and rerun bootstrap",
    );
  }
  const credentialKey = restoredCredentialKey ?? randomBytes(32).toString("base64url");
  const credentialKeySha256 = createHash("sha256").update(credentialKey).digest("hex");
  if (existingManifest?.credentialKeySha256 && existingManifest.credentialKeySha256 !== credentialKeySha256) {
    throw new Error("MLCLAW_CREDENTIAL_KEY does not match the recovered deployment");
  }
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
  if (existingManifest && bucket !== existingManifest.bucket) {
    throw new Error(
      `bootstrap cannot move state from ${existingManifest.bucket} to ${bucket}; use mlclaw state adopt ${agentName} --bucket ${bucket}`,
    );
  }
  const routerToken = await resolveRouterToken({
    opts,
    runtime,
    existingSecrets,
    model,
  });
  let spacePlan: BootstrapSpacePlan | undefined;
  if (gatewayLocation === "space") {
    const exists = await hub.spaceExists(names.space);
    const currentVisibility = exists ? await hub.getSpaceVisibility(names.space) : undefined;
    spacePlan = {
      space: names.space,
      exists,
      visibility: opts.publicSpace ? "public" : (existingManifest?.spaceVisibility ?? currentVisibility ?? "private"),
      ...(currentVisibility ? { currentVisibility } : {}),
    };
  }

  const effectiveModel = opts.model ?? existingManifest?.model ?? model;
  const effectiveRuntimeImage = opts.runtimeImage ? runtimeImage : (existingManifest?.runtimeImage ?? runtimeImage);
  const manifest: DeploymentManifest = {
    version: 2,
    deploymentId: existingManifest?.deploymentId ?? randomUUID(),
    desiredGeneration: existingManifest?.desiredGeneration ?? 0,
    agent: agentName,
    owner,
    bucket,
    space: names.space,
    localRuntimeId,
    gatewayLocation,
    model: effectiveModel,
    runtimeImage: effectiveRuntimeImage,
    credentialKeySha256,
    ...(existingManifest?.tailscaleMode ? { tailscaleMode: existingManifest.tailscaleMode } : {}),
    ...(existingManifest?.spaceVisibility ? { spaceVisibility: existingManifest.spaceVisibility } : {}),
    ...(existingManifest?.spaceHardware ? { spaceHardware: existingManifest.spaceHardware } : {}),
    ...(typeof existingManifest?.spaceSleepTime === "number"
      ? { spaceSleepTime: existingManifest.spaceSleepTime }
      : {}),
    ...(existingManifest?.pendingTombstoneBucket
      ? { pendingTombstoneBucket: existingManifest.pendingTombstoneBucket }
      : {}),
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
  const effectiveTelegramToken = telegramToken ?? existingSecrets.TELEGRAM_BOT_TOKEN;
  const effectiveTelegramUserId = telegramUserId ?? existingSecrets.TELEGRAM_ALLOWED_USERS;
  const effectiveTelegramProxy = opts.telegramProxy ?? existingSecrets.TELEGRAM_PROXY;
  const effectiveTelegramApiRoot = opts.telegramApiRoot ?? existingSecrets.TELEGRAM_API_ROOT;
  const secrets = deploymentSecrets({
    hfToken: effectiveBrokerHfToken,
    ...(effectiveTelegramToken ? { telegramToken: effectiveTelegramToken } : {}),
    ...(effectiveTelegramUserId ? { telegramUserId: effectiveTelegramUserId } : {}),
    sessionSecret,
    credentialKey,
    owner,
    bucket,
    model: effectiveModel,
    agentName,
    runtimeImage: effectiveRuntimeImage,
    gatewayLocation,
    localPort,
    runtimeId: gatewayLocation === "local" ? manifest.localRuntimeId : spaceRuntimeId(agentName),
    ...(bucketPrefix ? { bucketPrefix } : {}),
    ...(effectiveTelegramProxy ? { telegramProxy: effectiveTelegramProxy } : {}),
    ...(effectiveTelegramApiRoot ? { telegramApiRoot: effectiveTelegramApiRoot } : {}),
    ...(routerToken ? { routerToken } : {}),
  });
  return {
    agentName,
    names,
    hasExistingManifest: Boolean(existingManifest),
    ...(existingManifest ? { previousManifest: existingManifest } : {}),
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
      throw new Error("Tailscale access only applies to a local gateway");
    }
    return plan;
  }
  const existing = plan.manifest.networkAccess;
  let mode: TailscaleMode | undefined = opts.tailscale ?? plan.manifest.tailscaleMode ?? networkAccessMode(existing);
  let discovery = mode && mode !== "off" ? await runtime.tailscaleRunner.discover() : undefined;
  if (!mode && !opts.yes && runtime.prompt.isInteractive()) {
    discovery = await runtime.tailscaleRunner.discover();
    if (discovery.ready && (await promptConfirm("Make this gateway available on your tailnet?", false, runtime))) {
      mode = parseTailscaleMode(
        await promptSelect(
          "How should tailnet access work?",
          [
            { value: "direct", label: "Direct private link", hint: "No additional setup" },
            { value: "serve", label: "HTTPS with Tailscale Serve", hint: "May require administrator approval" },
          ],
          "direct",
          runtime,
        ),
      );
    } else {
      mode = "off";
    }
  }
  mode ??= "off";
  if (mode === "off") {
    if (opts.tailscalePort !== undefined) throw new Error("--tailscale-port cannot be used with --tailscale=off");
    return withBootstrapNetworkAccess(plan, undefined);
  }
  assertLocalNetworkAccessHost(plan.manifest);
  if (!discovery?.ready) {
    throw new Error(discovery?.reason ?? "Tailscale is unavailable");
  }
  const port = opts.tailscalePort ?? networkAccessPort(existing) ?? localGatewayPort(plan.manifest);
  if (mode === "direct") {
    return withBootstrapNetworkAccess(plan, {
      provider: "tailscale-direct",
      enabled: true,
      ipv4: discovery.ipv4,
      ...(discovery.dnsName ? { dnsName: discovery.dnsName } : {}),
      port,
      accessOrigin: `http://${discovery.ipv4}:${port}`,
    });
  }
  if (!discovery.dnsName) throw new Error("Tailscale MagicDNS is required for Serve mode");
  const mapping: TailscaleServeMapping = {
    dnsName: discovery.dnsName,
    httpsPort: port,
    target: localGatewayUrl(plan.manifest),
  };
  const state = await runtime.tailscaleRunner.mappingState(mapping);
  if (state === "conflict") {
    throw new Error(`Tailscale Serve HTTPS port ${port} is already in use; choose --tailscale-port`);
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
  const { networkAccess: _previous, ...base } = plan.manifest;
  const manifest: DeploymentManifest = {
    ...base,
    tailscaleMode: networkAccessMode(networkAccess) ?? "off",
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
  previousManifest?: DeploymentManifest;
  bucketPlan: BootstrapBucketPlan;
  spacePlan?: BootstrapSpacePlan;
  hasExistingManifest: boolean;
  hardware: string;
  sleepTime?: number;
  yes: boolean;
  runtime: Required<CliRuntime>;
}): Promise<void> {
  if (params.previousManifest) {
    const changes = deploymentChanges(params.previousManifest, params.manifest);
    params.runtime.prompt.note(
      [
        `Existing deployment: ${params.manifest.agent}`,
        ...(changes.length > 0 ? changes : ["No configuration changes; external state will be verified."]),
      ].join("\n"),
      "Bootstrap changes",
    );
    if (params.yes) return;
    if (!params.runtime.prompt.isInteractive()) {
      throw new Error("bootstrap confirmation required. Pass --yes to continue non-interactively.");
    }
    const confirmed = await promptConfirm(
      changes.length > 0 ? "Apply these changes?" : "Verify this deployment?",
      true,
      params.runtime,
    );
    if (!confirmed) throw new Error("bootstrap was not confirmed");
    return;
  }
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

function deploymentChanges(previous: DeploymentManifest, next: DeploymentManifest): string[] {
  const changes: string[] = [];
  add("Gateway", previous.gatewayLocation, next.gatewayLocation);
  add("Bucket", previous.bucket, next.bucket);
  add("Model", previous.model, next.model);
  add("Runtime image", previous.runtimeImage, next.runtimeImage);
  add("Gateway port", String(localGatewayPort(previous)), String(localGatewayPort(next)));
  add(
    "Tailnet access",
    networkAccessMode(previous.networkAccess) ?? "off",
    networkAccessMode(next.networkAccess) ?? "off",
  );
  return changes;

  function add(label: string, before: string, after: string): void {
    if (before !== after) changes.push(`${label}: ${before} -> ${after}`);
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
  hfIdentity: HubIdentity;
  brokerHfToken: string;
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
      hfIdentity: params.hfIdentity,
      providedBrokerHfToken: params.brokerHfToken,
      brokerCredentialReviewed: true,
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
    ...(localPlan.previousManifest ? { previousManifest: localPlan.previousManifest } : {}),
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
  const resumingBucketChange = !bucketChanged && Boolean(current.pendingTombstoneBucket);
  if (bucketChanged && current.pendingTombstoneBucket) {
    throw new Error(
      `finish tombstoning ${current.pendingTombstoneBucket} by adopting ${current.bucket} again before moving state`,
    );
  }
  if (bucketChanged && current.gatewayLocation === "local") {
    assertDedicatedRouterToken(current.model, secrets);
  }

  runtime.stdout.log(`Creating or adopting private bucket ${bucket}`);
  await hub.createBucket(bucket, true);
  const targetTombstone = await readDeploymentTombstone(hub.bucket(bucket));
  if (targetTombstone) {
    throw new Error(`state bucket ${bucket} was moved to ${targetTombstone.movedTo} and cannot be adopted again`);
  }
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

  let updated: DeploymentManifest = {
    ...current,
    bucket,
    ...(bucketChanged ? { pendingTombstoneBucket: current.bucket } : {}),
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
  const reconciled = await reconcileManifest({
    manifest: updated,
    bucketPrefix,
    ...(updated.pendingTombstoneBucket ? { previousIdentityBucket: updated.pendingTombstoneBucket } : {}),
    hub,
    runtime,
    apply: async ({ manifest: targetManifest, assertLease }) => {
      updated = targetManifest;
      if (bucketChanged) {
        await assertLease();
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

      await assertLease();
      await writeLocalDeployment(runtime.configRoot, updated, updatedSecrets);
      if (updated.gatewayLocation === "local") {
        if (bucketChanged || resumingBucketChange) {
          await assertLease();
          await startLocalGateway({
            manifest: updated,
            runtime,
            pull: shouldPull(opts),
            resetVolume: true,
            assertLease,
          });
        } else {
          runtime.stdout.log(`Deployment already uses bucket ${bucket}`);
        }
        return;
      }

      await assertLease();
      await setDeploymentVariables(
        hub,
        updated.space,
        {
          OPENCLAW_HF_STATE_BUCKET: bucket,
          MLCLAW_STATE_MOUNT_DIR: SPACE_STATE_MOUNT_DIR,
          OPENCLAW_LIVE_DIR: SPACE_LIVE_DIR,
          MLCLAW_RUNTIME_SETTINGS_FILE: `${SPACE_LIVE_DIR}/.mlclaw/settings.json`,
          MLCLAW_GATEWAY_LOCATION: "space",
          MLCLAW_RUNTIME_ID: spaceRuntimeId(updated.agent),
        },
        assertLease,
      );
      await ensureSpaceStateVolume(hub, updated.space, bucket, { assertMutation: assertLease });
      if (
        canDeleteBroadTokenSecrets({
          model: updated.model,
          routerTokenPresent: hasBrokerOrRouterTokenSecretRecord(secrets),
        })
      ) {
        await deleteStaleSpaceTokenSecrets(hub, updated.space, assertLease);
      }
      await clearSpaceGatewayDisabled(hub, updated.space);
      if (bucketChanged || resumingBucketChange) {
        await assertLease();
        await hub.restartSpace(updated.space, true);
        runtime.stdout.log(`Space gateway restart requested: ${updated.space}`);
      } else {
        runtime.stdout.log(`Deployment already uses bucket ${bucket}`);
      }
    },
    finalize: async ({ manifest, assertLease }) => {
      if (!manifest.pendingTombstoneBucket) return;
      await assertLease();
      await writeDeploymentTombstone(
        hub.bucket(manifest.pendingTombstoneBucket),
        current.deploymentId,
        bucket,
        runtime.now(),
      );
      const { pendingTombstoneBucket: _completed, ...completed } = manifest;
      await assertLease();
      await writeManifest(runtime.configRoot, completed);
      return completed;
    },
  });
  updated = reconciled.manifest;
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
  const payloadEntries = fileEntries.filter((entry) => !entry.path.startsWith(".mlclaw/"));
  const stateEntries = payloadEntries.filter(
    (entry) =>
      entry.path === manifestPath ||
      entry.path.startsWith(`${prefixWithSlash}snapshots/`) ||
      entry.path.startsWith(`${prefixWithSlash}runtime/`),
  );

  if (payloadEntries.length > 0 && stateEntries.length === 0) {
    throw new Error(`bucket ${bucket} contains objects but no ML Claw state under ${prefix}`);
  }

  const hasSnapshotManifest = stateEntries.some((entry) => entry.path === manifestPath);
  if (hasSnapshotManifest) {
    const blob = await client.downloadFile(manifestPath);
    if (!blob) {
      throw new Error(`bucket ${bucket} listed ${manifestPath}, but it could not be downloaded`);
    }
    const currentSnapshotPath = parseCurrentSnapshotPath(await blob.text(), bucket, manifestPath);
    const filePaths = new Set(payloadEntries.map((entry) => entry.path));
    if (!filePaths.has(currentSnapshotPath)) {
      throw new Error(`bucket ${bucket} state manifest points to missing snapshot ${currentSnapshotPath}`);
    }
  }

  return {
    objectCount: payloadEntries.length,
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
      ...(networkAccess?.enabled && !networkAccessPendingApproval(networkAccess) ? [networkAccess.accessOrigin] : []),
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
  desiredChanged = true,
  assertLease: () => Promise<void> = async () => undefined,
): Promise<{ waitingForApproval?: string } | void> {
  const previousManifest = await readManifest(runtime.configRoot, plan.agentName).catch(() => null);
  const previousSecrets = await readSecretEnv(runtime.configRoot, plan.agentName).catch(() => null);
  const previousContainer =
    previousManifest?.gatewayLocation === "local" && previousManifest.localGateway
      ? await localRunnerFor(previousManifest, runtime).inspect(
          containerNameFor(previousManifest.agent),
          localConnectionFor(previousManifest),
        )
      : null;
  const runtimeImageDrift = Boolean(previousContainer?.image && previousContainer.image !== plan.manifest.runtimeImage);
  const networkAccessChanged =
    JSON.stringify(previousManifest?.networkAccess) !== JSON.stringify(plan.manifest.networkAccess);
  const previousNetworkState =
    networkAccessChanged && previousManifest?.networkAccess?.provider === "tailscale-serve"
      ? await runtime.tailscaleRunner.mappingState(networkAccessMapping(previousManifest.networkAccess))
      : undefined;

  let startupAttempted = false;
  try {
    if (previousNetworkState === "owned" && previousManifest?.networkAccess) {
      await assertLease();
      await removeOwnedNetworkAccess(previousManifest.networkAccess, runtime);
    }
    await writeSecretEnv(runtime.configRoot, plan.agentName, plan.secrets);
    startupAttempted = true;
    await assertLease();
    await startLocalGateway({
      manifest: plan.manifest,
      runtime,
      pull: shouldPull(opts),
      refresh: desiredChanged || runtimeImageDrift || JSON.stringify(previousSecrets) !== JSON.stringify(plan.secrets),
      existing: previousContainer,
      assertLease,
    });
    await assertLease();
    await writeManifest(runtime.configRoot, plan.manifest);
  } catch (error) {
    if (
      error instanceof TailscaleApprovalRequiredError &&
      plan.manifest.networkAccess?.provider === "tailscale-serve"
    ) {
      plan.manifest = {
        ...plan.manifest,
        networkAccess: { ...plan.manifest.networkAccess, pendingApproval: true },
      };
      plan.secrets = {
        ...plan.secrets,
        ...localAccessSecrets(
          plan.manifest.owner,
          localGatewayPort(plan.manifest),
          plan.secrets,
          plan.manifest.networkAccess,
        ),
      };
      plan.waitingForApprovalUrl = error.approvalUrl;
      await assertLease();
      await writeSecretEnv(runtime.configRoot, plan.agentName, plan.secrets);
      await writeManifest(runtime.configRoot, plan.manifest);
      return { waitingForApproval: error.approvalUrl };
    }
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

function spaceGatewayNeedsRepair(
  manifest: DeploymentManifest,
  variables: Map<string, { value?: string }>,
  runtime: SpaceRuntime,
  allowedUsers: string,
): boolean {
  const expected = {
    OPENCLAW_HF_STATE_BUCKET: manifest.bucket,
    MLCLAW_STATE_MOUNT_DIR: SPACE_STATE_MOUNT_DIR,
    OPENCLAW_LIVE_DIR: SPACE_LIVE_DIR,
    MLCLAW_RUNTIME_SETTINGS_FILE: `${SPACE_LIVE_DIR}/.mlclaw/settings.json`,
    OPENCLAW_MODEL: manifest.model,
    OPENCLAW_AGENT_NAME: manifest.agent,
    MLCLAW_GATEWAY_LOCATION: "space",
    MLCLAW_RUNTIME_IMAGE: manifest.runtimeImage,
    MLCLAW_RUNTIME_ID: spaceRuntimeId(manifest.agent),
    MLCLAW_ALLOWED_USERS: allowedUsers,
    MLCLAW_ADMINS: allowedUsers,
    MLCLAW_CANONICAL_SPACE_ID: DEFAULT_CANONICAL_TEMPLATE_SPACE,
    MLCLAW_OPENCLAW_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    OPENCLAW_GATEWAY_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
  };
  return (
    !variables.has("MLCLAW_TEMPLATE_REV") ||
    Object.entries(expected).some(([key, value]) => variables.get(key)?.value !== value) ||
    !hasStateVolume(runtime.volumes, manifest.bucket)
  );
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
  assertLease?: () => Promise<void>;
}): Promise<{ runtimeImage: string }> {
  const { hub, runtime, hfToken, manifest, secrets } = params;
  const assertLease = params.assertLease ?? (async () => undefined);
  if (!params.spacePrepared) {
    runtime.stdout.log(
      params.spaceExists
        ? `Updating existing Space ${manifest.space}`
        : `Creating ${params.publicSpace ? "public" : "private"} Space ${manifest.space}`,
    );
    await assertLease();
    await hub.createDockerSpace(manifest.space, {
      private: !params.publicSpace,
      ...(params.hardware && !params.spaceExists ? { hardware: params.hardware } : {}),
      ...(typeof params.sleepTime === "number" ? { sleepTimeSeconds: params.sleepTime } : {}),
    });
  }
  if (params.hardware && params.spaceExists) {
    await assertLease();
    await hub.requestSpaceHardware(manifest.space, params.hardware, params.sleepTime);
  } else if (!params.hardware && params.spaceExists && typeof params.sleepTime === "number") {
    await assertLease();
    await hub.setSpaceSleepTime(manifest.space, params.sleepTime);
  }
  runtime.stdout.log(
    params.templateRuntimeImage
      ? "Generating Space files from prebuilt runtime image"
      : "Generating bundled Space runtime files",
  );
  await assertLease();
  const { templateRev } = await runtime.pushTemplateToSpace({
    targetRepo: manifest.space,
    token: hfToken,
    ...(params.templateRuntimeImage ? { runtimeImage: params.templateRuntimeImage } : {}),
  });
  const spaceRuntimeRef = params.templateRuntimeImage ?? bundledSpaceRuntimeRef(templateRev);

  await assertLease();
  await setDeploymentVariables(
    hub,
    manifest.space,
    {
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
      MLCLAW_CANONICAL_SPACE_ID: DEFAULT_CANONICAL_TEMPLATE_SPACE,
      MLCLAW_OPENCLAW_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
      OPENCLAW_GATEWAY_PORT: String(DEFAULT_SPACE_OPENCLAW_PORT),
    },
    assertLease,
  );
  await assertLease();
  await ensureSpaceStateVolume(hub, manifest.space, manifest.bucket, {
    allowMissingVolumes: !params.spaceExists,
    assertMutation: assertLease,
  });
  await assertLease();
  await clearSpaceGatewayDisabled(hub, manifest.space);
  await assertLease();
  await setSpaceGatewaySecrets(hub, manifest.space, hfToken, secrets, assertLease);
  if (
    canDeleteBroadTokenSecrets({
      model: manifest.model,
      routerTokenPresent: hasBrokerOrRouterTokenSecretRecord(secrets),
    })
  ) {
    await assertLease();
    await deleteStaleSpaceTokenSecrets(hub, manifest.space, assertLease);
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
  assertLease?: () => Promise<void>;
}): Promise<void> {
  const { manifest, runtime } = params;
  const assertLease = params.assertLease ?? (async () => undefined);
  await refreshDirectNetworkAccess(manifest, runtime);
  if (manifest.networkAccess?.enabled) {
    assertLocalNetworkAccessHost(manifest);
  }
  let secrets = await ensureDeploymentCredentialKey(runtime, manifest.agent);
  if (!secrets.MLCLAW_SESSION_SECRET) {
    secrets = { ...secrets, MLCLAW_SESSION_SECRET: randomBytes(48).toString("base64url") };
    await writeSecretEnv(runtime.configRoot, manifest.agent, secrets);
  }
  const accessSecrets = localAccessSecrets(manifest.owner, localGatewayPort(manifest), secrets, manifest.networkAccess);
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
      await assertLease();
      await syncNetworkAccess(manifest, runtime);
      runtime.stdout.log(`Local gateway already running: ${containerName}`);
      logLocalGatewayUrls(manifest, secrets, runtime);
      return;
    }
  }
  if (params.pull) {
    await assertLease();
    await runner.pull(manifest.runtimeImage, connection);
  }
  if (existing?.running) {
    await assertLease();
    await runner.stop(containerName, connection);
    runtime.stdout.log(`Local gateway stopped for config refresh: ${containerName}`);
  }
  if (existing) {
    await assertLease();
    await runner.rm(containerName, connection);
    runtime.stdout.log(`Local gateway removed for config refresh: ${containerName}`);
  }
  if (params.resetVolume) {
    await assertLease();
    await runner.rmVolume(volumeName, connection);
    runtime.stdout.log(`Local gateway volume reset for bucket restore: ${volumeName}`);
  }
  await assertLease();
  await runner.run({
    containerName,
    image: manifest.runtimeImage,
    envFile: secretEnvPath(runtime.configRoot, manifest.agent),
    volumeName,
    volumeMountPath: LOCAL_VOLUME_MOUNT_PATH,
    liveDir: LOCAL_LIVE_DIR,
    publishedPorts: publishedGatewayPorts(manifest),
    ...(connection ? { context: connection } : {}),
  });
  await runtime.sleep(LOCAL_START_SETTLE_MS);
  const started = await runner.inspect(containerName, connection);
  if (!started?.running) {
    throw new Error(`local gateway exited during startup. Inspect it with \`mlclaw gateway logs ${manifest.agent}\``);
  }
  await assertLease();
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
  const reconciled = await reconcileManifest({
    manifest,
    bucketPrefix,
    hub,
    runtime,
    apply: async ({ manifest: targetManifest, assertLease }) => {
      manifest = targetManifest;
      if (manifest.gatewayLocation === "local") {
        const previousSecrets = await readSecretEnv(runtime.configRoot, manifest.agent);
        const accessSecrets = localAccessSecrets(
          manifest.owner,
          localGatewayPort(manifest),
          previousSecrets,
          manifest.networkAccess,
        );
        const accessSecretsChanged = Object.entries(accessSecrets).some(
          ([key, value]) => previousSecrets[key] !== value,
        );
        const networkAccessChanged =
          JSON.stringify(previousManifest.networkAccess) !== JSON.stringify(manifest.networkAccess);
        const refresh = Boolean(opts.restart || localPortChanged || accessSecretsChanged || networkAccessChanged);
        const previousContainer = refresh
          ? await localRunnerFor(previousManifest, runtime).inspect(
              containerNameFor(previousManifest.agent),
              localConnectionFor(previousManifest),
            )
          : undefined;
        const previousNetworkState =
          networkAccessChanged && previousManifest.networkAccess?.provider === "tailscale-serve"
            ? await runtime.tailscaleRunner.mappingState(networkAccessMapping(previousManifest.networkAccess))
            : undefined;
        try {
          if (networkAccessChanged && previousNetworkState === "owned" && previousManifest.networkAccess) {
            await assertLease();
            await removeOwnedNetworkAccess(previousManifest.networkAccess, runtime);
          }
          if (accessSecretsChanged) {
            await assertLease();
            await writeSecretEnv(runtime.configRoot, manifest.agent, { ...previousSecrets, ...accessSecrets });
          }
          await assertLease();
          await startLocalGateway({
            manifest,
            runtime,
            pull: shouldPull(opts),
            refresh,
            assertLease,
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
              await assertLease();
              await startLocalGateway({
                manifest: previousManifest,
                runtime,
                pull: false,
                refresh: true,
                assertLease,
              });
              runtime.stdout.log(`Previous local gateway restored: ${containerNameFor(previousManifest.agent)}`);
            } else if (previousContainer) {
              await assertLease();
              await startLocalGateway({ manifest: previousManifest, runtime, pull: false, refresh: true, assertLease });
              await localRunnerFor(previousManifest, runtime).stop(
                containerNameFor(previousManifest.agent),
                localConnectionFor(previousManifest),
              );
              runtime.stdout.log(
                `Previous stopped local gateway restored: ${containerNameFor(previousManifest.agent)}`,
              );
            } else {
              await removeFailedBootstrapContainer(manifest, runtime, false);
            }
            if (previousNetworkState === "owned" && previousManifest.networkAccess) {
              await runtime.tailscaleRunner.ensureMapping(networkAccessMapping(previousManifest.networkAccess));
            }
          } catch (rollbackError) {
            throw new AggregateError([error, rollbackError], "local gateway update and rollback both failed");
          }
          throw error;
        }
        await writeManifest(runtime.configRoot, manifest);
      } else {
        await assertLease();
        await clearSpaceGatewayDisabled(hub, manifest.space);
        await assertLease();
        await hub.restartSpace(manifest.space, true);
        runtime.stdout.log(`Space gateway restart requested: ${manifest.space}`);
      }
    },
  });
  manifest = reconciled.manifest;
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
  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  await reconcileManifest({
    manifest,
    bucketPrefix,
    hub,
    runtime,
    apply: async ({ manifest: targetManifest, assertLease }) => {
      await assertLease();
      if (targetManifest.gatewayLocation === "local") {
        await stopLocalGateway(targetManifest, runtime);
        return;
      }
      await disableAndPauseSpaceGateway({ manifest: targetManifest, hub, runtime, bucketPrefix });
    },
  });
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
    if (manifest.networkAccess?.enabled && !networkAccessPendingApproval(manifest.networkAccess)) {
      runtime.stdout.log(`Tailnet URL: ${networkAccessUrl(manifest.networkAccess, manifest.agent, secrets)}`);
      if (manifest.networkAccess.provider === "tailscale-direct") {
        runtime.stdout.log(`Tailscale direct: ${manifest.networkAccess.ipv4}:${manifest.networkAccess.port}`);
      } else {
        try {
          runtime.stdout.log(
            `Tailscale Serve: ${await runtime.tailscaleRunner.mappingState(networkAccessMapping(manifest.networkAccess))}`,
          );
        } catch (error) {
          runtime.stdout.log(
            `Tailscale Serve: unavailable (${error instanceof Error ? error.message : String(error)})`,
          );
        }
      }
    } else if (manifest.networkAccess && networkAccessPendingApproval(manifest.networkAccess)) {
      runtime.stdout.log("Tailscale Serve: pending administrator approval");
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
    updated = {
      ...updated,
      spaceVisibility: opts.publicSpace ? "public" : (current.spaceVisibility ?? "private"),
      ...(paidHardware.kind === "explicit" ? { spaceHardware: paidHardware.hardware } : {}),
      ...(typeof paidHardware.sleepTime === "number" ? { spaceSleepTime: paidHardware.sleepTime } : {}),
    };
    await assertNoLiveForeignLease({
      hub,
      bucket: current.bucket,
      bucketPrefix,
      runtimeId: current.localRuntimeId,
      takeover: Boolean(opts.takeover),
    });
    const me = await hub.whoami();
    const templateRuntimeImage = resolveSpaceRuntimeImage(opts, runtime.env);
    const spaceExists = await hub.spaceExists(updated.space);
    const reconciled = await reconcileManifest({
      manifest: updated,
      bucketPrefix,
      hub,
      runtime,
      apply: async ({ manifest: targetManifest, assertLease }) => {
        updated = targetManifest;
        await assertLease();
        await handoffAndStopLocalGateway({ manifest: current, hub, runtime, bucketPrefix });
        await assertLease();
        await deploySpaceGateway({
          hub,
          runtime,
          hfToken: token,
          manifest: updated,
          secrets: deploymentSecrets,
          allowedUsers: me.name,
          publicSpace: updated.spaceVisibility === "public",
          spaceExists,
          assertLease,
          ...(paidHardware.kind === "explicit" ? { hardware: paidHardware.hardware } : {}),
          ...(typeof paidHardware.sleepTime === "number" ? { sleepTime: paidHardware.sleepTime } : {}),
          ...(templateRuntimeImage ? { templateRuntimeImage } : {}),
        });
        await assertLease();
        await writeSecretEnv(runtime.configRoot, agent, {
          ...deploymentSecrets,
          MLCLAW_GATEWAY_LOCATION: "space",
          MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
          MLCLAW_RUNTIME_ID: spaceRuntimeId(agent),
        });
        await writeManifest(runtime.configRoot, updated);
      },
    });
    updated = reconciled.manifest;
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
    const reconciled = await reconcileManifest({
      manifest: updated,
      bucketPrefix,
      hub,
      runtime,
      apply: async ({ manifest: targetManifest, assertLease }) => {
        updated = targetManifest;
        await assertLease();
        await disableAndPauseSpaceGateway({ manifest: current, hub, runtime, bucketPrefix });
        await assertLease();
        await assertNoLiveForeignLease({
          hub,
          bucket: current.bucket,
          bucketPrefix,
          runtimeId: updated.localRuntimeId,
          allowedRuntimeIds: [spaceRuntimeId(current.agent)],
          takeover: Boolean(opts.takeover),
        });
        await assertLease();
        await writeSecretEnv(runtime.configRoot, agent, {
          ...secrets,
          ...(routerToken ? { MLCLAW_ROUTER_TOKEN: routerToken } : {}),
          MLCLAW_GATEWAY_LOCATION: "local",
          MLCLAW_RUNTIME_IMAGE: updated.runtimeImage,
          MLCLAW_RUNTIME_ID: updated.localRuntimeId,
          ...localAccessSecrets(updated.owner, localGatewayPort(updated), secrets, updated.networkAccess),
        });
        await assertLease();
        await startLocalGateway({
          manifest: updated,
          runtime,
          pull: shouldPull(opts),
          resetVolume: true,
          assertLease,
        });
        await writeManifest(runtime.configRoot, updated);
      },
    });
    updated = reconciled.manifest;
  }
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

  const updated: DeploymentManifest = {
    ...current,
    localGateway: targetBinding,
    updatedAt: runtime.now().toISOString(),
  };
  if (updated.networkAccess?.enabled) {
    assertLocalNetworkAccessHost(updated);
  }

  const token = await runtime.readToken(runtime.env);
  const hub = runtime.hubFactory(token);
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, agent);
  await reconcileManifest({
    manifest: updated,
    bucketPrefix,
    hub,
    runtime,
    apply: async ({ manifest: targetManifest, assertLease }) => {
      if (currentContext && (await runtime.dockerRunner.contextExists(currentContext))) {
        try {
          await assertLease();
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
          await assertLease();
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

      await assertLease();
      await startLocalGateway({
        manifest: targetManifest,
        runtime,
        pull: shouldPull(opts),
        resetVolume: true,
        assertLease,
      });
      await writeManifest(runtime.configRoot, targetManifest);
    },
  });
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

function publishedGatewayPorts(manifest: DeploymentManifest): Array<{
  hostAddress: string;
  hostPort: number;
  containerPort: number;
}> {
  const port = localGatewayPort(manifest);
  return [
    { hostAddress: "127.0.0.1", hostPort: port, containerPort: DEFAULT_LOCAL_PORT },
    ...(manifest.networkAccess?.provider === "tailscale-direct" && manifest.networkAccess.enabled
      ? [
          {
            hostAddress: manifest.networkAccess.ipv4,
            hostPort: manifest.networkAccess.port,
            containerPort: DEFAULT_LOCAL_PORT,
          },
        ]
      : []),
  ];
}

function networkAccessMode(binding: NetworkAccessBinding | undefined): TailscaleMode | undefined {
  if (!binding?.enabled) return undefined;
  return binding.provider === "tailscale-direct" ? "direct" : "serve";
}

function networkAccessPendingApproval(binding: NetworkAccessBinding): boolean {
  return binding.provider === "tailscale-serve" && binding.pendingApproval === true;
}

async function refreshDirectNetworkAccess(manifest: DeploymentManifest, runtime: Required<CliRuntime>): Promise<void> {
  const binding = manifest.networkAccess;
  if (binding?.provider !== "tailscale-direct" || !binding.enabled) return;
  assertLocalNetworkAccessHost(manifest);
  const discovery = await runtime.tailscaleRunner.discover();
  if (!discovery.ready) throw new Error(discovery.reason);
  manifest.networkAccess = {
    provider: "tailscale-direct",
    enabled: true,
    ipv4: discovery.ipv4,
    ...(discovery.dnsName ? { dnsName: discovery.dnsName } : {}),
    port: binding.port,
    accessOrigin: `http://${discovery.ipv4}:${binding.port}`,
  };
}

function networkAccessPort(binding: NetworkAccessBinding | undefined): number | undefined {
  if (!binding) return undefined;
  return binding.provider === "tailscale-direct" ? binding.port : binding.httpsPort;
}

function localGatewayUrl(manifest: DeploymentManifest): string {
  return `http://127.0.0.1:${localGatewayPort(manifest)}`;
}

function localGatewayAccessUrl(manifest: DeploymentManifest, secrets: Record<string, string>): string {
  return localAccessUrl(localGatewayUrl(manifest), manifest.agent, secrets);
}

function networkAccessUrl(networkAccess: NetworkAccessBinding, agent: string, secrets: Record<string, string>): string {
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
  if (manifest.networkAccess?.enabled && !networkAccessPendingApproval(manifest.networkAccess)) {
    runtime.stdout.log(`Tailnet URL: ${networkAccessUrl(manifest.networkAccess, manifest.agent, secrets)}`);
  }
}

function localGatewayAccessSummary(manifest: DeploymentManifest, secrets: Record<string, string>): string {
  const lines = ["Open the gateway on this machine:", "", localGatewayAccessUrl(manifest, secrets)];
  if (manifest.networkAccess?.enabled && !networkAccessPendingApproval(manifest.networkAccess)) {
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
  if (binding.provider !== "tailscale-serve") throw new Error("direct tailnet access has no Serve mapping");
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
  if (binding.provider === "tailscale-direct") {
    runtime.stdout.log(`Tailscale direct listener ready: ${binding.accessOrigin}`);
    return;
  }
  const result = await runtime.tailscaleRunner.ensureMapping(networkAccessMapping(binding));
  if (binding.pendingApproval) {
    delete binding.pendingApproval;
    await writeManifest(runtime.configRoot, manifest);
  }
  runtime.stdout.log(`Tailscale Serve ${result}: ${binding.accessOrigin}`);
}

async function disableNetworkAccess(manifest: DeploymentManifest, runtime: Required<CliRuntime>): Promise<void> {
  const binding = manifest.networkAccess;
  if (!binding || binding.provider === "tailscale-direct") {
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

async function removeOwnedNetworkAccess(binding: NetworkAccessBinding, runtime: Required<CliRuntime>): Promise<void> {
  if (binding.provider === "tailscale-direct") return;
  const result = await runtime.tailscaleRunner.removeMapping(networkAccessMapping(binding));
  if (result !== "removed" && result !== "missing") {
    throw new Error(`Tailscale Serve mapping changed on HTTPS port ${binding.httpsPort}; preserving the live handler`);
  }
}

async function resolveGatewayNetworkAccess(
  manifest: DeploymentManifest,
  opts: Pick<GatewayCommandOptions, "tailscale" | "tailscalePort">,
  runtime: Required<CliRuntime>,
): Promise<DeploymentManifest> {
  const existing = manifest.networkAccess;
  if (
    opts.tailscale === undefined &&
    opts.tailscalePort === undefined &&
    !existing?.enabled &&
    (!manifest.tailscaleMode || manifest.tailscaleMode === "off")
  ) {
    return manifest;
  }
  const mode = opts.tailscale ?? manifest.tailscaleMode ?? networkAccessMode(existing) ?? "off";
  if (mode === "off") {
    if (opts.tailscalePort !== undefined) throw new Error("--tailscale-port cannot be used with --tailscale=off");
    const { networkAccess: _removed, ...base } = manifest;
    return { ...base, tailscaleMode: "off", updatedAt: runtime.now().toISOString() };
  }
  assertLocalNetworkAccessHost(manifest);
  const discovery = await runtime.tailscaleRunner.discover();
  if (!discovery.ready) {
    throw new Error(discovery.reason);
  }
  const port = opts.tailscalePort ?? networkAccessPort(existing) ?? localGatewayPort(manifest);
  if (mode === "direct") {
    return {
      ...manifest,
      tailscaleMode: "direct",
      networkAccess: {
        provider: "tailscale-direct",
        enabled: true,
        ipv4: discovery.ipv4,
        ...(discovery.dnsName ? { dnsName: discovery.dnsName } : {}),
        port,
        accessOrigin: `http://${discovery.ipv4}:${port}`,
      },
      updatedAt: runtime.now().toISOString(),
    };
  }
  if (!discovery.dnsName) throw new Error("Tailscale MagicDNS is required for Serve mode");
  const mapping: TailscaleServeMapping = {
    dnsName: discovery.dnsName,
    httpsPort: port,
    target: localGatewayUrl(manifest),
  };
  const state = await runtime.tailscaleRunner.mappingState(mapping);
  if (state === "conflict") {
    throw new Error(`Tailscale Serve HTTPS port ${port} is already in use; choose --tailscale-port`);
  }
  return {
    ...manifest,
    tailscaleMode: "serve",
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
  if (endpoint && !endpoint.startsWith("unix:") && !endpoint.startsWith("npipe:") && !endpointIsLoopback(endpoint)) {
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
  const secrets: Record<string, string> = await readSecretEnv(runtime.configRoot, agent).catch(() => ({}));
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

async function restoreMatchingDeploymentCredentialKey(
  runtime: Required<CliRuntime>,
  agent: string,
  expectedSha256: string,
  suppliedCredentialKey?: string,
  persist = true,
): Promise<void> {
  const secrets: Record<string, string> = await readSecretEnv(runtime.configRoot, agent).catch(() => ({}));
  const candidates = [suppliedCredentialKey, runtime.env.MLCLAW_CREDENTIAL_KEY, secrets.MLCLAW_CREDENTIAL_KEY].filter(
    (value): value is string => Boolean(value),
  );
  const credentialKey = candidates.find((value) => createHash("sha256").update(value).digest("hex") === expectedSha256);
  if (!credentialKey) {
    throw new Error("local MLCLAW_CREDENTIAL_KEY is missing or does not match the canonical deployment identity");
  }
  if (persist && secrets.MLCLAW_CREDENTIAL_KEY !== credentialKey) {
    await writeSecretEnv(runtime.configRoot, agent, { ...secrets, MLCLAW_CREDENTIAL_KEY: credentialKey });
  }
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
  const matches = (await listManifests(runtime.configRoot)).filter((manifest) => manifest.space === repoId);
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? `no local deployment cache owns Space ${repoId}; run mlclaw bootstrap to recover it first`
        : `multiple local deployments reference Space ${repoId}; repair the deployment caches before changing settings`,
    );
  }
  const current = matches[0] as DeploymentManifest;
  const bucketPrefix = await readDeploymentBucketPrefix(runtime, current.agent);
  const target: DeploymentManifest = {
    ...current,
    ...(opts.hardware ? { spaceHardware: opts.hardware } : {}),
    ...(typeof opts.sleepTime === "number" ? { spaceSleepTime: opts.sleepTime } : {}),
    updatedAt: runtime.now().toISOString(),
  };
  let result: SpaceRuntime | undefined;
  const reconciled = await reconcileManifest({
    manifest: target,
    bucketPrefix,
    hub,
    runtime,
    apply: async ({ manifest, assertLease }) => {
      await assertLease();
      result = opts.hardware
        ? await hub.requestSpaceHardware(repoId, opts.hardware, opts.sleepTime)
        : await hub.setSpaceSleepTime(repoId, opts.sleepTime as number);
      await writeManifest(runtime.configRoot, manifest);
    },
  });
  await writeManifest(runtime.configRoot, reconciled.manifest);
  if (!result) throw new Error("Space settings update returned no runtime state");
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
  assertMutation: () => Promise<void> = async () => undefined,
): Promise<void> {
  for (const [key, value] of Object.entries(variables)) {
    await assertMutation();
    await hub.addSpaceVariable(repoId, key, value);
  }
}

async function setDeploymentSecrets(
  hub: HubApi,
  repoId: string,
  secrets: Record<string, string>,
  assertMutation: () => Promise<void> = async () => undefined,
): Promise<void> {
  for (const [key, value] of Object.entries(secrets)) {
    await assertMutation();
    await hub.addSpaceSecret(repoId, key, value);
  }
}

async function setSpaceGatewaySecrets(
  hub: HubApi,
  repoId: string,
  hfToken: string,
  secrets: Record<string, string>,
  assertMutation: () => Promise<void> = async () => undefined,
): Promise<void> {
  await setDeploymentSecrets(
    hub,
    repoId,
    {
      MLCLAW_SESSION_SECRET: requiredSecret(secrets, "MLCLAW_SESSION_SECRET"),
      MLCLAW_CREDENTIAL_KEY: requiredSecret(secrets, "MLCLAW_CREDENTIAL_KEY"),
      MLCLAW_BROKER_HF_TOKEN: hfToken,
      ...(secrets.MLCLAW_ROUTER_TOKEN ? { MLCLAW_ROUTER_TOKEN: secrets.MLCLAW_ROUTER_TOKEN } : {}),
      ...(secrets.TELEGRAM_BOT_TOKEN ? { TELEGRAM_BOT_TOKEN: secrets.TELEGRAM_BOT_TOKEN } : {}),
      ...(secrets.TELEGRAM_ALLOWED_USERS ? { TELEGRAM_ALLOWED_USERS: secrets.TELEGRAM_ALLOWED_USERS } : {}),
      ...(secrets.TELEGRAM_PROXY ? { TELEGRAM_PROXY: secrets.TELEGRAM_PROXY } : {}),
      ...(secrets.TELEGRAM_API_ROOT ? { TELEGRAM_API_ROOT: secrets.TELEGRAM_API_ROOT } : {}),
    },
    assertMutation,
  );
}

async function deleteStaleSpaceTokenSecrets(
  hub: HubApi,
  repoId: string,
  assertMutation: () => Promise<void> = async () => undefined,
): Promise<void> {
  for (const key of ["HF_TOKEN", "HUGGINGFACE_HUB_TOKEN"]) {
    await assertMutation();
    await hub.deleteSpaceSecret(repoId, key);
  }
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
  opts: { allowMissingVolumes?: boolean; assertMutation?: () => Promise<void> } = {},
): Promise<void> {
  await opts.assertMutation?.();
  const runtime = await hub.getSpaceRuntime(repoId);
  const volumes = Array.isArray(runtime.volumes)
    ? runtime.volumes
    : opts.allowMissingVolumes
      ? []
      : requireRuntimeVolumes(runtime, repoId);
  await opts.assertMutation?.();
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

async function resolveBrokerHfToken(params: {
  opts: Pick<BootstrapOptions, "brokerHfTokenFile">;
  owner: string;
  hfToken: string;
  hfIdentity: HubIdentity;
  preferredToken?: string;
  skipReview: boolean;
  existingSecrets: Record<string, string>;
  runtime: Required<CliRuntime>;
}): Promise<string> {
  const fileToken = await readOptionalBrokerHfTokenFile(params.opts.brokerHfTokenFile);
  const configuredToken =
    fileToken ??
    nonEmpty(params.runtime.env.MLCLAW_BROKER_HF_TOKEN) ??
    nonEmpty(params.preferredToken) ??
    nonEmpty(params.existingSecrets.MLCLAW_BROKER_HF_TOKEN);
  let token = configuredToken ?? params.hfToken;
  let identity: HubIdentity;
  try {
    identity = token === params.hfToken ? params.hfIdentity : await params.runtime.hubFactory(token).whoami();
    if (identity.name !== params.hfIdentity.name) {
      throw new Error(`broker token belongs to ${identity.name}, not ${params.hfIdentity.name}`);
    }
  } catch (error) {
    if (fileToken) throw error;
    const warning = `The saved HF Broker credential could not be used (${errorMessage(error)}). Using the active Hugging Face login instead.`;
    if (params.runtime.prompt.isInteractive()) {
      params.runtime.prompt.note(warning, "HF Broker credential");
    } else {
      params.runtime.stderr.error(`Warning: ${warning}`);
    }
    token = params.hfToken;
    identity = params.hfIdentity;
  }

  const assessment = assessBrokerCredential(identity, params.owner);
  if (assessment.status === "sufficient") return token;
  if (params.skipReview) return token;

  const detail = brokerCredentialAssessmentDetail(assessment);
  if (!params.runtime.prompt.isInteractive()) {
    params.runtime.stderr.error(
      `Warning: ${detail}. Continuing with the current credential; some broker operations may fail with a permission error.`,
    );
    return token;
  }

  params.runtime.prompt.note(
    `${detail}.

ML Claw can open a Hugging Face token form with BrokerKit's permissions preselected. You still create the token on Hugging Face, then paste it here. Your current HF CLI login will not be changed.`,
    "HF Broker credential",
  );
  const action = await promptSelect(
    "How should HF Broker authenticate?",
    [
      {
        value: "create",
        label: "Create a dedicated broker token",
        hint: "Recommended for complete broker coverage",
      },
      {
        value: "current",
        label: "Continue with the current credential",
        hint: "Some broker operations may fail",
      },
    ],
    "create",
    params.runtime,
  );
  if (action === "current") return token;

  const url = buildBrokerTokenUrl(params.owner, params.hfIdentity.name);
  const opened = await params.runtime.hfCli.openUrl(url);
  params.runtime.prompt.note(
    `${opened ? "The token form was opened in your browser." : "Open this token form in your browser."}

Name and create the token, then copy it. The URL contains permission names only; it contains no credential.

${url}`,
    "Create the broker token",
  );

  for (;;) {
    const replacement = readPromptValue(
      await params.runtime.prompt.password({ message: "Paste the new Hugging Face broker token" }),
      "Hugging Face broker token",
    );
    try {
      const replacementIdentity = await params.runtime.hubFactory(replacement).whoami();
      if (replacementIdentity.name !== params.hfIdentity.name) {
        throw new Error(`token belongs to ${replacementIdentity.name}, not ${params.hfIdentity.name}`);
      }
      const replacementAssessment = assessBrokerCredential(replacementIdentity, params.owner);
      if (replacementAssessment.status !== "sufficient") {
        throw new Error(brokerCredentialAssessmentDetail(replacementAssessment));
      }
      params.runtime.prompt.note(
        "The dedicated broker token was verified. It will be stored only in ML Claw's trusted broker configuration.",
        "HF Broker credential ready",
      );
      return replacement;
    } catch (error) {
      params.runtime.prompt.note(errorMessage(error), "Broker token was not accepted");
      if (!(await promptConfirm("Try another broker token?", true, params.runtime))) return token;
    }
  }
}

async function readOptionalBrokerHfTokenFile(file: string | undefined): Promise<string | undefined> {
  if (!file) return undefined;
  const raw = await fs.readFile(file, "utf8");
  const parsed = parseSecretEnv(raw);
  const token = nonEmpty(parsed.MLCLAW_BROKER_HF_TOKEN) ?? nonEmpty(raw);
  if (!token) throw new Error("HF Broker token file is empty");
  return token;
}

function brokerCredentialAssessmentDetail(
  assessment: Exclude<BrokerCredentialAssessment, { status: "sufficient" }>,
): string {
  if (assessment.status === "unknown") return assessment.reason;
  const shown = assessment.missing.slice(0, 8);
  const remaining = assessment.missing.length - shown.length;
  return `The HF Broker credential is missing ${assessment.missing.length} required permission${assessment.missing.length === 1 ? "" : "s"}: ${shown.join(", ")}${remaining > 0 ? `, and ${remaining} more` : ""}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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

async function promptSelect(
  message: string,
  options: Array<{ value: string; label: string; hint?: string }>,
  initialValue: string,
  runtime: Required<CliRuntime>,
): Promise<string> {
  const value = await runtime.prompt.select({ message, options, initialValue });
  if (isCancel(value)) {
    runtime.prompt.cancel("Cancelled");
    throw new Error("cancelled");
  }
  return value;
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

function parseTailscaleMode(value: string): TailscaleMode {
  if (value === "off" || value === "direct" || value === "serve") return value;
  throw new InvalidArgumentError(`expected tailscale mode off, direct, or serve; got ${value}`);
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
