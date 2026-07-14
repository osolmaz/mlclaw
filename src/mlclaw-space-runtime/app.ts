import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import type { Context } from "hono";
import { brandingManifest, publicBranding } from "./branding.js";
import { integrationCredentialSlot, type SpaceRuntimeConfig } from "./config.js";
import { BrokerOperatorError, OperatorBrokerRegistry } from "./operator-brokers.js";
import type { McpCredentialStatus } from "./mcp-credentials.js";
import { createCsrfToken, verifyCsrfToken } from "./csrf.js";
import { DelegatedBrokerKit, DelegatedBrokerKitError, type DelegatedSessionIdentity } from "./delegated-brokerkit.js";
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
  OpenAiCredentialStore,
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

const BROKERKIT_SESSION_HEADER = "brokerkit-session";

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
  const delegatedBrokerKit = new DelegatedBrokerKit(operatorBrokers, config.sessionSecret);
  const allowDelegatedSessionSnapshot = fixedWindowRateLimit(12, 60_000);
  const allowDelegatedActorSnapshot = fixedWindowRateLimit(60, 60_000);
  const allowBrokerKitSummary = fixedWindowRateLimit(12, 60_000);
  const allowDelegatedEvents = fixedWindowRateLimit(60, 60_000);
  const allowSummaryEvents = fixedWindowRateLimit(60, 60_000);
  const openAiCredentials = new OpenAiCredentialStore(config.openaiCredentialStoreFile, config.credentialKey);

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
  app.get("/plugins/brokerkit/ui", (c) => c.redirect("/plugins/brokerkit/ui/", 308));
  app.get("/plugins/brokerkit/ui/*", (c) => trustedBrokerKitUi(c, config, delegatedBrokerKit));
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

  app.get("/mlclaw/api/brokerkit/summary", async (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) return auth;
    if (!allowBrokerKitSummary(auth.username)) return c.json({ ok: false, error: "rate limited" }, 429);
    try {
      return c.json(await delegatedBrokerKit.summary());
    } catch {
      return c.json({ ok: false, error: "operator inbox unavailable" }, 503);
    }
  });

  app.get("/mlclaw/api/brokerkit/summary/events", async (c) => {
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) return auth;
    if (!allowSummaryEvents(auth.username)) return c.json({ ok: false, error: "rate limited" }, 429);
    const input = delegatedEventQuery(c.req.url);
    if (!input) return c.json({ ok: false, error: "invalid request" }, 400);
    try {
      return c.json(await delegatedBrokerKit.events(input.cursor, input.waitSeconds, c.req.raw.signal));
    } catch (error) {
      return delegatedFailure(c, error);
    }
  });

  app.options("/mlclaw/api/brokerkit/*", (c) => delegatedPreflight(c, config));

  app.post("/mlclaw/api/brokerkit/session", (c) => {
    const identity = delegatedIdentity(c, delegatedBrokerKit, config);
    if (!identity) return delegatedErrorResponse(c, "not_authorized", 401);
    return delegatedJson(c, delegatedBrokerKit.issueSession(identity.actor, identity.access));
  });

  app.get("/mlclaw/api/brokerkit/snapshot", async (c) => {
    const identity = delegatedIdentity(c, delegatedBrokerKit, config);
    if (!identity) return delegatedErrorResponse(c, "not_authorized", 401);
    if (!allowDelegatedSessionSnapshot(identity.sessionId) || !allowDelegatedActorSnapshot(identity.actor)) {
      return delegatedErrorResponse(c, "rate_limited", 429);
    }
    try {
      return delegatedJson(c, await delegatedBrokerKit.snapshot());
    } catch (error) {
      return delegatedFailure(c, error);
    }
  });

  app.get("/mlclaw/api/brokerkit/events", async (c) => {
    const identity = delegatedIdentity(c, delegatedBrokerKit, config);
    if (!identity) return delegatedErrorResponse(c, "not_authorized", 401);
    if (!allowDelegatedEvents(identity.sessionId)) return delegatedErrorResponse(c, "rate_limited", 429);
    const input = delegatedEventQuery(c.req.url);
    if (!input) return delegatedErrorResponse(c, "invalid_input", 400);
    try {
      return delegatedJson(c, await delegatedBrokerKit.events(input.cursor, input.waitSeconds, c.req.raw.signal));
    } catch (error) {
      return delegatedFailure(c, error);
    }
  });

  app.get("/mlclaw/api/brokerkit/requests/:handle", async (c) => {
    const identity = delegatedIdentity(c, delegatedBrokerKit, config);
    if (!identity) return delegatedErrorResponse(c, "not_authorized", 401);
    try {
      return delegatedJson(c, await delegatedBrokerKit.detail(c.req.param("handle")));
    } catch (error) {
      return delegatedFailure(c, error);
    }
  });

  for (const action of ["approve", "deny", "revoke"] as const) {
    app.post(`/mlclaw/api/brokerkit/requests/:handle/${action}`, async (c) => {
      const identity = delegatedIdentity(c, delegatedBrokerKit, config);
      if (!identity || identity.access !== "decide") return delegatedErrorResponse(c, "not_authorized", 401);
      const body = await readBoundedJson(c, 16_384);
      if (!body || Object.keys(body).some((key) => !["expectedRevision", "constraints"].includes(key))) {
        return delegatedErrorResponse(c, "invalid_input", 400);
      }
      const constraints = recordValue(body.constraints);
      const expectedRevision = positiveJsonInteger(body.expectedRevision);
      const durationSeconds = optionalPositiveJsonInteger(constraints?.durationSeconds);
      const maxUses = optionalUseLimitJsonInteger(constraints?.maxUses);
      if (
        !expectedRevision ||
        (body.constraints !== undefined &&
          (!constraints ||
            Object.keys(constraints).some((key) => !["durationSeconds", "maxUses"].includes(key)) ||
            durationSeconds === undefined ||
            maxUses === undefined)) ||
        durationSeconds === "invalid" ||
        maxUses === "invalid" ||
        (action !== "approve" && (durationSeconds !== undefined || maxUses !== undefined))
      ) {
        return delegatedErrorResponse(c, "invalid_input", 400);
      }
      try {
        return delegatedJson(
          c,
          await delegatedBrokerKit.decide(c.req.param("handle"), action, expectedRevision, identity.actor, {
            ...(typeof durationSeconds === "number" ? { durationSeconds } : {}),
            ...(typeof maxUses === "number" || maxUses === null ? { maxUses } : {}),
          }),
        );
      } catch (error) {
        return delegatedFailure(c, error);
      }
    });
  }

  app.all("/mlclaw/api/brokerkit/*", (c) => delegatedErrorResponse(c, "not_found", 404));

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
    try {
      await openAiCredentials.save(apiKey);
      persistent = true;
    } catch (err) {
      if (!persistent) {
        throw err;
      }
      process.stderr.write("[mlclaw] failed to persist encrypted OpenAI credential\n");
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

async function trustedBrokerKitUi(
  c: Context,
  config: SpaceRuntimeConfig,
  delegatedBrokerKit: DelegatedBrokerKit,
): Promise<Response> {
  const prefix = "/plugins/brokerkit/ui/";
  const requested = c.req.path.slice(prefix.length);
  const relative = requested ? safeRelativePath(requested) : "index.html";
  if (!relative) return c.text("not found\n", 404);
  const uiDir = path.join(config.brokerKitPluginPath, "dist", "ui");
  const file = path.join(uiDir, relative);
  if (relative === "index.html") {
    const destination = c.req.header("sec-fetch-dest");
    if (destination !== "iframe" && destination !== "document") return c.text("not found\n", 404);
    const query = new URL(c.req.url).search;
    const embeddedPopover = destination === "iframe" && query === "?embed=popover";
    if (query && !embeddedPopover) return c.text("not found\n", 404);
    const auth = requireAdmin(c, config);
    if (auth instanceof Response) return auth;
    try {
      const template = await fs.readFile(file, "utf8");
      const delegatedSession = destination === "document" || embeddedPopover;
      const marker = !delegatedSession
        ? '<meta name="brokerkit-delegated-top-level">'
        : `<meta name="brokerkit-delegated-session" content="${Buffer.from(
            JSON.stringify(
              delegatedBrokerKit.issueSession(
                auth.username,
                embeddedPopover && !config.brokerKitPopoverDecisions ? "read" : "decide",
              ),
            ),
            "utf8",
          ).toString("base64url")}">`;
      if (!template.includes("</head>")) return c.text("not found\n", 404);
      const headers = trustedBrokerKitHeaders(
        embeddedPopover ? "popover" : destination === "iframe" ? "launcher" : "top-level",
        new URL(config.publicUrl).origin,
      );
      headers.set("content-type", "text/html; charset=utf-8");
      return new Response(template.replace("</head>", `${marker}</head>`), { status: 200, headers });
    } catch {
      return c.text("not found\n", 404);
    }
  }
  const response = await serveFile(file, contentType(file), true);
  if (response.status !== 200) return response;
  const headers = trustedBrokerKitHeaders("asset", new URL(config.publicUrl).origin);
  headers.set("content-type", response.headers.get("content-type") ?? "application/octet-stream");
  return new Response(response.body, { status: response.status, headers });
}

function trustedBrokerKitHeaders(mode: "launcher" | "popover" | "top-level" | "asset", origin: string): Headers {
  const asset = mode === "asset";
  const sandbox = mode === "top-level" || mode === "popover" ? "sandbox allow-scripts; " : "";
  const headers = new Headers({
    "cache-control": asset ? "public, max-age=31536000, immutable" : "no-store",
    "content-security-policy": `${sandbox}default-src 'self'; script-src 'self' ${origin}; style-src 'self' 'unsafe-inline' ${origin}; connect-src 'self' ${origin}; img-src 'self' data:; frame-ancestors ${mode === "top-level" ? "'none'" : "'self'"}`,
    "cross-origin-resource-policy": asset ? "cross-origin" : "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": mode === "top-level" ? "DENY" : "SAMEORIGIN",
  });
  if (asset) headers.set("access-control-allow-origin", "null");
  return headers;
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

function optionalPositiveInteger(value: unknown, maximum: number): number | "invalid" | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number(String(value));
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum ? parsed : "invalid";
}

function delegatedOriginAllowed(c: Context, config: SpaceRuntimeConfig): boolean {
  const origin = c.req.header("origin");
  if (origin === "null") return true;
  if (c.req.header("x-mlclaw-brokerkit-relay") !== "1") return false;
  return !origin || origin === new URL(config.publicUrl).origin;
}

function delegatedEventQuery(urlValue: string): { cursor: string; waitSeconds: number } | undefined {
  const url = new URL(urlValue);
  if ([...url.searchParams.keys()].some((key) => key !== "cursor" && key !== "wait_seconds")) return undefined;
  const cursor = url.searchParams.get("cursor") ?? "";
  const wait = url.searchParams.get("wait_seconds") ?? "25";
  if (
    cursor.length < 1 ||
    cursor.length > 128 ||
    !/^[A-Za-z0-9_.-]+$/u.test(cursor) ||
    !/^(?:[1-9]|1[0-9]|2[0-5])$/u.test(wait)
  ) {
    return undefined;
  }
  return { cursor, waitSeconds: Number(wait) };
}

function delegatedIdentity(
  c: Context,
  delegated: DelegatedBrokerKit,
  config: SpaceRuntimeConfig,
): DelegatedSessionIdentity | undefined {
  if (!delegatedOriginAllowed(c, config)) return undefined;
  return delegated.authorizeSession(c.req.header(BROKERKIT_SESSION_HEADER));
}

function delegatedPreflight(c: Context, config: SpaceRuntimeConfig): Response {
  if (!delegatedOriginAllowed(c, config)) return delegatedErrorResponse(c, "not_authorized", 403);
  delegatedHeaders(c);
  c.header("access-control-allow-headers", `${BROKERKIT_SESSION_HEADER}, content-type`);
  c.header("access-control-allow-methods", "GET, POST, OPTIONS");
  c.header("access-control-max-age", "300");
  return c.body(null, 204);
}

function delegatedJson(c: Context, value: unknown, status: 200 | 201 = 200): Response {
  delegatedHeaders(c);
  return c.json(value, status);
}

function delegatedErrorResponse(
  c: Context,
  code: string,
  status: 400 | 401 | 403 | 404 | 409 | 410 | 429 | 502,
): Response {
  delegatedHeaders(c);
  return c.json({ error: { code } }, status);
}

function delegatedFailure(c: Context, error: unknown): Response {
  if (error instanceof DelegatedBrokerKitError) {
    const status =
      error.code === "request_not_found"
        ? 404
        : error.code === "cursor_expired"
          ? 410
          : error.code === "revision_stale" || error.code === "action_not_allowed"
            ? 409
            : 502;
    return delegatedErrorResponse(c, error.code, status);
  }
  if (error instanceof BrokerOperatorError) {
    const code = delegatedBrokerCode(error.code);
    const status = error.status === 404 ? 404 : error.status === 409 ? 409 : 502;
    return delegatedErrorResponse(c, code, status);
  }
  process.stderr.write(
    `[mlclaw] delegated BrokerKit request failed: route=${delegatedRouteLabel(c)} status=502 class=${safeErrorClass(error)}\n`,
  );
  return delegatedErrorResponse(c, "source_unavailable", 502);
}

function delegatedRouteLabel(c: Context): string {
  const pathLabel = c.req.path.replace(/\/requests\/[^/]+/u, "/requests/:handle");
  return `${c.req.method}:${pathLabel}`;
}

function safeErrorClass(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  return /^[A-Za-z][A-Za-z0-9]{0,79}$/u.test(name) ? name : "unknown";
}

function delegatedHeaders(c: Context): void {
  c.header("access-control-allow-origin", "null");
  c.header("cache-control", "no-store");
  c.header("vary", "origin");
  c.header("x-content-type-options", "nosniff");
}

function delegatedBrokerCode(value: string | undefined): string {
  if (value === "not_found" || value === "request_not_found") return "request_not_found";
  if (value === "revision_conflict" || value === "revision_stale") return "revision_stale";
  if (
    value === "invalid_transition" ||
    value === "constraint_exceeded" ||
    value === "idempotency_conflict" ||
    value === "request_terminal" ||
    value === "action_not_allowed"
  ) {
    return "action_not_allowed";
  }
  return "source_unavailable";
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

async function readBoundedJson(c: Context, maximum: number): Promise<Record<string, unknown> | undefined> {
  if (c.req.header("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") return undefined;
  const declaredLength = Number(c.req.header("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximum) return undefined;
  const body = c.req.raw.body;
  if (!body) return undefined;
  const reader = body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(Buffer.from(value));
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
    return recordValue(JSON.parse(text));
  } catch {
    return undefined;
  }
}

function positiveJsonInteger(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function optionalPositiveJsonInteger(value: unknown): number | "invalid" | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : "invalid";
}

function optionalUseLimitJsonInteger(value: unknown): number | null | "invalid" | undefined {
  if (value === null) return null;
  return optionalPositiveJsonInteger(value);
}

function fixedWindowRateLimit(limit: number, windowMs: number): (key: string) => boolean {
  const windows = new Map<string, { startedAt: number; count: number }>();
  return (key) => {
    const now = Date.now();
    const current = windows.get(key);
    if (!current || now - current.startedAt >= windowMs) {
      if (!current && windows.size >= 1_024) {
        for (const [candidate, entry] of windows) {
          if (now - entry.startedAt >= windowMs) windows.delete(candidate);
        }
        if (windows.size >= 1_024) return false;
      }
      windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  };
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
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
