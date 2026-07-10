import { z } from "zod";

export type OAuthSettings = {
  clientId: string;
  clientSecret: string;
  providerUrl: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
};

export type OAuthIdentity = {
  username: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope: string[];
  expiresAt?: number;
};

export const HF_MCP_OAUTH_SCOPES = [
  "openid",
  "profile",
  "read-mcp",
  "read-repos",
  "contribute-repos",
  "write-repos",
  "manage-repos",
  "inference-api",
  "jobs",
] as const;

export const HF_LOGIN_OAUTH_SCOPES = ["openid", "profile"] as const;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  token_type: z.string().min(1).optional().default("Bearer"),
  scope: z.union([z.string(), z.array(z.string())]).optional(),
  expires_in: z.number().positive().optional(),
}).passthrough();

const userInfoSchema = z.object({
  preferred_username: z.string().min(1),
}).passthrough();

export function authorizeUrl(
  settings: OAuthSettings,
  state: string,
  scopes: readonly string[] = HF_LOGIN_OAUTH_SCOPES,
): string {
  const url = new URL(`${settings.providerUrl.replace(/\/+$/, "")}/oauth/authorize`);
  url.searchParams.set("client_id", settings.clientId);
  url.searchParams.set("redirect_uri", settings.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForIdentity(
  settings: OAuthSettings,
  code: string,
): Promise<OAuthIdentity | undefined> {
  const fetchImpl = settings.fetchImpl ?? fetch;
  const providerUrl = settings.providerUrl.replace(/\/+$/, "");
  const basic = Buffer.from(`${settings.clientId}:${settings.clientSecret}`).toString("base64");
  const tokenResponse = await fetchImpl(`${providerUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      client_id: settings.clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: settings.redirectUri,
    }),
  });
  if (!tokenResponse.ok) {
    return undefined;
  }
  const tokenBody = tokenResponseSchema.safeParse(await tokenResponse.json());
  if (!tokenBody.success) {
    return undefined;
  }

  const userResponse = await fetchImpl(`${providerUrl}/oauth/userinfo`, {
    headers: { authorization: `Bearer ${tokenBody.data.access_token}` },
  });
  if (!userResponse.ok) {
    return undefined;
  }
  const userBody = userInfoSchema.safeParse(await userResponse.json());
  if (!userBody.success) {
    return undefined;
  }
  return {
    username: userBody.data.preferred_username,
    accessToken: tokenBody.data.access_token,
    ...(tokenBody.data.refresh_token ? { refreshToken: tokenBody.data.refresh_token } : {}),
    tokenType: tokenBody.data.token_type,
    scope: normalizeScope(tokenBody.data.scope),
    ...(tokenBody.data.expires_in
      ? { expiresAt: Date.now() + tokenBody.data.expires_in * 1000 }
      : {}),
  };
}

function normalizeScope(value: string | string[] | undefined): string[] {
  const scopes = Array.isArray(value) ? value : (value ?? "").split(/\s+/);
  return [...new Set(scopes.map((scope) => scope.trim()).filter(Boolean))];
}
