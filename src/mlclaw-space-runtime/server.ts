import { spawn, type ChildProcess } from "node:child_process";
import http from "node:http";
import type net from "node:net";
import { Readable } from "node:stream";
import type { Hono } from "hono";
import { createSpaceRuntimeApp } from "./app.js";
import type { SpaceRuntimeConfig } from "./config.js";
import { configureOpenClawGateway } from "./openclaw-config.js";
import { loadOpenAiCredentialFile, openAiConfigured } from "./openai-credentials.js";
import { loginPage, templatePage, unauthorizedPage } from "./pages.js";
import { proxyHttp, proxyWebSocket, rejectWebSocket } from "./proxy.js";
import { normalizeNext, readSession } from "./session.js";

type SpaceRuntimeServerOptions = {
  exitProcess?: (code: number) => void;
};

export class SpaceRuntimeServer {
  private openclaw: ChildProcess | undefined;
  private openclawStarting = false;
  private openclawStopping = false;
  private readonly app: Hono;
  private readonly exitProcess: (code: number) => void;

  constructor(private readonly config: SpaceRuntimeConfig, options: SpaceRuntimeServerOptions = {}) {
    this.exitProcess = options.exitProcess ?? ((code) => process.exit(code));
    this.app = createSpaceRuntimeApp(config, {
      openclawRunning: () => Boolean(this.openclaw && !this.openclaw.killed),
      openAiConfigured: async () =>
        openAiConfigured() || Boolean(await loadOpenAiCredentialFile(this.config.openaiCredentialFile)),
      restartOpenClawWithOpenAi: (apiKey) => this.restartOpenClawWithOpenAi(apiKey),
      restartOpenClaw: () => this.restartOpenClaw(),
      setModelSettings: (model, choices) => {
        this.config.model = model;
        this.config.modelChoices = choices;
      },
    });
  }

  async start(): Promise<http.Server> {
    if (this.config.mode === "app") {
      await this.startOpenClaw();
    }

    const server = http.createServer((req, res) => {
      this.handle(req, res).catch((err) => {
        process.stderr.write(`[mlclaw] request failed: ${formatError(err)}\n`);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        }
        res.end("Internal server error\n");
      });
    });
    server.on("upgrade", (req, socket, head) => {
      const netSocket = socket as net.Socket;
      try {
        const session = readSession(req.headers.cookie, this.config.sessionSecret);
        if (!session || !this.isAllowed(session.username)) {
          rejectWebSocket(netSocket);
          return;
        }
        proxyWebSocket(req, netSocket, head, this.config, { username: session.username });
      } catch (err) {
        process.stderr.write(`[mlclaw] websocket upgrade failed: ${formatError(err)}\n`);
        rejectWebSocket(netSocket);
      }
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
    if (this.config.mode === "template" && !isTemplateRuntimePath(url.pathname)) {
      this.sendHtml(res, templatePage(this.config));
      return;
    }
    if (this.shouldRouteToMlClaw(url.pathname)) {
      const response = await this.app.fetch(nodeRequestToWebRequest(req, this.config.publicUrl));
      if (!response.headers.has("x-mlclaw-fallback")) {
        await sendWebResponse(res, response);
        return;
      }
    }

    const session = readSession(req.headers.cookie, this.config.sessionSecret);
    if (!session) {
      this.sendUnauthenticated(req, res, url);
      return;
    }
    if (!this.isAllowed(session.username)) {
      this.sendHtml(res, unauthorizedPage(session.username), 403);
      return;
    }
    await proxyHttp(req, res, this.config, { username: session.username });
  }

  private shouldRouteToMlClaw(pathname: string): boolean {
    return pathname === "/health" ||
      pathname === "/healthz" ||
      pathname === "/favicon.svg" ||
      pathname === "/favicon-32.png" ||
      pathname === "/favicon.ico" ||
      pathname === "/apple-touch-icon.png" ||
      pathname === "/manifest.webmanifest" ||
      pathname === "/sw.js" ||
      pathname === "/assets/hf-logo.svg" ||
      pathname === "/assets/mlclaw.svg" ||
      pathname === "/assets/assistant-avatar.svg" ||
      pathname === "/assets/mlclaw-control-branding.js" ||
      pathname === "/assets/brand/logo" ||
      pathname === "/login" ||
      pathname === "/logout" ||
      pathname.startsWith("/oauth/") ||
      pathname === "/mlclaw" ||
      pathname.startsWith("/mlclaw/");
  }

  private async startOpenClaw(extraEnv: Record<string, string> = {}): Promise<void> {
    if (this.openclawStarting || (this.openclaw && !this.openclaw.killed)) {
      return;
    }
    this.openclawStarting = true;
    try {
      await configureOpenClawGateway(this.config);
      const persistedOpenAiKey = await loadOpenAiCredentialFile(this.config.openaiCredentialFile);
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        OPENCLAW_GATEWAY_PORT: String(this.config.openclawPort),
        OPENCLAW_MODEL: this.config.model,
        ...(persistedOpenAiKey ? { OPENAI_API_KEY: persistedOpenAiKey } : {}),
        ...extraEnv,
      };
      if (process.env.MLCLAW_PASS_HF_TOKEN_TO_OPENCLAW !== "1") {
        delete env.HF_TOKEN;
        delete env.HUGGINGFACE_HUB_TOKEN;
      }
      if (this.config.routerToken) {
        env.HF_TOKEN = this.config.routerToken;
        env.HUGGINGFACE_HUB_TOKEN = this.config.routerToken;
      }
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

  private async restartOpenClaw(): Promise<void> {
    await this.stop();
    await this.startOpenClaw();
  }

  private isAllowed(username: string): boolean {
    return this.config.allowAnySignedIn || this.config.allowedUsers.includes(username);
  }

  private sendUnauthenticated(req: http.IncomingMessage, res: http.ServerResponse, url: URL): void {
    const next = normalizeNext(`${url.pathname}${url.search}`);
    if (url.pathname === "/" && (req.method === "GET" || req.method === "HEAD")) {
      this.sendHtml(res, loginPage(this.config, undefined, next));
      return;
    }
    if (isBrowserNavigation(req) && !isApiPath(url.pathname)) {
      this.sendRedirect(res, `/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (isApiPath(url.pathname)) {
      res.writeHead(401, { "content-type": "application/json; charset=utf-8" });
      res.end(`${JSON.stringify({ ok: false, error: "authentication required" })}\n`);
      return;
    }
    this.sendHtml(res, loginPage(this.config, undefined, next), 401);
  }

  private sendRedirect(res: http.ServerResponse, location: string): void {
    res.writeHead(302, { location });
    res.end();
  }

  private sendHtml(res: http.ServerResponse, body: string, status = 200): void {
    res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  }
}

function nodeRequestToWebRequest(req: http.IncomingMessage, publicUrl: string): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }
  const init: RequestInit & { duplex?: "half" } = {
    method: req.method ?? "GET",
    headers,
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }
  return new Request(new URL(req.url ?? "/", publicUrl).toString(), init);
}

async function sendWebResponse(res: http.ServerResponse, response: Response): Promise<void> {
  const headers: http.OutgoingHttpHeaders = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") {
      headers[key] = value;
    }
  });
  const setCookies = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ??
    (response.headers.get("set-cookie") ? [response.headers.get("set-cookie") as string] : []);
  if (setCookies.length > 0) {
    headers["set-cookie"] = setCookies;
  }
  res.writeHead(response.status, headers);
  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!res.write(Buffer.from(value))) {
      await new Promise<void>((resolve) => res.once("drain", resolve));
    }
  }
  res.end();
}

function isBrowserNavigation(req: http.IncomingMessage): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }
  return String(req.headers.accept ?? "").includes("text/html");
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/mlclaw/api/");
}

function isTemplateRuntimePath(pathname: string): boolean {
  return pathname === "/health" ||
    pathname === "/healthz" ||
    pathname === "/favicon.svg" ||
    pathname === "/favicon-32.png" ||
    pathname === "/favicon.ico" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/assets/hf-logo.svg" ||
    pathname === "/assets/mlclaw.svg" ||
    pathname === "/assets/assistant-avatar.svg" ||
    pathname === "/assets/brand/logo";
}

function formatError(err: unknown): string {
  return err instanceof Error ? err.stack ?? err.message : String(err);
}
