#!/usr/bin/env node
import fs from "node:fs/promises";
import readline from "node:readline/promises";
import { randomBytes } from "node:crypto";
import { stdin as input, stdout as output } from "node:process";
import { parseArgs, stringFlag, boolFlag, type ParsedArgs } from "./args.js";
import { readToken } from "./auth.js";
import { pushTemplateToSpace } from "./git.js";
import { HubApi } from "./hub-api.js";
import { namesFor, slugifyAgentName } from "./naming.js";
import { getTelegramBot } from "./telegram.js";

const DEFAULT_MODEL = "huggingface/Qwen/Qwen3-8B";
const DEFAULT_HARDWARE = "cpu-basic";
const STALE_PATH_VARS = ["OPENCLAW_STATE_DIR", "OPENCLAW_WORKSPACE_DIR", "OPENCLAW_CONFIG_PATH"];

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (boolFlag(args, "help")) {
    printUsage();
    return 0;
  }
  const token = await readToken();
  const hub = new HubApi({ token });
  switch (args.command) {
    case "bootstrap":
      await bootstrap(args, hub, token);
      return 0;
    case "update":
      await update(args, hub, token);
      return 0;
    case "doctor":
      await doctor(args, hub);
      return 0;
    default:
      printUsage();
      return 2;
  }
}

async function bootstrap(args: ParsedArgs, hub: HubApi, hfToken: string): Promise<void> {
  const me = await hub.whoami();
  const owner = stringFlag(args, "owner") ?? me.name;
  const telegramToken = await readTelegramToken(args);
  const bot = telegramToken ? await getTelegramBot(telegramToken, stringFlag(args, "telegram-api-root")) : null;
  const agentName = slugifyAgentName(
    stringFlag(args, "name") ?? bot?.username ?? await promptRequired("Agent name"),
  );
  const telegramUserId = stringFlag(args, "telegram-user-id") ?? process.env.TELEGRAM_ALLOWED_USERS;
  if (telegramToken && !telegramUserId) {
    throw new Error("Telegram bot token was provided, but --telegram-user-id is missing");
  }

  const names = namesFor(owner, agentName);
  const hardware = stringFlag(args, "hardware") ?? DEFAULT_HARDWARE;
  const model = stringFlag(args, "model") ?? DEFAULT_MODEL;
  const gatewayToken = stringFlag(args, "gateway-token") ?? randomBytes(32).toString("base64url");

  console.log(`Creating private bucket ${names.bucket}`);
  await hub.createBucket(names.bucket, true);
  console.log(`Creating private Space ${names.space}`);
  await hub.createDockerSpace(names.space, { private: true, hardware });
  console.log("Generating Space files from huggingclaw source");
  const { templateRev } = await pushTemplateToSpace({ targetRepo: names.space, token: hfToken });

  await setDeploymentVariables(hub, names.space, {
    OPENCLAW_HF_STATE_BUCKET: names.bucket,
    OPENCLAW_HF_TEMPLATE_REV: templateRev,
    OPENCLAW_MODEL: model,
    OPENCLAW_AGENT_NAME: agentName,
  });
  await setDeploymentSecrets(hub, names.space, {
    OPENCLAW_GATEWAY_TOKEN: gatewayToken,
    HF_TOKEN: hfToken,
    ...(telegramToken ? { TELEGRAM_BOT_TOKEN: telegramToken } : {}),
    ...(telegramUserId ? { TELEGRAM_ALLOWED_USERS: telegramUserId } : {}),
    ...(stringFlag(args, "telegram-proxy") ? { TELEGRAM_PROXY: stringFlag(args, "telegram-proxy") as string } : {}),
    ...(stringFlag(args, "telegram-api-root")
      ? { TELEGRAM_API_ROOT: stringFlag(args, "telegram-api-root") as string }
      : {}),
  });
  await hub.restartSpace(names.space, true);

  console.log("");
  console.log(`Space:  https://huggingface.co/spaces/${names.space}`);
  console.log(`Bucket: https://huggingface.co/buckets/${names.bucket}`);
  console.log(`Agent:  ${agentName}${bot ? ` (@${bot.username})` : ""}`);
  console.log("Restart requested. Build logs may take a few minutes to appear.");
}

async function update(args: ParsedArgs, hub: HubApi, hfToken: string): Promise<void> {
  const repoId = args.positionals[0];
  if (!repoId) {
    throw new Error("usage: hclaw update <owner/space>");
  }
  const variables = await hub.getSpaceVariables(repoId);
  if (!variables.has("OPENCLAW_HF_TEMPLATE_REV") && !boolFlag(args, "force")) {
    throw new Error(`${repoId} does not look like a Hugging Claw deployment; pass --force to update anyway`);
  }
  console.log(`Generating current Space files into ${repoId}`);
  const { templateRev } = await pushTemplateToSpace({ targetRepo: repoId, token: hfToken });
  await hub.addSpaceVariable(repoId, "OPENCLAW_HF_TEMPLATE_REV", templateRev);
  await hub.restartSpace(repoId, true);
  await doctor({ ...args, flags: new Map([...args.flags, ["fix", true]]), positionals: [repoId] }, hub);
}

async function doctor(args: ParsedArgs, hub: HubApi): Promise<void> {
  const repoId = args.positionals[0];
  if (!repoId) {
    throw new Error("usage: hclaw doctor <owner/space> [--fix]");
  }
  const fix = boolFlag(args, "fix");
  const variables = await hub.getSpaceVariables(repoId);
  const secrets = await hub.getSpaceSecrets(repoId);
  const issues: string[] = [];
  const fixed: string[] = [];

  const bucket = variables.get("OPENCLAW_HF_STATE_BUCKET")?.value ?? stringFlag(args, "bucket");
  if (!bucket) {
    issues.push("OPENCLAW_HF_STATE_BUCKET is missing");
  } else if (!variables.has("OPENCLAW_HF_STATE_BUCKET") && fix) {
    await hub.addSpaceVariable(repoId, "OPENCLAW_HF_STATE_BUCKET", bucket);
    fixed.push("set OPENCLAW_HF_STATE_BUCKET");
  }
  for (const key of STALE_PATH_VARS) {
    if (variables.has(key)) {
      issues.push(`${key} is set; runtime now derives it from OPENCLAW_LIVE_DIR`);
      if (fix) {
        await hub.deleteSpaceVariable(repoId, key);
        fixed.push(`deleted ${key}`);
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

  const runtime = await hub.getSpaceRuntime(repoId);
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

  console.log(`Space: ${repoId}`);
  console.log(`Stage: ${runtime.stage ?? "unknown"}`);
  console.log(`Hardware: ${runtime.requested_hardware ?? runtime.hardware ?? "unknown"}`);
  if (fixed.length > 0) {
    console.log(`Fixed: ${fixed.join(", ")}`);
  }
  if (issues.length === 0) {
    console.log("Doctor: clean");
  } else {
    console.log("Doctor findings:");
    for (const issue of issues) {
      console.log(`- ${issue}`);
    }
  }
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

async function readTelegramToken(args: ParsedArgs): Promise<string | null> {
  const direct = stringFlag(args, "telegram-token") ?? process.env.TELEGRAM_BOT_TOKEN;
  if (direct) {
    return direct;
  }
  const file = stringFlag(args, "telegram-token-file");
  if (!file) {
    return null;
  }
  const raw = await fs.readFile(file, "utf8");
  const match = raw.match(/(?:^|\n)\s*TELEGRAM_BOT_TOKEN\s*=\s*['"]?([^'"\n]+)['"]?/);
  return (match?.[1] ?? raw.trim()).trim();
}

async function promptRequired(label: string): Promise<string> {
  const rl = readline.createInterface({ input, output });
  try {
    const value = (await rl.question(`${label}: `)).trim();
    if (!value) {
      throw new Error(`${label} is required`);
    }
    return value;
  } finally {
    rl.close();
  }
}

function printUsage(): void {
  console.log(`usage:
  hclaw [bootstrap] [--owner OWNER] [--name NAME] [--telegram-token TOKEN|--telegram-token-file PATH] [--telegram-user-id ID]
  hclaw update <owner/space> [--force]
  hclaw doctor <owner/space> [--fix] [--bucket owner/bucket]

defaults:
  model:    ${DEFAULT_MODEL}
  hardware: ${DEFAULT_HARDWARE}`);
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  },
);
