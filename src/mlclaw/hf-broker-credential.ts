import type { HubFineGrainedScope, HubIdentity } from "./hub-api.js";

export const HF_TOKEN_CREATE_URL = "https://huggingface.co/settings/tokens/new";

export const BROKER_PERSONAL_PERMISSIONS = [
  "collection.read",
  "collection.write",
  "discussion.write",
  "inference.endpoints.infer.write",
  "inference.endpoints.write",
  "inference.serverless.write",
  "job.write",
  "repo.access.read",
  "repo.content.read",
  "repo.write",
  "resourceGroup.write",
  "sql-console.embed.write",
  "user.billing.read",
  "user.mcp.read",
  "user.notifications.read",
  "user.notifications.write",
  "user.papers.write",
  "user.preferences.write",
  "user.settings.notifications.write",
  "user.social.likes.write",
  "user.webhooks.read",
  "user.webhooks.write",
] as const;

export const BROKER_GLOBAL_PERMISSIONS = ["discussion.write", "post.write"] as const;

export const BROKER_ORGANIZATION_PERMISSIONS = [
  "collection.read",
  "collection.write",
  "discussion.write",
  "inference.endpoints.infer.write",
  "inference.endpoints.write",
  "inference.serverless.write",
  "job.write",
  "org.auditLog.write",
  "org.billing.read",
  "org.members.read",
  "org.members.write",
  "org.networkSecurity.read",
  "org.networkSecurity.write",
  "org.read",
  "org.repos.read",
  "org.serviceAccounts.read",
  "org.serviceAccounts.write",
  "org.write",
  "repo.access.read",
  "repo.content.read",
  "repo.write",
  "resourceGroup.write",
  "sql-console.embed.write",
] as const;

export type BrokerCredentialAssessment =
  { status: "sufficient" } | { status: "insufficient"; missing: string[] } | { status: "unknown"; reason: string };

export function buildBrokerTokenUrl(owner: string, accountName: string): string {
  const url = new URL(HF_TOKEN_CREATE_URL);
  url.searchParams.set("tokenType", "fineGrained");
  for (const permission of BROKER_PERSONAL_PERMISSIONS) {
    url.searchParams.append("ownUserPermissions", permission);
  }
  for (const permission of BROKER_GLOBAL_PERMISSIONS) {
    url.searchParams.append("globalPermissions", permission);
  }
  url.searchParams.set("canReadGatedRepos", "true");
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
  if (accessToken?.role === "write") {
    return { status: "sufficient" };
  }
  if (accessToken?.role === "read") {
    return { status: "insufficient", missing: requiredPermissions(owner, identity.name) };
  }
  if (accessToken?.role !== "fineGrained") {
    return {
      status: "unknown",
      reason: "Hugging Face does not expose permission details for this login credential",
    };
  }
  if (!accessToken.fineGrained) {
    return { status: "unknown", reason: "Hugging Face omitted this fine-grained token's permission details" };
  }

  const personalAvailable = new Set(scopedPermissions(accessToken.fineGrained.scoped, "user", identity.name));
  const globalAvailable = new Set(accessToken.fineGrained.global);
  const missing = BROKER_PERSONAL_PERMISSIONS.filter((permission) => !personalAvailable.has(permission)).map(String);
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

function scopedPermissions(scopes: HubFineGrainedScope[], type: string, name: string): string[] {
  if (!Array.isArray(scopes)) return [];
  return scopes
    .filter((scope) => scope.entity.type === type && (!scope.entity.name || scope.entity.name === name))
    .flatMap((scope) => scope.permissions);
}

function requiredPermissions(owner: string, accountName: string): string[] {
  return [
    ...BROKER_PERSONAL_PERMISSIONS,
    ...BROKER_GLOBAL_PERMISSIONS.map((permission) => `global:${permission}`),
    "canReadGatedRepos",
    ...(owner === accountName ? [] : BROKER_ORGANIZATION_PERMISSIONS.map((permission) => `org:${permission}`)),
  ].sort();
}
