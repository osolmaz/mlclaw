import { spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import type net from "node:net";
import fs from "node:fs/promises";
import { clearCookie, createSignedCookie, randomState, verifySignedCookie } from "./cookies.js";
import type { SpaceRuntimeConfig } from "./config.js";
import { authorizeUrl, exchangeCodeForIdentity } from "./oauth.js";
import { configureOpenClawGateway } from "./openclaw-config.js";
import {
  loadOpenAiCredentialFile,
  openAiConfigured,
  persistOpenAiCredentialToSpaceSecret,
  validateOpenAiApiKey,
  writeEphemeralOpenAiCredential,
} from "./openai-credentials.js";
import { adminRequiredPage, loginPage, openAiPage, statusJson, templatePage, unauthorizedPage } from "./pages.js";
import { proxyHttp, proxyWebSocket, rejectWebSocket } from "./proxy.js";

const SESSION_COOKIE = "mlclaw_session";
const STATE_COOKIE = "mlclaw_oauth";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const STATE_TTL_SECONDS = 60 * 10;

type SessionPayload = {
  username: string;
  exp: number;
};

type StatePayload = {
  state: string;
  next?: string;
  exp: number;
};

type SpaceRuntimeServerOptions = {
  exitProcess?: (code: number) => void;
};

export class SpaceRuntimeServer {
  private openclaw: ChildProcess | undefined;
  private openclawStarting = false;
  private openclawStopping = false;
  private readonly exitProcess: (code: number) => void;

  constructor(private readonly config: SpaceRuntimeConfig, options: SpaceRuntimeServerOptions = {}) {
    this.exitProcess = options.exitProcess ?? ((code) => process.exit(code));
  }

  async start(): Promise<http.Server> {
    if (this.config.mode === "app") {
      await this.startOpenClaw();
    }

    const server = http.createServer((req, res) => {
      this.handle(req, res).catch((err) => {
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        }
        res.end(err instanceof Error ? err.message : String(err));
      });
    });
    server.on("upgrade", (req, socket, head) => {
      const session = this.readSession(req);
      const netSocket = socket as net.Socket;
      if (!session || !this.isAllowed(session.username)) {
        rejectWebSocket(netSocket);
        return;
      }
      proxyWebSocket(req, netSocket, head, this.config, { username: session.username });
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const onError = (err: Error) => {
          server.off("listening", onListening);
          reject(err);
        };
        const onListening = () => {
          server.off("error", onError);
          resolve();
        };
        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(this.config.port, "0.0.0.0");
      });
    } catch (err) {
      await this.stop();
      server.close();
      throw err;
    }
    process.stdout.write(`[mlclaw] listening on ${this.config.port} in ${this.config.mode} mode\n`);
    return server;
  }

  async stop(): Promise<void> {
    const child = this.openclaw;
    if (!child || child.killed) {
      return;
    }
    this.openclawStopping = true;
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 10_000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.openclawStopping = false;
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", this.config.publicUrl);
    if (url.pathname === "/health" || url.pathname === "/healthz") {
      const healthy = this.config.mode !== "app" || Boolean(this.openclaw && !this.openclaw.killed);
      this.sendText(res, healthy ? 200 : 503, healthy ? "ok\n" : "openclaw is not running\n");
      return;
    }
    if (url.pathname === "/assets/mlclaw.svg") {
      await this.sendAsset(res, "/app/assets/mlclaw.svg");
      return;
    }
    if (this.config.mode === "template") {
      this.sendHtml(res, templatePage(this.config));
      return;
    }
    if (url.pathname === "/oauth/login") {
      this.handleOauthLogin(res, url.searchParams.get("next") ?? "/");
      return;
    }
    if (url.pathname === "/oauth/callback") {
      await this.handleOauthCallback(req, res, url);
      return;
    }
    if (url.pathname === "/logout") {
      res.writeHead(302, {
        location: "/",
        "set-cookie": clearCookie(SESSION_COOKIE, this.config.cookieSecure),
      });
      res.end();
      return;
    }
    const session = this.readSession(req);
    if (!session) {
      this.sendHtml(res, loginPage(this.config));
      return;
    }
    if (!this.isAllowed(session.username)) {
      this.sendHtml(res, unauthorizedPage(session.username), 403);
      return;
    }
    if (url.pathname === "/mlclaw/status") {
      this.sendJson(res, 200, statusJson({
        config: this.config,
        openclawRunning: Boolean(this.openclaw && !this.openclaw.killed),
        openAiConfigured: openAiConfigured() || Boolean(await loadOpenAiCredentialFile(this.config.openaiCredentialFile)),
      }));
      return;
    }
    if (url.pathname === "/mlclaw/openai") {
      if (!this.isAdmin(session.username)) {
        this.sendHtml(res, adminRequiredPage(session.username), 403);
        return;
      }
      if (req.method === "GET") {
        this.sendHtml(res, openAiPage(
          openAiConfigured() || Boolean(await loadOpenAiCredentialFile(this.config.openaiCredentialFile)),
          openAiConfigured(),
        ));
        return;
      }
      if (req.method === "POST") {
        await this.handleOpenAiPost(req, res);
        return;
      }
    }
    await proxyHttp(req, res, this.config, { username: session.username });
  }

  private handleOauthLogin(res: http.ServerResponse, next: string): void {
    if (!this.config.oauthClientId || !this.config.oauthClientSecret) {
      this.sendHtml(res, loginPage(this.config, "Hugging Face OAuth is not configured."));
      return;
    }
    const state = randomState();
    const cookie = createSignedCookie({
      name: STATE_COOKIE,
      secret: this.config.sessionSecret,
      maxAgeSeconds: STATE_TTL_SECONDS,
      secure: this.config.cookieSecure,
    }, { state, next: normalizeNext(next) });
    const redirectUri = `${this.config.publicUrl}/oauth/callback`;
    res.writeHead(302, {
      location: authorizeUrl({
        clientId: this.config.oauthClientId,
        clientSecret: this.config.oauthClientSecret,
        providerUrl: this.config.providerUrl,
        redirectUri,
      }, state),
      "set-cookie": cookie,
    });
    res.end();
  }

  private async handleOauthCallback(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    url: URL,
  ): Promise<void> {
    const stateCookie = verifySignedCookie<StatePayload>(req.headers.cookie, STATE_COOKIE, this.config.sessionSecret);
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (!stateCookie || !state || stateCookie.state !== state || !code || !this.config.oauthClientId || !this.config.oauthClientSecret) {
      this.sendHtml(res, loginPage(this.config, "The Hugging Face sign-in attempt expired. Try again."), 401);
      return;
    }
    const identity = await exchangeCodeForIdentity({
      clientId: this.config.oauthClientId,
      clientSecret: this.config.oauthClientSecret,
      providerUrl: this.config.providerUrl,
      redirectUri: `${this.config.publicUrl}/oauth/callback`,
    }, code);
    if (!identity) {
      this.sendHtml(res, loginPage(this.config, "Hugging Face sign-in failed. Try again."), 401);
      return;
    }
    const sessionCookie = createSignedCookie({
      name: SESSION_COOKIE,
      secret: this.config.sessionSecret,
      maxAgeSeconds: SESSION_TTL_SECONDS,
      secure: this.config.cookieSecure,
    }, { username: identity.username });
    res.writeHead(302, {
      location: normalizeNext(typeof stateCookie.next === "string" ? stateCookie.next : "/"),
      "set-cookie": [
        sessionCookie,
        clearCookie(STATE_COOKIE, this.config.cookieSecure),
      ],
    });
    res.end();
  }

  private async handleOpenAiPost(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const body = await readBody(req, 20_000);
    const params = new URLSearchParams(body);
    const apiKey = validateOpenAiApiKey(params.get("apiKey"));
    if (!apiKey) {
      this.sendHtml(res, openAiPage(false, false), 400);
      return;
    }
    await writeEphemeralOpenAiCredential(this.config.openaiCredentialFile, apiKey);
    const persistent = await persistOpenAiCredentialToSpaceSecret(this.config, apiKey);
    await this.restartOpenClawWithOpenAi(apiKey);
    this.sendHtml(res, openAiPage(true, persistent));
  }

  private async startOpenClaw(extraEnv: Record<string, string> = {}): Promise<void> {
    if (this.openclawStarting || (this.openclaw && !this.openclaw.killed)) {
      return;
    }
    this.openclawStarting = true;
    try {
      await configureOpenClawGateway(this.config);
      const persistedOpenAiKey = await loadOpenAiCredentialFile(this.config.openaiCredentialFile);
      const env = {
        ...process.env,
        OPENCLAW_GATEWAY_PORT: String(this.config.openclawPort),
        ...(persistedOpenAiKey ? { OPENAI_API_KEY: persistedOpenAiKey } : {}),
        ...extraEnv,
      };
      this.openclaw = spawn(this.config.openclawCommand, this.config.openclawArgs, {
        stdio: "inherit",
        env,
      });
      this.openclaw.once("exit", (code, signal) => {
        process.stdout.write(`[mlclaw] openclaw exited code=${code ?? "null"} signal=${signal ?? "null"}\n`);
        this.openclaw = undefined;
        if (!this.openclawStopping) {
          const exitCode = typeof code === "number" && code !== 0 ? code : 1;
          this.exitProcess(exitCode);
        }
      });
    } finally {
      this.openclawStarting = false;
    }
  }

  private async restartOpenClawWithOpenAi(apiKey: string): Promise<void> {
    await this.stop();
    await this.startOpenClaw({ OPENAI_API_KEY: apiKey });
  }

  private readSession(req: http.IncomingMessage): SessionPayload | undefined {
    return verifySignedCookie<SessionPayload>(req.headers.cookie, SESSION_COOKIE, this.config.sessionSecret);
  }

  private isAllowed(username: string): boolean {
    return this.config.allowAnySignedIn || this.config.allowedUsers.includes(username);
  }

  private isAdmin(username: string): boolean {
    return this.config.adminUsers.includes(username);
  }

  private async sendAsset(res: http.ServerResponse, file: string): Promise<void> {
    try {
      res.writeHead(200, { "content-type": "image/svg+xml; charset=utf-8" });
      res.end(await fs.readFile(file, "utf8"));
    } catch {
      this.sendText(res, 404, "not found\n");
    }
  }

  private sendHtml(res: http.ServerResponse, body: string, status = 200): void {
    res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  }

  private sendJson(res: http.ServerResponse, status: number, body: string): void {
    res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    res.end(`${body}\n`);
  }

  private sendText(res: http.ServerResponse, status: number, body: string): void {
    res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    res.end(body);
  }
}

function normalizeNext(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function readBody(req: http.IncomingMessage, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) {
      throw new Error("request body too large");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
