import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig, type SpaceRuntimeConfig } from "../src/mlclaw-space-runtime/config.js";
import { McpCredentialStore } from "../src/mlclaw-space-runtime/mcp-credentials.js";
import { deriveInternalToken, McpIntegrationServer } from "../src/mlclaw-space-runtime/mcp-integrations.js";
import {
  authorizeUrl,
  HF_LOGIN_OAUTH_SCOPES,
  HF_MCP_OAUTH_SCOPES,
} from "../src/mlclaw-space-runtime/oauth.js";

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

describe("automatic MCP integrations", () => {
  it("separates ordinary login scopes from integration authorization", () => {
    const settings = {
      clientId: "client",
      clientSecret: "secret",
      providerUrl: "https://huggingface.co",
      redirectUri: "https://example.test/oauth/callback",
    };
    const login = new URL(authorizeUrl(settings, "state"));
    const integrations = new URL(authorizeUrl(settings, "state", HF_MCP_OAUTH_SCOPES));
    expect(login.searchParams.get("scope")?.split(" ")).toEqual([...HF_LOGIN_OAUTH_SCOPES]);
    expect(integrations.searchParams.get("scope")?.split(" ")).toEqual([...HF_MCP_OAUTH_SCOPES]);
  });

  it("encrypts credentials, refreshes once, and never writes token plaintext", async () => {
    const root = await temporaryDirectory();
    const file = path.join(root, "mcp-oauth.enc");
    let refreshCalls = 0;
    const store = new McpCredentialStore({
      file,
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
      clientId: "client",
      clientSecret: "client-secret",
      now: () => 2_000_000,
      fetchImpl: async (_url, request) => {
        refreshCalls += 1;
        expect(request?.headers).toMatchObject({
          authorization: expect.stringMatching(/^Basic /),
        });
        expect(String(request?.body)).toContain("refresh_token=refresh-old");
        return Response.json({
          access_token: "hf_access_refreshed",
          refresh_token: "refresh-new",
          token_type: "Bearer",
          expires_in: 3600,
          scope: "openid profile read-mcp",
        });
      },
    });

    await store.save({
      username: "alice",
      accessToken: "hf_access_old",
      refreshToken: "refresh-old",
      tokenType: "Bearer",
      scope: ["openid", "profile", "read-mcp"],
      expiresAt: 1_000_000,
    });

    const encrypted = await fs.readFile(file, "utf8");
    expect(encrypted).not.toContain("hf_access_old");
    expect(encrypted).not.toContain("refresh-old");
    expect((await fs.stat(file)).mode & 0o777).toBe(0o600);

    await expect(Promise.all([store.accessToken("alice"), store.accessToken("alice")]))
      .resolves.toEqual(["hf_access_refreshed", "hf_access_refreshed"]);
    expect(refreshCalls).toBe(1);
    expect(await fs.readFile(file, "utf8")).not.toContain("hf_access_refreshed");

    const reloaded = new McpCredentialStore({
      file,
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
      now: () => 2_100_000,
    });
    await expect(reloaded.accessToken("alice")).resolves.toBe("hf_access_refreshed");
    await expect(new McpCredentialStore({
      file,
      secret: "wrong-secret",
      providerUrl: "https://huggingface.test",
    }).status("alice")).rejects.toThrow("cannot be decrypted");
  });

  it("serializes first load and keeps one deployment identity across admins", async () => {
    const root = await temporaryDirectory();
    const file = path.join(root, "mcp-oauth.enc");
    const writer = new McpCredentialStore({
      file,
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
    });
    await writer.save({
      username: "bob",
      accessToken: "hf_bob",
      tokenType: "Bearer",
      scope: ["read-mcp"],
    }, "primary-admin");

    const reader = new McpCredentialStore({
      file,
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
    });
    const [status, token] = await Promise.all([
      reader.status("primary-admin"),
      reader.accessToken("primary-admin"),
    ]);
    expect(status).toMatchObject({ configured: true, username: "bob" });
    expect(token).toBe("hf_bob");
  });

  it("lets an administrator replace or clear an unreadable encrypted credential", async () => {
    const root = await temporaryDirectory();
    const file = path.join(root, "mcp-oauth.enc");
    await fs.writeFile(file, "not-an-encrypted-credential");

    const replacement = new McpCredentialStore({
      file,
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
    });
    await replacement.save({
      username: "alice",
      accessToken: "hf_replacement",
      tokenType: "Bearer",
      scope: ["read-mcp"],
    });
    await expect(replacement.accessToken("alice")).resolves.toBe("hf_replacement");

    await fs.writeFile(file, "still-not-an-encrypted-credential");
    const clearing = new McpCredentialStore({
      file,
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
    });
    await clearing.clear("alice");
    await expect(clearing.status("alice")).resolves.toMatchObject({ configured: false });
    await expect(new McpCredentialStore({
      file,
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
    }).status("alice")).resolves.toMatchObject({ configured: false });
  });

  it("disconnects after a rejected refresh and does not resurrect access during disconnect", async () => {
    const root = await temporaryDirectory();
    const rejected = new McpCredentialStore({
      file: path.join(root, "rejected.enc"),
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
      clientId: "client",
      clientSecret: "client-secret",
      now: () => 2_000_000,
      fetchImpl: async () => new Response("revoked", { status: 400 }),
    });
    await rejected.save({
      username: "alice",
      accessToken: "hf_expired",
      refreshToken: "refresh-revoked",
      tokenType: "Bearer",
      scope: ["read-mcp"],
      expiresAt: 1_000_000,
    });
    await expect(rejected.accessToken("alice")).rejects.toThrow("sign in again");
    await expect(rejected.status("alice")).resolves.toMatchObject({ configured: false });

    let finishRefresh: (() => void) | undefined;
    const refreshStarted = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    let releaseResponse: (() => void) | undefined;
    const responseReleased = new Promise<void>((resolve) => {
      releaseResponse = resolve;
    });
    const racing = new McpCredentialStore({
      file: path.join(root, "racing.enc"),
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
      clientId: "client",
      clientSecret: "client-secret",
      now: () => 2_000_000,
      fetchImpl: async () => {
        finishRefresh?.();
        await responseReleased;
        return Response.json({ access_token: "hf_refreshed", expires_in: 3600 });
      },
    });
    await racing.save({
      username: "alice",
      accessToken: "hf_expired",
      refreshToken: "refresh-valid",
      tokenType: "Bearer",
      scope: ["read-mcp"],
      expiresAt: 1_000_000,
    });
    const refresh = racing.accessToken("alice");
    await refreshStarted;
    const disconnect = racing.clear("alice");
    releaseResponse?.();
    await expect(refresh).resolves.toBe("hf_refreshed");
    await disconnect;
    await expect(racing.status("alice")).resolves.toMatchObject({ configured: false });
  });

  it("reports expired unrefreshable credentials disconnected and clears stale expiry after refresh", async () => {
    const root = await temporaryDirectory();
    const expiredFile = path.join(root, "expired.enc");
    const expired = new McpCredentialStore({
      file: expiredFile,
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
      now: () => 2_000_000,
    });
    await expired.save({
      username: "alice",
      accessToken: "hf_expired",
      tokenType: "Bearer",
      scope: ["read-mcp"],
      expiresAt: 1_000_000,
    });
    await expect(expired.status("alice")).resolves.toMatchObject({ configured: false });

    let refreshCalls = 0;
    const refreshFile = path.join(root, "refresh.enc");
    const refreshing = new McpCredentialStore({
      file: refreshFile,
      secret: "credential-secret",
      providerUrl: "https://huggingface.test",
      clientId: "client",
      clientSecret: "client-secret",
      now: () => 2_000_000,
      fetchImpl: async () => {
        refreshCalls += 1;
        return Response.json({ access_token: "hf_refreshed", token_type: "Bearer" });
      },
    });
    await refreshing.save({
      username: "alice",
      accessToken: "hf_old",
      refreshToken: "refresh",
      tokenType: "Bearer",
      scope: ["read-mcp"],
      expiresAt: 1_000_000,
    });
    await expect(refreshing.accessToken("alice")).resolves.toBe("hf_refreshed");
    await expect(refreshing.accessToken("alice")).resolves.toBe("hf_refreshed");
    expect(refreshCalls).toBe(1);
  });

  it("scopes the credential file to the configured bucket prefix", () => {
    const config = loadConfig({
      SPACE_ID: "alice/mlclaw-test",
      MLCLAW_SESSION_SECRET: "m".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
      MLCLAW_STATE_MOUNT_DIR: "/data/mlclaw-state",
      OPENCLAW_HF_STATE_PREFIX: "teams/alice",
    });
    expect(config.mcpCredentialFile).toBe("/data/mlclaw-state/teams/alice/.mlclaw/mcp-oauth.enc");
  });

  it("forwards Hugging Face MCP with OAuth while hiding the token from OpenClaw", async () => {
    let upstreamAuthorization: string | undefined;
    const upstream = http.createServer(async (req, res) => {
      upstreamAuthorization = req.headers.authorization;
      await drain(req);
      res.writeHead(200, {
        "content-type": "application/json",
        "mcp-session-id": "hf-session",
      });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: [] } }));
    });
    const upstreamPort = await listen(upstream);
    cleanups.push(() => closeServer(upstream));

    const fixture = await integrationFixture({
      hfMcpUrl: `http://127.0.0.1:${upstreamPort}/mcp`,
    });
    const endpoint = `http://127.0.0.1:${fixture.config.mcpPort}/mcp/huggingface`;

    const unauthorized = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(unauthorized.status).toBe(401);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-mlclaw-mcp-key": deriveInternalToken(fixture.config.sessionSecret),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("mcp-session-id")).toBe("hf-session");
    expect(await response.json()).toMatchObject({ result: { tools: [] } });
    expect(upstreamAuthorization).toBe("Bearer hf_mcp_access");
  });

  it("uses the trusted local Hub token after migrating away from Space OAuth", async () => {
    let upstreamAuthorization: string | undefined;
    const upstream = http.createServer(async (req, res) => {
      upstreamAuthorization = req.headers.authorization;
      await drain(req);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: [] } }));
    });
    const upstreamPort = await listen(upstream);
    cleanups.push(() => closeServer(upstream));

    const fixture = await integrationFixture({
      gatewayLocation: "local",
      hfToken: "hf_local_wrapper",
      spaceId: undefined,
      adminUsers: [],
      allowedUsers: [],
      hfMcpUrl: `http://127.0.0.1:${upstreamPort}/mcp`,
    }, { skipCredential: true });
    const response = await fetch(`http://127.0.0.1:${fixture.config.mcpPort}/mcp/huggingface`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-mlclaw-mcp-key": deriveInternalToken(fixture.config.sessionSecret),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ result: { tools: [] } });
    expect(upstreamAuthorization).toBe("Bearer hf_local_wrapper");
    await expect(fixture.store.status("alice")).resolves.toMatchObject({ configured: false });
  });

  it("turns the Research Agent MCP App into a completed research tool call", async () => {
    const calls: string[] = [];
    const upstream = http.createServer(async (req, res) => {
      const body = JSON.parse(await text(req)) as Record<string, unknown>;
      const method = String(body.method ?? "");
      const params = object(body.params);
      const tool = String(params?.name ?? "");
      calls.push(tool || method);
      const id = body.id ?? null;
      if (method !== "initialize" && req.headers["mcp-protocol-version"] !== "2025-06-18") {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "missing negotiated MCP protocol version" }));
        return;
      }
      res.setHeader("content-type", "text/event-stream");
      res.setHeader("mcp-session-id", "research-session");
      if (method === "initialize") {
        sse(res, { jsonrpc: "2.0", id, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "research", version: "1" } } });
        return;
      }
      if (method === "notifications/initialized") {
        res.writeHead(202);
        res.end();
        return;
      }
      if (tool === "research") {
        sse(res, {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: "[Rendered Prefab UI]" }],
            structuredContent: {
              $prefab: {
                state: { job_id: "research-test", job: { status: "queued" } },
                view: {
                  onMount: [
                    { action: "toolCall", tool: "abc_start_research" },
                    { action: "setInterval", onTick: { action: "toolCall", tool: "xyz_research_status" } },
                  ],
                },
              },
            },
          },
        });
        return;
      }
      if (tool === "abc_start_research") {
        sse(res, { jsonrpc: "2.0", id, result: { structuredContent: { job_id: "research-test", status: "running", done: false } } });
        return;
      }
      if (tool === "xyz_research_status") {
        sse(res, { jsonrpc: "2.0", id, result: { structuredContent: { job_id: "research-test", status: "completed", result: "Verified research result", done: true } } });
        return;
      }
      sse(res, { jsonrpc: "2.0", id, error: { code: -32601, message: "unknown" } });
    });
    const upstreamPort = await listen(upstream);
    cleanups.push(() => closeServer(upstream));

    const fixture = await integrationFixture({
      researchMcpUrl: `http://127.0.0.1:${upstreamPort}/mcp`,
      researchPollMs: 1,
    });
    const headers = {
      "content-type": "application/json",
      "mcp-protocol-version": "2025-06-18",
      "x-mlclaw-mcp-key": deriveInternalToken(fixture.config.sessionSecret),
    };
    const endpoint = `http://127.0.0.1:${fixture.config.mcpPort}/mcp/research`;
    const initialized = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } },
      }),
    });
    expect(initialized.headers.get("mcp-session-id")).toBe("research-session");
    await initialized.text();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { ...headers, "mcp-session-id": "research-session" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "research", arguments: { topic: "test" } },
      }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: 2,
      result: {
        content: [{ type: "text", text: "Verified research result" }],
        structuredContent: { status: "completed", done: true },
        isError: false,
      },
    });
    expect(calls).toEqual(["initialize", "research", "abc_start_research", "xyz_research_status"]);
  });

  it("returns a Research Agent JSON-RPC error without polling again", async () => {
    const calls: string[] = [];
    const upstream = http.createServer(async (req, res) => {
      const body = JSON.parse(await text(req)) as Record<string, unknown>;
      const params = object(body.params);
      const tool = String(params?.name ?? "");
      calls.push(tool);
      const id = body.id ?? null;
      res.setHeader("content-type", "text/event-stream");
      res.setHeader("mcp-session-id", "research-error-session");
      if (tool === "research") {
        sse(res, {
          jsonrpc: "2.0",
          id,
          result: {
            structuredContent: {
              $prefab: {
                state: { job_id: "research-error" },
                view: {
                  onMount: [
                    { action: "toolCall", tool: "abc_start_research" },
                    { action: "setInterval", onTick: { action: "toolCall", tool: "xyz_research_status" } },
                  ],
                },
              },
            },
          },
        });
        return;
      }
      if (tool === "abc_start_research") {
        sse(res, { jsonrpc: "2.0", id, result: { structuredContent: { done: false } } });
        return;
      }
      sse(res, { jsonrpc: "2.0", id, error: { code: -32042, message: "research session expired" } });
    });
    const upstreamPort = await listen(upstream);
    cleanups.push(() => closeServer(upstream));

    const fixture = await integrationFixture({
      researchMcpUrl: `http://127.0.0.1:${upstreamPort}/mcp`,
      researchPollMs: 1,
    });
    const response = await fetch(`http://127.0.0.1:${fixture.config.mcpPort}/mcp/research`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-session-id": "research-error-session",
        "x-mlclaw-mcp-key": deriveInternalToken(fixture.config.sessionSecret),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { name: "research", arguments: { topic: "test" } },
      }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      id: 7,
      error: { code: -32042, message: "research session expired" },
    });
    expect(calls).toEqual(["research", "abc_start_research", "xyz_research_status"]);
  });

  it("stops immediately when a Research Agent tool result is an MCP error", async () => {
    const calls: string[] = [];
    const upstream = http.createServer(async (req, res) => {
      const body = JSON.parse(await text(req)) as Record<string, unknown>;
      const params = object(body.params);
      const tool = String(params?.name ?? "");
      calls.push(tool);
      const id = body.id ?? null;
      res.setHeader("content-type", "text/event-stream");
      res.setHeader("mcp-session-id", "research-tool-error-session");
      if (tool === "research") {
        sse(res, {
          jsonrpc: "2.0",
          id,
          result: {
            structuredContent: {
              $prefab: {
                state: { job_id: "research-tool-error" },
                view: {
                  onMount: [
                    { action: "toolCall", tool: "abc_start_research" },
                    { action: "setInterval", onTick: { action: "toolCall", tool: "xyz_research_status" } },
                  ],
                },
              },
            },
          },
        });
        return;
      }
      sse(res, {
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: "Research permission denied" }],
          isError: true,
        },
      });
    });
    const upstreamPort = await listen(upstream);
    cleanups.push(() => closeServer(upstream));

    const fixture = await integrationFixture({
      researchMcpUrl: `http://127.0.0.1:${upstreamPort}/mcp`,
      researchPollMs: 1,
    });
    const response = await fetch(`http://127.0.0.1:${fixture.config.mcpPort}/mcp/research`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-session-id": "research-tool-error-session",
        "x-mlclaw-mcp-key": deriveInternalToken(fixture.config.sessionSecret),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 8,
        method: "tools/call",
        params: { name: "research", arguments: { topic: "test" } },
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      id: 8,
      error: { code: -32003, message: "Research permission denied" },
    });
    expect(calls).toEqual(["research", "abc_start_research"]);
  });

  it("aborts active upstream requests during shutdown", async () => {
    let requestStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      requestStarted = resolve;
    });
    const upstream = http.createServer(async (req) => {
      await drain(req);
      requestStarted();
    });
    const upstreamPort = await listen(upstream);
    cleanups.push(() => closeServer(upstream));

    const fixture = await integrationFixture({
      hfMcpUrl: `http://127.0.0.1:${upstreamPort}/mcp`,
    });
    const pending = fetch(`http://127.0.0.1:${fixture.config.mcpPort}/mcp/huggingface`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-mlclaw-mcp-key": deriveInternalToken(fixture.config.sessionSecret),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    }).catch((err) => err);
    await started;

    const before = Date.now();
    await fixture.server.stop();
    expect(Date.now() - before).toBeLessThan(1_000);
    expect(await pending).toBeInstanceOf(Error);
  });
});

async function integrationFixture(
  overrides: Partial<SpaceRuntimeConfig> = {},
  options: { skipCredential?: boolean } = {},
): Promise<{
  config: SpaceRuntimeConfig;
  store: McpCredentialStore;
  server: McpIntegrationServer;
}> {
  const root = await temporaryDirectory();
  const mcpPort = await freePort();
  const config = {
    ...loadConfig({
      SPACE_ID: "alice/mlclaw-test",
      MLCLAW_SESSION_SECRET: "m".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
      MLCLAW_MCP_PORT: String(mcpPort),
      MLCLAW_STATE_MOUNT_DIR: root,
    }),
    ...overrides,
  };
  const store = new McpCredentialStore({
    file: config.mcpCredentialFile,
    secret: config.credentialKey,
    providerUrl: config.providerUrl,
  });
  if (!options.skipCredential) {
    await store.save({
      username: "alice",
      accessToken: "hf_mcp_access",
      tokenType: "Bearer",
      scope: ["openid", "profile", "read-mcp"],
    });
  }
  const server = new McpIntegrationServer(config, store);
  await server.start();
  cleanups.push(() => server.stop());
  return { config, store, server };
}

async function temporaryDirectory(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-mcp-test-"));
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

async function freePort(): Promise<number> {
  const server = http.createServer();
  const port = await listen(server);
  await closeServer(server);
  return port;
}

async function listen(server: http.Server): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("could not resolve server port");
  }
  return address.port;
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

async function text(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function drain(req: http.IncomingMessage): Promise<void> {
  await text(req);
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function sse(res: http.ServerResponse, value: unknown): void {
  res.end(`event: message\ndata: ${JSON.stringify(value)}\n\n`);
}
