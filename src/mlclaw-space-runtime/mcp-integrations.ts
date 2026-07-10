import { createHmac, timingSafeEqual } from "node:crypto";
import http from "node:http";
import { Readable } from "node:stream";
import { integrationCredentialSlot, type SpaceRuntimeConfig } from "./config.js";
import type { McpCredentialStore } from "./mcp-credentials.js";

const MAX_REQUEST_BYTES = 16 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 120_000;
const INTERNAL_HEADER = "x-mlclaw-mcp-key";

type JsonRpcRequest = {
  jsonrpc?: unknown;
  id?: unknown;
  method?: unknown;
  params?: unknown;
};

type BufferedResponse = {
  status: number;
  headers: Headers;
  body: Uint8Array;
};

export class McpIntegrationServer {
  private server: http.Server | undefined;
  private readonly internalToken: string;
  private readonly activeRequests = new Set<AbortController>();

  constructor(
    private readonly config: SpaceRuntimeConfig,
    private readonly credentials: McpCredentialStore,
  ) {
    this.internalToken = deriveInternalToken(config.sessionSecret);
  }

  managedServerConfig(): Record<string, Record<string, unknown>> {
    return managedMcpServerConfig(this.config);
  }

  async start(): Promise<void> {
    if (this.server) {
      return;
    }
    const server = http.createServer((req, res) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      this.activeRequests.add(controller);
      req.once("aborted", abort);
      res.once("close", abort);
      this.handle(req, res, controller.signal).catch((err) => {
        if (controller.signal.aborted) {
          res.destroy();
          return;
        }
        process.stderr.write(`[mlclaw] MCP integration request failed: ${safeError(err)}\n`);
        if (!res.headersSent) {
          writeJson(res, 502, mcpError(null, -32603, "MCP integration request failed"));
        } else {
          res.end();
        }
      }).finally(() => {
        req.off("aborted", abort);
        res.off("close", abort);
        this.activeRequests.delete(controller);
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(this.config.mcpPort, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });
    this.server = server;
    process.stdout.write(`[mlclaw] MCP integrations listening on 127.0.0.1:${this.config.mcpPort}\n`);
  }

  async stop(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    if (!server) {
      return;
    }
    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    for (const controller of this.activeRequests) {
      controller.abort();
    }
    server.closeAllConnections();
    await closed;
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse, signal: AbortSignal): Promise<void> {
    if (!validInternalToken(req.headers[INTERNAL_HEADER], this.internalToken)) {
      writeJson(res, 401, mcpError(null, -32001, "Unauthorized"));
      return;
    }
    const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    if (pathname !== "/mcp/huggingface" && pathname !== "/mcp/research") {
      writeJson(res, 404, mcpError(null, -32601, "Not found"));
      return;
    }
    let accessToken = this.config.gatewayLocation === "local" ? this.config.hfToken : undefined;
    if (!accessToken) {
      const credentialSlot = integrationCredentialSlot(this.config);
      if (!credentialSlot) {
        writeJson(res, 503, mcpError(null, -32002, "ML Claw has no primary admin"));
        return;
      }
      try {
        accessToken = await this.credentials.accessToken(credentialSlot);
      } catch (err) {
        writeJson(res, 503, mcpError(null, -32002, safeError(err)));
        return;
      }
    }
    const body = await readBody(req, MAX_REQUEST_BYTES);
    if (pathname === "/mcp/research" && req.method === "POST") {
      const parsed = parseJsonRpc(body);
      if (parsed?.method === "tools/call" && toolName(parsed) === "research") {
        await this.handleResearchCall(req, res, body, parsed, accessToken, signal);
        return;
      }
    }
    await forwardStreaming({
      req,
      res,
      body,
      url: pathname === "/mcp/huggingface" ? this.config.hfMcpUrl : this.config.researchMcpUrl,
      accessToken,
      signal,
    });
  }

  private async handleResearchCall(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    body: Uint8Array,
    request: JsonRpcRequest,
    accessToken: string,
    signal: AbortSignal,
  ): Promise<void> {
    const initial = await forwardBuffered({
      method: req.method ?? "POST",
      requestHeaders: req.headers,
      body,
      url: this.config.researchMcpUrl,
      accessToken,
      signal,
    });
    const message = parseMcpResponse(initial.body);
    const prefab = prefabJob(message);
    if (!prefab) {
      writeBuffered(res, initial);
      return;
    }
    const sessionId = requestHeader(req.headers, "mcp-session-id");
    if (!sessionId) {
      writeJson(res, 502, mcpError(request.id ?? null, -32603, "Research Agent did not establish an MCP session"));
      return;
    }
    try {
      await this.callResearchBackend({
        sessionId,
        tool: prefab.startTool,
        arguments: { job_id: prefab.jobId },
        accessToken,
        id: `${String(request.id ?? "research")}:start`,
        signal,
      });

      const deadline = Date.now() + this.config.researchTimeoutMs;
      let status: Record<string, unknown> | undefined;
      while (Date.now() < deadline) {
        if (res.destroyed) {
          return;
        }
        const result = await this.callResearchBackend({
          sessionId,
          tool: prefab.statusTool,
          arguments: { job_id: prefab.jobId },
          accessToken,
          id: `${String(request.id ?? "research")}:status`,
          signal,
        });
        status = toolResultObject(result);
        if (status?.done === true) {
          const error = stringValue(status.error);
          const resultText = stringValue(status.result);
          writeJson(res, 200, {
            jsonrpc: "2.0",
            id: request.id ?? null,
            result: {
              content: [{
                type: "text",
                text: error
                  ? `Research failed: ${error}`
                  : resultText ?? `Research completed. Job: ${prefab.jobId}`,
              }],
              structuredContent: redactResearchStatus(status),
              isError: Boolean(error),
            },
          });
          return;
        }
        await delay(this.config.researchPollMs, signal);
      }
      writeJson(res, 200, {
        jsonrpc: "2.0",
        id: request.id ?? null,
        result: {
          content: [{ type: "text", text: `Research is still running. Job: ${prefab.jobId}` }],
          structuredContent: redactResearchStatus(status ?? { job_id: prefab.jobId, status: "running", done: false }),
          isError: false,
        },
      });
    } catch (err) {
      if (err instanceof ResearchRpcError) {
        writeJson(res, 200, mcpError(request.id ?? null, err.code, err.message));
        return;
      }
      throw err;
    }
  }

  private async callResearchBackend(params: {
    sessionId: string;
    tool: string;
    arguments: Record<string, unknown>;
    accessToken: string;
    id: string;
    signal: AbortSignal;
  }): Promise<Record<string, unknown>> {
    const response = await forwardBuffered({
      method: "POST",
      requestHeaders: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
        "mcp-session-id": params.sessionId,
      },
      body: Buffer.from(JSON.stringify({
        jsonrpc: "2.0",
        id: params.id,
        method: "tools/call",
        params: { name: params.tool, arguments: params.arguments },
      })),
      url: this.config.researchMcpUrl,
      accessToken: params.accessToken,
      signal: params.signal,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Research Agent returned HTTP ${response.status}`);
    }
    const parsed = parseMcpResponse(response.body);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Research Agent returned an invalid MCP response");
    }
    const rpcError = objectValue(parsed.error);
    if (rpcError) {
      throw new ResearchRpcError(
        numberValue(rpcError.code) ?? -32603,
        stringValue(rpcError.message) ?? "Research Agent request failed",
      );
    }
    return parsed;
  }
}

class ResearchRpcError extends Error {
  constructor(readonly code: number, message: string) {
    super(message);
    this.name = "ResearchRpcError";
  }
}

export function deriveInternalToken(secret: string): string {
  return createHmac("sha256", secret).update("mlclaw:mcp-integrations:v1").digest("base64url");
}

export function managedMcpServerConfig(config: SpaceRuntimeConfig): Record<string, Record<string, unknown>> {
  const headers = { [INTERNAL_HEADER]: deriveInternalToken(config.sessionSecret) };
  return {
    huggingface: {
      url: `http://127.0.0.1:${config.mcpPort}/mcp/huggingface`,
      transport: "streamable-http",
      headers,
      timeout: 120,
      connectTimeout: 10,
      supportsParallelToolCalls: true,
    },
    "research-agent": {
      url: `http://127.0.0.1:${config.mcpPort}/mcp/research`,
      transport: "streamable-http",
      headers,
      timeout: Math.ceil(config.researchTimeoutMs / 1000) + 30,
      connectTimeout: 10,
      supportsParallelToolCalls: false,
    },
  };
}

async function forwardStreaming(params: {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  body: Uint8Array;
  url: string;
  accessToken: string;
  signal: AbortSignal;
}): Promise<void> {
  const timed = timedAbortSignal(params.signal, UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(params.url, {
      method: params.req.method ?? "POST",
      headers: upstreamHeaders(params.req.headers, params.accessToken),
      ...(params.body.byteLength > 0 ? { body: Buffer.from(params.body) } : {}),
      redirect: "error",
      signal: timed.signal,
    });
    params.res.writeHead(response.status, responseHeaders(response.headers));
    if (!response.body) {
      params.res.end();
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const stream = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream<Uint8Array>);
      stream.once("error", reject);
      params.res.once("error", reject);
      params.res.once("finish", resolve);
      stream.pipe(params.res);
    });
  } finally {
    timed.dispose();
  }
}

async function forwardBuffered(params: {
  method: string;
  requestHeaders: http.IncomingHttpHeaders;
  body: Uint8Array;
  url: string;
  accessToken: string;
  signal: AbortSignal;
}): Promise<BufferedResponse> {
  const timed = timedAbortSignal(params.signal, UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(params.url, {
      method: params.method,
      headers: upstreamHeaders(params.requestHeaders, params.accessToken),
      ...(params.body.byteLength > 0 ? { body: Buffer.from(params.body) } : {}),
      redirect: "error",
      signal: timed.signal,
    });
    return {
      status: response.status,
      headers: response.headers,
      body: new Uint8Array(await response.arrayBuffer()),
    };
  } finally {
    timed.dispose();
  }
}

function upstreamHeaders(headers: http.IncomingHttpHeaders, accessToken: string): Headers {
  const out = new Headers({ authorization: `Bearer ${accessToken}` });
  for (const name of ["accept", "content-type", "mcp-session-id", "mcp-protocol-version", "last-event-id"]) {
    const value = requestHeader(headers, name);
    if (value) {
      out.set(name, value);
    }
  }
  return out;
}

function responseHeaders(headers: Headers): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = {};
  for (const name of ["content-type", "cache-control", "mcp-session-id", "mcp-protocol-version", "www-authenticate", "retry-after"]) {
    const value = headers.get(name);
    if (value) {
      out[name] = value;
    }
  }
  return out;
}

function writeBuffered(res: http.ServerResponse, response: BufferedResponse): void {
  const headers = responseHeaders(response.headers);
  headers["content-length"] = response.body.byteLength;
  res.writeHead(response.status, headers);
  res.end(response.body);
}

async function readBody(req: http.IncomingMessage, limit: number): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > limit) {
      throw new Error("MCP request body is too large");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function parseJsonRpc(body: Uint8Array): JsonRpcRequest | undefined {
  try {
    const value = JSON.parse(Buffer.from(body).toString("utf8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRpcRequest : undefined;
  } catch {
    return undefined;
  }
}

function parseMcpResponse(body: Uint8Array): Record<string, unknown> | undefined {
  const text = Buffer.from(body).toString("utf8").trim();
  if (!text) {
    return undefined;
  }
  const candidates = text.startsWith("{")
    ? [text]
    : text.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim());
  for (const candidate of candidates.reverse()) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    } catch {
      // Continue to another SSE data frame.
    }
  }
  return undefined;
}

function prefabJob(message: Record<string, unknown> | undefined): {
  jobId: string;
  startTool: string;
  statusTool: string;
} | undefined {
  const result = objectValue(message?.result);
  const structured = objectValue(result?.structuredContent);
  const prefab = objectValue(structured?.$prefab);
  const state = objectValue(prefab?.state);
  const view = objectValue(prefab?.view);
  const jobId = stringValue(state?.job_id);
  const startTool = findActionTool(view, "_start_research");
  const statusTool = findActionTool(view, "_research_status");
  return jobId && startTool && statusTool ? { jobId, startTool, statusTool } : undefined;
}

function findActionTool(value: unknown, suffix: string): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findActionTool(item, suffix);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const tool = stringValue(record.tool);
  if (record.action === "toolCall" && tool?.endsWith(suffix)) {
    return tool;
  }
  for (const item of Object.values(record)) {
    const found = findActionTool(item, suffix);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function toolName(request: JsonRpcRequest): string | undefined {
  return stringValue(objectValue(request.params)?.name);
}

function toolResultObject(message: Record<string, unknown>): Record<string, unknown> | undefined {
  const result = objectValue(message.result);
  const structured = objectValue(result?.structuredContent);
  if (structured) {
    return structured;
  }
  const content = Array.isArray(result?.content) ? result.content : [];
  for (const item of content) {
    const text = stringValue(objectValue(item)?.text);
    if (!text) {
      continue;
    }
    try {
      const value = JSON.parse(text);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    } catch {
      // Ignore non-JSON text content.
    }
  }
  return undefined;
}

function redactResearchStatus(status: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(status).filter(([key]) => ![
    "auth",
    "token",
    "access_token",
    "refresh_token",
  ].includes(key.toLowerCase())));
}

function mcpError(id: unknown, code: number, message: string): Record<string, unknown> {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function writeJson(res: http.ServerResponse, status: number, value: unknown): void {
  const body = `${JSON.stringify(value)}\n`;
  res.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json; charset=utf-8",
  });
  res.end(body);
}

function validInternalToken(value: string | string[] | undefined, expected: string): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function requestHeader(headers: http.IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function safeError(err: unknown): string {
  return err instanceof Error ? err.message : "unknown error";
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

function timedAbortSignal(parent: AbortSignal, timeoutMs: number): {
  signal: AbortSignal;
  dispose(): void;
} {
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  if (parent.aborted) {
    abort();
  } else {
    parent.addEventListener("abort", abort, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      parent.removeEventListener("abort", abort);
    },
  };
}
