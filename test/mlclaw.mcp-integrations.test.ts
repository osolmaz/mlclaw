import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig, type SpaceRuntimeConfig } from "../src/mlclaw-space-runtime/config.js";
import { McpCredentialStore } from "../src/mlclaw-space-runtime/mcp-credentials.js";
import { deriveInternalToken, McpIntegrationServer } from "../src/mlclaw-space-runtime/mcp-integrations.js";
import { authorizeUrl, HF_MCP_OAUTH_SCOPES } from "../src/mlclaw-space-runtime/oauth.js";

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

describe("automatic MCP integrations", () => {
  it("requests the complete automatic integration scope set", () => {
    const url = new URL(authorizeUrl({
      clientId: "client",
      clientSecret: "secret",
      providerUrl: "https://huggingface.co",
      redirectUri: "https://example.test/oauth/callback",
    }, "state"));
    expect(url.searchParams.get("scope")?.split(" ")).toEqual([...HF_MCP_OAUTH_SCOPES]);
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

  it("turns the Research Agent MCP App into a completed research tool call", async () => {
    const calls: string[] = [];
    const upstream = http.createServer(async (req, res) => {
      const body = JSON.parse(await text(req)) as Record<string, unknown>;
      const method = String(body.method ?? "");
      const params = object(body.params);
      const tool = String(params?.name ?? "");
      calls.push(tool || method);
      const id = body.id ?? null;
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
});

async function integrationFixture(overrides: Partial<SpaceRuntimeConfig> = {}): Promise<{
  config: SpaceRuntimeConfig;
  store: McpCredentialStore;
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
  await store.save({
    username: "alice",
    accessToken: "hf_mcp_access",
    tokenType: "Bearer",
    scope: ["openid", "profile", "read-mcp"],
  });
  const server = new McpIntegrationServer(config, store);
  await server.start();
  cleanups.push(() => server.stop());
  return { config, store };
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
