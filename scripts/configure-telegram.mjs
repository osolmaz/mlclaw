import fs from "node:fs";

const [configPath, allowedUsersRaw] = process.argv.slice(2);

if (!configPath) {
  console.error("Usage: configure-telegram.mjs <config-path> <allowed-users>");
  process.exit(2);
}

const allowedUsers = (allowedUsersRaw || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const telegramProxy = (process.env.TELEGRAM_PROXY || "").trim();
const telegramApiRoot = (process.env.TELEGRAM_API_ROOT || "").trim().replace(/\/+$/, "");

if (allowedUsers.length === 0) {
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
config.channels ||= {};
config.channels.telegram ||= {};
config.messages ||= {};
config.messages.queue ||= {};
config.messages.queue.byChannel ||= {};
config.messages.queue.debounceMsByChannel ||= {};

config.messages.queue.byChannel.telegram ||= "collect";
config.messages.queue.debounceMsByChannel.telegram ??= 1500;
config.messages.queue.cap ??= 20;
config.messages.queue.drop ||= "summarize";

Object.assign(config.channels.telegram, {
  enabled: true,
  botToken: "${TELEGRAM_BOT_TOKEN}",
  dmPolicy: "allowlist",
  allowFrom: allowedUsers,
  timeoutSeconds: 45,
  pollingStallThresholdMs: 60000,
  commands: {
    ...(config.channels.telegram.commands || {}),
    native: false
  },
  network: {
    ...(config.channels.telegram.network || {}),
    autoSelectFamily: false,
    dnsResultOrder: "ipv4first"
  },
  ...(telegramProxy ? { proxy: "${TELEGRAM_PROXY}" } : {}),
  ...(telegramApiRoot ? { apiRoot: "${TELEGRAM_API_ROOT}" } : {}),
  groups: config.channels.telegram.groups || {}
});

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
