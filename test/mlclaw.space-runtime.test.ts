import http from "node:http";
import net from "node:net";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSignedCookie } from "../src/mlclaw-space-runtime/cookies.js";
import { createCsrfToken } from "../src/mlclaw-space-runtime/csrf.js";
import { resolveBranding } from "../src/mlclaw-space-runtime/branding.js";
import { loadConfig, type SpaceRuntimeConfig } from "../src/mlclaw-space-runtime/config.js";
import { PRESET_MODEL_CHOICES } from "../src/mlclaw-space-runtime/model-choices.js";
import {
  BROKER_MCP_CONNECTION_TIMEOUT_MS,
  BROKER_MCP_REQUEST_TIMEOUT_MS,
  configureOpenClawGateway,
} from "../src/mlclaw-space-runtime/openclaw-config.js";
import { createSpaceRuntimeApp } from "../src/mlclaw-space-runtime/app.js";
import { OpenAiCredentialStore } from "../src/mlclaw-space-runtime/openai-credentials.js";
import { SpaceRuntimeServer } from "../src/mlclaw-space-runtime/server.js";

const cleanups: Array<() => Promise<void> | void> = [];

function brokerApproval(
  id: string,
  status: string,
  revision: number,
  approvalBounds = { max_duration_seconds: 300, max_uses: 1 },
) {
  return {
    id,
    revision,
    requester: "bob",
    operation: "repo.update",
    status,
    requested_at: "2026-07-11T00:00:00Z",
    pending_expires_at: "2099-07-12T00:05:00Z",
    requested_duration_seconds: approvalBounds.max_duration_seconds,
    requested_max_uses: approvalBounds.max_uses,
    granted_max_uses: status === "active" ? approvalBounds.max_uses : null,
    used_count: 0,
    presentation: {
      risk: "medium",
      title: "Update repository",
      facts: [{ label: "Repository", value: "osolmaz/example" }],
    },
    allowed_actions: status === "pending" ? ["approve", "deny"] : ["revoke"],
    approval_bounds: approvalBounds,
  };
}

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

describe("ML Claw Space runtime", () => {
  it("fails closed when an app deployment has no durable credential key", () => {
    expect(() =>
      loadConfig({
        SPACE_ID: "alice/research",
        MLCLAW_SESSION_SECRET: "x".repeat(48),
      }),
    ).toThrow("MLCLAW_CREDENTIAL_KEY is required");
  });

  it("includes the curated Router model presets", () => {
    expect(PRESET_MODEL_CHOICES.map((choice) => choice.openclawModel)).toEqual(
      expect.arrayContaining([
        "huggingface/google/gemma-4-26B-A4B-it:deepinfra",
        "huggingface/Qwen/Qwen3.6-35B-A3B:deepinfra",
        "huggingface/Qwen/Qwen3.6-27B:deepinfra",
        "huggingface/zai-org/GLM-5.2:deepinfra",
        "huggingface/zai-org/GLM-5.2:fireworks-ai",
        "huggingface/moonshotai/Kimi-K2.7-Code:deepinfra",
        "huggingface/moonshotai/Kimi-K2.7-Code:fireworks-ai",
        "huggingface/openai/gpt-oss-120b:deepinfra",
        "huggingface/openai/gpt-oss-120b:fireworks-ai",
        "huggingface/openai/gpt-oss-20b:deepinfra",
        "huggingface/openai/gpt-oss-20b:fireworks-ai",
        "huggingface/deepseek-ai/DeepSeek-V4-Flash:deepinfra",
        "huggingface/deepseek-ai/DeepSeek-V4-Flash:fireworks-ai",
        "huggingface/deepseek-ai/DeepSeek-V4-Pro:deepinfra",
        "huggingface/deepseek-ai/DeepSeek-V4-Pro:fireworks-ai",
        "huggingface/MiniMaxAI/MiniMax-M3:together",
        "huggingface/MiniMaxAI/MiniMax-M3:fireworks-ai",
      ]),
    );
    expect(new Set(PRESET_MODEL_CHOICES.map((choice) => choice.key)).size).toBe(PRESET_MODEL_CHOICES.length);
    const fireworks = PRESET_MODEL_CHOICES.filter((choice) => choice.provider === "fireworks-ai");
    expect(fireworks.map((choice) => choice.modelId)).toEqual([
      "zai-org/GLM-5.2",
      "moonshotai/Kimi-K2.7-Code",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Pro",
      "MiniMaxAI/MiniMax-M3",
    ]);
    expect(fireworks.every((choice) => choice.supportsTools === true)).toBe(true);
    expect(fireworks.every((choice) => choice.supportsStructuredOutput === false)).toBe(true);
  });

  it("serves the Hugging Face login page before a session exists", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await fetch(`http://127.0.0.1:${config.port}/`);

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("Sign in with Hugging Face");
    expect(body).toContain('src="/assets/hf-logo.svg"');
  });

  it("requires an authenticated allowed session before returning deployment status", async () => {
    const config = await testConfig();
    await fs.writeFile(
      config.openclawConfigPath,
      JSON.stringify({
        gateway: {},
        mcp: { servers: { "research-agent": { enabled: false } } },
      }),
      "utf8",
    );
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const anonymous = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/status`);

    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("content-type")).toContain("application/json");
    expect(await anonymous.json()).toMatchObject({ ok: false, error: "authentication required" });

    const cookie = sessionCookie(config, "alice");
    const statusPage = await fetch(`http://127.0.0.1:${config.port}/mlclaw/status`, {
      headers: { cookie },
    });
    expect(statusPage.status).toBe(200);
    expect(statusPage.headers.get("content-type")).toContain("text/html");
    expect(await statusPage.text()).toContain('<div id="root">');

    const authenticated = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/status`, {
      headers: { cookie },
    });

    expect(authenticated.status).toBe(200);
    expect(authenticated.headers.get("content-type")).toContain("application/json");
    expect(await authenticated.json()).toMatchObject({
      mode: "app",
      model: "huggingface/google/gemma-4-26B-A4B-it:deepinfra",
      stateBucket: "alice/research-data",
      auth: {
        allowedUsers: ["alice"],
        adminUsers: ["alice"],
      },
      integrations: {
        servers: [
          { id: "huggingface", enabled: true },
          { id: "research-agent", enabled: false },
        ],
      },
    });
  });

  it("delegates the packaged BrokerKit tab to authenticated admin authority", async () => {
    const pluginRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-brokerkit-delegated-ui-"));
    cleanups.push(() => fs.rm(pluginRoot, { recursive: true, force: true }));
    await fs.mkdir(path.join(pluginRoot, "dist", "ui"), { recursive: true });
    await fs.writeFile(
      path.join(pluginRoot, "dist", "ui", "index.html"),
      "<!doctype html><html><head><title>BrokerKit</title></head><body></body></html>",
    );
    const brokerPort = await freePort();
    const brokerRequests: Array<{ method: string; url: string; authorization?: string; body: string }> = [];
    let postAttempts = 0;
    const broker = http.createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += String(chunk);
      brokerRequests.push({
        method: req.method ?? "",
        url: req.url ?? "",
        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        body,
      });
      res.setHeader("content-type", "application/json");
      if (req.url === "/.well-known/brokerkit-operator") {
        res.writeHead(200);
        res.end(JSON.stringify({ api_version: "brokerkit.io/operator/v1" }));
      } else if (req.method === "POST") {
        postAttempts += 1;
        if (postAttempts === 1) {
          res.writeHead(409);
          res.end(
            JSON.stringify({
              error: { code: "revision_conflict", message: "changed", correlation_id: "conflict-1" },
            }),
          );
          return;
        }
        res.writeHead(200);
        res.end(
          JSON.stringify(brokerApproval("request-1", "active", 2, { max_duration_seconds: 172_800, max_uses: 200 })),
        );
      } else if (req.url?.includes("/request-1")) {
        res.writeHead(200);
        res.end(
          JSON.stringify(brokerApproval("request-1", "pending", 1, { max_duration_seconds: 172_800, max_uses: 200 })),
        );
      } else if (req.url?.includes("status=active")) {
        res.writeHead(200);
        res.end(JSON.stringify({ requests: [] }));
      } else {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            requests: [brokerApproval("request-1", "pending", 1, { max_duration_seconds: 172_800, max_uses: 200 })],
          }),
        );
      }
    });
    await listen(broker, brokerPort);
    cleanups.push(() => closeServer(broker));
    const config = await testConfig({
      allowedUsers: ["alice", "bob"],
      adminUsers: ["alice"],
      brokerKitPluginPath: pluginRoot,
      brokerKitPopoverDecisions: true,
      operatorBrokers: [
        {
          id: "hf-broker",
          label: "Hugging Face",
          baseUrl: `http://127.0.0.1:${brokerPort}`,
          token: "operator-secret-that-never-enters-openclaw",
        },
      ],
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );
    const hostEdgePort = await freePort();
    const hostEdge = identityAwareHostEdge(config.port);
    await listen(hostEdge, hostEdgePort);
    cleanups.push(() => closeServer(hostEdge));
    const base = `http://127.0.0.1:${hostEdgePort}/mlclaw/api/brokerkit`;
    const ui = `http://127.0.0.1:${hostEdgePort}/plugins/brokerkit/ui/`;
    const iframeHeaders = { "sec-fetch-dest": "iframe" };
    const anonymous = await fetch(ui, { headers: iframeHeaders });
    const member = await fetch(ui, {
      headers: { ...iframeHeaders, cookie: sessionCookie(config, "bob") },
    });
    const fetchedDocument = await fetch(ui, {
      headers: { cookie: sessionCookie(config, "alice") },
    });
    const launcher = await fetch(ui, {
      headers: { ...iframeHeaders, cookie: sessionCookie(config, "alice") },
    });
    const popover = await fetch(`${ui}?embed=popover`, {
      headers: { ...iframeHeaders, cookie: sessionCookie(config, "alice") },
    });
    const session = await fetch(ui, {
      headers: { "sec-fetch-dest": "document", cookie: sessionCookie(config, "alice") },
    });
    expect(anonymous.status).toBe(401);
    expect(member.status).toBe(403);
    expect(fetchedDocument.status).toBe(404);
    expect(launcher.status).toBe(200);
    const launcherHtml = await launcher.text();
    expect(launcherHtml).toContain('name="brokerkit-delegated-top-level"');
    expect(launcherHtml).not.toContain("brokerkit-delegated-session");
    expect(popover.status).toBe(200);
    const popoverHtml = await popover.text();
    const popoverEmbedded = popoverHtml.match(/name="brokerkit-delegated-session" content="([A-Za-z0-9_-]+)"/u)?.[1];
    const popoverSessionBody = JSON.parse(Buffer.from(popoverEmbedded ?? "", "base64url").toString("utf8")) as {
      token: string;
      access: string;
      renewal_transport: string;
    };
    expect(popoverSessionBody.access).toBe("decide");
    expect(popoverSessionBody.renewal_transport).toBe("direct");
    expect(session.status).toBe(200);
    expect(session.headers.get("cache-control")).toBe("no-store");
    expect(session.headers.get("content-security-policy")).toContain("sandbox allow-scripts");
    expect(session.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(session.headers.get("content-security-policy")).toContain(
      `script-src 'self' http://127.0.0.1:${config.port}`,
    );
    expect(session.headers.get("x-frame-options")).toBe("DENY");
    const sessionHtml = await session.text();
    const embedded = sessionHtml.match(/name="brokerkit-delegated-session" content="([A-Za-z0-9_-]+)"/u)?.[1];
    expect(embedded).toBeDefined();
    const sessionBody = JSON.parse(Buffer.from(embedded ?? "", "base64url").toString("utf8")) as {
      token: string;
      expires_at: string;
      access: string;
      renewal_transport: string;
    };
    expect(sessionBody.access).toBe("decide");
    expect(sessionBody.renewal_transport).toBe("direct");
    expect(sessionBody.token).not.toContain("operator-secret");
    expect(Date.parse(sessionBody.expires_at) - Date.now()).toBeLessThanOrEqual(5 * 60_000);
    const cookieOnly = await fetch(`${base}/snapshot`, {
      headers: { origin: "null", cookie: sessionCookie(config, "alice") },
    });
    expect(cookieOnly.status).toBe(401);
    const delegatedAuthorization = await fetch(`${base}/snapshot`, {
      headers: { origin: "null", authorization: `Bearer ${sessionBody.token}` },
    });
    expect(delegatedAuthorization.status).toBe(404);
    const prefixedSession = await fetch(`${base}/snapshot`, {
      headers: { origin: "null", "brokerkit-session": `Bearer ${sessionBody.token}` },
    });
    expect(prefixedSession.status).toBe(401);
    const combinedSession = await fetch(`${base}/snapshot`, {
      headers: { origin: "null", "brokerkit-session": `${sessionBody.token}, ${sessionBody.token}` },
    });
    expect(combinedSession.status).toBe(401);
    const preflight = await fetch(`${base}/snapshot`, {
      method: "OPTIONS",
      headers: {
        origin: "null",
        "access-control-request-method": "GET",
        "access-control-request-headers": "brokerkit-session, content-type",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("null");
    expect(preflight.headers.get("access-control-allow-headers")).toBe("brokerkit-session, content-type");
    expect(preflight.headers.get("access-control-allow-methods")).toBe("GET, POST, OPTIONS");
    expect(preflight.headers.get("access-control-allow-credentials")).toBeNull();
    const authorizedHeaders = {
      origin: "null",
      authorization: "Bearer simulated-host-credential",
      "brokerkit-session": sessionBody.token,
    };
    const snapshot = await fetch(`${base}/snapshot`, { headers: authorizedHeaders });
    expect(snapshot.status).toBe(200);
    expect(snapshot.headers.get("access-control-allow-credentials")).toBeNull();
    const snapshotBody = (await snapshot.json()) as {
      api_version: string;
      cursor: string;
      requests: Array<{ handle: string; request: { id: string } }>;
    };
    expect(snapshotBody.api_version).toBe("brokerkit.io/operator-ui/v1");
    expect(snapshotBody.cursor).toMatch(/^[A-Za-z0-9_-]{22}\.[0-9a-z]+$/u);
    expect(snapshotBody.requests).toHaveLength(1);
    expect(snapshotBody.requests[0]?.request.id).toBe("request-1");
    expect(snapshotBody.requests[0]?.handle).toMatch(/^[A-Za-z0-9_-]{24}$/u);
    const popoverHeaders = {
      origin: "null",
      "brokerkit-session": popoverSessionBody.token,
    };
    const popoverSnapshot = await fetch(`${base}/snapshot`, { headers: popoverHeaders });
    expect(popoverSnapshot.status).toBe(200);
    const summary = await fetch(`${base}/summary`, { headers: { cookie: sessionCookie(config, "alice") } });
    expect(summary.status).toBe(200);
    expect(await summary.json()).toEqual({
      api_version: "brokerkit.io/operator-ui/v1",
      cursor: snapshotBody.cursor,
      pending: 1,
      healthy: true,
    });
    const expiredEvents = await fetch(`${base}/events?cursor=foreign.1&wait_seconds=25`, {
      headers: authorizedHeaders,
    });
    expect(expiredEvents.status).toBe(410);
    expect(await expiredEvents.json()).toEqual({ error: { code: "cursor_expired" } });
    const invalidEvents = await fetch(`${base}/events?cursor=${snapshotBody.cursor}&wait_seconds=26`, {
      headers: authorizedHeaders,
    });
    expect(invalidEvents.status).toBe(400);
    const expiredSummaryEvents = await fetch(`${base}/summary/events?cursor=foreign.1&wait_seconds=25`, {
      headers: { cookie: sessionCookie(config, "alice") },
    });
    expect(expiredSummaryEvents.status).toBe(410);

    const refreshes = await Promise.all(
      Array.from({ length: 11 }, () => fetch(`${base}/snapshot`, { headers: authorizedHeaders })),
    );
    expect(refreshes.every((response) => response.status === 200)).toBe(true);
    const rateLimited = await fetch(`${base}/snapshot`, { headers: authorizedHeaders });
    expect(rateLimited.status).toBe(429);
    expect(await rateLimited.json()).toEqual({ error: { code: "rate_limited" } });
    const renewedSession = await fetch(`${base}/session`, { method: "POST", headers: authorizedHeaders });
    expect(renewedSession.status).toBe(200);
    const renewedSessionBody = (await renewedSession.json()) as { token: string; access: string };
    expect(renewedSessionBody.token).not.toBe(sessionBody.token);
    expect(renewedSessionBody.access).toBe("decide");
    const anotherSession = await fetch(ui, {
      headers: { "sec-fetch-dest": "document", cookie: sessionCookie(config, "alice") },
    });
    const anotherHtml = await anotherSession.text();
    const anotherEmbedded = anotherHtml.match(/name="brokerkit-delegated-session" content="([A-Za-z0-9_-]+)"/u)?.[1];
    const anotherSessionBody = JSON.parse(Buffer.from(anotherEmbedded ?? "", "base64url").toString("utf8")) as {
      token: string;
    };
    const independentTab = await fetch(`${base}/snapshot`, {
      headers: { origin: "null", "brokerkit-session": anotherSessionBody.token },
    });
    expect(independentTab.status).toBe(200);
    for (const requestCount of [12, 12, 12, 10]) {
      const actorSession = await fetch(ui, {
        headers: { "sec-fetch-dest": "document", cookie: sessionCookie(config, "alice") },
      });
      const actorHtml = await actorSession.text();
      const actorEmbedded = actorHtml.match(/name="brokerkit-delegated-session" content="([A-Za-z0-9_-]+)"/u)?.[1];
      const actorBody = JSON.parse(Buffer.from(actorEmbedded ?? "", "base64url").toString("utf8")) as {
        token: string;
      };
      const responses = await Promise.all(
        Array.from({ length: requestCount }, () =>
          fetch(`${base}/snapshot`, {
            headers: { origin: "null", "brokerkit-session": actorBody.token },
          }),
        ),
      );
      expect(responses.every((response) => response.status === 200)).toBe(true);
    }
    const actorLimited = await fetch(`${base}/snapshot`, {
      headers: { origin: "null", "brokerkit-session": renewedSessionBody.token },
    });
    expect(actorLimited.status).toBe(429);
    brokerRequests.length = 0;

    const requestUrl = `${base}/requests/${snapshotBody.requests[0]?.handle}/approve`;
    const removedCancel = await fetch(`${base}/requests/${snapshotBody.requests[0]?.handle}/cancel`, {
      method: "POST",
      headers: { ...popoverHeaders, "content-type": "application/json" },
      body: JSON.stringify({ expectedRevision: 1 }),
    });
    expect(removedCancel.status).toBe(404);
    const oversized = await fetch(requestUrl, {
      method: "POST",
      headers: { ...popoverHeaders, "content-type": "application/json" },
      body: JSON.stringify({ expectedRevision: 1, reason: "x".repeat(17_000) }),
    });
    expect(oversized.status).toBe(400);
    const legacyShape = await fetch(requestUrl, {
      method: "POST",
      headers: { ...popoverHeaders, "content-type": "application/json" },
      body: JSON.stringify({ expectedRevision: 1, durationSeconds: 300, maxUses: 1 }),
    });
    expect(legacyShape.status).toBe(400);
    const removedReason = await fetch(requestUrl, {
      method: "POST",
      headers: { ...popoverHeaders, "content-type": "application/json" },
      body: JSON.stringify({ expectedRevision: 1, reason: "removed" }),
    });
    expect(removedReason.status).toBe(400);

    const decisionBody = JSON.stringify({
      expectedRevision: 1,
      constraints: { durationSeconds: 172_800, maxUses: 200 },
    });
    const conflict = await fetch(requestUrl, {
      method: "POST",
      headers: { ...popoverHeaders, "content-type": "application/json" },
      body: decisionBody,
    });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({ error: { code: "revision_stale" } });

    const approve = await fetch(requestUrl, {
      method: "POST",
      headers: { ...popoverHeaders, "content-type": "application/json" },
      body: decisionBody,
    });
    expect(approve.status).toBe(200);
    expect(brokerRequests.map((request) => request.url)).toEqual([
      "/api/operator/v1/requests/request-1",
      "/api/operator/v1/requests/request-1/approve",
      "/api/operator/v1/requests/request-1",
      "/api/operator/v1/requests/request-1/approve",
    ]);
    expect(
      brokerRequests.every((request) => request.authorization === "Bearer operator-secret-that-never-enters-openclaw"),
    ).toBe(true);
    expect(JSON.parse(brokerRequests.at(-1)?.body ?? "{}")).toMatchObject({
      expected_revision: 1,
      on_behalf_of: "mlclaw:alice",
      constraints: { duration_seconds: 172_800, max_uses: 200 },
    });
  });

  it("fails health checks closed until broker inference routes are ready", async () => {
    const brokerPort = await freePort();
    let inferenceReady = false;
    const broker = http.createServer((req, res) => {
      if (req.url === "/healthz") {
        res.writeHead(200);
        res.end("ok\n");
        return;
      }
      if (req.url === "/v1/models" && req.headers.authorization === "Bearer agent-secret") {
        res.writeHead(inferenceReady ? 200 : 404, { "content-type": "application/json" });
        res.end(inferenceReady ? JSON.stringify({ data: [] }) : JSON.stringify({ error: "not found" }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await listen(broker, brokerPort);
    cleanups.push(() => closeServer(broker));
    const config = await testConfig({
      brokerAgentUrl: `http://127.0.0.1:${brokerPort}`,
      brokerAgentSecret: "agent-secret",
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const unavailable = await fetch(`http://127.0.0.1:${config.port}/health`);
    expect(unavailable.status).toBe(503);
    await expect(unavailable.text()).resolves.toBe("HF Broker inference routes are not ready\n");

    inferenceReady = true;
    const ready = await fetch(`http://127.0.0.1:${config.port}/health`);
    expect(ready.status).toBe(200);
    await expect(ready.text()).resolves.toBe("ok\n");
  });

  it("fails health checks closed when an HF model has no broker", async () => {
    const config = await testConfig({ brokerAgentUrl: undefined, brokerAgentSecret: undefined });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );
    const response = await fetch(`http://127.0.0.1:${config.port}/health`);
    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe("HF Broker is required for the configured model\n");
  });

  it("reports trusted local Hub-token integrations as configured", async () => {
    const config = await testConfig({
      gatewayLocation: "local",
      hfToken: "hf_local_wrapper",
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/status`, {
      headers: { cookie: sessionCookie(config, "alice") },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      integrations: {
        configured: true,
        source: "local",
        identity: null,
        scope: [],
        refreshable: false,
        error: null,
      },
    });

    const disconnect = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/integrations/huggingface/disconnect`, {
      method: "POST",
      headers: {
        cookie: sessionCookie(config, "alice"),
        "x-mlclaw-csrf": createCsrfToken({ username: "alice", sessionSecret: config.sessionSecret }),
      },
    });
    expect(disconnect.status).toBe(409);
    await expect(disconnect.json()).resolves.toMatchObject({
      ok: false,
      error: expect.stringContaining("ML Claw CLI"),
    });
  });

  it("automatically requests MCP authorization for an admin entering the gateway", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await fetch(`http://127.0.0.1:${config.port}/chat?thread=1`, {
      headers: {
        cookie: sessionCookie(config, "alice"),
        accept: "text/html",
      },
      redirect: "manual",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/oauth/login?intent=integrations&next=%2Fchat%3Fthread%3D1");
  });

  it("recovers unreadable MCP credentials through OAuth", async () => {
    const config = await testConfig();
    await fs.mkdir(path.dirname(config.mcpCredentialFile), { recursive: true });
    await fs.writeFile(config.mcpCredentialFile, "invalid encrypted credential");
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await fetch(`http://127.0.0.1:${config.port}/chat`, {
      headers: {
        cookie: sessionCookie(config, "alice"),
        accept: "text/html",
      },
      redirect: "manual",
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/oauth/login?intent=integrations&next=%2Fchat");
  });

  it("does not require integration authorization when every managed server is disabled", async () => {
    const openclawPort = await freePort();
    const upstream = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end("gateway");
    });
    await listen(upstream, openclawPort);
    cleanups.push(() => closeServer(upstream));

    const config = await testConfig({ openclawPort });
    await fs.writeFile(
      config.openclawConfigPath,
      JSON.stringify({
        gateway: {},
        mcp: {
          servers: {
            huggingface: { enabled: false },
            "research-agent": { enabled: false },
          },
        },
      }),
      "utf8",
    );
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await fetch(`http://127.0.0.1:${config.port}/`, {
      headers: {
        cookie: sessionCookie(config, "alice"),
        accept: "text/html",
      },
      redirect: "manual",
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("gateway");
  });

  it("requests broad integration scopes only for an authenticated admin", async () => {
    const config = await testConfig({
      allowedUsers: ["alice", "bob"],
      adminUsers: ["alice"],
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const admin = await fetch(`http://127.0.0.1:${config.port}/oauth/login?intent=integrations`, {
      headers: { cookie: sessionCookie(config, "alice") },
      redirect: "manual",
    });
    const member = await fetch(`http://127.0.0.1:${config.port}/oauth/login?intent=integrations`, {
      headers: { cookie: sessionCookie(config, "bob") },
      redirect: "manual",
    });
    const anonymous = await fetch(`http://127.0.0.1:${config.port}/oauth/login?intent=integrations`, {
      redirect: "manual",
    });

    expect(new URL(admin.headers.get("location") ?? "").searchParams.get("scope")).toContain("manage-repos");
    expect(new URL(member.headers.get("location") ?? "").searchParams.get("scope")).toBe("openid profile");
    expect(new URL(anonymous.headers.get("location") ?? "").searchParams.get("scope")).toBe("openid profile");
  });

  it("returns dynamic Hugging Face Router model/provider options", async () => {
    const routerPort = await freePort();
    const router = http.createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          object: "list",
          data: [
            {
              id: "Qwen/Qwen3.6-27B",
              architecture: {
                input_modalities: ["text", "image"],
                output_modalities: ["text"],
              },
              providers: [
                {
                  provider: "deepinfra",
                  status: "live",
                  context_length: 262144,
                  pricing: { input: 0.32, output: 3.2 },
                  supports_tools: true,
                  supports_structured_output: true,
                  first_token_latency_ms: 347.8,
                  throughput: 39.47002845464158,
                },
              ],
            },
          ],
        }),
      );
    });
    await listen(router, routerPort);
    cleanups.push(() => closeServer(router));

    const config = await testConfig({
      routerModelsUrl: `http://127.0.0.1:${routerPort}/v1/models`,
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/router-models`, {
      headers: { cookie: sessionCookie(config, "alice") },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true });
    expect(body.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          modelId: "google/gemma-4-26B-A4B-it",
          provider: "deepinfra",
          preset: true,
        }),
        expect.objectContaining({
          modelId: "Qwen/Qwen3.6-27B",
          provider: "deepinfra",
          openclawModel: "huggingface/Qwen/Qwen3.6-27B:deepinfra",
          pricing: expect.objectContaining({ input: 0.32, output: 3.2 }),
          supportsTools: true,
          supportsStructuredOutput: true,
        }),
      ]),
    );
  });

  it("keeps the requested browser path as OAuth next while APIs return 401", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const browser = await fetch(`http://127.0.0.1:${config.port}/control/deep?tab=chat`, {
      headers: { accept: "text/html" },
      redirect: "manual",
    });

    expect(browser.status).toBe(302);
    expect(browser.headers.get("location")).toBe("/login?next=%2Fcontrol%2Fdeep%3Ftab%3Dchat");

    const login = await fetch(`http://127.0.0.1:${config.port}/login?next=%2Fcontrol%2Fdeep%3Ftab%3Dchat`);
    expect(login.status).toBe(200);
    const loginHtml = await login.text();
    expect(loginHtml).toContain(`${config.publicUrl}/oauth/login?next=%2Fcontrol%2Fdeep%3Ftab%3Dchat`);
    expect(loginHtml).toContain('target="_blank"');
    expect(loginHtml).toContain('rel="noopener"');

    const api = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/status`, {
      headers: { accept: "application/json" },
    });
    expect(api.status).toBe(401);
  });

  it("rejects malformed-cookie WebSocket upgrades without crashing", async () => {
    const config = await testConfig({ model: "openai/gpt-5" });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await websocketUpgrade(
      config.port,
      [
        "GET / HTTP/1.1",
        `Host: 127.0.0.1:${config.port}`,
        "Connection: Upgrade",
        "Upgrade: websocket",
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
        "Sec-WebSocket-Version: 13",
        "Cookie: mlclaw_session=%",
        "",
        "",
      ].join("\r\n"),
    );

    expect(response).toContain("401 Unauthorized");
    const health = await fetch(`http://127.0.0.1:${config.port}/health`);
    expect(health.status).toBe(200);
  });

  it("proxies browser traffic as an authenticated trusted proxy user", async () => {
    const openclawPort = await freePort();
    let capturedHeaders: http.IncomingHttpHeaders | undefined;
    const upstream = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end(String(req.headers["x-forwarded-user"]));
    });
    await listen(upstream, openclawPort);
    cleanups.push(() => closeServer(upstream));

    const config = await testConfig({ openclawPort });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const cookie = sessionCookie(config, "alice");
    const response = await fetch(`http://127.0.0.1:${config.port}/`, {
      headers: {
        cookie,
        "x-forwarded-user": "mallory",
        "x-openclaw-scopes": "operator.admin",
        authorization: "Bearer attacker",
      },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("alice");
    expect(capturedHeaders).toMatchObject({
      "x-forwarded-user": "alice",
      "x-forwarded-proto": "http",
      "x-forwarded-host": `127.0.0.1:${config.port}`,
      "x-openclaw-scopes": "operator.admin,operator.read,operator.write,operator.approvals,operator.pairing",
    });
    expect(capturedHeaders?.authorization).toBeUndefined();
  });

  it("does not grant admin Control UI scopes to non-admin allowed users", async () => {
    const openclawPort = await freePort();
    let capturedHeaders: http.IncomingHttpHeaders | undefined;
    const upstream = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      res.end("ok");
    });
    await listen(upstream, openclawPort);
    cleanups.push(() => closeServer(upstream));

    const config = await testConfig({
      openclawPort,
      allowedUsers: ["alice", "bob"],
      adminUsers: ["alice"],
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const cookie = sessionCookie(config, "bob");
    const response = await fetch(`http://127.0.0.1:${config.port}/`, {
      headers: { cookie },
    });

    expect(response.status).toBe(200);
    expect(capturedHeaders?.["x-openclaw-scopes"]).toBe("operator.read,operator.write");
  });

  it("returns a generic upstream error when OpenClaw is unavailable", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );
    const cookie = sessionCookie(config, "alice");

    const response = await fetch(`http://127.0.0.1:${config.port}/`, {
      headers: { cookie },
    });

    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).toBe("OpenClaw gateway is not ready\n");
    expect(body).not.toMatch(/ECONNREFUSED|127\.0\.0\.1/);
  });

  it("stores OpenAI credentials as a Space secret and a 0600 runtime file", async () => {
    const captured: unknown[] = [];
    const hubPort = await freePort();
    const hub = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += String(chunk);
      });
      req.on("end", () => {
        captured.push(JSON.parse(body));
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      });
    });
    await listen(hub, hubPort);
    cleanups.push(() => closeServer(hub));

    const config = await testConfig({
      hfToken: "hf_test",
      hubUrl: `http://127.0.0.1:${hubPort}`,
      spaceId: "alice/research",
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );
    const cookie = sessionCookie(config, "alice");
    const csrf = await csrfToken(config, cookie);

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/credentials/openai`, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
        "x-mlclaw-csrf": csrf,
      },
      body: JSON.stringify({ apiKey: `sk-${"a".repeat(32)}` }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, configured: true, persistent: true });
    expect(captured).toEqual([{ key: "OPENAI_API_KEY", value: `sk-${"a".repeat(32)}` }]);
    await expect(fs.readFile(config.openaiCredentialFile, "utf8")).resolves.toBe(
      `OPENAI_API_KEY=sk-${"a".repeat(32)}\n`,
    );
    const mode = (await fs.stat(config.openaiCredentialFile)).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("does not log OpenAI key material when Space Secret persistence fails", async () => {
    const apiKey = `sk-${"b".repeat(32)}`;
    const hubPort = await freePort();
    const hub = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += String(chunk);
      });
      req.on("end", () => {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "echo", request: body }));
      });
    });
    await listen(hub, hubPort);
    cleanups.push(() => closeServer(hub));

    const config = await testConfig({
      hfToken: "hf_test",
      hubUrl: `http://127.0.0.1:${hubPort}`,
      spaceId: "alice/research",
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );
    const cookie = sessionCookie(config, "alice");
    const csrf = await csrfToken(config, cookie);
    const stderr: string[] = [];
    const writeStderr = process.stderr.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderr.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return true;
    }) as typeof process.stderr.write;

    try {
      const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/credentials/openai`, {
        method: "POST",
        headers: {
          cookie,
          "content-type": "application/json",
          "x-mlclaw-csrf": csrf,
        },
        body: JSON.stringify({ apiKey }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ ok: true, configured: true, persistent: true });
    } finally {
      process.stderr.write = writeStderr;
    }

    const log = stderr.join("");
    expect(log).toContain("failed to persist OpenAI key as Space Secret");
    expect(log).not.toContain(apiKey);
    await expect(fs.readFile(config.openaiCredentialFile, "utf8")).resolves.toBe(`OPENAI_API_KEY=${apiKey}\n`);
    const encrypted = await fs.readFile(config.openaiCredentialStoreFile, "utf8");
    expect(encrypted).not.toContain(apiKey);
    await expect(
      new OpenAiCredentialStore(config.openaiCredentialStoreFile, config.credentialKey).load(),
    ).resolves.toBe(apiKey);
  });

  it("requires an admin session before storing OpenAI credentials", async () => {
    const captured: unknown[] = [];
    const hubPort = await freePort();
    const hub = http.createServer((req, res) => {
      req.on("data", (chunk) => {
        captured.push(String(chunk));
      });
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      });
    });
    await listen(hub, hubPort);
    cleanups.push(() => closeServer(hub));

    const config = await testConfig({
      allowedUsers: ["alice", "bob"],
      adminUsers: ["alice"],
      hfToken: "hf_test",
      hubUrl: `http://127.0.0.1:${hubPort}`,
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );
    const cookie = sessionCookie(config, "bob");
    const csrf = await csrfToken(config, cookie);

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/credentials/openai`, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
        "x-mlclaw-csrf": csrf,
      },
      body: JSON.stringify({ apiKey: `sk-${"a".repeat(32)}` }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, error: "admin required" });
    expect(captured).toEqual([]);
    await expect(fs.access(config.openaiCredentialFile)).rejects.toThrow();
  });

  it("requires CSRF before mutating model settings", async () => {
    const config = await testConfig({
      hfToken: "hf_test",
      hubUrl: "http://127.0.0.1:1",
      spaceId: "alice/research",
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/settings/model`, {
      method: "POST",
      headers: {
        cookie: sessionCookie(config, "alice"),
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "huggingface/Qwen/Qwen3.6-27B:deepinfra" }),
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ ok: false, error: "csrf token is invalid or missing" });
  });

  it("rejects Hugging Face Router model changes without an inference token", async () => {
    const config = await testConfig({
      hfToken: undefined,
      routerToken: undefined,
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );
    const cookie = sessionCookie(config, "alice");
    const csrf = await csrfToken(config, cookie);
    const qwenChoice = PRESET_MODEL_CHOICES.find((choice) => choice.modelId === "Qwen/Qwen3.6-27B");
    if (!qwenChoice) {
      throw new Error("Qwen preset is missing");
    }

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/settings/model`, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
        "x-mlclaw-csrf": csrf,
      },
      body: JSON.stringify({ model: qwenChoice.openclawModel, modelChoices: [qwenChoice] }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: "Hugging Face broker credential is required before selecting a Hugging Face Router model",
    });
  });

  it("writes model choices to the current Space, updates OpenClaw config, and requests restart", async () => {
    const captured: Array<{ path: string; body: unknown; authorization: string | undefined }> = [];
    const hubPort = await freePort();
    const hub = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += String(chunk);
      });
      req.on("end", () => {
        captured.push({
          path: req.url ?? "",
          body: body ? JSON.parse(body) : undefined,
          authorization: req.headers.authorization,
        });
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      });
    });
    await listen(hub, hubPort);
    cleanups.push(() => closeServer(hub));

    const config = await testConfig({
      hfToken: "hf_test",
      hubUrl: `http://127.0.0.1:${hubPort}`,
      spaceId: "alice/research",
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );
    const cookie = sessionCookie(config, "alice");
    const csrf = await csrfToken(config, cookie);

    const qwenChoice = PRESET_MODEL_CHOICES.find((choice) => choice.modelId === "Qwen/Qwen3.6-27B");
    if (!qwenChoice) {
      throw new Error("Qwen preset is missing");
    }

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/settings/model`, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
        "x-mlclaw-csrf": csrf,
      },
      body: JSON.stringify({ model: qwenChoice.openclawModel, modelChoices: [qwenChoice] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      model: "huggingface/Qwen/Qwen3.6-27B:deepinfra",
      modelChoices: [
        {
          modelId: "Qwen/Qwen3.6-27B",
          provider: "deepinfra",
        },
      ],
      restartPending: true,
    });
    expect(captured[0]).toEqual({
      path: "/api/spaces/alice/research/variables",
      body: { key: "OPENCLAW_MODEL", value: "huggingface/Qwen/Qwen3.6-27B:deepinfra" },
      authorization: "Bearer hf_test",
    });
    expect(captured[1]).toMatchObject({
      path: "/api/spaces/alice/research/variables",
      body: { key: "MLCLAW_MODEL_CHOICES" },
      authorization: "Bearer hf_test",
    });
    const storedChoices = JSON.parse((captured[1]?.body as { value: string }).value);
    expect(storedChoices).toMatchObject([
      {
        modelId: "Qwen/Qwen3.6-27B",
        provider: "deepinfra",
      },
    ]);
    expect(captured[2]).toEqual({
      path: "/api/spaces/alice/research/restart",
      body: { factoryReboot: false },
      authorization: "Bearer hf_test",
    });
    const rewritten = JSON.parse(await fs.readFile(config.openclawConfigPath, "utf8"));
    expect(rewritten.agents.defaults.model.primary).toBe("huggingface/Qwen/Qwen3.6-27B:deepinfra");
    expect(rewritten.models.providers.huggingface.models).toMatchObject([
      {
        id: "Qwen/Qwen3.6-27B:deepinfra",
        contextWindow: 262144,
        cost: {
          input: 0.32,
          output: 3.2,
        },
      },
    ]);
    const runtimeSettings = await fs.stat(config.runtimeSettingsFile);
    expect(runtimeSettings.mode & 0o777).toBe(0o600);
    expect(runtimeSettings.uid).toBe(config.openclawUid);
    expect(runtimeSettings.gid).toBe(config.openclawGid);
  });

  it("reports a saved model when the restart request fails", async () => {
    const captured: Array<{ path: string; body: unknown }> = [];
    const hubPort = await freePort();
    const hub = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += String(chunk);
      });
      req.on("end", () => {
        captured.push({
          path: req.url ?? "",
          body: body ? JSON.parse(body) : undefined,
        });
        if (req.url?.endsWith("/restart")) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "restart failed" }));
          return;
        }
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
      });
    });
    await listen(hub, hubPort);
    cleanups.push(() => closeServer(hub));

    const config = await testConfig({
      hfToken: "hf_test",
      hubUrl: `http://127.0.0.1:${hubPort}`,
      spaceId: "alice/research",
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );
    const cookie = sessionCookie(config, "alice");
    const csrf = await csrfToken(config, cookie);

    const qwenChoice = PRESET_MODEL_CHOICES.find((choice) => choice.modelId === "Qwen/Qwen3.6-27B");
    if (!qwenChoice) {
      throw new Error("Qwen preset is missing");
    }

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/settings/model`, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/json",
        "x-mlclaw-csrf": csrf,
      },
      body: JSON.stringify({ model: qwenChoice.openclawModel, modelChoices: [qwenChoice] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      model: "huggingface/Qwen/Qwen3.6-27B:deepinfra",
      restartPending: false,
    });
    expect(captured.map((item) => item.path)).toEqual([
      "/api/spaces/alice/research/variables",
      "/api/spaces/alice/research/variables",
      "/api/spaces/alice/research/restart",
    ]);
  });

  it("injects a small ML Claw shell into authenticated OpenClaw HTML", async () => {
    const openclawPort = await freePort();
    let capturedHeaders: http.IncomingHttpHeaders | undefined;
    const upstream = http.createServer((req, res) => {
      capturedHeaders = req.headers;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(
        "<!doctype html><html><head><title>OpenClaw Control</title></head><body><main>OpenClaw</main></body></html>",
      );
    });
    await listen(upstream, openclawPort);
    cleanups.push(() => closeServer(upstream));

    const config = await testConfig({
      openclawPort,
      oauthClientId: undefined,
      oauthClientSecret: undefined,
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await fetch(`http://127.0.0.1:${config.port}/`, {
      headers: {
        cookie: sessionCookie(config, "alice"),
        accept: "text/html",
        "accept-encoding": "gzip, br",
      },
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("<title>Research Control</title>");
    expect(body).toContain('name="application-name" content="Research"');
    expect(body).toContain("data-mlclaw-shell");
    expect(body).toContain("data-mlclaw-control-branding");
    expect(body).toContain("data-mlclaw-approvals-button");
    expect(body).toContain("data-mlclaw-approvals-frame");
    expect(body).toContain('title="Approval requests" sandbox="allow-scripts"');
    expect(body).toContain("data-mlclaw-approvals-popover");
    const popoverSrc = body.match(/data-mlclaw-approvals-frame data-src="([^"]+)"/u)?.[1];
    expect(popoverSrc).toBeDefined();
    const popoverUrl = new URL(popoverSrc ?? "", "http://mlclaw.test");
    expect(popoverUrl.pathname).toBe("/plugins/brokerkit/ui/");
    expect(popoverUrl.search).toBe("?embed=popover");
    expect(JSON.parse(Buffer.from(popoverUrl.hash.slice(1), "base64url").toString("utf8"))).toEqual({
      version: 1,
      mode: "delegated-web",
      basePath: "/mlclaw/api/brokerkit",
    });
    expect(body).toContain("width:min(420px,calc(100vw - 24px))");
    expect(body).toContain('src="/assets/mlclaw-control-branding.js"');
    expect(body).toContain('href="/mlclaw"');
    expect(body).toContain("width:34px;height:34px");
    expect(body).toContain('<svg aria-hidden="true" viewBox="0 0 24 24"');
    expect(body).toContain('<circle cx="12" cy="12" r="3"></circle>');
    expect(body).not.toContain('src="/assets/hf-logo.svg"');
    expect(body).not.toContain('var productName = "ML Claw"');
    expect(body).toContain('title="Research"');
    expect(body).toContain("left:max(12px,env(safe-area-inset-left))");
    expect(body).not.toContain(">Settings</a>");
    expect(body).not.toContain(">Sign out</a>");
    expect(capturedHeaders?.["accept-encoding"]).toBeUndefined();
  });

  it("serves CSP-compatible branding and service worker reset scripts", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const branding = await fetch(`http://127.0.0.1:${config.port}/assets/mlclaw-control-branding.js`);
    expect(branding.status).toBe(200);
    expect(branding.headers.get("content-type")).toContain("text/javascript");
    expect(branding.headers.get("cache-control")).toContain("no-store");
    const brandingScript = await branding.text();
    expect(brandingScript).toContain('var productName = "ML Claw"');
    expect(brandingScript).not.toContain("brokerkit.delegated-web.session.request");
    expect(brandingScript).not.toContain("brokerKitSession");
    expect(brandingScript).toContain('data.type !== "brokerkit.delegated-web.open"');
    expect(brandingScript).toContain("event.source !== frame.contentWindow");
    const topLevelPath = brandingScript.match(/window\.location\.assign\("([^"]+)"\)/u)?.[1];
    expect(topLevelPath).toBeDefined();
    const topLevelUrl = new URL(topLevelPath ?? "", "http://mlclaw.test");
    expect(topLevelUrl.pathname).toBe("/plugins/brokerkit/ui/");
    expect(JSON.parse(Buffer.from(topLevelUrl.hash.slice(1), "base64url").toString("utf8"))).toEqual({
      version: 1,
      mode: "delegated-web",
      basePath: "/mlclaw/api/brokerkit",
    });
    expect(brandingScript).toContain("installApprovals");
    expect(brandingScript).toContain('fetch("/mlclaw/api/brokerkit/summary"');
    expect(brandingScript).toContain('fetch("/mlclaw/api/brokerkit/summary/events?cursor="');
    expect(brandingScript).toContain('frame.contentWindow.postMessage({ type: "brokerkit.operator-ui.invalidate"');
    expect(brandingScript).toContain("window.setInterval(refresh, 300000)");
    expect(brandingScript).not.toContain("window.setInterval(refresh, 15000)");

    const sw = await fetch(`http://127.0.0.1:${config.port}/sw.js`);
    expect(sw.status).toBe(200);
    expect(sw.headers.get("content-type")).toContain("text/javascript");
    expect(sw.headers.get("cache-control")).toContain("no-store");
    expect(await sw.text()).toContain("registration.unregister");
  });

  it("serves the packaged BrokerKit UI from the trusted ML Claw boundary", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-brokerkit-ui-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const uiDir = path.join(root, "dist", "ui", "assets");
    await fs.mkdir(uiDir, { recursive: true });
    await fs.writeFile(
      path.join(root, "dist", "ui", "index.html"),
      "<!doctype html><html><head><title>Trusted BrokerKit</title></head><body></body></html>",
    );
    await fs.writeFile(path.join(uiDir, "app.js"), "globalThis.trustedBrokerKit = true;");
    const config = await testConfig({
      allowedUsers: ["alice", "bob"],
      adminUsers: ["alice"],
      brokerKitPluginPath: root,
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const base = `http://127.0.0.1:${config.port}/plugins/brokerkit/ui/`;
    const page = await fetch(base, {
      headers: { "sec-fetch-dest": "iframe", cookie: sessionCookie(config, "alice") },
    });
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toContain("text/html");
    const launcherHtml = await page.text();
    expect(launcherHtml).toContain("Trusted BrokerKit");
    expect(launcherHtml).toContain('name="brokerkit-delegated-top-level"');
    expect(launcherHtml).not.toContain("brokerkit-delegated-session");
    expect(page.headers.get("cache-control")).toBe("no-store");
    expect(page.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(page.headers.get("content-security-policy")).not.toContain("sandbox");
    expect(page.headers.get("content-security-policy")).toContain(`connect-src 'self' http://127.0.0.1:${config.port}`);
    expect(page.headers.get("x-frame-options")).toBe("SAMEORIGIN");

    const popover = await fetch(`${base}?embed=popover`, {
      headers: { "sec-fetch-dest": "iframe", cookie: sessionCookie(config, "alice") },
    });
    const popoverHtml = await popover.text();
    expect(popover.status).toBe(200);
    expect(popoverHtml).toContain('name="brokerkit-delegated-session"');
    expect(popoverHtml).not.toContain("brokerkit-delegated-top-level");
    const popoverSession = popoverHtml.match(/name="brokerkit-delegated-session" content="([A-Za-z0-9_-]+)"/u)?.[1];
    const popoverSessionBody = JSON.parse(Buffer.from(popoverSession ?? "", "base64url").toString("utf8")) as {
      access: string;
      token: string;
    };
    expect(popoverSessionBody).toMatchObject({
      api_version: "brokerkit.io/delegated-web/v1",
      access: "read",
      renewal_transport: "direct",
    });
    const readOnlyDecision = await fetch(
      `http://127.0.0.1:${config.port}/mlclaw/api/brokerkit/requests/opaque/approve`,
      {
        method: "POST",
        headers: {
          origin: "null",
          "content-type": "application/json",
          "brokerkit-session": popoverSessionBody.token,
        },
        body: JSON.stringify({ expectedRevision: 1 }),
      },
    );
    expect(readOnlyDecision.status).toBe(401);
    expect(popover.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(popover.headers.get("content-security-policy")).toContain("sandbox allow-scripts");
    expect(popover.headers.get("x-frame-options")).toBe("SAMEORIGIN");

    const invalidEmbed = await fetch(`${base}?embed=other`, {
      headers: { "sec-fetch-dest": "iframe", cookie: sessionCookie(config, "alice") },
    });
    expect(invalidEmbed.status).toBe(404);

    const topLevel = await fetch(base, {
      headers: { "sec-fetch-dest": "document", cookie: sessionCookie(config, "alice") },
    });
    const topLevelHtml = await topLevel.text();
    expect(topLevel.status).toBe(200);
    expect(topLevelHtml).toContain('name="brokerkit-delegated-session"');
    expect(topLevelHtml).not.toContain("brokerkit-delegated-top-level");
    const topLevelSession = topLevelHtml.match(/name="brokerkit-delegated-session" content="([A-Za-z0-9_-]+)"/u)?.[1];
    expect(JSON.parse(Buffer.from(topLevelSession ?? "", "base64url").toString("utf8"))).toMatchObject({
      api_version: "brokerkit.io/delegated-web/v1",
      access: "decide",
      renewal_transport: "direct",
    });
    expect(topLevel.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(topLevel.headers.get("content-security-policy")).toContain("sandbox allow-scripts");
    expect(topLevel.headers.get("x-frame-options")).toBe("DENY");

    const asset = await fetch(`${base}assets/app.js`, {
      headers: { cookie: sessionCookie(config, "alice") },
    });
    expect(asset.status).toBe(200);
    expect(asset.headers.get("cache-control")).toContain("immutable");
    expect(asset.headers.get("access-control-allow-origin")).toBe("null");
    expect(asset.headers.get("cross-origin-resource-policy")).toBe("cross-origin");
    expect(await asset.text()).toContain("trustedBrokerKit");

    const member = await fetch(base, {
      headers: { "sec-fetch-dest": "iframe", cookie: sessionCookie(config, "bob") },
    });
    expect(member.status).toBe(403);
  });

  it("does not inject the ML Claw shell into proxied JSON", async () => {
    const openclawPort = await freePort();
    const upstream = http.createServer((req, res) => {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
    });
    await listen(upstream, openclawPort);
    cleanups.push(() => closeServer(upstream));

    const config = await testConfig({ openclawPort });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const response = await fetch(`http://127.0.0.1:${config.port}/api/example`, {
      headers: {
        cookie: sessionCookie(config, "alice"),
        accept: "application/json",
      },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(JSON.stringify({ ok: true }));
  });

  it("serves branded browser assets and a branded web manifest", async () => {
    const config = await testConfig({
      branding: resolveBranding(
        {
          MLCLAW_BRAND_NAME: "Bob Lab",
          MLCLAW_BRAND_SHORT_NAME: "Bob",
          MLCLAW_BRAND_THEME_COLOR: "#0f0",
        },
        "research",
      ),
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    const manifest = await fetch(`http://127.0.0.1:${config.port}/manifest.webmanifest`);
    expect(manifest.status).toBe(200);
    expect(manifest.headers.get("content-type")).toContain("application/manifest+json");
    await expect(manifest.json()).resolves.toMatchObject({
      name: "Bob Lab",
      short_name: "Bob",
      theme_color: "#00ff00",
      icons: [{ src: "./favicon.svg" }, { src: "./favicon-32.png" }, { src: "./apple-touch-icon.png" }],
    });

    for (const pathname of ["/assets/brand/logo", "/favicon.svg", "/favicon.ico", "/assets/assistant-avatar.svg"]) {
      const response = await fetch(`http://127.0.0.1:${config.port}${pathname}`);
      expect(response.status, pathname).toBe(200);
      expect(response.headers.get("cache-control"), pathname).toBeNull();
      expect(await response.text(), pathname).toContain("<svg");
    }
    for (const pathname of ["/favicon-32.png", "/apple-touch-icon.png"]) {
      const response = await fetch(`http://127.0.0.1:${config.port}${pathname}`);
      expect(response.status, pathname).toBe(200);
      expect(response.headers.get("content-type"), pathname).toBe("image/png");
      expect(response.headers.get("cache-control"), pathname).toBeNull();
      expect([...new Uint8Array(await response.arrayBuffer()).slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    }
  });

  it("exits the wrapper when OpenClaw exits unexpectedly", async () => {
    const exitCodes: number[] = [];
    const config = await testConfig({
      openclawArgs: ["-e", "process.exit(7)"],
    });
    const runtime = new SpaceRuntimeServer(config, {
      exitProcess: (code) => {
        exitCodes.push(code);
      },
    });
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    await waitFor(() => exitCodes.length > 0);

    expect(exitCodes).toEqual([7]);
  });

  it("stops OpenClaw if the public HTTP port cannot bind", async () => {
    const blockedPort = await freePort();
    const blocker = http.createServer();
    await listen(blocker, blockedPort, "0.0.0.0");
    cleanups.push(() => closeServer(blocker));

    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-bind-failure-"));
    const pidFile = path.join(root, "pid");
    const config = await testConfig({
      port: blockedPort,
      openclawArgs: [
        "-e",
        `require("fs").writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setInterval(()=>undefined,100000)`,
      ],
    });
    const runtime = new SpaceRuntimeServer(config);
    cleanups.push(
      () => runtime.stop(),
      () => fs.rm(root, { recursive: true, force: true }),
    );

    await expect(runtime.start()).rejects.toThrow(/EADDRINUSE|address already in use/i);
    const pid = await readPidFile(pidFile);
    if (pid) {
      await waitFor(() => !processIsAlive(pid));
    }
  });

  it("passes only the Router token to the OpenClaw child when broad Hub tokens are present", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-router-token-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const envFile = path.join(root, "env.json");
    const previousHfToken = process.env.HF_TOKEN;
    const previousHubToken = process.env.HUGGINGFACE_HUB_TOKEN;
    process.env.HF_TOKEN = "hf_broad";
    process.env.HUGGINGFACE_HUB_TOKEN = "hf_broad";
    cleanups.push(() => {
      if (previousHfToken === undefined) {
        delete process.env.HF_TOKEN;
      } else {
        process.env.HF_TOKEN = previousHfToken;
      }
      if (previousHubToken === undefined) {
        delete process.env.HUGGINGFACE_HUB_TOKEN;
      } else {
        process.env.HUGGINGFACE_HUB_TOKEN = previousHubToken;
      }
    });
    const config = await testConfig({
      routerToken: "hf_router",
      openclawArgs: [
        "-e",
        `require("fs").writeFileSync(${JSON.stringify(envFile)},JSON.stringify({HF_TOKEN:process.env.HF_TOKEN,HUGGINGFACE_HUB_TOKEN:process.env.HUGGINGFACE_HUB_TOKEN}));setInterval(()=>undefined,100000)`,
      ],
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    await waitFor(async () => fileExists(envFile));
    const env = JSON.parse(await fs.readFile(envFile, "utf8")) as Record<string, string>;
    expect(env).toEqual({
      HF_TOKEN: "hf_router",
      HUGGINGFACE_HUB_TOKEN: "hf_router",
    });
  });

  it("does not expose wrapper-only secrets to the OpenClaw child", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-wrapper-secrets-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const envFile = path.join(root, "env.json");
    const secretKeys = [
      "MLCLAW_CREDENTIAL_KEY",
      "MLCLAW_SESSION_SECRET",
      "SESSION_SECRET",
      "OAUTH_CLIENT_SECRET",
      "MLCLAW_BROKER_HF_TOKEN",
      "MLCLAW_TRUSTED_HF_TOKEN_FILE",
      "MLCLAW_OPERATOR_BROKERS_FILE",
    ];
    const keys = [...secretKeys, "HOME", "USER", "LOGNAME"];
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    for (const key of keys) {
      process.env[key] = `secret-${key}`;
    }
    cleanups.push(() => {
      for (const key of keys) {
        if (previous[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = previous[key];
        }
      }
    });
    const config = await testConfig({
      openclawArgs: [
        "-e",
        `require("fs").writeFileSync(${JSON.stringify(envFile)},JSON.stringify(Object.fromEntries(${JSON.stringify(keys)}.map(k=>[k,process.env[k]]))));setInterval(()=>undefined,100000)`,
      ],
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    await waitFor(async () => fileExists(envFile));
    const env = JSON.parse(await fs.readFile(envFile, "utf8")) as Record<string, string>;
    expect(secretKeys.every((key) => env[key] === undefined)).toBe(true);
    expect(env).toMatchObject({ HOME: "/home/node", USER: "node", LOGNAME: "node" });
  });

  it("forwards a persisted OpenAI Space secret to the OpenClaw child", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-openai-secret-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const envFile = path.join(root, "env.json");
    const apiKey = `sk-${"p".repeat(32)}`;
    const previous = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = apiKey;
    cleanups.push(() => {
      if (previous === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = previous;
      }
    });
    const config = await testConfig({
      openclawArgs: [
        "-e",
        `require("fs").writeFileSync(${JSON.stringify(envFile)},JSON.stringify({OPENAI_API_KEY:process.env.OPENAI_API_KEY}));setInterval(()=>undefined,100000)`,
      ],
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    await waitFor(async () => fileExists(envFile));
    await expect(fs.readFile(envFile, "utf8")).resolves.toBe(JSON.stringify({ OPENAI_API_KEY: apiKey }));
  });

  it("scrubs broad Hub tokens when no Router token exists", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-legacy-hub-token-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const envFile = path.join(root, "env.json");
    const previousHfToken = process.env.HF_TOKEN;
    const previousHubToken = process.env.HUGGINGFACE_HUB_TOKEN;
    process.env.HF_TOKEN = "hf_legacy";
    process.env.HUGGINGFACE_HUB_TOKEN = "hf_legacy";
    cleanups.push(() => {
      if (previousHfToken === undefined) {
        delete process.env.HF_TOKEN;
      } else {
        process.env.HF_TOKEN = previousHfToken;
      }
      if (previousHubToken === undefined) {
        delete process.env.HUGGINGFACE_HUB_TOKEN;
      } else {
        process.env.HUGGINGFACE_HUB_TOKEN = previousHubToken;
      }
    });
    const config = await testConfig({
      openclawArgs: [
        "-e",
        `require("fs").writeFileSync(${JSON.stringify(envFile)},JSON.stringify({HF_TOKEN:process.env.HF_TOKEN,HUGGINGFACE_HUB_TOKEN:process.env.HUGGINGFACE_HUB_TOKEN}));setInterval(()=>undefined,100000)`,
      ],
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    await waitFor(async () => fileExists(envFile));
    const env = JSON.parse(await fs.readFile(envFile, "utf8")) as Record<string, string>;
    expect(env).toEqual({});
  });

  it("restarts only the OpenClaw child when runtime restart has no Hub token", async () => {
    const config = await testConfig({ hfToken: undefined });
    let restartCount = 0;
    const app = createSpaceRuntimeApp(config, {
      openclawRunning: () => true,
      openAiConfigured: async () => false,
      restartOpenClawWithOpenAi: async () => undefined,
      restartOpenClaw: async () => {
        restartCount += 1;
      },
      setModelSettings: () => undefined,
      saveMcpCredentials: async () => undefined,
      clearMcpCredentials: async () => undefined,
      mcpCredentialStatus: async (username) => ({
        configured: false,
        username,
        scope: [],
        expiresAt: null,
        refreshable: false,
      }),
      mcpServerStatus: async () => [
        { id: "huggingface", name: "Hugging Face MCP", enabled: true },
        { id: "research-agent", name: "Research Agent", enabled: true },
      ],
    });
    const cookie = sessionCookie(config, "alice");
    const csrf = createCsrfToken({ username: "alice", sessionSecret: config.sessionSecret });

    const response = await app.fetch(
      new Request(`${config.publicUrl}/mlclaw/api/runtime/restart`, {
        method: "POST",
        headers: {
          cookie,
          "x-mlclaw-csrf": csrf,
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, restartPending: false });
    expect(restartCount).toBe(1);
  });

  it("configures OpenClaw as a loopback trusted-proxy browser gateway", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-openclaw-config-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const configPath = path.join(root, "openclaw.json");
    await fs.writeFile(
      configPath,
      JSON.stringify({
        gateway: {
          controlUi: {
            allowedOrigins: ["https://old.example"],
          },
        },
        mcp: {
          servers: {
            custom: {
              command: "custom-mcp",
            },
            huggingface: {
              enabled: false,
              toolFilter: { include: ["paper_search"] },
              url: "https://stale.example/mcp",
            },
          },
        },
        plugins: {
          allow: ["custom"],
          load: { paths: ["/opt/custom-plugin"] },
          entries: { custom: { enabled: true } },
        },
      }),
    );
    const config = await testConfig({
      publicUrl: "https://alice-research.hf.space",
      openclawConfigPath: configPath,
    });

    await configureOpenClawGateway(config);

    const rewritten = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(rewritten.gateway).toMatchObject({
      mode: "local",
      bind: "loopback",
      port: config.openclawPort,
      auth: {
        mode: "trusted-proxy",
        trustedProxy: {
          userHeader: "x-forwarded-user",
          requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],
          allowLoopback: true,
        },
      },
      trustedProxies: ["127.0.0.1", "::1"],
      controlUi: {
        dangerouslyDisableDeviceAuth: true,
        allowedOrigins: ["https://alice-research.hf.space"],
        embedSandbox: "scripts",
      },
    });
    expect(rewritten.agents.defaults.model.primary).toBe("huggingface/google/gemma-4-26B-A4B-it:deepinfra");
    expect(rewritten.agents.defaults.models).toHaveProperty("huggingface/google/gemma-4-26B-A4B-it:deepinfra");
    expect(rewritten.agents.defaults.models).toHaveProperty("huggingface/Qwen/Qwen3.6-27B:deepinfra");
    expect(rewritten.models.providers.huggingface).toMatchObject({
      baseUrl: "https://router.huggingface.co/v1",
      api: "openai-completions",
    });
    expect(rewritten.models.providers.huggingface.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "google/gemma-4-26B-A4B-it:deepinfra",
          contextWindow: 262144,
          cost: expect.objectContaining({
            input: 0.07,
            output: 0.34,
          }),
          compat: expect.objectContaining({
            supportsTools: true,
            supportsStrictMode: true,
          }),
        }),
        expect.objectContaining({
          id: "Qwen/Qwen3.6-27B:deepinfra",
          contextWindow: 262144,
          cost: expect.objectContaining({
            input: 0.32,
            output: 3.2,
          }),
        }),
      ]),
    );
    expect(rewritten.mcp.servers.custom).toEqual({ command: "custom-mcp" });
    expect(rewritten.mcp.servers.huggingface).toMatchObject({
      enabled: false,
      url: `http://127.0.0.1:${config.mcpPort}/mcp/huggingface`,
      transport: "streamable-http",
      toolFilter: { include: ["paper_search"] },
    });
    expect(rewritten.mcp.servers["research-agent"]).toMatchObject({
      enabled: true,
      url: `http://127.0.0.1:${config.mcpPort}/mcp/research`,
      transport: "streamable-http",
    });
    expect(rewritten.plugins).toEqual({
      allow: ["custom", "brokerkit"],
      load: { paths: ["/opt/custom-plugin", config.brokerKitPluginPath] },
      entries: {
        custom: { enabled: true },
        brokerkit: {
          enabled: true,
          config: {
            mode: "delegated-web",
            delegatedWeb: { basePath: "/mlclaw/api/brokerkit" },
          },
        },
      },
    });
    expect(JSON.stringify(rewritten.plugins)).not.toContain("operator-secret");
  });

  it("does not create a restrictive plugin allowlist", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-openclaw-plugins-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const configPath = path.join(root, "openclaw.json");
    await fs.writeFile(configPath, JSON.stringify({ plugins: { entries: { telegram: { enabled: true } } } }));
    const config = await testConfig({ openclawConfigPath: configPath });

    await configureOpenClawGateway(config);

    const rewritten = JSON.parse(await fs.readFile(configPath, "utf8"));
    expect(rewritten.plugins.allow).toBeUndefined();
    expect(rewritten.plugins.entries.telegram).toEqual({ enabled: true });
    expect(rewritten.plugins.entries.brokerkit.enabled).toBe(true);
  });

  it("configures OpenClaw inference with only the broker agent credential", async () => {
    const config = await testConfig({
      brokerAgentUrl: "http://127.0.0.1:7863/",
      brokerAgentSecret: "agent-secret",
      brokerAgentSecretFile: "/run/mlclaw-hf-broker/agent-secret",
      routerToken: undefined,
    });

    await configureOpenClawGateway(config);

    const rewritten = JSON.parse(await fs.readFile(config.openclawConfigPath, "utf8"));
    expect(rewritten.models.providers.huggingface).toMatchObject({
      baseUrl: "http://127.0.0.1:7863/v1",
      apiKey: "agent-secret",
      api: "openai-completions",
    });
    expect(rewritten.mcp.servers["huggingface-broker"]).toEqual({
      command: "/usr/local/bin/hf-broker",
      args: ["mcp"],
      connectionTimeoutMs: BROKER_MCP_CONNECTION_TIMEOUT_MS,
      requestTimeoutMs: BROKER_MCP_REQUEST_TIMEOUT_MS,
      env: {
        MLCLAW_HF_BROKER_URL: "http://127.0.0.1:7863/",
        MLCLAW_HF_BROKER_AGENT_SECRET_FILE: "/run/mlclaw-hf-broker/agent-secret",
      },
      enabled: true,
    });
    expect(JSON.stringify(rewritten)).not.toContain("operator-secret");
    expect(BROKER_MCP_REQUEST_TIMEOUT_MS).toBeGreaterThan(25_000);
  });

  it("replaces stale managed broker settings while preserving disablement and tool filtering", async () => {
    const config = await testConfig({
      brokerAgentUrl: "http://127.0.0.1:7863/",
      brokerAgentSecretFile: "/run/mlclaw-hf-broker/agent-secret",
    });
    const existing = JSON.parse(await fs.readFile(config.openclawConfigPath, "utf8"));
    existing.mcp = {
      servers: {
        "huggingface-broker": {
          command: "/tmp/untrusted-broker",
          args: ["serve"],
          connectionTimeoutMs: 1,
          requestTimeoutMs: 900_000,
          cwd: "/tmp",
          unexpected: "stale",
          env: {
            MLCLAW_HF_BROKER_URL: "https://example.invalid",
            MLCLAW_HF_BROKER_AGENT_SECRET_FILE: "/tmp/secret",
          },
          enabled: false,
          toolFilter: { include: ["hf_operation_get"] },
          supportsParallelToolCalls: true,
          codex: {
            agents: [" main ", "reviewer"],
            defaultToolsApprovalMode: "prompt",
            unexpected: "stale",
          },
        },
        custom: { command: "/usr/local/bin/custom", enabled: true },
      },
    };
    await fs.writeFile(config.openclawConfigPath, JSON.stringify(existing));

    await configureOpenClawGateway(config);

    const rewritten = JSON.parse(await fs.readFile(config.openclawConfigPath, "utf8"));
    expect(rewritten.mcp.servers["huggingface-broker"]).toEqual({
      command: "/usr/local/bin/hf-broker",
      args: ["mcp"],
      connectionTimeoutMs: BROKER_MCP_CONNECTION_TIMEOUT_MS,
      requestTimeoutMs: BROKER_MCP_REQUEST_TIMEOUT_MS,
      env: {
        MLCLAW_HF_BROKER_URL: "http://127.0.0.1:7863/",
        MLCLAW_HF_BROKER_AGENT_SECRET_FILE: "/run/mlclaw-hf-broker/agent-secret",
      },
      enabled: false,
      toolFilter: { include: ["hf_operation_get"] },
      supportsParallelToolCalls: true,
      codex: {
        agents: ["main", "reviewer"],
        defaultToolsApprovalMode: "prompt",
      },
    });
    expect(rewritten.mcp.servers.custom).toEqual({ command: "/usr/local/bin/custom", enabled: true });
  });

  it("removes a stale managed broker MCP server when the broker is unavailable", async () => {
    const config = await testConfig({ brokerAgentUrl: undefined, brokerAgentSecretFile: undefined });
    const existing = JSON.parse(await fs.readFile(config.openclawConfigPath, "utf8"));
    existing.mcp = { servers: { "huggingface-broker": { command: "/missing/hf-broker", enabled: true } } };
    await fs.writeFile(config.openclawConfigPath, JSON.stringify(existing));

    await configureOpenClawGateway(config);

    const rewritten = JSON.parse(await fs.readFile(config.openclawConfigPath, "utf8"));
    expect(rewritten.mcp.servers["huggingface-broker"]).toBeUndefined();
  });

  it("makes the duplicated Space owner the default admin", () => {
    const config = loadConfig({
      SPACE_ID: "osolmaz/research",
      MLCLAW_ALLOWED_USERS: "alice,bob",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
    });

    expect(config.adminUsers).toEqual(["osolmaz"]);
    expect(config.allowedUsers).toEqual(["alice", "bob", "osolmaz"]);
    expect(config.brokerKitPopoverDecisions).toBe(false);
  });

  it("requires explicit opt-in for decisions inside the Gateway popover", () => {
    const config = loadConfig({
      SPACE_ID: "osolmaz/research",
      MLCLAW_BROKERKIT_POPOVER_DECISIONS: "true",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
    });

    expect(config.brokerKitPopoverDecisions).toBe(true);
  });

  it("loads the trusted local integration token from a protected file", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-trusted-token-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const tokenFile = path.join(root, "hf-token");
    await fs.writeFile(tokenFile, "hf_trusted_local\n", { mode: 0o600 });

    const config = loadConfig({
      SPACE_ID: "osolmaz/research",
      MLCLAW_GATEWAY_LOCATION: "local",
      MLCLAW_TRUSTED_HF_TOKEN_FILE: tokenFile,
      MLCLAW_SESSION_SECRET: "x".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
    });

    expect(config.hfToken).toBe("hf_trusted_local");
  });

  it("implicitly allows explicit admins", () => {
    const config = loadConfig({
      SPACE_ID: "osolmaz/research",
      MLCLAW_ALLOWED_USERS: "alice",
      MLCLAW_ADMINS: "bob",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
    });

    expect(config.adminUsers).toEqual(["bob"]);
    expect(config.allowedUsers).toEqual(["alice", "bob", "osolmaz"]);
  });

  it("uses template mode only for the canonical Space when the creator ID matches", () => {
    const config = loadConfig({
      SPACE_ID: "osolmaz/mlclaw",
      SPACE_CREATOR_USER_ID: "42",
      MLCLAW_CANONICAL_CREATOR_USER_ID: "42",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
    });

    expect(config.mode).toBe("template");
  });

  it("does not use template mode for another Space by the canonical creator", () => {
    const config = loadConfig({
      SPACE_ID: "osolmaz/research",
      SPACE_CREATOR_USER_ID: "42",
      MLCLAW_CANONICAL_CREATOR_USER_ID: "42",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
    });

    expect(config.mode).toBe("app");
  });

  it("derives browser branding from the agent name and accepts explicit branding", () => {
    const derived = loadConfig({
      SPACE_ID: "osolmaz/bob-lab",
      OPENCLAW_AGENT_NAME: "bob-lab",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
    });
    expect(derived.branding).toMatchObject({
      name: "Bob Lab",
      shortName: "Bob Lab",
      themeColor: "#111827",
      logoAsset: "mlclaw.svg",
      faviconSvgAsset: "hf-logo.svg",
      favicon32Asset: "hf-logo.png",
      faviconIcoAsset: "hf-logo.svg",
      appleTouchIconAsset: "hf-logo.png",
    });

    const explicit = loadConfig({
      SPACE_ID: "osolmaz/bob-lab",
      OPENCLAW_AGENT_NAME: "bob-lab",
      MLCLAW_BRAND_NAME: "Bob Research",
      MLCLAW_BRAND_SHORT_NAME: "Bob",
      MLCLAW_BRAND_THEME_COLOR: "#abc",
      MLCLAW_BRAND_LOGO: "/assets/custom/logo.svg",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
      MLCLAW_CREDENTIAL_KEY: "k".repeat(48),
    });
    expect(explicit.branding).toMatchObject({
      name: "Bob Research",
      shortName: "Bob",
      themeColor: "#aabbcc",
      logoAsset: "custom/logo.svg",
    });
  });

  it("serves the template landing page on template-mode app paths", async () => {
    const config = await testConfig({
      mode: "template",
      spaceId: "osolmaz/mlclaw",
    });
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(
      () => closeServer(server),
      () => runtime.stop(),
    );

    for (const pathname of ["/", "/login", "/oauth/login", "/mlclaw", "/mlclaw/settings"]) {
      const response = await fetch(`http://127.0.0.1:${config.port}${pathname}`, {
        headers: { accept: "text/html" },
        redirect: "manual",
      });
      expect(response.status).toBe(200);
      const body = await response.text();
      expect(body).toContain("Do not set this up by only clicking Duplicate");
    }

    const health = await fetch(`http://127.0.0.1:${config.port}/health`);
    expect(health.status).toBe(200);

    const logo = await fetch(`http://127.0.0.1:${config.port}/assets/hf-logo.svg`);
    expect(logo.status).toBe(200);
    expect(logo.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");

    const avatar = await fetch(`http://127.0.0.1:${config.port}/assets/assistant-avatar.svg`);
    expect(avatar.status).toBe(200);
    expect(avatar.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");

    for (const pathname of ["/favicon-32.png", "/apple-touch-icon.png"]) {
      const icon = await fetch(`http://127.0.0.1:${config.port}${pathname}`);
      expect(icon.status).toBe(200);
      expect(icon.headers.get("content-type")).toBe("image/png");
      expect([...new Uint8Array(await icon.arrayBuffer()).slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    }
  });
});

async function testConfig(overrides: Partial<SpaceRuntimeConfig> = {}): Promise<SpaceRuntimeConfig> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-space-runtime-"));
  const configPath = path.join(root, "openclaw.json");
  await fs.writeFile(configPath, JSON.stringify({ gateway: {} }), "utf8");
  const port = overrides.port ?? (await freePort());
  const openclawPort = overrides.openclawPort ?? (await freePort());
  const mcpPort = overrides.mcpPort ?? (await freePort());
  return {
    port,
    openclawPort,
    mcpPort,
    openclawHost: "127.0.0.1",
    openclawUid: process.getuid?.() ?? 1000,
    openclawGid: process.getgid?.() ?? 1000,
    publicUrl: `http://127.0.0.1:${port}`,
    providerUrl: "https://huggingface.co",
    oauthClientId: "client",
    oauthClientSecret: "secret",
    sessionSecret: "x".repeat(48),
    sessionSecretGenerated: false,
    credentialKey: "k".repeat(48),
    credentialKeyGenerated: false,
    cookieSecure: false,
    spaceId: "alice/research",
    canonicalSpaceId: "osolmaz/mlclaw",
    canonicalCreatorUserId: undefined,
    spaceCreatorUserId: undefined,
    allowedUsers: ["alice"],
    adminUsers: ["alice"],
    allowAnySignedIn: false,
    mode: "app",
    hfToken: undefined,
    routerToken: undefined,
    brokerAgentUrl: undefined,
    brokerAgentSecret: undefined,
    brokerAgentSecretFile: undefined,
    operatorBrokers: [],
    brokerKitPopoverDecisions: false,
    hubUrl: "https://huggingface.co",
    openaiCredentialFile: path.join(root, "secrets", "openai.env"),
    openaiCredentialStoreFile: path.join(root, "durable", "openai-api-key.enc"),
    mcpCredentialFile: path.join(root, "secrets", "mcp-oauth.enc"),
    hfMcpUrl: "https://huggingface.co/mcp?bouquet=hf",
    researchMcpUrl: "https://evalstate-research-agent-two.hf.space/mcp",
    researchTimeoutMs: 30 * 60 * 1000,
    researchPollMs: 1500,
    runtimeSettingsFile: path.join(root, ".mlclaw", "settings.json"),
    openclawConfigPath: configPath,
    openclawCommand: process.execPath,
    openclawArgs: ["-e", "setInterval(() => undefined, 100000)"],
    brokerKitPluginPath: "/opt/openclaw-plugins/node_modules/openclaw-brokerkit",
    agentName: "research",
    model: "huggingface/google/gemma-4-26B-A4B-it:deepinfra",
    modelChoices: PRESET_MODEL_CHOICES,
    routerModelsUrl: "https://router.huggingface.co/v1/models",
    stateBucket: "alice/research-data",
    stateMountDir: "/data/mlclaw-state",
    statePrefix: undefined,
    gatewayLocation: "space",
    runtimeImage: "example/runtime:test",
    runtimeId: "test-runtime",
    templateRev: "test-rev",
    assetsDir: path.resolve("assets"),
    branding: resolveBranding({}, "research"),
    ...overrides,
  };
}

async function readPidFile(file: string): Promise<number | undefined> {
  try {
    const pid = Number.parseInt(await fs.readFile(file, "utf8"), 10);
    return Number.isFinite(pid) ? pid : undefined;
  } catch {
    return undefined;
  }
}

async function fileExists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function freePort(): Promise<number> {
  const server = http.createServer();
  await listen(server, 0);
  const address = server.address();
  server.close();
  if (!address || typeof address === "string") {
    throw new Error("could not allocate test port");
  }
  return address.port;
}

async function listen(server: http.Server, port: number, host = "127.0.0.1"): Promise<void> {
  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve);
  });
}

async function closeServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
}

function identityAwareHostEdge(upstreamPort: number): http.Server {
  return http.createServer((request, response) => {
    if (request.headers.authorization?.startsWith("Bearer eyJ")) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("not found\n");
      return;
    }
    const upstream = http.request(
      {
        hostname: "127.0.0.1",
        port: upstreamPort,
        path: request.url,
        method: request.method,
        headers: request.headers,
      },
      (upstreamResponse) => {
        response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
        upstreamResponse.pipe(response);
      },
    );
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    });
    request.pipe(upstream);
  });
}

function sessionCookie(config: SpaceRuntimeConfig, username: string): string {
  return createSignedCookie(
    {
      name: "mlclaw_session",
      secret: config.sessionSecret,
      maxAgeSeconds: 60,
      secure: false,
    },
    { username },
  );
}

async function csrfToken(config: SpaceRuntimeConfig, cookie: string): Promise<string> {
  const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/api/session`, {
    headers: { cookie },
  });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { csrfToken?: string };
  expect(body.csrfToken).toBeTruthy();
  return body.csrfToken as string;
}

async function websocketUpgrade(port: number, request: string): Promise<string> {
  const socket = net.connect(port, "127.0.0.1");
  cleanups.push(() => {
    socket.destroy();
  });
  socket.setEncoding("utf8");
  let output = "";
  await new Promise<void>((resolve, reject) => {
    socket.once("error", reject);
    socket.on("data", (chunk) => {
      output += chunk;
    });
    socket.once("close", resolve);
    socket.write(request);
  });
  return output;
}

async function waitFor(predicate: () => boolean | Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error("timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
