import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import type { Context } from "hono";
import { brandingManifest, publicBranding } from "./branding.js";
import { integrationCredentialSlot, type SpaceRuntimeConfig } from "./config.js";
import {
  BrokerOperatorError,
  OperatorBrokerRegistry,
  type BrokerOperatorClient,
  type OperatorBrokerSummary,
} from "./operator-brokers.js";
import type { McpCredentialStatus } from "./mcp-credentials.js";
import { createCsrfToken, verifyCsrfToken } from "./csrf.js";
import {
  normalizeModel,
  restartCurrentSpace,
  runtimeSettings,
  setCurrentSpaceSecret,
  setCurrentSpaceVariable,
} from "./hub-settings.js";
import {
  normalizeModelChoices,
  parseOpenClawModelRef,
  serializeModelChoices,
  type ModelChoice,
} from "./model-choices.js";
import { authorizeUrl, exchangeCodeForIdentity, HF_MCP_OAUTH_SCOPES, type OAuthIdentity } from "./oauth.js";
import { configureOpenClawGateway } from "./openclaw-config.js";
import {
  loadOpenAiCredentialFile,
  openAiConfigured,
  validateOpenAiApiKey,
  writeEphemeralOpenAiCredential,
} from "./openai-credentials.js";
import { loginPage, templatePage, unauthorizedPage } from "./pages.js";
import { loadRouterModelChoices } from "./router-models.js";
import {
  clearOauthStateCookie,
  clearSessionCookie,
  createOauthStateCookie,
  createSessionCookie,
  normalizeNext,
  readOauthState,
  readSession,
  type SessionPayload,
} from "./session.js";
import { CONTROL_BRANDING_SCRIPT, SERVICE_WORKER_RESET_SCRIPT } from "./shell.js";

export type RuntimeControls = {
  openclawRunning(): boolean;
  openAiConfigured(): Promise<boolean>;
  restartOpenClawWithOpenAi(apiKey: string): Promise<void>;
  restartOpenClaw(): Promise<void>;
  setModelSettings(model: string, choices: ModelChoice[]): void;
  saveMcpCredentials(identity: OAuthIdentity): Promise<void>;
  clearMcpCredentials(username: string): Promise<void>;
  mcpCredentialStatus(username: string): Promise<McpCredentialStatus>;
  mcpServerStatus(): Promise<Array<{ id: string; name: string; enabled: boolean }>>;
};

export function createSpaceRuntimeApp(config: SpaceRuntimeConfig, controls: RuntimeControls): Hono {
  const app = new Hono();
  const operatorBrokers = new OperatorBrokerRegistry(config.operatorBrokers);

  app.get("/health", (c) => health(c, config, controls));
  app.get("/healthz", (c) => health(c, config, controls));
  app.get("/assets/mlclaw.svg", async () =>
    serveFile(path.join(config.assetsDir, "mlclaw.svg"), "image/svg+xml; charset=utf-8"),
  );
  app.get("/assets/hf-logo.svg", async () =>
    serveFile(path.join(config.assetsDir, "hf-logo.svg"), "image/svg+xml; charset=utf-8"),
  );
  app.get("/assets/assistant-avatar.svg", async () =>
    serveFile(path.join(config.assetsDir, "assistant-avatar.svg"), "image/svg+xml; charset=utf-8"),
  );
  app.get("/assets/mlclaw-control-branding.js", () => staticScript(CONTROL_BRANDING_SCRIPT));
  app.get("/assets/brand/logo", async () => serveBrandAsset(config, config.branding.logoAsset));
  app.get("/favicon.svg", async () => serveBrandAsset(config, config.branding.faviconSvgAsset));
  app.get("/favicon-32.png", async () => serveBrandAsset(config, config.branding.favicon32Asset));
  app.get("/favicon.ico", async () => serveBrandAsset(config, config.branding.faviconIcoAsset));
  app.get("/apple-touch-icon.png", async () => serveBrandAsset(config, config.branding.appleTouchIconAsset));
  app.get("/sw.js", () => staticScript(SERVICE_WORKER_RESET_SCRIPT));
  app.get(
    "/manifest.webmanifest",
    () =>
      new Response(brandingManifest(config.branding), {
        headers: {
          "cache-control": "no-cache",
          "content-type": "application/manifest+json; charset=utf-8",
        },
      }),
  );

  app.get("/oauth/login", (c) => handleOauthLogin(c, config));
  app.get("/oauth/callback", (c) => handleOauthCallback(c, config, controls));
  app.get("/login", (c) => c.html(loginPage(config, undefined, normalizeNext(c.req.query("next") ?? "/"))));
  app.get("/logout", (c) => logoutResponse(config, false));
  app.get("/mlclaw/logout", (c) => logoutResponse(config, false));
  app.post("/mlclaw/api/logout", (c) => logoutResponse(config, true));

  app.get("/mlclaw/assets/*", async (c) => {
    const relative = c.req.path.slice("/mlclaw/assets/".length);
    const safe = safeRelativePath(relative);
    if (!safe) {
      return c.text("not found\n", 404);
    }
    const file = path.join(config.assetsDir, "mlclaw-control-ui", safe);
    return serveFile(file, contentType(file), true);
  });

  app.get("/mlclaw/openai", (c) => c.redirect("/mlclaw/credentials", 302));
  app.post("/mlclaw/openai", (c) => c.redirect("/mlclaw/credentials", 303));

  app.get("/mlclaw/api/session", (c) => {
    const auth = requireAllowed(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    return c.json({
      user: auth.username,
      admin: isAdmin(config, auth.username),
      csrfToken: createCsrfToken({ username: auth.username, sessionSecret: config.sessionSecret }),
      branding: publicBranding(config.branding),
    });
  });

  app.get("/mlclaw/api/status", async (c) => {
    const auth = requireAllowed(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    return c.json(await statusPayload(config, controls));
  });

  app.get("/mlclaw/api/approvals/brokers", (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    return c.json({ brokers: operatorBrokers.list() });
  });

  app.get("/mlclaw/api/approvals", async (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    const broker = selectedOperatorBroker(c, operatorBrokers);
    if (broker instanceof Response) {
      return broker;
    }
    const rawStatus = c.req.query("status");
    if (rawStatus && rawStatus !== "pending" && rawStatus !== "history") {
      return c.json({ ok: false, error: "status must be pending or history" }, 400);
    }
    const status: "pending" | "history" | undefined =
      rawStatus === "pending" || rawStatus === "history" ? rawStatus : undefined;
    const cursor = c.req.query("cursor");
    try {
      const page = await broker.list({
        ...(status ? { status } : {}),
        ...(cursor ? { cursor } : {}),
        limit: boundedInteger(c.req.query("limit"), 50, 100),
      });
      return c.json({ broker: broker.summary(), ...page });
    } catch (err) {
      return brokerFailure(c, err, broker.summary());
    }
  });

  app.get("/mlclaw/api/approvals/events", async (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    const broker = selectedOperatorBroker(c, operatorBrokers);
    if (broker instanceof Response) {
      return broker;
    }
    try {
      const upstream = await broker.events(c.req.header("last-event-id"), c.req.raw.signal);
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "cache-control": "no-store",
          "content-type": "text/event-stream",
          "x-accel-buffering": "no",
        },
      });
    } catch (err) {
      return brokerFailure(c, err, broker.summary());
    }
  });

  app.get("/mlclaw/api/approvals/:broker/:id", async (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    const broker = operatorBrokers.get(c.req.param("broker"));
    if (!broker) {
      return c.json({ ok: false, error: "operator broker is not configured" }, 404);
    }
    try {
      return c.json({ broker: broker.summary(), item: await broker.get(c.req.param("id")) });
    } catch (err) {
      return brokerFailure(c, err, broker.summary());
    }
  });

  for (const [browserAction, brokerAction] of [
    ["approve", "approve"],
    ["deny", "deny"],
    ["cancel", "cancel"],
    ["revoke", "revoke"],
  ] as const) {
    app.post(`/mlclaw/api/approvals/:broker/:id/${browserAction}`, async (c) => {
      const auth = requireAdmin(c, config);
      if (auth instanceof Response) {
        return auth;
      }
      const csrf = requireCsrf(c, config, auth.username);
      if (csrf) {
        return csrf;
      }
      const broker = operatorBrokers.get(c.req.param("broker"));
      if (!broker) {
        return c.json({ ok: false, error: "operator broker is not configured" }, 404);
      }
      const body = await readJson(c);
      const expectedRevision = boundedInteger(body?.expectedRevision, 0, Number.MAX_SAFE_INTEGER);
      if (!expectedRevision) {
        return c.json({ ok: false, error: "expectedRevision is required" }, 400);
      }
      try {
        const item = await broker.decide(c.req.param("id"), brokerAction, {
          expectedRevision,
          ...(typeof body?.expectedStatus === "string" ? { expectedStatus: body.expectedStatus } : {}),
          ...(typeof body?.reason === "string" ? { reason: body.reason.slice(0, 2_000) } : {}),
          ...(browserAction === "approve"
            ? {
                durationSeconds: boundedInteger(body?.durationSeconds, 0, 86_400),
                maxUses: boundedInteger(body?.maxUses, 0, 100),
              }
            : {}),
        });
        return c.json({ broker: broker.summary(), item });
      } catch (err) {
        return brokerFailure(c, err, broker.summary());
      }
    });
  }

  app.post("/mlclaw/api/integrations/huggingface/disconnect", async (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    const csrf = requireCsrf(c, config, auth.username);
    if (csrf) {
      return csrf;
    }
    if (config.gatewayLocation === "local") {
      return c.json(
        {
          ok: false,
          error: "Local integrations use the local Hugging Face token; manage that credential with the ML Claw CLI",
        },
        409,
      );
    }
    const credentialSlot = integrationCredentialSlot(config) ?? auth.username;
    await controls.clearMcpCredentials(credentialSlot);
    return c.json({ ok: true, configured: false });
  });

  app.get("/mlclaw/api/settings", (c) => {
    const auth = requireAllowed(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    return c.json(runtimeSettings(config));
  });

  app.get("/mlclaw/api/router-models", async (c) => {
    const auth = requireAllowed(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    return c.json(await loadRouterModelChoices({ url: config.routerModelsUrl }));
  });

  app.post("/mlclaw/api/settings/model", async (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    const csrf = requireCsrf(c, config, auth.username);
    if (csrf) {
      return csrf;
    }
    if (config.mode !== "app") {
      return c.json({ ok: false, error: "template mode cannot mutate settings" }, 403);
    }
    const body = await readJson(c);
    const model = normalizeModel(body?.model);
    if (!model) {
      return c.json({ ok: false, error: "model is required" }, 400);
    }
    const choices = normalizeModelChoices(body?.modelChoices, model);
    if (!choices) {
      return c.json({ ok: false, error: "at least one valid model choice is required" }, 400);
    }
    const selected = choices.find((choice) => choice.openclawModel === model);
    if (!selected) {
      return c.json({ ok: false, error: "active model must be included in model choices" }, 400);
    }
    if (parseOpenClawModelRef(model) && !config.brokerAgentSecret && !config.routerToken && !config.hfToken) {
      return c.json(
        { ok: false, error: "Hugging Face broker credential is required before selecting a Hugging Face Router model" },
        400,
      );
    }
    let persistent = false;
    if (config.spaceId && config.hfToken) {
      await setCurrentSpaceVariable(config, "OPENCLAW_MODEL", model);
      await setCurrentSpaceVariable(config, "MLCLAW_MODEL_CHOICES", serializeModelChoices(choices));
      persistent = true;
    }
    await writeRuntimeSettingsFile(config, model, choices);
    controls.setModelSettings(model, choices);
    await configureOpenClawGateway(config);
    let restartPending = false;
    if (persistent) {
      try {
        restartPending = await restartCurrentSpace(config);
      } catch (err) {
        process.stderr.write(`[mlclaw] failed to restart Space after model update: ${formatError(err)}\n`);
      }
    } else {
      await controls.restartOpenClaw();
    }
    return c.json({ ok: true, model, modelChoices: choices, persistent, restartPending });
  });

  app.post("/mlclaw/api/credentials/openai", async (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    const csrf = requireCsrf(c, config, auth.username);
    if (csrf) {
      return csrf;
    }
    if (config.mode !== "app") {
      return c.json({ ok: false, error: "template mode cannot mutate credentials" }, 403);
    }
    const body = await readJson(c);
    const apiKey = validateOpenAiApiKey(body?.apiKey);
    if (!apiKey) {
      return c.json({ ok: false, error: "valid OpenAI API key is required" }, 400);
    }
    let persistent = false;
    if (config.spaceId && config.hfToken) {
      try {
        await setCurrentSpaceSecret(config, "OPENAI_API_KEY", apiKey);
        persistent = true;
      } catch {
        process.stderr.write("[mlclaw] failed to persist OpenAI key as Space Secret\n");
      }
    }
    await writeEphemeralOpenAiCredential(config.openaiCredentialFile, apiKey);
    await controls.restartOpenClawWithOpenAi(apiKey);
    return c.json({ ok: true, configured: true, persistent });
  });

  app.post("/mlclaw/api/runtime/restart", async (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) {
      return auth;
    }
    const csrf = requireCsrf(c, config, auth.username);
    if (csrf) {
      return csrf;
    }
    if (config.mode !== "app") {
      return c.json({ ok: false, error: "template mode cannot restart runtime" }, 403);
    }
    const restartPending = await restartCurrentSpace(config);
    if (!restartPending) {
      await controls.restartOpenClaw();
    }
    return c.json({ ok: true, restartPending });
  });

  app.get("/mlclaw", (c) => controlUi(c, config));
  app.get("/mlclaw/*", (c) => controlUi(c, config));

  app.notFound((c) => {
    if (config.mode === "template") {
      return c.html(templatePage(config));
    }
    return new Response("", { status: 404, headers: { "x-mlclaw-fallback": "openclaw" } });
  });

  return app;
}

async function health(c: Context, config: SpaceRuntimeConfig, controls: RuntimeControls): Promise<Response> {
  if (config.mode !== "app") {
    return c.text("ok\n");
  }
  if (!controls.openclawRunning()) {
    return c.text("openclaw is not running\n", 503);
  }
  const broker = await brokerStatus(config);
  if (parseOpenClawModelRef(config.model) && !broker.configured) {
    return c.text("HF Broker is required for the configured model\n", 503);
  }
  if (broker.configured && !broker.agentHealthy) {
    return c.text("HF Broker agent listener is not healthy\n", 503);
  }
  if (broker.configured && parseOpenClawModelRef(config.model) && !broker.inferenceReady) {
    return c.text("HF Broker inference routes are not ready\n", 503);
  }
  return c.text("ok\n");
}

function handleOauthLogin(c: Context, config: SpaceRuntimeConfig): Response {
  const next = normalizeNext(c.req.query("next") ?? "/");
  if (!config.oauthClientId || !config.oauthClientSecret) {
    return c.html(loginPage(config, "Hugging Face OAuth is not configured.", next));
  }
  const session = readSession(c.req.header("cookie"), config.sessionSecret);
  const integrationsRequested = c.req.query("intent") === "integrations";
  const intent = integrationsRequested && session && isAdmin(config, session.username) ? "integrations" : "login";
  const { state, cookie } = createOauthStateCookie({
    next,
    intent,
    sessionSecret: config.sessionSecret,
    secure: config.cookieSecure,
  });
  const redirectUri = `${config.publicUrl}/oauth/callback`;
  const headers = new Headers({
    location: authorizeUrl(
      {
        clientId: config.oauthClientId,
        clientSecret: config.oauthClientSecret,
        providerUrl: config.providerUrl,
        redirectUri,
      },
      state,
      intent === "integrations" ? HF_MCP_OAUTH_SCOPES : undefined,
    ),
  });
  headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

async function handleOauthCallback(
  c: Context,
  config: SpaceRuntimeConfig,
  controls: RuntimeControls,
): Promise<Response> {
  const stateCookie = readOauthState(c.req.header("cookie"), config.sessionSecret);
  const state = c.req.query("state");
  const code = c.req.query("code");
  if (
    !stateCookie ||
    !state ||
    stateCookie.state !== state ||
    !code ||
    !config.oauthClientId ||
    !config.oauthClientSecret
  ) {
    return c.html(loginPage(config, "The Hugging Face sign-in attempt expired. Try again."), 401);
  }
  const identity = await exchangeCodeForIdentity(
    {
      clientId: config.oauthClientId,
      clientSecret: config.oauthClientSecret,
      providerUrl: config.providerUrl,
      redirectUri: `${config.publicUrl}/oauth/callback`,
    },
    code,
  );
  if (!identity) {
    return c.html(loginPage(config, "Hugging Face sign-in failed. Try again."), 401);
  }
  if (stateCookie.intent === "integrations") {
    const session = readSession(c.req.header("cookie"), config.sessionSecret);
    if (!session || !isAdmin(config, session.username) || session.username !== identity.username) {
      return c.html(loginPage(config, "Integration authorization requires the signed-in ML Claw administrator."), 403);
    }
    try {
      await controls.saveMcpCredentials(identity);
    } catch (err) {
      process.stderr.write(`[mlclaw] failed to store MCP authorization: ${formatError(err)}\n`);
      return c.html(
        loginPage(config, "Hugging Face sign-in succeeded, but MCP authorization could not be stored."),
        500,
      );
    }
  }
  const headers = new Headers({
    location: normalizeNext(typeof stateCookie.next === "string" ? stateCookie.next : "/"),
  });
  headers.append(
    "set-cookie",
    createSessionCookie({
      username: identity.username,
      sessionSecret: config.sessionSecret,
      secure: config.cookieSecure,
    }),
  );
  headers.append("set-cookie", clearOauthStateCookie(config.cookieSecure));
  return new Response(null, { status: 302, headers });
}

async function controlUi(c: Context, config: SpaceRuntimeConfig): Promise<Response> {
  const auth = requireAllowed(c, config);
  if (auth instanceof Response) {
    return auth;
  }
  return serveFile(path.join(config.assetsDir, "mlclaw-control-ui", "index.html"), "text/html; charset=utf-8");
}

function logoutResponse(config: SpaceRuntimeConfig, json: boolean): Response {
  const headers = new Headers();
  headers.append("set-cookie", clearSessionCookie(config.cookieSecure));
  if (json) {
    headers.set("content-type", "application/json; charset=utf-8");
    return new Response(`${JSON.stringify({ ok: true })}\n`, { status: 200, headers });
  }
  headers.set("location", "/");
  return new Response(null, { status: 302, headers });
}

function requireAllowed(c: Context, config: SpaceRuntimeConfig): SessionPayload | Response {
  const session = readSession(c.req.header("cookie"), config.sessionSecret);
  if (!session) {
    return unauthenticated(c, config);
  }
  if (!isAllowed(config, session.username)) {
    return c.html(unauthorizedPage(session.username), 403);
  }
  return session;
}

function requireAdmin(c: Context, config: SpaceRuntimeConfig): SessionPayload | Response {
  const allowed = requireAllowed(c, config);
  if (allowed instanceof Response) {
    return allowed;
  }
  if (!isAdmin(config, allowed.username)) {
    return c.json({ ok: false, error: "admin required" }, 403);
  }
  return allowed;
}

function requireCsrf(c: Context, config: SpaceRuntimeConfig, username: string): Response | undefined {
  if (
    verifyCsrfToken({
      token: c.req.header("x-mlclaw-csrf"),
      username,
      sessionSecret: config.sessionSecret,
    })
  ) {
    return undefined;
  }
  return c.json({ ok: false, error: "csrf token is invalid or missing" }, 403);
}

function boundedInteger(value: unknown, fallback: number, maximum: number): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    return fallback;
  }
  return parsed;
}

function selectedOperatorBroker(c: Context, registry: OperatorBrokerRegistry): BrokerOperatorClient | Response {
  const id = c.req.query("broker");
  if (!id) {
    return c.json({ ok: false, error: "broker is required" }, 400);
  }
  return registry.get(id) ?? c.json({ ok: false, error: "operator broker is not configured" }, 404);
}

function brokerFailure(c: Context, err: unknown, broker: OperatorBrokerSummary): Response {
  process.stderr.write(`[mlclaw] ${broker.id} operator request failed: ${formatError(err)}\n`);
  if (err instanceof BrokerOperatorError && err.status >= 400 && err.status < 500) {
    return c.json({ ok: false, error: err.message, ...(err.code ? { code: err.code } : {}) }, err.status as 400);
  }
  return c.json({ ok: false, error: `${broker.label} operator API is unavailable` }, 502);
}

function unauthenticated(c: Context, config: SpaceRuntimeConfig): Response {
  const next = normalizeNext(c.req.path + new URL(c.req.url).search);
  if (c.req.path.startsWith("/mlclaw/api/")) {
    return c.json({ ok: false, error: "authentication required" }, 401);
  }
  if (isBrowserNavigation(c)) {
    return c.redirect(`/login?next=${encodeURIComponent(next)}`, 302);
  }
  return c.html(loginPage(config, undefined, next), 401);
}

function isBrowserNavigation(c: Context): boolean {
  const method = c.req.method;
  return (method === "GET" || method === "HEAD") && (c.req.header("accept") ?? "").includes("text/html");
}

function isAllowed(config: SpaceRuntimeConfig, username: string): boolean {
  return config.allowAnySignedIn || config.allowedUsers.includes(username);
}

function isAdmin(config: SpaceRuntimeConfig, username: string): boolean {
  return config.adminUsers.includes(username);
}

async function statusPayload(config: SpaceRuntimeConfig, controls: RuntimeControls): Promise<Record<string, unknown>> {
  const credentialSlot = integrationCredentialSlot(config) ?? "";
  const localTokenConfigured = config.gatewayLocation === "local" && Boolean(config.hfToken);
  let mcpCredentials: McpCredentialStatus | undefined;
  let mcpCredentialError: string | undefined;
  if (!localTokenConfigured && credentialSlot) {
    try {
      mcpCredentials = await controls.mcpCredentialStatus(credentialSlot);
    } catch {
      mcpCredentialError = "Encrypted MCP credentials could not be loaded";
    }
  }
  return {
    ok: true,
    mode: config.mode,
    agent: config.agentName ?? null,
    model: config.model,
    space: config.spaceId ?? null,
    stateBucket: config.stateBucket ?? null,
    stateMountDir: config.stateMountDir ?? null,
    statePrefix: config.statePrefix ?? null,
    gatewayLocation: config.gatewayLocation ?? null,
    broker: await brokerStatus(config),
    runtimeImage: config.runtimeImage ?? null,
    runtimeId: config.runtimeId ?? null,
    templateRev: config.templateRev ?? null,
    openclaw: {
      running: controls.openclawRunning(),
      host: config.openclawHost,
      port: config.openclawPort,
    },
    auth: {
      hfOAuthConfigured: Boolean(config.oauthClientId && config.oauthClientSecret),
      allowedUsers: config.allowedUsers,
      adminUsers: config.adminUsers,
      allowAnySignedIn: config.allowAnySignedIn,
    },
    openai: {
      configured: await controls.openAiConfigured(),
      environmentConfigured: openAiConfigured(),
      runtimeFileConfigured: Boolean(await loadOpenAiCredentialFile(config.openaiCredentialFile)),
    },
    integrations: {
      automatic: true,
      source: localTokenConfigured ? "local" : mcpCredentials?.configured ? "oauth" : null,
      identity: mcpCredentials?.configured ? mcpCredentials.username : null,
      configured: localTokenConfigured || (mcpCredentials?.configured ?? false),
      scope: mcpCredentials?.scope ?? [],
      expiresAt: mcpCredentials?.expiresAt ?? null,
      refreshable: mcpCredentials?.refreshable ?? false,
      error: mcpCredentialError ?? null,
      servers: await controls.mcpServerStatus(),
    },
    branding: publicBranding(config.branding),
  };
}

async function brokerStatus(config: SpaceRuntimeConfig): Promise<{
  configured: boolean;
  agentHealthy: boolean;
  inferenceReady: boolean;
  operatorConfigured: boolean;
  operatorBrokers: number;
}> {
  const configured = Boolean(config.brokerAgentUrl && config.brokerAgentSecret);
  if (!configured) {
    return {
      configured: false,
      agentHealthy: false,
      inferenceReady: false,
      operatorConfigured: config.operatorBrokers.some((broker) => broker.id === "hf-broker"),
      operatorBrokers: config.operatorBrokers.length,
    };
  }
  const baseUrl = (config.brokerAgentUrl as string).replace(/\/+$/, "");
  const token = config.brokerAgentSecret as string;
  const [agentHealthy, inferenceReady] = await Promise.all([
    brokerProbe(`${baseUrl}/healthz`),
    brokerProbe(`${baseUrl}/v1/models`, token),
  ]);
  return {
    configured: true,
    agentHealthy,
    inferenceReady,
    operatorConfigured: config.operatorBrokers.some((broker) => broker.id === "hf-broker"),
    operatorBrokers: config.operatorBrokers.length,
  };
}

async function brokerProbe(url: string, token?: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
      redirect: "error",
      signal: AbortSignal.timeout(2_000),
    });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

function staticScript(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/javascript; charset=utf-8",
    },
  });
}

async function readJson(c: Context): Promise<Record<string, unknown> | undefined> {
  try {
    const value = await c.req.json();
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

async function writeRuntimeSettingsFile(
  config: SpaceRuntimeConfig,
  model: string,
  choices: ModelChoice[],
): Promise<void> {
  await fs.mkdir(path.dirname(config.runtimeSettingsFile), { recursive: true });
  await fs.writeFile(
    config.runtimeSettingsFile,
    `${JSON.stringify(
      {
        version: 1,
        model,
        modelChoices: choices,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await fs.chmod(config.runtimeSettingsFile, 0o600);
  if (process.getuid?.() === 0) {
    await fs.chown(config.runtimeSettingsFile, config.openclawUid, config.openclawGid);
  }
}

async function serveFile(file: string, contentTypeHeader: string, immutable = false): Promise<Response> {
  try {
    const body = await fs.readFile(file);
    const headers = new Headers({ "content-type": contentTypeHeader });
    if (immutable) {
      headers.set("cache-control", "public, max-age=31536000, immutable");
    }
    return new Response(new Uint8Array(body), { status: 200, headers });
  } catch {
    return new Response("not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

async function serveBrandAsset(config: SpaceRuntimeConfig, asset: string): Promise<Response> {
  const response = await serveFile(path.join(config.assetsDir, asset), contentType(asset));
  if (response.status !== 404 || asset === "mlclaw.svg") {
    return response;
  }
  return serveFile(path.join(config.assetsDir, "mlclaw.svg"), "image/svg+xml; charset=utf-8");
}

function safeRelativePath(value: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return undefined;
  }
  const normalized = path.posix.normalize(decoded).replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    return undefined;
  }
  return normalized;
}

function formatError(err: unknown): string {
  return err instanceof Error ? (err.stack ?? err.message) : String(err);
}

function contentType(file: string): string {
  if (file.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (file.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (file.endsWith(".svg")) {
    return "image/svg+xml; charset=utf-8";
  }
  if (file.endsWith(".png")) {
    return "image/png";
  }
  if (file.endsWith(".ico")) {
    return "image/x-icon";
  }
  if (file.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  return "application/octet-stream";
}
