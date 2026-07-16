import { createHmac, timingSafeEqual } from "node:crypto";

const LOCAL_ACCESS_CONTEXT = "mlclaw-local-access-v1";

export function deriveLocalAccessToken(sessionSecret: string): string {
  return createHmac("sha256", sessionSecret).update(LOCAL_ACCESS_CONTEXT).digest("base64url");
}

export function localAccessTokenMatches(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
