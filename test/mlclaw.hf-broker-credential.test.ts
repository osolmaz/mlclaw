import { describe, expect, it } from "vitest";
import {
  assessBrokerCredential,
  BROKER_GLOBAL_PERMISSIONS,
  BROKER_ORGANIZATION_PERMISSIONS,
  BROKER_PERSONAL_PERMISSIONS,
  buildBrokerTokenUrl,
  HF_TOKEN_CREATE_URL,
} from "../src/mlclaw/hf-broker-credential.js";
import type { HubIdentity } from "../src/mlclaw/hub-api.js";

describe("HF Broker credential policy", () => {
  it("builds a personal fine-grained token form without secret material", () => {
    const url = new URL(buildBrokerTokenUrl("alice", "alice"));

    expect(`${url.origin}${url.pathname}`).toBe(HF_TOKEN_CREATE_URL);
    expect(url.searchParams.get("tokenType")).toBe("fineGrained");
    expect(url.searchParams.get("canReadGatedRepos")).toBe("true");
    expect(url.searchParams.getAll("ownUserPermissions")).toEqual(BROKER_PERSONAL_PERMISSIONS);
    expect(url.searchParams.getAll("globalPermissions")).toEqual(BROKER_GLOBAL_PERMISSIONS);
    expect(url.searchParams.getAll("orgs")).toEqual([]);
    expect(url.toString()).not.toContain("hf_");
  });

  it("adds isolated organization permissions for an organization deployment", () => {
    const url = new URL(buildBrokerTokenUrl("research-org", "alice"));

    expect(url.searchParams.getAll("orgs")).toEqual(["research-org"]);
    expect(url.searchParams.getAll("orgPermissions")).toEqual(BROKER_ORGANIZATION_PERMISSIONS);
    expect(url.searchParams.getAll("ownUserPermissions")).toEqual(BROKER_PERSONAL_PERMISSIONS);
  });

  it("accepts legacy write tokens", () => {
    expect(
      assessBrokerCredential(identity({ type: "access_token", accessToken: { role: "write" } }), "research-org"),
    ).toEqual({ status: "sufficient" });
  });

  it("accepts a complete personal fine-grained token", () => {
    expect(assessBrokerCredential(fineGrainedIdentity(), "alice")).toEqual({ status: "sufficient" });
  });

  it("requires permissions on the selected organization scope", () => {
    const candidate = fineGrainedIdentity([
      {
        entity: { type: "org", name: "other-org" },
        permissions: [...BROKER_ORGANIZATION_PERMISSIONS],
      },
    ]);

    const result = assessBrokerCredential(candidate, "research-org");

    expect(result.status).toBe("insufficient");
    if (result.status === "insufficient") {
      expect(result.missing).toContain("org:repo.write");
      expect(result.missing).toContain("org:inference.endpoints.write");
    }
  });

  it("reports exact missing fine-grained permissions", () => {
    const candidate = fineGrainedIdentity(
      [],
      BROKER_PERSONAL_PERMISSIONS.filter((value) => value !== "job.write"),
    );

    expect(assessBrokerCredential(candidate, "alice")).toEqual({ status: "insufficient", missing: ["job.write"] });
  });

  it("requires personal and global grants independently", () => {
    const missingPersonal = fineGrainedIdentity(
      [],
      BROKER_PERSONAL_PERMISSIONS.filter((value) => value !== "discussion.write"),
    );
    const missingGlobal = fineGrainedIdentity([], BROKER_PERSONAL_PERMISSIONS, []);

    expect(assessBrokerCredential(missingPersonal, "alice")).toEqual({
      status: "insufficient",
      missing: ["discussion.write"],
    });
    expect(assessBrokerCredential(missingGlobal, "alice")).toEqual({
      status: "insufficient",
      missing: ["global:discussion.write", "global:post.write"],
    });
  });

  it("requires gated-repository access", () => {
    const candidate = fineGrainedIdentity([], BROKER_PERSONAL_PERMISSIONS, BROKER_GLOBAL_PERMISSIONS, false);

    expect(assessBrokerCredential(candidate, "alice")).toEqual({
      status: "insufficient",
      missing: ["canReadGatedRepos"],
    });
  });

  it("does not claim opaque OAuth credentials are insufficient", () => {
    expect(assessBrokerCredential(identity({ type: "oauth" }), "alice")).toEqual({
      status: "unknown",
      reason: "Hugging Face does not expose permission details for this login credential",
    });
  });

  it("reports fine-grained credentials whose metadata is omitted as unknown", () => {
    expect(
      assessBrokerCredential(identity({ type: "access_token", accessToken: { role: "fineGrained" } }), "alice"),
    ).toEqual({
      status: "unknown",
      reason: "Hugging Face omitted this fine-grained token's permission details",
    });
  });
});

function identity(auth: NonNullable<HubIdentity["auth"]>): HubIdentity {
  return { name: "alice", organizations: ["research-org"], auth };
}

function fineGrainedIdentity(
  extraScopes: NonNullable<NonNullable<NonNullable<HubIdentity["auth"]>["accessToken"]>["fineGrained"]>["scoped"] = [],
  personalPermissions: readonly string[] = BROKER_PERSONAL_PERMISSIONS,
  globalPermissions: readonly string[] = BROKER_GLOBAL_PERMISSIONS,
  canReadGatedRepos = true,
): HubIdentity {
  return identity({
    type: "access_token",
    accessToken: {
      role: "fineGrained",
      fineGrained: {
        global: [...globalPermissions],
        scoped: [{ entity: { type: "user", name: "alice" }, permissions: [...personalPermissions] }, ...extraScopes],
        canReadGatedRepos,
      },
    },
  });
}
