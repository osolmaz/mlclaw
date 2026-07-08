import http from "node:http";
import net from "node:net";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSignedCookie } from "../src/mlclaw-space-runtime/cookies.js";
import { loadConfig, type SpaceRuntimeConfig } from "../src/mlclaw-space-runtime/config.js";
import { SpaceRuntimeServer } from "../src/mlclaw-space-runtime/server.js";

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

describe("ML Claw Space runtime", () => {
  it("serves the Hugging Face login page before a session exists", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(() => closeServer(server), () => runtime.stop());

    const response = await fetch(`http://127.0.0.1:${config.port}/`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Sign in with Hugging Face");
  });

  it("requires an authenticated allowed session before returning deployment status", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(() => closeServer(server), () => runtime.stop());

    const anonymous = await fetch(`http://127.0.0.1:${config.port}/mlclaw/status`);

    expect(anonymous.status).toBe(401);
    expect(anonymous.headers.get("content-type")).toContain("text/html");
    expect(await anonymous.text()).toContain("Sign in with Hugging Face");

    const cookie = createSignedCookie({
      name: "mlclaw_session",
      secret: config.sessionSecret,
      maxAgeSeconds: 60,
      secure: false,
    }, { username: "alice" });
    const authenticated = await fetch(`http://127.0.0.1:${config.port}/mlclaw/status`, {
      headers: { cookie },
    });

    expect(authenticated.status).toBe(200);
    expect(authenticated.headers.get("content-type")).toContain("application/json");
    expect(await authenticated.json()).toMatchObject({
      mode: "app",
      stateBucket: "alice/research-data",
      auth: {
        allowedUsers: ["alice"],
      },
    });
  });

  it("keeps the requested browser path as OAuth next while APIs return 401", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(() => closeServer(server), () => runtime.stop());

    const browser = await fetch(`http://127.0.0.1:${config.port}/control/deep?tab=chat`, {
      headers: { accept: "text/html" },
      redirect: "manual",
    });

    expect(browser.status).toBe(302);
    expect(browser.headers.get("location")).toBe("/login?next=%2Fcontrol%2Fdeep%3Ftab%3Dchat");

    const login = await fetch(`http://127.0.0.1:${config.port}/login?next=%2Fcontrol%2Fdeep%3Ftab%3Dchat`);
    expect(login.status).toBe(200);
    expect(await login.text()).toContain("/oauth/login?next=%2Fcontrol%2Fdeep%3Ftab%3Dchat");

    const api = await fetch(`http://127.0.0.1:${config.port}/mlclaw/status`, {
      headers: { accept: "application/json" },
    });
    expect(api.status).toBe(401);
  });

  it("rejects malformed-cookie WebSocket upgrades without crashing", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(() => closeServer(server), () => runtime.stop());

    const response = await websocketUpgrade(config.port, [
      "GET / HTTP/1.1",
      `Host: 127.0.0.1:${config.port}`,
      "Connection: Upgrade",
      "Upgrade: websocket",
      "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==",
      "Sec-WebSocket-Version: 13",
      "Cookie: mlclaw_session=%",
      "",
      "",
    ].join("\r\n"));

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
    cleanups.push(() => closeServer(server), () => runtime.stop());

    const cookie = createSignedCookie({
      name: "mlclaw_session",
      secret: config.sessionSecret,
      maxAgeSeconds: 60,
      secure: false,
    }, { username: "alice" });
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
    cleanups.push(() => closeServer(server), () => runtime.stop());

    const cookie = createSignedCookie({
      name: "mlclaw_session",
      secret: config.sessionSecret,
      maxAgeSeconds: 60,
      secure: false,
    }, { username: "bob" });
    const response = await fetch(`http://127.0.0.1:${config.port}/`, {
      headers: { cookie },
    });

    expect(response.status).toBe(200);
    expect(capturedHeaders?.["x-openclaw-scopes"]).toBe("operator.read,operator.write,operator.approvals");
  });

  it("returns a generic upstream error when OpenClaw is unavailable", async () => {
    const config = await testConfig();
    const runtime = new SpaceRuntimeServer(config);
    const server = await runtime.start();
    cleanups.push(() => closeServer(server), () => runtime.stop());
    const cookie = createSignedCookie({
      name: "mlclaw_session",
      secret: config.sessionSecret,
      maxAgeSeconds: 60,
      secure: false,
    }, { username: "alice" });

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
    cleanups.push(() => closeServer(server), () => runtime.stop());
    const cookie = createSignedCookie({
      name: "mlclaw_session",
      secret: config.sessionSecret,
      maxAgeSeconds: 60,
      secure: false,
    }, { username: "alice" });

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/openai`, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ apiKey: `sk-${"a".repeat(32)}` }),
    });

    expect(response.status).toBe(200);
    expect(captured).toEqual([{ key: "OPENAI_API_KEY", value: `sk-${"a".repeat(32)}` }]);
    await expect(fs.readFile(config.openaiCredentialFile, "utf8")).resolves.toBe(`OPENAI_API_KEY=sk-${"a".repeat(32)}\n`);
    const mode = (await fs.stat(config.openaiCredentialFile)).mode & 0o777;
    expect(mode).toBe(0o600);
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
    cleanups.push(() => closeServer(server), () => runtime.stop());
    const cookie = createSignedCookie({
      name: "mlclaw_session",
      secret: config.sessionSecret,
      maxAgeSeconds: 60,
      secure: false,
    }, { username: "bob" });

    const response = await fetch(`http://127.0.0.1:${config.port}/mlclaw/openai`, {
      method: "POST",
      headers: {
        cookie,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ apiKey: `sk-${"a".repeat(32)}` }),
    });

    expect(response.status).toBe(403);
    expect(await response.text()).toContain("Admin required");
    expect(captured).toEqual([]);
    await expect(fs.access(config.openaiCredentialFile)).rejects.toThrow();
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
    cleanups.push(() => closeServer(server), () => runtime.stop());

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
    cleanups.push(() => runtime.stop(), () => fs.rm(root, { recursive: true, force: true }));

    await expect(runtime.start()).rejects.toThrow(/EADDRINUSE|address already in use/i);
    const pid = await readPidFile(pidFile);
    if (pid) {
      await waitFor(() => !processIsAlive(pid));
    }
  });

  it("makes the duplicated Space owner the default admin", () => {
    const config = loadConfig({
      SPACE_ID: "osolmaz/research",
      MLCLAW_ALLOWED_USERS: "alice,bob",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
    });

    expect(config.adminUsers).toEqual(["osolmaz"]);
    expect(config.allowedUsers).toEqual(["alice", "bob", "osolmaz"]);
  });

  it("implicitly allows explicit admins", () => {
    const config = loadConfig({
      SPACE_ID: "osolmaz/research",
      MLCLAW_ALLOWED_USERS: "alice",
      MLCLAW_ADMINS: "bob",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
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
    });

    expect(config.mode).toBe("template");
  });

  it("does not use template mode for another Space by the canonical creator", () => {
    const config = loadConfig({
      SPACE_ID: "osolmaz/research",
      SPACE_CREATOR_USER_ID: "42",
      MLCLAW_CANONICAL_CREATOR_USER_ID: "42",
      MLCLAW_SESSION_SECRET: "x".repeat(48),
    });

    expect(config.mode).toBe("app");
  });
});

async function testConfig(overrides: Partial<SpaceRuntimeConfig> = {}): Promise<SpaceRuntimeConfig> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-space-runtime-"));
  const configPath = path.join(root, "openclaw.json");
  await fs.writeFile(configPath, JSON.stringify({ gateway: {} }), "utf8");
  const port = overrides.port ?? await freePort();
  const openclawPort = overrides.openclawPort ?? await freePort();
  return {
    port,
    openclawPort,
    openclawHost: "127.0.0.1",
    publicUrl: `http://127.0.0.1:${port}`,
    providerUrl: "https://huggingface.co",
    oauthClientId: "client",
    oauthClientSecret: "secret",
    sessionSecret: "x".repeat(48),
    sessionSecretGenerated: false,
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
    hubUrl: "https://huggingface.co",
    openaiCredentialFile: path.join(root, "secrets", "openai.env"),
    openclawConfigPath: configPath,
    openclawCommand: process.execPath,
    openclawArgs: ["-e", "setInterval(() => undefined, 100000)"],
    agentName: "research",
    stateBucket: "alice/research-data",
    runtimeImage: "example/runtime:test",
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
  while (!await predicate()) {
    if (Date.now() > deadline) {
      throw new Error("timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
