import { createHash } from "node:crypto";
import { z } from "zod";
import rawProfile from "./hf-broker-credential-requirements.json" with { type: "json" };
import type { HubFineGrainedScope, HubIdentity } from "./hub-api.js";

const permissionListSchema = z
  .array(z.string().min(1))
  .min(1)
  .superRefine((permissions, context) => {
    if (permissions.some((permission) => permission !== permission.trim())) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "permissions must not contain outer whitespace" });
    }
    if (new Set(permissions).size !== permissions.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "permissions must be unique" });
    }
    if (permissions.some((permission, index) => index > 0 && permission < (permissions[index - 1] as string))) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "permissions must be sorted" });
    }
  });

const profileSchema = z
  .object({
    version: z.literal(1),
    profile_id: z.literal("hf-broker-complete-v1"),
    token_form_url: z.literal("https://huggingface.co/settings/tokens/new"),
    token_type: z.literal("fineGrained"),
    requires_gated_repositories: z.literal(true),
    personal_permissions: permissionListSchema,
    global_permissions: permissionListSchema,
    organization_permissions: permissionListSchema,
  })
  .strict();

export const BROKER_CREDENTIAL_PROFILE = Object.freeze(profileSchema.parse(rawProfile));
export const HF_TOKEN_CREATE_URL = BROKER_CREDENTIAL_PROFILE.token_form_url;
export const BROKER_PERSONAL_PERMISSIONS = BROKER_CREDENTIAL_PROFILE.personal_permissions;
export const BROKER_GLOBAL_PERMISSIONS = BROKER_CREDENTIAL_PROFILE.global_permissions;
export const BROKER_ORGANIZATION_PERMISSIONS = BROKER_CREDENTIAL_PROFILE.organization_permissions;

export type BrokerCredentialMetadata = {
  profileId: typeof BROKER_CREDENTIAL_PROFILE.profile_id;
  account: string;
  fingerprintSha256: string;
  verifiedAt: string;
};

export type BrokerCredentialAssessment =
  { status: "sufficient" } | { status: "insufficient"; missing: string[] } | { status: "unsupported"; reason: string };

export function buildBrokerTokenUrl(owner: string, accountName: string): string {
  const url = new URL(HF_TOKEN_CREATE_URL);
  url.searchParams.set("tokenType", BROKER_CREDENTIAL_PROFILE.token_type);
  for (const permission of BROKER_PERSONAL_PERMISSIONS) {
    url.searchParams.append("ownUserPermissions", permission);
  }
  for (const permission of BROKER_GLOBAL_PERMISSIONS) {
    url.searchParams.append("globalPermissions", permission);
  }
  url.searchParams.set("canReadGatedRepos", String(BROKER_CREDENTIAL_PROFILE.requires_gated_repositories));
  if (owner !== accountName) {
    url.searchParams.append("orgs", owner);
    for (const permission of BROKER_ORGANIZATION_PERMISSIONS) {
      url.searchParams.append("orgPermissions", permission);
    }
  }
  return url.toString();
}

export function assessBrokerCredential(identity: HubIdentity, owner: string): BrokerCredentialAssessment {
  const accessToken = identity.auth?.accessToken;
  if (accessToken?.role !== BROKER_CREDENTIAL_PROFILE.token_type) {
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

  const personalAvailable = new Set(scopedPermissions(accessToken.fineGrained.scoped, "user", identity.name));
  const globalAvailable = new Set(accessToken.fineGrained.global);
  const missing = BROKER_PERSONAL_PERMISSIONS.filter((permission) => !personalAvailable.has(permission));
  missing.push(
    ...BROKER_GLOBAL_PERMISSIONS.filter((permission) => !globalAvailable.has(permission)).map(
      (permission) => `global:${permission}`,
    ),
  );
  if (!accessToken.fineGrained.canReadGatedRepos) {
    missing.push("canReadGatedRepos");
  }
  if (owner !== identity.name) {
    const organizationAvailable = new Set(scopedPermissions(accessToken.fineGrained.scoped, "org", owner));
    missing.push(
      ...BROKER_ORGANIZATION_PERMISSIONS.filter((permission) => !organizationAvailable.has(permission)).map(
        (permission) => `org:${permission}`,
      ),
    );
  }
  missing.sort();
  return missing.length === 0 ? { status: "sufficient" } : { status: "insufficient", missing };
}

export function brokerCredentialMetadata(
  token: string,
  identity: HubIdentity,
  verifiedAt: Date,
): BrokerCredentialMetadata {
  return {
    profileId: BROKER_CREDENTIAL_PROFILE.profile_id,
    account: identity.name,
    fingerprintSha256: createHash("sha256").update(token).digest("hex"),
    verifiedAt: verifiedAt.toISOString(),
  };
}

function scopedPermissions(scopes: HubFineGrainedScope[], type: string, name: string): string[] {
  if (!Array.isArray(scopes)) return [];
  return scopes
    .filter((scope) => scope.entity.type === type && (!scope.entity.name || scope.entity.name === name))
    .flatMap((scope) => scope.permissions);
}
