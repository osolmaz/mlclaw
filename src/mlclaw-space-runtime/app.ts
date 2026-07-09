import fs from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import type { Context } from "hono";
import { brandingManifest, publicBranding } from "./branding.js";
import type { SpaceRuntimeConfig } from "./config.js";
import { createCsrfToken, verifyCsrfToken } from "./csrf.js";
import { normalizeModel, restartCurrentSpace, runtimeSettings, setCurrentSpaceSecret, setCurrentSpaceVariable } from "./hub-settings.js";
import { normalizeModelChoices, serializeModelChoices, type ModelChoice } from "./model-choices.js";
import { authorizeUrl, exchangeCodeForIdentity } from "./oauth.js";
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
};

export function createSpaceRuntimeApp(config: SpaceRuntimeConfig, controls: RuntimeControls): Hono {
  const app = new Hono();

  app.get("/health", (c) => health(c, config, controls));
  app.get("/healthz", (c) => health(c, config, controls));
  app.get("/assets/mlclaw.svg", async () => serveFile(path.join(config.assetsDir, "mlclaw.svg"), "image/svg+xml; charset=utf-8"));
  app.get("/assets/hf-logo.svg", async () => serveFile(path.join(config.assetsDir, "hf-logo.svg"), "image/svg+xml; charset=utf-8"));
  app.get("/assets/assistant-avatar.svg", async () => serveFile(path.join(config.assetsDir, "assistant-avatar.svg"), "image/svg+xml; charset=utf-8"));
  app.get("/assets/mlclaw-control-branding.js", () => staticScript(CONTROL_BRANDING_SCRIPT));
  app.get("/assets/brand/logo", async () => serveBrandAsset(config, config.branding.logoAsset));
  app.get("/favicon.svg", async () => serveBrandAsset(config, config.branding.faviconSvgAsset));
  app.get("/favicon-32.png", async () => serveBrandAsset(config, config.branding.favicon32Asset));
  app.get("/favicon.ico", async () => serveBrandAsset(config, config.branding.faviconIcoAsset));
  app.get("/apple-touch-icon.png", async () => serveBrandAsset(config, config.branding.appleTouchIconAsset));
  app.get("/sw.js", () => staticScript(SERVICE_WORKER_RESET_SCRIPT));
  app.get("/manifest.webmanifest", () => new Response(brandingManifest(config.branding), {
    headers: {
      "cache-control": "no-cache",
      "content-type": "application/manifest+json; charset=utf-8",
    },
  }));

  app.get("/oauth/login", (c) => handleOauthLogin(c, config));
  app.get("/oauth/callback", (c) => handleOauthCallback(c, config));
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

function health(c: Context, config: SpaceRuntimeConfig, controls: RuntimeControls): Response {
  const healthy = config.mode !== "app" || controls.openclawRunning();
  return c.text(healthy ? "ok\n" : "openclaw is not running\n", healthy ? 200 : 503);
}

function handleOauthLogin(c: Context, config: SpaceRuntimeConfig): Response {
  const next = normalizeNext(c.req.query("next") ?? "/");
  if (!config.oauthClientId || !config.oauthClientSecret) {
    return c.html(loginPage(config, "Hugging Face OAuth is not configured.", next));
  }
  const { state, cookie } = createOauthStateCookie({
    next,
    sessionSecret: config.sessionSecret,
    secure: config.cookieSecure,
  });
  const redirectUri = `${config.publicUrl}/oauth/callback`;
  const headers = new Headers({ location: authorizeUrl({
    clientId: config.oauthClientId,
    clientSecret: config.oauthClientSecret,
    providerUrl: config.providerUrl,
    redirectUri,
  }, state) });
  headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}

async function handleOauthCallback(c: Context, config: SpaceRuntimeConfig): Promise<Response> {
  const stateCookie = readOauthState(c.req.header("cookie"), config.sessionSecret);
  const state = c.req.query("state");
  const code = c.req.query("code");
  if (!stateCookie || !state || stateCookie.state !== state || !code || !config.oauthClientId || !config.oauthClientSecret) {
    return c.html(loginPage(config, "The Hugging Face sign-in attempt expired. Try again."), 401);
  }
  const identity = await exchangeCodeForIdentity({
    clientId: config.oauthClientId,
    clientSecret: config.oauthClientSecret,
    providerUrl: config.providerUrl,
    redirectUri: `${config.publicUrl}/oauth/callback`,
  }, code);
  if (!identity) {
    return c.html(loginPage(config, "Hugging Face sign-in failed. Try again."), 401);
  }
  const headers = new Headers({ location: normalizeNext(typeof stateCookie.next === "string" ? stateCookie.next : "/") });
  headers.append("set-cookie", createSessionCookie({
    username: identity.username,
    sessionSecret: config.sessionSecret,
    secure: config.cookieSecure,
  }));
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
  if (verifyCsrfToken({
    token: c.req.header("x-mlclaw-csrf"),
    username,
    sessionSecret: config.sessionSecret,
  })) {
    return undefined;
  }
  return c.json({ ok: false, error: "csrf token is invalid or missing" }, 403);
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
  return (method === "GET" || method === "HEAD") &&
    (c.req.header("accept") ?? "").includes("text/html");
}

function isAllowed(config: SpaceRuntimeConfig, username: string): boolean {
  return config.allowAnySignedIn || config.allowedUsers.includes(username);
}

function isAdmin(config: SpaceRuntimeConfig, username: string): boolean {
  return config.adminUsers.includes(username);
}

async function statusPayload(config: SpaceRuntimeConfig, controls: RuntimeControls): Promise<Record<string, unknown>> {
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
    branding: publicBranding(config.branding),
  };
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
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined;
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
  await fs.writeFile(config.runtimeSettingsFile, `${JSON.stringify({
    version: 1,
    model,
    modelChoices: choices,
    updatedAt: new Date().toISOString(),
  }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await fs.chmod(config.runtimeSettingsFile, 0o600);
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
  return err instanceof Error ? err.stack ?? err.message : String(err);
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
