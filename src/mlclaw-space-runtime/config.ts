import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { normalizeBucketPrefix } from "../hf-state-sync/paths.js";
import { resolveBranding, type RuntimeBranding } from "./branding.js";
import { DEFAULT_MODEL, normalizeModelChoices, parseModelChoicesEnv, type ModelChoice } from "./model-choices.js";
import { loadOperatorBrokers, type OperatorBrokerConfig } from "./operator-brokers.js";
import { deriveLocalAccessToken } from "./local-access.js";

export type RuntimeMode = "template" | "app";

export type SpaceRuntimeConfig = {
  port: number;
  openclawPort: number;
  mcpPort: number;
  openclawHost: string;
  openclawUid: number;
  openclawGid: number;
  publicUrl: string;
  providerUrl: string;
  oauthClientId: string | undefined;
  oauthClientSecret: string | undefined;
  sessionSecret: string;
  sessionSecretGenerated: boolean;
  credentialKey: string;
  credentialKeyGenerated: boolean;
  cookieSecure: boolean;
  sessionCookieName: string;
  spaceId: string | undefined;
  canonicalSpaceId: string;
  canonicalCreatorUserId: string | undefined;
  spaceCreatorUserId: string | undefined;
  allowedUsers: string[];
  adminUsers: string[];
  allowAnySignedIn: boolean;
  localAccessUser: string | undefined;
  localAccessToken: string | undefined;
  mode: RuntimeMode;
  hfToken: string | undefined;
  routerToken: string | undefined;
  brokerAgentUrl: string | undefined;
  brokerAgentSecret: string | undefined;
  brokerAgentSecretFile: string | undefined;
  operatorBrokers: OperatorBrokerConfig[];
  brokerKitPopoverDecisions: boolean;
  hubUrl: string;
  openaiCredentialFile: string;
  openaiCredentialStoreFile: string;
  mcpCredentialFile: string;
  hfMcpUrl: string;
  researchMcpUrl: string;
  researchTimeoutMs: number;
  researchPollMs: number;
  runtimeSettingsFile: string;
  openclawConfigPath: string;
  openclawCommand: string;
  openclawArgs: string[];
  brokerKitPluginPath: string;
  agentName: string | undefined;
  model: string;
  modelChoices: ModelChoice[];
  routerModelsUrl: string;
  stateBucket: string | undefined;
  stateMountDir: string | undefined;
  statePrefix: string | undefined;
  gatewayLocation: string | undefined;
  runtimeImage: string | undefined;
  runtimeId: string | undefined;
  templateRev: string | undefined;
  assetsDir: string;
  branding: RuntimeBranding;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SpaceRuntimeConfig {
  const port = integer(env.PORT ?? env.MLCLAW_SPACE_PORT, 7860);
  const openclawPort = integer(env.MLCLAW_OPENCLAW_PORT ?? env.OPENCLAW_GATEWAY_PORT, 7861);
  const mcpPort = integer(env.MLCLAW_MCP_PORT, 7862);
  const spaceId = trim(env.SPACE_ID);
  const canonicalSpaceId = trim(env.MLCLAW_CANONICAL_SPACE_ID) ?? "osolmaz/mlclaw";
  const canonicalCreatorUserId = trim(env.MLCLAW_CANONICAL_CREATOR_USER_ID);
  const spaceCreatorUserId = trim(env.SPACE_CREATOR_USER_ID);
  const mode = resolveMode({
    env,
    spaceId,
    canonicalSpaceId,
    canonicalCreatorUserId,
    spaceCreatorUserId,
  });
  const owner = ownerFromSpaceId(spaceId);
  const stateBucket = trim(env.OPENCLAW_HF_STATE_BUCKET);
  const gatewayLocation = trim(env.MLCLAW_GATEWAY_LOCATION);
  const localAccessUser =
    gatewayLocation === "local" ? (trim(env.MLCLAW_LOCAL_ACCESS_USER) ?? ownerFromRepoId(stateBucket)) : undefined;
  const configuredAllowedUsers = splitUsers(env.MLCLAW_ALLOWED_USERS ?? env.ALLOWED_USERS);
  const configuredAdmins = splitUsers(env.MLCLAW_ADMINS);
  const resolvedAdmins = uniqueUsers([
    ...(configuredAdmins.length > 0 ? configuredAdmins : owner ? [owner] : configuredAllowedUsers.slice(0, 1)),
    ...(localAccessUser ? [localAccessUser] : []),
  ]);
  const allowedUsers = uniqueUsers([...configuredAllowedUsers, ...resolvedAdmins, ...(owner ? [owner] : [])]);
  const publicUrl = publicUrlFromEnv(env, port);
  const sessionSecret = trim(env.MLCLAW_SESSION_SECRET ?? env.SESSION_SECRET) ?? randomBytes(48).toString("base64url");
  const configuredCredentialKey = trim(env.MLCLAW_CREDENTIAL_KEY);
  if (mode === "app" && !configuredCredentialKey) {
    throw new Error("MLCLAW_CREDENTIAL_KEY is required in app mode; run mlclaw doctor --fix");
  }
  const credentialKey = configuredCredentialKey ?? randomBytes(32).toString("base64url");
  const openclawCommand = trim(env.MLCLAW_OPENCLAW_COMMAND) ?? "openclaw";
  const openclawArgs = splitArgs(env.MLCLAW_OPENCLAW_ARGS) ?? ["gateway"];
  const runtimeSettingsFile =
    trim(env.MLCLAW_RUNTIME_SETTINGS_FILE) ?? "/home/node/.local/share/mlclaw/live/.mlclaw/settings.json";
  const stateMountDir = trim(env.MLCLAW_STATE_MOUNT_DIR);
  const statePrefix = trim(env.OPENCLAW_HF_STATE_PREFIX);
  const mcpCredentialFile =
    trim(env.MLCLAW_MCP_CREDENTIAL_FILE) ??
    (stateMountDir
      ? `${stateMountDir.replace(/\/+$/, "")}/${normalizeBucketPrefix(statePrefix)}/.mlclaw/mcp-oauth.enc`
      : `${pathDirname(runtimeSettingsFile)}/mcp-oauth.enc`);
  const openaiCredentialStoreFile =
    trim(env.MLCLAW_OPENAI_CREDENTIAL_STORE_FILE) ??
    (stateMountDir
      ? `${stateMountDir.replace(/\/+$/, "")}/${normalizeBucketPrefix(statePrefix)}/.mlclaw/openai-api-key.enc`
      : `${pathDirname(pathDirname(runtimeSettingsFile))}/.mlclaw-protected/control/openai-api-key.enc`);
  const runtimeSettings = readRuntimeSettings(runtimeSettingsFile);
  const model = runtimeSettings.model ?? trim(env.OPENCLAW_MODEL) ?? DEFAULT_MODEL;
  const agentName = trim(env.OPENCLAW_AGENT_NAME);

  return {
    port,
    openclawPort,
    mcpPort,
    openclawHost: trim(env.MLCLAW_OPENCLAW_HOST) ?? "127.0.0.1",
    openclawUid: integer(env.MLCLAW_OPENCLAW_UID, 1000),
    openclawGid: integer(env.MLCLAW_OPENCLAW_GID, 1000),
    publicUrl,
    providerUrl: trim(env.OPENID_PROVIDER_URL) ?? "https://huggingface.co",
    oauthClientId: trim(env.OAUTH_CLIENT_ID),
    oauthClientSecret: trim(env.OAUTH_CLIENT_SECRET),
    sessionSecret,
    sessionSecretGenerated: !trim(env.MLCLAW_SESSION_SECRET ?? env.SESSION_SECRET),
    credentialKey,
    credentialKeyGenerated: !configuredCredentialKey,
    cookieSecure: env.MLCLAW_COOKIE_SECURE === "0" ? false : !publicUrl.startsWith("http://"),
    sessionCookieName: gatewayLocation === "local" ? localSessionCookieName(publicUrl) : SESSION_COOKIE_PREFIX,
    spaceId,
    canonicalSpaceId,
    canonicalCreatorUserId,
    spaceCreatorUserId,
    allowedUsers,
    adminUsers: resolvedAdmins,
    allowAnySignedIn: env.MLCLAW_ALLOW_ANY_SIGNED_IN === "1" || env.MLCLAW_ALLOW_ANY_SIGNED_IN === "true",
    localAccessUser,
    localAccessToken:
      gatewayLocation === "local" && localAccessUser ? deriveLocalAccessToken(sessionSecret) : undefined,
    mode,
    hfToken:
      readOptionalSecret(trim(env.MLCLAW_TRUSTED_HF_TOKEN_FILE)) ?? trim(env.HF_TOKEN ?? env.HUGGINGFACE_HUB_TOKEN),
    routerToken: trim(env.MLCLAW_ROUTER_TOKEN ?? env.HF_ROUTER_TOKEN),
    brokerAgentUrl: trim(env.MLCLAW_HF_BROKER_URL),
    brokerAgentSecret: readOptionalSecret(trim(env.MLCLAW_HF_BROKER_AGENT_SECRET_FILE)),
    brokerAgentSecretFile: trim(env.MLCLAW_HF_BROKER_AGENT_SECRET_FILE),
    operatorBrokers: loadOperatorBrokers(trim(env.MLCLAW_OPERATOR_BROKERS_FILE)),
    brokerKitPopoverDecisions:
      env.MLCLAW_BROKERKIT_POPOVER_DECISIONS !== "0" && env.MLCLAW_BROKERKIT_POPOVER_DECISIONS !== "false",
    hubUrl: trim(env.HF_ENDPOINT) ?? "https://huggingface.co",
    openaiCredentialFile: trim(env.MLCLAW_OPENAI_CREDENTIAL_FILE) ?? "/tmp/mlclaw-secrets/openai.env",
    openaiCredentialStoreFile,
    mcpCredentialFile,
    hfMcpUrl: trim(env.MLCLAW_HF_MCP_URL) ?? "https://huggingface.co/mcp?bouquet=hf",
    researchMcpUrl: trim(env.MLCLAW_RESEARCH_MCP_URL) ?? "https://evalstate-research-agent-two.hf.space/mcp",
    researchTimeoutMs: integer(env.MLCLAW_RESEARCH_TIMEOUT_MS, 30 * 60 * 1000),
    researchPollMs: integer(env.MLCLAW_RESEARCH_POLL_MS, 1500),
    runtimeSettingsFile,
    openclawConfigPath: trim(env.OPENCLAW_CONFIG_PATH) ?? "/home/node/.local/share/mlclaw/live/.openclaw/openclaw.json",
    openclawCommand,
    openclawArgs,
    brokerKitPluginPath:
      trim(env.MLCLAW_BROKERKIT_PLUGIN_PATH) ?? "/opt/openclaw-plugins/node_modules/openclaw-brokerkit",
    agentName,
    model,
    modelChoices: runtimeSettings.modelChoices ?? parseModelChoicesEnv(env.MLCLAW_MODEL_CHOICES, model),
    routerModelsUrl: trim(env.MLCLAW_ROUTER_MODELS_URL) ?? "https://router.huggingface.co/v1/models",
    stateBucket,
    stateMountDir,
    statePrefix,
    gatewayLocation,
    runtimeImage: trim(env.MLCLAW_RUNTIME_IMAGE),
    runtimeId: trim(env.MLCLAW_RUNTIME_ID),
    templateRev: trim(env.MLCLAW_TEMPLATE_REV),
    assetsDir: trim(env.MLCLAW_ASSETS_DIR) ?? "/app/assets",
    branding: resolveBranding(env, agentName),
  };
}

const SESSION_COOKIE_PREFIX = "mlclaw_session";

function localSessionCookieName(publicUrl: string): string {
  const url = new URL(publicUrl);
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  return `${SESSION_COOKIE_PREFIX}_${port}`;
}

function readOptionalSecret(file: string | undefined): string | undefined {
  if (!file) {
    return undefined;
  }
  try {
    return trim(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

export function integrationCredentialSlot(config: Pick<SpaceRuntimeConfig, "adminUsers">): string | undefined {
  return config.adminUsers[0];
}

function pathDirname(file: string): string {
  const slash = file.lastIndexOf("/");
  return slash > 0 ? file.slice(0, slash) : ".";
}

function resolveMode(params: {
  env: NodeJS.ProcessEnv;
  spaceId: string | undefined;
  canonicalSpaceId: string;
  canonicalCreatorUserId: string | undefined;
  spaceCreatorUserId: string | undefined;
}): RuntimeMode {
  if (params.env.MLCLAW_FORCE_TEMPLATE === "1") {
    return "template";
  }
  if (params.env.MLCLAW_FORCE_APP === "1") {
    return "app";
  }
  const isCanonicalSpace = Boolean(params.spaceId && params.spaceId === params.canonicalSpaceId);
  if (!isCanonicalSpace) {
    return "app";
  }
  if (!params.canonicalCreatorUserId || !params.spaceCreatorUserId) {
    return "template";
  }
  return params.canonicalCreatorUserId === params.spaceCreatorUserId ? "template" : "app";
}

function publicUrlFromEnv(env: NodeJS.ProcessEnv, port: number): string {
  const explicit = trim(env.MLCLAW_PUBLIC_URL);
  if (explicit) {
    const url = new URL(explicit);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error("MLCLAW_PUBLIC_URL must be one HTTP origin without credentials, path, query, or fragment");
    }
    return url.origin;
  }
  const host = trim(env.SPACE_HOST);
  if (host) {
    return host.startsWith("http") ? host.replace(/\/+$/, "") : `https://${host.replace(/\/+$/, "")}`;
  }
  return `http://127.0.0.1:${port}`;
}

function ownerFromSpaceId(spaceId?: string): string | undefined {
  return ownerFromRepoId(spaceId);
}

function ownerFromRepoId(repoId?: string): string | undefined {
  const owner = repoId?.split("/")[0]?.trim();
  return owner || undefined;
}

function integer(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function splitUsers(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueUsers(users: string[]): string[] {
  return [...new Set(users)];
}

function splitArgs(value: string | undefined): string[] | undefined {
  const trimmed = trim(value);
  return trimmed ? trimmed.split(/\s+/).filter(Boolean) : undefined;
}

function trim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function readRuntimeSettings(file: string): { model?: string; modelChoices?: ModelChoice[] } {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
    const model = typeof parsed.model === "string" ? parsed.model.trim() : undefined;
    if (!model) {
      return {};
    }
    const modelChoices = normalizeModelChoices(parsed.modelChoices, model);
    return {
      model,
      ...(modelChoices ? { modelChoices } : {}),
    };
  } catch {
    return {};
  }
}
