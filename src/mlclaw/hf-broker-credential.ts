import { createHash } from "node:crypto";
import type { HubIdentity } from "./hub-api.js";

export const HF_TOKEN_CREATE_URL = "https://huggingface.co/settings/tokens/new?tokenType=fineGrained";

export type BrokerCredentialMetadata = {
  credentialKind: "fine_grained_user_token";
  account: string;
  fingerprintSha256: string;
  verifiedAt: string;
};

export type BrokerCredentialAssessment = { status: "sufficient" } | { status: "unsupported"; reason: string };

export function buildBrokerTokenUrl(): string {
  return HF_TOKEN_CREATE_URL;
}

export function assessBrokerCredential(identity: HubIdentity): BrokerCredentialAssessment {
  const accessToken = identity.auth?.accessToken;
  if (accessToken?.role !== "fineGrained") {
    return {
      status: "unsupported",
      reason: "HF Broker requires a dedicated fine-grained Hugging Face token",
    };
  }
  if (!accessToken.fineGrained) {
    return {
      status: "unsupported",
      reason: "Hugging Face omitted this fine-grained token's permission details",
    };
  }
  return { status: "sufficient" };
}

export function brokerCredentialMetadata(
  token: string,
  identity: HubIdentity,
  verifiedAt: Date,
): BrokerCredentialMetadata {
  return {
    credentialKind: "fine_grained_user_token",
    account: identity.name,
    fingerprintSha256: createHash("sha256").update(token).digest("hex"),
    verifiedAt: verifiedAt.toISOString(),
  };
}
