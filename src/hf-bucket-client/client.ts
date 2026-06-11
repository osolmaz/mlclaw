/**
 * Minimal Hugging Face Storage Bucket client.
 *
 * Protocol reference: huggingface_hub (Python) `HfApi._batch_bucket_files`.
 * Buckets are non-versioned object storage; file content travels the Xet
 * protocol (vendored from huggingface.js), then files are registered with a
 * single NDJSON `POST /api/buckets/{id}/batch` call. Reads are plain HTTP.
 */
import { uploadShards } from "../vendor/hfjs-xet/utils/uploadShards.js";

export const HUB_URL = "https://huggingface.co";

export type BucketClientOptions = {
  bucket: string;
  accessToken: string;
  hubUrl?: string;
  fetch?: typeof fetch;
};

export type BucketEntry = {
  path: string;
  size: number;
  type: "file" | "directory";
};

type BatchOperation =
  | { type: "addFile"; path: string; xetHash: string; mtime: number; contentType?: string }
  | { type: "deleteFile"; path: string };

const RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const REQUEST_TIMEOUT_MS = 30_000;

/** RFC 5988 Link header, GitHub pagination style (per the Python reference). */
function nextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null;
  }
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

export class BucketHttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    body: string,
  ) {
    super(`bucket request failed: ${status} ${url}: ${body.slice(0, 500)}`);
    this.name = "BucketHttpError";
  }
}

export class BucketClient {
  private readonly bucket: string;
  private readonly hubUrl: string;
  private readonly accessToken: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: BucketClientOptions) {
    this.bucket = options.bucket;
    this.hubUrl = options.hubUrl ?? HUB_URL;
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetch ?? fetch;
  }

  private apiUrl(suffix: string): string {
    return `${this.hubUrl}/api/buckets/${this.bucket}${suffix}`;
  }

  private authHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  private async request(url: string, init?: RequestInit): Promise<Response> {
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      throw new BucketHttpError(response.status, url, await response.text());
    }
    return response;
  }

  private async fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
    const attempts = 4;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: { ...this.authHeaders(), ...init?.headers },
        });
      } catch (err) {
        if (
          attempt < attempts - 1 &&
          err instanceof Error &&
          (err.name === "AbortError" || err.name === "TimeoutError")
        ) {
          await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
          continue;
        }
        throw err;
      }
      if (!RETRY_STATUSES.has(response.status) || attempt === attempts - 1) {
        return response;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
    throw new Error("unreachable retry state");
  }

  /** Upload file contents via Xet, then register them in one batch call. */
  async uploadFiles(files: Array<{ path: string; content: Blob }>): Promise<void> {
    if (files.length === 0) {
      return;
    }
    const hashes = new Map<string, string>();
    const source = (async function* () {
      for (const file of files) {
        yield { content: file.content, path: file.path };
      }
    })();
    for await (const event of uploadShards(source, {
      accessToken: this.accessToken,
      hubUrl: this.hubUrl,
      // All upload traffic goes to the CAS endpoint from the write token;
      // repo/rev are unused by the network path for buckets.
      repo: { type: "model", name: this.bucket },
      rev: "main",
      xetParams: {
        refreshWriteTokenUrl: this.apiUrl("/xet-write-token"),
      },
      fetch: this.fetchImpl,
    })) {
      if (event.event === "file") {
        hashes.set(event.path, event.xetHash);
      }
    }
    const missing = files.filter((file) => !hashes.has(file.path));
    if (missing.length > 0) {
      throw new Error(`xet upload returned no hash for: ${missing.map((f) => f.path).join(", ")}`);
    }
    await this.batch(
      files.map((file) => ({
        type: "addFile",
        path: file.path,
        xetHash: hashes.get(file.path) as string,
        // Milliseconds, per the Python reference (`int(time.time() * 1000)`).
        mtime: Date.now(),
      })),
    );
  }

  async deleteFiles(paths: string[]): Promise<void> {
    if (paths.length === 0) {
      return;
    }
    await this.batch(paths.map((path) => ({ type: "deleteFile", path })));
  }

  private async batch(operations: BatchOperation[]): Promise<void> {
    const body = `${operations.map((op) => JSON.stringify(op)).join("\n")}\n`;
    await this.request(this.apiUrl("/batch"), {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body,
    });
  }

  /**
   * Download a file. Returns null when the file does not exist; throws on
   * any other failure (including bucket/auth errors), so a missing object is
   * never conflated with an unreachable bucket.
   */
  async downloadFile(path: string): Promise<Blob | null> {
    // The reference fully quotes the path, slashes included (`quote(safe="")`).
    const url = `${this.hubUrl}/buckets/${this.bucket}/resolve/${encodeURIComponent(path)}`;
    const response = await this.fetchWithRetry(url);
    if (response.status === 404) {
      // Distinguish "object missing" from "bucket missing/no access".
      await this.assertBucketAccessible();
      return null;
    }
    if (!response.ok) {
      throw new BucketHttpError(response.status, url, await response.text());
    }
    return await response.blob();
  }

  /** List files under a prefix (recursive), following Link-header pagination. */
  async listFiles(prefix = ""): Promise<BucketEntry[]> {
    const entries: BucketEntry[] = [];
    const encodedPrefix = prefix ? `/${encodeURIComponent(prefix)}` : "";
    let url: string | null = `${this.apiUrl(`/tree${encodedPrefix}`)}?recursive=true`;
    while (url) {
      const response: Response = await this.request(url);
      const page = (await response.json()) as Array<{ type: string; path: string; size?: number }>;
      for (const item of page) {
        entries.push({
          path: item.path,
          size: item.size ?? 0,
          type: item.type === "directory" ? "directory" : "file",
        });
      }
      url = nextPageUrl(response.headers.get("link"));
    }
    return entries;
  }

  async assertBucketAccessible(): Promise<void> {
    await this.request(this.apiUrl(""));
  }
}
