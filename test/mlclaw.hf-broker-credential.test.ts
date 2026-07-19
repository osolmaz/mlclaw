import { describe, expect, it } from "vitest";
import {
  assessBrokerCredential,
  brokerCredentialMetadata,
  buildBrokerTokenUrl,
  HF_TOKEN_CREATE_URL,
} from "../src/mlclaw/hf-broker-credential.js";
import type { HubIdentity } from "../src/mlclaw/hub-api.js";

describe("HF Broker credential policy", () => {
  it("opens an empty fine-grained token form", () => {
    const url = new URL(buildBrokerTokenUrl());

    expect(url.toString()).toBe(HF_TOKEN_CREATE_URL);
    expect(url.searchParams.get("tokenType")).toBe("fineGrained");
    expect(url.searchParams.getAll("ownUserPermissions")).toEqual([]);
    expect(url.searchParams.getAll("globalPermissions")).toEqual([]);
    expect(url.searchParams.getAll("orgPermissions")).toEqual([]);
    expect(url.searchParams.getAll("orgs")).toEqual([]);
    expect(url.toString()).not.toContain("hf_");
  });

  it("accepts a dedicated fine-grained token without imposing a permission profile", () => {
    expect(assessBrokerCredential(fineGrainedIdentity())).toEqual({ status: "sufficient" });
  });

  it("rejects legacy write tokens", () => {
    expect(assessBrokerCredential(identity({ type: "access_token", accessToken: { role: "write" } }))).toEqual({
      status: "unsupported",
      reason: "HF Broker requires a dedicated fine-grained Hugging Face token",
    });
  });

  it("rejects opaque OAuth credentials", () => {
    expect(assessBrokerCredential(identity({ type: "oauth" }))).toEqual({
      status: "unsupported",
      reason: "HF Broker requires a dedicated fine-grained Hugging Face token",
    });
  });

  it("rejects fine-grained credentials whose metadata is omitted", () => {
    expect(assessBrokerCredential(identity({ type: "access_token", accessToken: { role: "fineGrained" } }))).toEqual({
      status: "unsupported",
      reason: "Hugging Face omitted this fine-grained token's permission details",
    });
  });

  it("records only secret-free credential identity metadata", () => {
    const metadata = brokerCredentialMetadata("hf_secret", fineGrainedIdentity(), new Date("2026-07-19T00:00:00Z"));

    expect(metadata).toEqual({
      credentialKind: "fine_grained_user_token",
      account: "alice",
      fingerprintSha256: "108bb086b4d27560850369270e94c892a27977da0772782a127962c0569b202e",
      verifiedAt: "2026-07-19T00:00:00.000Z",
    });
    expect(JSON.stringify(metadata)).not.toContain("hf_secret");
  });
});

function identity(auth: NonNullable<HubIdentity["auth"]>): HubIdentity {
  return { name: "alice", organizations: ["research-org"], auth };
}

function fineGrainedIdentity(): HubIdentity {
  return identity({
    type: "access_token",
    accessToken: {
      role: "fineGrained",
      fineGrained: {
        global: [],
        scoped: [],
        canReadGatedRepos: false,
      },
    },
  });
}
