import { BucketClient, BucketHttpError, HUB_URL } from "../hf-bucket-client/client.js";

export class HubApiError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    body: string,
  ) {
    super(`Hub request failed: ${status} ${url}: ${body.slice(0, 500)}`);
    this.name = "HubApiError";
  }
}

type SpaceSecret = { key: string; updatedAt?: string };
type SpaceVariable = { key: string; value?: string; updatedAt?: string };
export type SpaceVolume = {
  type: "bucket" | "model" | "dataset" | "space";
  source: string;
  mountPath?: string;
  mount_path?: string;
  readOnly?: boolean;
  read_only?: boolean;
  revision?: string;
  path?: string;
};
export type SpaceRuntime = {
  stage?: string;
  hardware?: unknown;
  requested_hardware?: unknown;
  sleep_time?: number;
  volumes?: SpaceVolume[] | null;
};
type SpaceInfo = {
  private?: boolean;
  runtime?: SpaceRuntime | null;
};
export type SpaceVisibility = "private" | "protected" | "public";
type RepositorySettingsEntry = { id?: string; type?: string; visibility?: SpaceVisibility };
export type HubCommitFile = { path: string; content: Uint8Array | Buffer };
type ModelInfo = { sha?: string };

export type HubFineGrainedScope = {
  entity: { type: string; name?: string };
  permissions: string[];
};

export type HubIdentity = {
  name: string;
  organizations: string[];
  auth?: {
    type?: string;
    accessToken?: {
      role?: string;
      fineGrained?: {
        global: string[];
        scoped: HubFineGrainedScope[];
        canReadGatedRepos: boolean;
      };
    };
  };
};

export class HubApi {
  private readonly hubUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;

  constructor(params: { token: string; hubUrl?: string; fetch?: typeof fetch }) {
    this.token = params.token;
    this.hubUrl = params.hubUrl ?? HUB_URL;
    this.fetchImpl = params.fetch ?? fetch;
  }

  bucket(bucket: string): BucketClient {
    return new BucketClient({ bucket, accessToken: this.token, hubUrl: this.hubUrl, fetch: this.fetchImpl });
  }

  async whoami(): Promise<HubIdentity> {
    return parseHubIdentity(await this.requestJson("/api/whoami-v2"));
  }

  async createBucket(bucketId: string, privateBucket = true): Promise<void> {
    const [namespace, name] = splitRepoId(bucketId);
    try {
      await this.requestJson(`/api/buckets/${namespace}/${name}`, {
        method: "POST",
        body: JSON.stringify({ private: privateBucket }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      if (err instanceof HubApiError && err.status === 409) {
        return;
      }
      throw err;
    }
  }

  async bucketExists(bucketId: string): Promise<boolean> {
    try {
      await this.bucket(bucketId).assertBucketAccessible();
      return true;
    } catch (err) {
      if (err instanceof BucketHttpError && err.status === 404) {
        return false;
      }
      throw err;
    }
  }

  async listBuckets(namespace?: string): Promise<string[]> {
    const buckets: string[] = [];
    let url: string | null = `${this.hubUrl}/api/buckets/${encodeURIComponent(namespace ?? "me")}`;
    while (url) {
      const response = await this.request(url);
      const page = (await response.json()) as Array<{ id?: string; name?: string }>;
      for (const bucket of page) {
        const id = bucket.id ?? bucket.name;
        if (typeof id === "string" && id.includes("/")) buckets.push(id);
      }
      url = nextLink(response.headers.get("link"));
    }
    return [...new Set(buckets)].sort();
  }

  async deploymentControlStore(
    owner: string,
    deploymentId: string,
  ): Promise<{
    read(): Promise<{ value: unknown | null; revision: string }>;
    compareAndSwap(expectedRevision: string, value: unknown | null): Promise<string>;
  }> {
    const repoId = `${owner}/mlclaw-control-${deploymentId.replaceAll("-", "")}`;
    await this.ensurePrivateModelRepo(repoId);
    const path = "control-lease.json";
    return {
      read: async () => await this.readModelDocument(repoId, path),
      compareAndSwap: async (expectedRevision, value) =>
        await this.commitModelDocument(repoId, path, expectedRevision, value),
    };
  }

  async deploymentClaimStore(owner: string): Promise<{
    read(): Promise<{ value: unknown | null; revision: string }>;
    compareAndSwap(expectedRevision: string, value: unknown | null): Promise<string>;
  }> {
    const repoId = `${owner}/mlclaw-control-claims`;
    await this.ensurePrivateModelRepo(repoId);
    const path = "control-lease.json";
    return {
      read: async () => await this.readModelDocument(repoId, path),
      compareAndSwap: async (expectedRevision, value) =>
        await this.commitModelDocument(repoId, path, expectedRevision, value),
    };
  }

  async createDockerSpace(
    repoId: string,
    options?: { visibility?: "protected" | "public"; hardware?: string; sleepTimeSeconds?: number },
  ): Promise<void> {
    const [owner, name] = splitRepoId(repoId);
    const me = await this.whoami();
    const payload: Record<string, unknown> = {
      name,
      organization: owner === me.name ? null : owner,
      type: "space",
      sdk: "docker",
      visibility: options?.visibility ?? "protected",
    };
    if (options?.hardware) {
      payload.hardware = options.hardware;
    }
    if (typeof options?.sleepTimeSeconds === "number") {
      payload.sleepTimeSeconds = options.sleepTimeSeconds;
    }
    try {
      await this.requestJson("/api/repos/create", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      if (err instanceof HubApiError && err.status === 409) {
        return;
      }
      throw err;
    }
  }

  async spaceExists(repoId: string): Promise<boolean> {
    try {
      await this.requestJson(`/api/spaces/${repoId}`);
      return true;
    } catch (err) {
      if (err instanceof HubApiError && err.status === 404) {
        return false;
      }
      throw err;
    }
  }

  async getSpaceVisibility(repoId: string): Promise<SpaceVisibility> {
    const [owner] = splitRepoId(repoId);
    const me = await this.whoami();
    let url: string | null =
      owner === me.name
        ? `${this.hubUrl}/api/settings/repositories`
        : `${this.hubUrl}/api/organizations/${encodeURIComponent(owner)}/settings/repositories`;
    while (url) {
      const response = await this.request(url);
      const repositories = (await response.json()) as RepositorySettingsEntry[];
      const visibility = repositories.find((repo) => repo.id === repoId && repo.type === "space")?.visibility;
      if (visibility === "private" || visibility === "protected" || visibility === "public") {
        return visibility;
      }
      url = nextLink(response.headers.get("link"));
    }
    throw new Error(`Hub repository settings omitted Space visibility for ${repoId}`);
  }

  async updateSpaceVisibility(repoId: string, visibility: "protected" | "public"): Promise<void> {
    await this.requestJson(`/api/spaces/${repoId}/settings`, {
      method: "PUT",
      body: JSON.stringify({ visibility }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async addSpaceVariable(repoId: string, key: string, value: string): Promise<void> {
    await this.requestJson(`/api/spaces/${repoId}/variables`, {
      method: "POST",
      body: JSON.stringify({ key, value }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async deleteSpaceVariable(repoId: string, key: string): Promise<void> {
    await this.requestJson(`/api/spaces/${repoId}/variables`, {
      method: "DELETE",
      body: JSON.stringify({ key }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async getSpaceVariables(repoId: string): Promise<Map<string, SpaceVariable>> {
    const raw = await this.requestJson<Record<string, SpaceVariable>>(`/api/spaces/${repoId}/variables`);
    return new Map(Object.entries(raw));
  }

  async addSpaceSecret(repoId: string, key: string, value: string): Promise<void> {
    await this.requestJson(`/api/spaces/${repoId}/secrets`, {
      method: "POST",
      body: JSON.stringify({ key, value }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async getSpaceSecrets(repoId: string): Promise<Map<string, SpaceSecret>> {
    const raw = await this.requestJson<Record<string, SpaceSecret>>(`/api/spaces/${repoId}/secrets`);
    return new Map(Object.entries(raw));
  }

  async deleteSpaceSecret(repoId: string, key: string): Promise<void> {
    try {
      await this.requestJson(`/api/spaces/${repoId}/secrets`, {
        method: "DELETE",
        body: JSON.stringify({ key }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      if (err instanceof HubApiError && err.status === 404) {
        return;
      }
      throw err;
    }
  }

  async restartSpace(repoId: string, factoryReboot = false): Promise<void> {
    await this.requestJson(`/api/spaces/${repoId}/restart`, {
      method: "POST",
      body: JSON.stringify({ factoryReboot }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async pauseSpace(repoId: string): Promise<SpaceRuntime> {
    return await this.requestJson<SpaceRuntime>(`/api/spaces/${repoId}/pause`, {
      method: "POST",
    });
  }

  async requestSpaceHardware(repoId: string, hardware: string, sleepTimeSeconds?: number): Promise<SpaceRuntime> {
    const payload: Record<string, unknown> = { flavor: hardware };
    if (typeof sleepTimeSeconds === "number") {
      payload.sleepTimeSeconds = sleepTimeSeconds;
    }
    return await this.requestJson<SpaceRuntime>(`/api/spaces/${repoId}/hardware`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
  }

  async setSpaceSleepTime(repoId: string, seconds: number): Promise<SpaceRuntime> {
    return await this.requestJson<SpaceRuntime>(`/api/spaces/${repoId}/sleeptime`, {
      method: "POST",
      body: JSON.stringify({ seconds }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async getSpaceRuntime(repoId: string): Promise<SpaceRuntime> {
    const runtime = await this.requestJson<SpaceRuntime>(`/api/spaces/${repoId}/runtime`);
    if (Array.isArray(runtime.volumes)) {
      return runtime;
    }
    try {
      const info = await this.requestJson<SpaceInfo>(`/api/spaces/${repoId}`);
      if (Array.isArray(info.runtime?.volumes)) {
        return { ...runtime, volumes: info.runtime.volumes };
      }
    } catch {
      // The runtime endpoint is still authoritative for status. Callers
      // fail closed if volume metadata is unavailable from either endpoint.
    }
    return runtime;
  }

  async setSpaceVolumes(repoId: string, volumes: SpaceVolume[]): Promise<void> {
    await this.requestJson(`/api/spaces/${repoId}/volumes`, {
      method: "PUT",
      body: JSON.stringify({ volumes }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async fetchSpaceLogs(repoId: string, kind: "run" | "build" = "run"): Promise<string> {
    const url = `${this.hubUrl}/api/spaces/${repoId}/logs/${kind}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: "text/event-stream" },
      signal: controller.signal,
    });
    if (!response.ok) {
      clearTimeout(timeout);
      throw new HubApiError(response.status, url, await response.text());
    }
    const reader = response.body?.getReader();
    if (!reader) {
      clearTimeout(timeout);
      return "";
    }
    const decoder = new TextDecoder();
    let raw = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
    } catch (err) {
      if (!(err instanceof Error) || (err.name !== "AbortError" && err.name !== "TimeoutError")) {
        throw err;
      }
    } finally {
      clearTimeout(timeout);
    }
    return sseDataToText(raw);
  }

  async fetchSpaceLogsTextFallback(repoId: string, kind: "run" | "build" = "run"): Promise<string> {
    const response = await this.request(
      `/api/spaces/${repoId}/logs/${kind}`,
      {
        headers: { Accept: "text/event-stream" },
        signal: AbortSignal.timeout(5000),
      },
      true,
    );
    return sseDataToText(await response.text());
  }

  async listSpaceFiles(repoId: string): Promise<string[]> {
    const raw = await this.requestJson<{ siblings?: Array<{ rfilename?: string }> }>(`/api/spaces/${repoId}`);
    return (raw.siblings ?? [])
      .map((sibling) => sibling.rfilename)
      .filter((name): name is string => typeof name === "string" && name.length > 0)
      .sort();
  }

  async commitSpaceFiles(
    repoId: string,
    params: {
      files: HubCommitFile[];
      deletePaths?: string[];
      title: string;
      description?: string;
      branch?: string;
    },
  ): Promise<void> {
    const body = [
      {
        key: "header",
        value: {
          summary: params.title,
          description: params.description,
        },
      },
      ...params.files.map((file) => ({
        key: "file",
        value: {
          path: file.path,
          content: Buffer.from(file.content).toString("base64"),
          encoding: "base64",
        },
      })),
      ...(params.deletePaths ?? []).map((path) => ({
        key: "deletedFile",
        value: { path },
      })),
    ]
      .map((entry) => JSON.stringify(entry))
      .join("\n");

    await this.request(`/api/spaces/${repoId}/commit/${encodeURIComponent(params.branch ?? "main")}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body,
    });
  }

  private async ensurePrivateModelRepo(repoId: string): Promise<void> {
    const [owner, name] = splitRepoId(repoId);
    const me = await this.whoami();
    try {
      await this.requestJson("/api/repos/create", {
        method: "POST",
        body: JSON.stringify({
          name,
          organization: owner === me.name ? null : owner,
          type: "model",
          private: true,
        }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (!(error instanceof HubApiError) || error.status !== 409) throw error;
    }
    const info = await this.requestJson<ModelInfo>(`/api/models/${repoId}`);
    if (info.sha) return;
    await this.commitModelDocument(repoId, "README.md", "", "# ML Claw deployment control\n");
  }

  private async readModelDocument(repoId: string, path: string): Promise<{ value: unknown | null; revision: string }> {
    const info = await this.requestJson<ModelInfo>(`/api/models/${repoId}`);
    if (!info.sha) throw new Error(`control repository ${repoId} has no revision`);
    const url = `${this.hubUrl}/${repoId}/resolve/${info.sha}/${path.split("/").map(encodeURIComponent).join("/")}`;
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (response.status === 404) return { value: null, revision: info.sha };
    if (!response.ok) throw new HubApiError(response.status, url, await response.text());
    return { value: JSON.parse(await response.text()), revision: info.sha };
  }

  private async commitModelDocument(
    repoId: string,
    path: string,
    parentCommit: string,
    value: unknown | null,
  ): Promise<string> {
    const header: Record<string, string> = {
      summary: value === null ? "Release deployment control" : "Update deployment control",
      description: "ML Claw deployment reconciliation state",
    };
    if (parentCommit) header.parentCommit = parentCommit;
    const operation =
      value === null
        ? { key: "deletedFile", value: { path } }
        : {
            key: "file",
            value: {
              path,
              content: Buffer.from(typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`).toString(
                "base64",
              ),
              encoding: "base64",
            },
          };
    const body = [{ key: "header", value: header }, operation].map((entry) => JSON.stringify(entry)).join("\n");
    try {
      const response = await this.request(`/api/models/${repoId}/commit/main`, {
        method: "POST",
        headers: { "Content-Type": "application/x-ndjson" },
        body,
      });
      const result = (await response.json()) as { commitOid?: string };
      if (!result.commitOid) throw new Error("Hub commit response omitted commitOid");
      return result.commitOid;
    } catch (error) {
      if (error instanceof HubApiError && (error.status === 409 || error.status === 412)) {
        throw new Error("deployment control lease changed concurrently", { cause: error });
      }
      throw error;
    }
  }

  async assertBucketAccessible(bucketId: string): Promise<void> {
    try {
      await this.bucket(bucketId).assertBucketAccessible();
    } catch (err) {
      if (err instanceof BucketHttpError) {
        throw new Error(`bucket ${bucketId} is not accessible: ${err.message}`);
      }
      throw err;
    }
  }

  private async requestJson<T = unknown>(pathOrUrl: string, init?: RequestInit): Promise<T> {
    const response = await this.request(pathOrUrl, init);
    return (await response.json()) as T;
  }

  private async request(pathOrUrl: string, init?: RequestInit, tolerateAbort = false): Promise<Response> {
    const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${this.hubUrl}${pathOrUrl}`;
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        ...init,
        headers: { Authorization: `Bearer ${this.token}`, ...init?.headers },
      });
    } catch (err) {
      if (tolerateAbort && err instanceof Error && err.name === "TimeoutError") {
        throw err;
      }
      throw err;
    }
    if (!response.ok) {
      throw new HubApiError(response.status, url, await response.text());
    }
    return response;
  }
}

export function parseHubIdentity(value: unknown): HubIdentity {
  const root = record(value);
  const name = stringValue(root.name);
  if (!name) {
    throw new Error("Hugging Face identity response omitted the account name");
  }

  const organizations = Array.isArray(root.orgs)
    ? root.orgs.map((entry) => stringValue(record(entry).name)).filter((entry): entry is string => Boolean(entry))
    : [];
  const auth = record(root.auth);
  const accessToken = record(auth.accessToken);
  const fineGrained = record(accessToken.fineGrained);
  const authType = stringValue(auth.type);
  const accessTokenRole = stringValue(accessToken.role);
  const scoped = Array.isArray(fineGrained.scoped)
    ? fineGrained.scoped.map(parseFineGrainedScope).filter((entry): entry is HubFineGrainedScope => Boolean(entry))
    : [];
  const global = stringArray(fineGrained.global);
  const canReadGatedRepos = fineGrained.canReadGatedRepos === true;
  const parsedAccessToken = {
    ...(accessTokenRole ? { role: accessTokenRole } : {}),
    ...(Object.keys(fineGrained).length > 0 ? { fineGrained: { global, scoped, canReadGatedRepos } } : {}),
  };
  const parsedAuth = {
    ...(authType ? { type: authType } : {}),
    ...(Object.keys(parsedAccessToken).length > 0 ? { accessToken: parsedAccessToken } : {}),
  };

  return {
    name,
    organizations: [...new Set(organizations)].sort(),
    ...(Object.keys(parsedAuth).length > 0 ? { auth: parsedAuth } : {}),
  };
}

function parseFineGrainedScope(value: unknown): HubFineGrainedScope | undefined {
  const scope = record(value);
  const entity = record(scope.entity);
  const type = stringValue(entity.type);
  if (!type) return undefined;
  const name = stringValue(entity.name);
  return {
    entity: { type, ...(name ? { name } : {}) },
    permissions: stringArray(scope.permissions),
  };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim())))]
        .map((entry) => entry.trim())
        .sort()
    : [];
}

export function splitRepoId(repoId: string): [string, string] {
  const parts = repoId.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`expected repo id as owner/name, got ${repoId}`);
  }
  return [parts[0], parts[1]];
}

function sseDataToText(raw: string): string {
  const lines: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) {
      continue;
    }
    const data = line.slice("data:".length).trim();
    if (!data || !data.startsWith("{")) {
      continue;
    }
    try {
      const parsed = JSON.parse(data) as { data?: string };
      if (typeof parsed.data === "string") {
        lines.push(parsed.data);
      }
    } catch {
      // Ignore malformed SSE fragments.
    }
  }
  return lines.join("");
}

function nextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match?.[1]) return match[1];
  }
  return null;
}
