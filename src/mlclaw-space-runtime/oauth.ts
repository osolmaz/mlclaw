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
};

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
}).passthrough();

const userInfoSchema = z.object({
  preferred_username: z.string().min(1),
}).passthrough();

export function authorizeUrl(settings: OAuthSettings, state: string): string {
  const url = new URL(`${settings.providerUrl.replace(/\/+$/, "")}/oauth/authorize`);
  url.searchParams.set("client_id", settings.clientId);
  url.searchParams.set("redirect_uri", settings.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
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
  return { username: userBody.data.preferred_username };
}
