import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type SignedCookieOptions = {
  name: string;
  secret: string;
  maxAgeSeconds: number;
  secure: boolean;
};

export function createSignedCookie(
  options: SignedCookieOptions,
  payload: Record<string, unknown>,
): string {
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + options.maxAgeSeconds,
  })).toString("base64url");
  const signature = sign(body, options.secret);
  return serializeCookie(options.name, `${body}.${signature}`, {
    httpOnly: true,
    secure: options.secure,
    sameSite: "Lax",
    path: "/",
    maxAge: options.maxAgeSeconds,
  });
}

export function verifySignedCookie<T extends Record<string, unknown>>(
  cookieHeader: string | undefined,
  name: string,
  secret: string,
): T | undefined {
  const value = parseCookies(cookieHeader).get(name);
  if (!value) {
    return undefined;
  }
  const [body, signature] = value.split(".");
  if (!body || !signature || !signatureMatches(signature, sign(body, secret))) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object") {
    return undefined;
  }
  const exp = (parsed as { exp?: unknown }).exp;
  if (typeof exp !== "number" || exp <= Math.floor(Date.now() / 1000)) {
    return undefined;
  }
  return parsed as T;
}

export function clearCookie(name: string, secure: boolean): string {
  return serializeCookie(name, "", {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });
}

export function randomState(): string {
  return randomBytes(24).toString("base64url");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function signatureMatches(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header ?? "").split(";")) {
    const equals = part.indexOf("=");
    if (equals <= 0) {
      continue;
    }
    const name = part.slice(0, equals).trim();
    if (!name) {
      continue;
    }
    try {
      cookies.set(name, decodeURIComponent(part.slice(equals + 1).trim()));
    } catch {
      continue;
    }
  }
  return cookies;
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Lax" | "Strict" | "None";
    path: string;
    maxAge: number;
  },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${options.maxAge}`,
    `Path=${options.path}`,
    `SameSite=${options.sameSite}`,
  ];
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}
