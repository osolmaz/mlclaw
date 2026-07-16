import http from "node:http";
import net from "node:net";
import type { SpaceRuntimeConfig } from "./config.js";
import { rewriteOpenClawHtml, shouldInjectShell } from "./shell.js";

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

const USER_CONTROL_UI_SCOPES = ["operator.read", "operator.write"] as const;

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
  if (isHtmlNavigation(req)) {
    delete headers["accept-encoding"];
    delete headers["Accept-Encoding"];
  }
  addTrustedProxyHeaders(headers, config, identity, requestAccessOrigin(req, config));

  const upstream = http.request(
    {
      host: config.openclawHost,
      port: config.openclawPort,
      method: req.method,
      path: req.url,
      headers,
    },
    (upstreamResponse) => {
      const responseHeaders = sanitizeHeaders(upstreamResponse.headers);
      const inject = shouldInjectShell({
        method: req.method,
        requestAccept: String(req.headers.accept ?? ""),
        responseContentType: headerValue(upstreamResponse.headers["content-type"]),
        responseContentEncoding: headerValue(upstreamResponse.headers["content-encoding"]),
      });
      if (!inject) {
        res.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
        upstreamResponse.pipe(res);
        return;
      }

      const chunks: Buffer[] = [];
      upstreamResponse.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      upstreamResponse.on("end", () => {
        const body = rewriteOpenClawHtml(Buffer.concat(chunks).toString("utf8"), config.branding);
        delete responseHeaders["content-length"];
        delete responseHeaders["Content-Length"];
        res.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
        res.end(body);
      });
    },
  );

  upstream.on("error", (err) => {
    process.stderr.write(`[mlclaw] upstream HTTP proxy failed: ${err.stack ?? err.message}\n`);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end("OpenClaw gateway is not ready\n");
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
  let connected = false;
  const destroyBoth = () => {
    upstream.destroy();
    socket.destroy();
  };
  upstream.on("connect", () => {
    connected = true;
    const headers = sanitizeHeaders(req.headers);
    headers.host = `${config.openclawHost}:${config.openclawPort}`;
    headers.connection = "Upgrade";
    headers.upgrade = req.headers.upgrade ?? "websocket";
    addTrustedProxyHeaders(headers, config, identity, requestAccessOrigin(req, config));
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
  upstream.on("error", (err) => {
    process.stderr.write(`[mlclaw] upstream WebSocket proxy failed: ${err.stack ?? err.message}\n`);
    if (!connected && !socket.destroyed) {
      socket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
    }
    destroyBoth();
  });
  socket.on("error", destroyBoth);
  socket.on("close", () => upstream.destroy());
  upstream.on("close", () => socket.destroy());
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
      lower.startsWith("tailscale-") ||
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
  accessOrigin: string,
): void {
  headers["x-forwarded-user"] = identity.username;
  headers["x-forwarded-proto"] = accessOrigin.startsWith("https://") ? "https" : "http";
  headers["x-forwarded-host"] = new URL(accessOrigin).host;
  headers["x-openclaw-scopes"] = resolveControlUiScopes(config, identity).join(",");
}

function requestAccessOrigin(req: http.IncomingMessage, config: SpaceRuntimeConfig): string {
  const host = req.headers.host?.trim().toLowerCase();
  if (!host) {
    return config.publicUrl;
  }
  return config.accessOrigins.find((origin) => new URL(origin).host.toLowerCase() === host) ?? config.publicUrl;
}

function resolveControlUiScopes(
  config: Pick<SpaceRuntimeConfig, "adminUsers">,
  identity: ProxyIdentity,
): readonly string[] {
  return config.adminUsers.includes(identity.username) ? ADMIN_CONTROL_UI_SCOPES : USER_CONTROL_UI_SCOPES;
}

function headerValue(value: string | string[] | number | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  if (typeof value === "number") {
    return String(value);
  }
  return value;
}

function isHtmlNavigation(req: http.IncomingMessage): boolean {
  return (req.method === "GET" || req.method === "HEAD") && String(req.headers.accept ?? "").includes("text/html");
}
