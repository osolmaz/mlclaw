#!/usr/bin/env node
import fs from "node:fs/promises";
import { realpathSync } from "node:fs";
import process from "node:process";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Command, CommanderError, InvalidArgumentError } from "commander";
import { cancel, confirm, intro, isCancel, note, outro, password, text } from "@clack/prompts";
import { readToken } from "./auth.js";
import { pushTemplateToSpace } from "./git.js";
import { HubApi } from "./hub-api.js";
import { namesFor, slugifyAgentName } from "./naming.js";
import { getTelegramBot, type TelegramBot } from "./telegram.js";

export const DEFAULT_MODEL = "huggingface/Qwen/Qwen3-8B";
export const DEFAULT_HARDWARE = "cpu-basic";
export const TELEGRAM_HARDWARE = "cpu-upgrade";
export const TELEGRAM_SLEEP_TIME = -1;

const STALE_PATH_VARS = ["OPENCLAW_STATE_DIR", "OPENCLAW_WORKSPACE_DIR", "OPENCLAW_CONFIG_PATH"];
const PAID_HARDWARE_COST_NOTE =
  "Telegram requires upgraded Hugging Face Space hardware today. The cheapest option is cpu-upgrade at $0.03/hour, about $22/month if kept always on.";

type BootstrapOptions = {
  owner?: string;
  name?: string;
  telegramToken?: string;
  telegramTokenFile?: string;
  telegramUserId?: string;
  telegramApiRoot?: string;
  telegramProxy?: string;
  hardware?: string;
  sleepTime?: number;
  model?: string;
  gatewayToken?: string;
  yes?: boolean;
};

type UpdateOptions = {
  force?: boolean;
};

type DoctorOptions = {
  fix?: boolean;
  bucket?: string;
};

type SettingsOptions = {
  hardware?: string;
  sleepTime?: number;
  yes?: boolean;
};

type CliRuntime = {
  env?: NodeJS.ProcessEnv;
  stdout?: Pick<typeof console, "log">;
  stderr?: Pick<typeof console, "error">;
  readToken?: typeof readToken;
  hubFactory?: (token: string) => HubApi;
  pushTemplateToSpace?: typeof pushTemplateToSpace;
  getTelegramBot?: (token: string, apiRoot?: string) => Promise<TelegramBot>;
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
    .option("--telegram-token <token>", "Telegram bot token")
    .option("--telegram-token-file <path>", "File containing TELEGRAM_BOT_TOKEN=... or a raw token")
    .option("--telegram-user-id <id>", "Allowed Telegram user ID")
    .option("--telegram-api-root <url>", "Telegram API root override")
    .option("--telegram-proxy <url>", "Telegram proxy URL override")
    .option("--hardware <flavor>", "Hugging Face Space hardware flavor")
    .option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger)
    .option("--model <model>", "OpenClaw model identifier", DEFAULT_MODEL)
    .option("--gateway-token <token>", "OpenClaw gateway token")
    .option("--yes", "Confirm paid hardware prompts for automation", false)
    .action(async (opts: BootstrapOptions) => {
      await bootstrap(opts, runtime);
    });

  program
    .command("update")
    .description("Regenerate and upload current HuggingClaw Space files")
    .argument("<owner/space>", "Hugging Face Space repo ID")
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
    .option("--hardware <flavor>", "Hugging Face Space hardware flavor")
    .option("--sleep-time <seconds>", "Space sleep timeout in seconds; -1 means never sleep", parseInteger)
    .option("--yes", "Confirm paid hardware prompts for automation", false)
    .action(async (repoId: string, opts: SettingsOptions) => {
      const token = await runtime.readToken(runtime.env);
      const hub = runtime.hubFactory(token);
      await settings(repoId, opts, hub, runtime);
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

  const paidHardware = await resolveHardware({
    ...(opts.hardware ? { requestedHardware: opts.hardware } : {}),
    ...(typeof opts.sleepTime === "number" ? { requestedSleepTime: opts.sleepTime } : {}),
    yes: Boolean(opts.yes),
    runtime,
  });
  const names = namesFor(owner, agentName);
  const model = opts.model ?? DEFAULT_MODEL;
  const providedGatewayToken = opts.gatewayToken;
  const gatewayToken = providedGatewayToken ?? randomBytes(32).toString("base64url");

  runtime.stdout.log(`Creating private bucket ${names.bucket}`);
  await hub.createBucket(names.bucket, true);
  runtime.stdout.log(`Creating private Space ${names.space}`);
  await hub.createDockerSpace(names.space, {
    private: true,
    hardware: paidHardware.hardware,
    ...(typeof paidHardware.sleepTime === "number" ? { sleepTimeSeconds: paidHardware.sleepTime } : {}),
  });
  await hub.requestSpaceHardware(names.space, paidHardware.hardware, paidHardware.sleepTime);
  runtime.stdout.log("Generating Space files from huggingclaw source");
  const { templateRev } = await runtime.pushTemplateToSpace({ targetRepo: names.space, token: hfToken });

  await setDeploymentVariables(hub, names.space, {
    OPENCLAW_HF_STATE_BUCKET: names.bucket,
    OPENCLAW_HF_TEMPLATE_REV: templateRev,
    OPENCLAW_MODEL: model,
    OPENCLAW_AGENT_NAME: agentName,
  });
  await setDeploymentSecrets(hub, names.space, {
    OPENCLAW_GATEWAY_TOKEN: gatewayToken,
    HF_TOKEN: hfToken,
    TELEGRAM_BOT_TOKEN: telegramToken,
    TELEGRAM_ALLOWED_USERS: telegramUserId,
    ...(opts.telegramProxy ? { TELEGRAM_PROXY: opts.telegramProxy } : {}),
    ...(opts.telegramApiRoot ? { TELEGRAM_API_ROOT: opts.telegramApiRoot } : {}),
  });
  await hub.restartSpace(names.space, true);

  runtime.stdout.log("");
  runtime.stdout.log(`Space:  https://huggingface.co/spaces/${names.space}`);
  runtime.stdout.log(`Bucket: https://huggingface.co/buckets/${names.bucket}`);
  runtime.stdout.log(`Agent:  ${agentName}${bot ? ` (@${bot.username})` : ""}`);
  runtime.stdout.log(`Hardware: ${paidHardware.hardware}${typeof paidHardware.sleepTime === "number" ? ` (sleep-time ${paidHardware.sleepTime})` : ""}`);
  if (!providedGatewayToken) {
    runtime.stdout.log("");
    runtime.stdout.log("Generated OpenClaw gateway token:");
    runtime.stdout.log(`  ${gatewayToken}`);
    runtime.stdout.log("");
    runtime.stdout.log("Save this token now. Hugging Face stores it as a write-only Space Secret.");
  }
  runtime.prompt.outro("Restart requested. Build logs may take a few minutes to appear.");
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
  runtime.stdout.log(`Generating current Space files into ${repoId}`);
  const { templateRev } = await runtime.pushTemplateToSpace({ targetRepo: repoId, token: hfToken });
  await hub.addSpaceVariable(repoId, "OPENCLAW_HF_TEMPLATE_REV", templateRev);
  await hub.restartSpace(repoId, true);
  await doctor(repoId, { fix: true }, hub, runtime);
}

async function doctor(repoId: string, opts: DoctorOptions, hub: HubApi, runtime: Required<CliRuntime>): Promise<void> {
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

const invokedPath = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  main().then((code) => process.exit(code));
}
