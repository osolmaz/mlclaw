import { randomBytes } from "node:crypto";

export type RuntimeMode = "template" | "app";

export type SpaceRuntimeConfig = {
  port: number;
  openclawPort: number;
  openclawHost: string;
  publicUrl: string;
  providerUrl: string;
  oauthClientId: string | undefined;
  oauthClientSecret: string | undefined;
  sessionSecret: string;
  sessionSecretGenerated: boolean;
  cookieSecure: boolean;
  spaceId: string | undefined;
  canonicalSpaceId: string;
  canonicalCreatorUserId: string | undefined;
  spaceCreatorUserId: string | undefined;
  allowedUsers: string[];
  adminUsers: string[];
  allowAnySignedIn: boolean;
  mode: RuntimeMode;
  hfToken: string | undefined;
  hubUrl: string;
  openaiCredentialFile: string;
  openclawConfigPath: string;
  openclawCommand: string;
  openclawArgs: string[];
  agentName: string | undefined;
  stateBucket: string | undefined;
  runtimeImage: string | undefined;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): SpaceRuntimeConfig {
  const port = integer(env.PORT ?? env.MLCLAW_SPACE_PORT, 7860);
  const openclawPort = integer(env.MLCLAW_OPENCLAW_PORT ?? env.OPENCLAW_GATEWAY_PORT, 7861);
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
  const configuredAllowedUsers = splitUsers(env.MLCLAW_ALLOWED_USERS ?? env.ALLOWED_USERS);
  const configuredAdmins = splitUsers(env.MLCLAW_ADMINS);
  const resolvedAdmins = uniqueUsers(configuredAdmins.length > 0
    ? configuredAdmins
    : owner ? [owner] : configuredAllowedUsers.slice(0, 1));
  const allowedUsers = uniqueUsers([
    ...configuredAllowedUsers,
    ...resolvedAdmins,
    ...(owner ? [owner] : []),
  ]);
  const publicUrl = publicUrlFromEnv(env, port);
  const sessionSecret = trim(env.MLCLAW_SESSION_SECRET ?? env.SESSION_SECRET) ?? randomBytes(48).toString("base64url");
  const openclawCommand = trim(env.MLCLAW_OPENCLAW_COMMAND) ?? "openclaw";
  const openclawArgs = splitArgs(env.MLCLAW_OPENCLAW_ARGS) ?? ["gateway"];

  return {
    port,
    openclawPort,
    openclawHost: trim(env.MLCLAW_OPENCLAW_HOST) ?? "127.0.0.1",
    publicUrl,
    providerUrl: trim(env.OPENID_PROVIDER_URL) ?? "https://huggingface.co",
    oauthClientId: trim(env.OAUTH_CLIENT_ID),
    oauthClientSecret: trim(env.OAUTH_CLIENT_SECRET),
    sessionSecret,
    sessionSecretGenerated: !trim(env.MLCLAW_SESSION_SECRET ?? env.SESSION_SECRET),
    cookieSecure: env.MLCLAW_COOKIE_SECURE === "0" ? false : !publicUrl.startsWith("http://"),
    spaceId,
    canonicalSpaceId,
    canonicalCreatorUserId,
    spaceCreatorUserId,
    allowedUsers,
    adminUsers: resolvedAdmins,
    allowAnySignedIn: env.MLCLAW_ALLOW_ANY_SIGNED_IN === "1" || env.MLCLAW_ALLOW_ANY_SIGNED_IN === "true",
    mode,
    hfToken: trim(env.HF_TOKEN ?? env.HUGGINGFACE_HUB_TOKEN),
    hubUrl: trim(env.HF_ENDPOINT) ?? "https://huggingface.co",
    openaiCredentialFile: trim(env.MLCLAW_OPENAI_CREDENTIAL_FILE) ?? "/tmp/mlclaw-secrets/openai.env",
    openclawConfigPath: trim(env.OPENCLAW_CONFIG_PATH) ?? "/tmp/openclaw-live/.openclaw/openclaw.json",
    openclawCommand,
    openclawArgs,
    agentName: trim(env.OPENCLAW_AGENT_NAME),
    stateBucket: trim(env.OPENCLAW_HF_STATE_BUCKET),
    runtimeImage: trim(env.MLCLAW_RUNTIME_IMAGE),
  };
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
  const host = trim(env.SPACE_HOST);
  if (host) {
    return host.startsWith("http") ? host.replace(/\/+$/, "") : `https://${host.replace(/\/+$/, "")}`;
  }
  return `http://127.0.0.1:${port}`;
}

function ownerFromSpaceId(spaceId?: string): string | undefined {
  const owner = spaceId?.split("/")[0]?.trim();
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
