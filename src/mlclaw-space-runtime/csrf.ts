import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CSRF_TTL_SECONDS = 60 * 60;

type CsrfPayload = {
  username: string;
  nonce: string;
  exp: number;
};

export function createCsrfToken(params: {
  username: string;
  sessionSecret: string;
  now?: number;
}): string {
  const now = params.now ?? Date.now();
  const body = Buffer.from(JSON.stringify({
    username: params.username,
    nonce: randomBytes(24).toString("base64url"),
    exp: Math.floor(now / 1000) + CSRF_TTL_SECONDS,
  } satisfies CsrfPayload)).toString("base64url");
  return `${body}.${sign(body, params.sessionSecret)}`;
}

export function verifyCsrfToken(params: {
  token: string | undefined;
  username: string;
  sessionSecret: string;
  now?: number;
}): boolean {
  if (!params.token) {
    return false;
  }
  const [body, signature] = params.token.split(".");
  if (!body || !signature || !signatureMatches(signature, sign(body, params.sessionSecret))) {
    return false;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object") {
    return false;
  }
  const payload = parsed as Partial<CsrfPayload>;
  const now = Math.floor((params.now ?? Date.now()) / 1000);
  return payload.username === params.username &&
    typeof payload.exp === "number" &&
    payload.exp > now &&
    typeof payload.nonce === "string" &&
    payload.nonce.length > 0;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function signatureMatches(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
