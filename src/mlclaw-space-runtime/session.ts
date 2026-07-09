import { clearCookie, createSignedCookie, randomState, verifySignedCookie } from "./cookies.js";

export const SESSION_COOKIE = "mlclaw_session";
export const STATE_COOKIE = "mlclaw_oauth";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const STATE_TTL_SECONDS = 60 * 10;

export type SessionPayload = {
  username: string;
  exp: number;
};

export type StatePayload = {
  state: string;
  next?: string;
  exp: number;
};

export function createSessionCookie(params: {
  username: string;
  sessionSecret: string;
  secure: boolean;
}): string {
  return createSignedCookie({
    name: SESSION_COOKIE,
    secret: params.sessionSecret,
    maxAgeSeconds: SESSION_TTL_SECONDS,
    secure: params.secure,
  }, { username: params.username });
}

export function createOauthStateCookie(params: {
  state?: string;
  next: string;
  sessionSecret: string;
  secure: boolean;
}): { state: string; cookie: string } {
  const state = params.state ?? randomState();
  return {
    state,
    cookie: createSignedCookie({
      name: STATE_COOKIE,
      secret: params.sessionSecret,
      maxAgeSeconds: STATE_TTL_SECONDS,
      secure: params.secure,
    }, { state, next: normalizeNext(params.next) }),
  };
}

export function clearSessionCookie(secure: boolean): string {
  return clearCookie(SESSION_COOKIE, secure);
}

export function clearOauthStateCookie(secure: boolean): string {
  return clearCookie(STATE_COOKIE, secure);
}

export function readSession(cookieHeader: string | undefined, sessionSecret: string): SessionPayload | undefined {
  return verifySignedCookie<SessionPayload>(cookieHeader, SESSION_COOKIE, sessionSecret);
}

export function readOauthState(cookieHeader: string | undefined, sessionSecret: string): StatePayload | undefined {
  return verifySignedCookie<StatePayload>(cookieHeader, STATE_COOKIE, sessionSecret);
}

export function normalizeNext(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\r") || value.includes("\n")) {
    return "/";
  }
  return value;
}
