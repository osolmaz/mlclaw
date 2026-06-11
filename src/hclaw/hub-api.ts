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
export type SpaceRuntime = { stage?: string; hardware?: unknown; requested_hardware?: unknown };
export type HubCommitFile = { path: string; content: Uint8Array | Buffer };

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

  async whoami(): Promise<{ name: string }> {
    return await this.requestJson<{ name: string }>("/api/whoami-v2");
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

  async createDockerSpace(repoId: string, options?: { private?: boolean; hardware?: string }): Promise<void> {
    const [owner, name] = splitRepoId(repoId);
    const me = await this.whoami();
    const payload: Record<string, unknown> = {
      name,
      organization: owner === me.name ? null : owner,
      type: "space",
      sdk: "docker",
      private: options?.private !== false,
    };
    if (options?.hardware) {
      payload.hardware = options.hardware;
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

  async restartSpace(repoId: string, factoryReboot = false): Promise<void> {
    await this.requestJson(`/api/spaces/${repoId}/restart`, {
      method: "POST",
      body: JSON.stringify({ factoryReboot }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async getSpaceRuntime(repoId: string): Promise<SpaceRuntime> {
    return await this.requestJson<SpaceRuntime>(`/api/spaces/${repoId}/runtime`);
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
    const response = await this.request(`/api/spaces/${repoId}/logs/${kind}`, {
      headers: { Accept: "text/event-stream" },
      signal: AbortSignal.timeout(5000),
    }, true);
    return sseDataToText(await response.text());
  }

  async listSpaceFiles(repoId: string): Promise<string[]> {
    const raw = await this.requestJson<{ siblings?: Array<{ rfilename?: string }> }>(`/api/spaces/${repoId}`);
    return (raw.siblings ?? [])
      .map((sibling) => sibling.rfilename)
      .filter((name): name is string => typeof name === "string" && name.length > 0)
      .sort();
  }

  async commitSpaceFiles(repoId: string, params: {
    files: HubCommitFile[];
    deletePaths?: string[];
    title: string;
    description?: string;
    branch?: string;
  }): Promise<void> {
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
