import http from "node:http";
import net from "node:net";
import type { SpaceRuntimeConfig } from "./config.js";

export type ProxyIdentity = {
  username: string;
};

const ADMIN_CONTROL_UI_SCOPES = [
  "operator.admin",
  "operator.read",
  "operator.write",
  "operator.approvals",
  "operator.pairing",
] as const;

const USER_CONTROL_UI_SCOPES = [
  "operator.read",
  "operator.write",
  "operator.approvals",
] as const;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export async function proxyHttp(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  config: SpaceRuntimeConfig,
  identity: ProxyIdentity,
): Promise<void> {
  const headers = sanitizeHeaders(req.headers);
  headers.host = `${config.openclawHost}:${config.openclawPort}`;
  addTrustedProxyHeaders(headers, config, identity);

  const upstream = http.request({
    host: config.openclawHost,
    port: config.openclawPort,
    method: req.method,
    path: req.url,
    headers,
  }, (upstreamResponse) => {
    res.writeHead(upstreamResponse.statusCode ?? 502, sanitizeHeaders(upstreamResponse.headers));
    upstreamResponse.pipe(res);
  });

  upstream.on("error", (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end(`OpenClaw gateway is not ready: ${err.message}`);
  });

  req.pipe(upstream);
}

export function proxyWebSocket(
  req: http.IncomingMessage,
  socket: net.Socket,
  head: Buffer,
  config: SpaceRuntimeConfig,
  identity: ProxyIdentity,
): void {
  const upstream = net.connect(config.openclawPort, config.openclawHost);
  upstream.on("connect", () => {
    const headers = sanitizeHeaders(req.headers);
    headers.host = `${config.openclawHost}:${config.openclawPort}`;
    headers.connection = "Upgrade";
    headers.upgrade = req.headers.upgrade ?? "websocket";
    addTrustedProxyHeaders(headers, config, identity);
    upstream.write(`${req.method ?? "GET"} ${req.url ?? "/"} HTTP/${req.httpVersion}\r\n`);
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          upstream.write(`${key}: ${item}\r\n`);
        }
      } else if (value !== undefined) {
        upstream.write(`${key}: ${value}\r\n`);
      }
    }
    upstream.write("\r\n");
    if (head.length > 0) {
      upstream.write(head);
    }
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", () => {
    socket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
    socket.destroy();
  });
}

export function rejectWebSocket(socket: net.Socket): void {
  socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
  socket.destroy();
}

function sanitizeHeaders(headers: http.IncomingHttpHeaders): http.OutgoingHttpHeaders {
  const out: http.OutgoingHttpHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      continue;
    }
    if (
      lower.startsWith("x-forwarded-") ||
      lower.startsWith("x-openclaw-") ||
      lower === "authorization"
    ) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

function addTrustedProxyHeaders(
  headers: http.OutgoingHttpHeaders,
  config: SpaceRuntimeConfig,
  identity: ProxyIdentity,
): void {
  headers["x-forwarded-user"] = identity.username;
  headers["x-forwarded-proto"] = config.publicUrl.startsWith("https://") ? "https" : "http";
  headers["x-forwarded-host"] = new URL(config.publicUrl).host;
  headers["x-openclaw-scopes"] = resolveControlUiScopes(config, identity).join(",");
}

function resolveControlUiScopes(
  config: Pick<SpaceRuntimeConfig, "adminUsers">,
  identity: ProxyIdentity,
): readonly string[] {
  return config.adminUsers.includes(identity.username)
    ? ADMIN_CONTROL_UI_SCOPES
    : USER_CONTROL_UI_SCOPES;
}
