import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  BrokerOperatorError,
  BrokerOperatorClient,
  loadOperatorBrokers,
  OperatorBrokerRegistry,
} from "../src/mlclaw-space-runtime/operator-brokers.js";

const cleanups: Array<() => Promise<void>> = [];

function approval(id: string, status: string, revision: number) {
  return {
    id,
    revision,
    requester: "bob",
    operation: "repo.update",
    status,
    requested_at: "2026-07-11T00:00:00Z",
    pending_expires_at: "2026-07-11T00:05:00Z",
    requested_duration_seconds: 300,
    requested_max_uses: 1,
    granted_max_uses: status === "active" ? 1 : null,
    used_count: 0,
    presentation: {
      risk: "medium",
      title: "Update repository",
      facts: [{ label: "Repository", value: "osolmaz/example" }],
    },
    allowed_actions: status === "pending" ? ["approve", "deny", "cancel"] : ["revoke"],
    approval_bounds: { max_duration_seconds: 300, max_uses: 1 },
  };
}

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe("Brokerkit operator backends", () => {
  it("uses only fixed operator routes with the operator bearer token", async () => {
    const requests: Array<{ method: string; url: string; authorization?: string; body: string }> = [];
    const server = http.createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) {
        body += String(chunk);
      }
      requests.push({
        method: req.method ?? "",
        url: req.url ?? "",
        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        body,
      });
      res.writeHead(200, { "content-type": "application/json" });
      if (req.url?.includes("/approve")) {
        res.end(JSON.stringify(approval("grant-1", "active", 2)));
      } else {
        res.end(JSON.stringify({ requests: [] }));
      }
    });
    const port = await listen(server);
    cleanups.push(() => close(server));
    const client = new BrokerOperatorClient({
      id: "hf-broker",
      label: "Hugging Face",
      baseUrl: `http://127.0.0.1:${port}`,
      token: "operator-secret",
    });

    await client.list({ status: "pending", limit: 50 });
    await client.decide("grant-1", "approve", {
      expectedRevision: 1,
      idempotencyKey: "decision-1",
      onBehalfOf: "mlclaw:alice",
      durationSeconds: 300,
      maxUses: 1,
    });

    expect(requests).toEqual([
      {
        method: "GET",
        url: "/api/operator/v1/requests?status=pending&limit=50",
        authorization: "Bearer operator-secret",
        body: "",
      },
      {
        method: "POST",
        url: "/api/operator/v1/requests/grant-1/approve",
        authorization: "Bearer operator-secret",
        body: JSON.stringify({
          expected_revision: 1,
          idempotency_key: "decision-1",
          on_behalf_of: "mlclaw:alice",
          constraints: { duration_seconds: 300, max_uses: 1 },
        }),
      },
    ]);
  });

  it("rejects path-like request identifiers before sending", async () => {
    const client = new BrokerOperatorClient({
      id: "sudo-broker",
      label: "Unix access",
      baseUrl: "http://127.0.0.1:1",
      token: "operator-secret",
    });
    expect(() => client.get("../healthz")).toThrow("invalid approval request id");
  });

  it("forwards durable event cursors and maps only bounded safe errors", async () => {
    const requests: Request[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.url.includes("/events")) {
        return new Response("id: cursor-2\ndata: {}\n\n", {
          headers: { "content-type": "text/event-stream; charset=utf-8" },
        });
      }
      if (request.url.includes("cursor=next")) {
        return new Response(JSON.stringify({ error: { code: "revision_conflict", message: "Request changed" } }), {
          status: 409,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(approval("grant-1", "pending", 1)), {
        headers: { "content-type": "application/json" },
      });
    };
    const client = new BrokerOperatorClient({
      id: "gh-broker",
      label: "GitHub",
      baseUrl: "http://broker.example/",
      token: "operator-secret",
      fetch: fetchImpl,
    });

    const controller = new AbortController();
    const events = await client.events("cursor-1", controller.signal);
    expect(await events.text()).toContain("cursor-2");
    expect(requests[0]?.url).toContain("/api/operator/v1/events?cursor=cursor-1");
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer operator-secret");
    expect(await client.get("grant-1")).toMatchObject({ id: "grant-1" });
    await expect(client.list({ status: "history", cursor: "next", limit: 12 })).rejects.toMatchObject({
      broker: { id: "gh-broker", label: "GitHub" },
      status: 409,
      code: "revision_conflict",
      message: "Request changed",
    } satisfies Partial<BrokerOperatorError>);

    const invalidEvents = new BrokerOperatorClient({
      id: "sudo-broker",
      label: "Unix access",
      baseUrl: "http://broker.example",
      token: "operator-secret",
      fetch: async () => new Response("{}", { headers: { "content-type": "application/json" } }),
    });
    await expect(invalidEvents.events()).rejects.toMatchObject({ code: "invalid_event_stream", status: 502 });
    const malformedError = new BrokerOperatorClient({
      id: "hf-broker",
      label: "Hugging Face",
      baseUrl: "http://broker.example",
      token: "operator-secret",
      fetch: async () => new Response("not json", { status: 500 }),
    });
    await expect(malformedError.list()).rejects.toMatchObject({
      status: 500,
      message: "Hugging Face operator request failed",
    });
  });

  it("bounds broker responses before decoding them", async () => {
    const oversized = new BrokerOperatorClient({
      id: "hf-broker",
      label: "Hugging Face",
      baseUrl: "http://broker.example",
      token: "operator-secret",
      fetch: async () => new Response(`{"padding":"${"x".repeat(2 * 1024 * 1024)}"}`),
    });
    await expect(oversized.list()).rejects.toThrow("broker response is too large");
    const empty = new BrokerOperatorClient({
      id: "hf-broker",
      label: "Hugging Face",
      baseUrl: "http://broker.example",
      token: "operator-secret",
      fetch: async () => new Response(null),
    });
    await expect(empty.list()).rejects.toThrow("broker response body is empty");
    const malformed = new BrokerOperatorClient({
      id: "gh-broker",
      label: "GitHub",
      baseUrl: "http://broker.example",
      token: "operator-secret",
      fetch: async () => new Response(JSON.stringify({ requests: null })),
    });
    await expect(malformed.list()).rejects.toThrow("broker request list response is invalid");
    const malformedFact = new BrokerOperatorClient({
      id: "gh-broker",
      label: "GitHub",
      baseUrl: "http://broker.example",
      token: "operator-secret",
      fetch: async () => {
        const item = approval("request-1", "pending", 1);
        return Response.json({
          requests: [
            {
              ...item,
              presentation: {
                ...item.presentation,
                facts: [{ label: "Repository", value: "", unexpected: "not-safe" }],
              },
            },
          ],
        });
      },
    });
    await expect(malformedFact.list()).rejects.toThrow("broker request list response is invalid");
  });

  it("times out stalled non-streaming broker requests", async () => {
    const client = new BrokerOperatorClient({
      id: "gh-broker",
      label: "GitHub",
      baseUrl: "http://broker.example",
      token: "operator-secret",
      requestTimeoutMs: 10,
      fetch: async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
        }),
    });

    await expect(client.list()).rejects.toMatchObject({
      status: 504,
      code: "broker_timeout",
      message: "GitHub operator request timed out",
    });
  });

  it("loads a strict multi-broker file without exposing tokens in summaries", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-operator-brokers-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const hfToken = path.join(root, "hf-token");
    const ghToken = path.join(root, "gh-token");
    const configFile = path.join(root, "brokers.json");
    await fs.writeFile(hfToken, `${"h".repeat(32)}\n`, { mode: 0o600 });
    await fs.writeFile(ghToken, `${"g".repeat(32)}\n`, { mode: 0o600 });
    await fs.writeFile(
      configFile,
      JSON.stringify({
        version: 1,
        brokers: [
          { id: "hf-broker", label: "Hugging Face", url: "http://127.0.0.1:7864", token_file: hfToken },
          { id: "gh-broker", label: "GitHub", url: "http://127.0.0.1:8081/", token_file: ghToken },
        ],
      }),
      "utf8",
    );

    const configs = loadOperatorBrokers(configFile);
    const registry = new OperatorBrokerRegistry(configs, async () => new Response("{}"));
    const summaries = registry.list();
    expect(summaries).toEqual([
      { id: "hf-broker", label: "Hugging Face" },
      { id: "gh-broker", label: "GitHub" },
    ]);
    expect(JSON.stringify(summaries)).not.toContain("h".repeat(32));
    expect(JSON.stringify(summaries)).not.toContain("g".repeat(32));
    expect(registry.get("hf-broker")?.summary()).toEqual({ id: "hf-broker", label: "Hugging Face" });
    expect(registry.get("missing")).toBeUndefined();
    expect(loadOperatorBrokers(undefined)).toEqual([]);
  });

  it("fails closed on malformed broker configuration", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-invalid-brokers-"));
    cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
    const token = path.join(root, "token");
    await fs.writeFile(token, "t".repeat(32), { mode: 0o600 });
    const invalid = [
      null,
      {},
      { version: 2, brokers: [] },
      { version: 1, brokers: "invalid" },
      { version: 1, brokers: Array.from({ length: 17 }, () => ({})) },
      { version: 1, brokers: [{ id: "HF", label: "HF", url: "http://127.0.0.1:1", token_file: token }] },
      { version: 1, brokers: [{ id: "hf-broker", label: "HF\nBroker", url: "http://127.0.0.1:1", token_file: token }] },
      { version: 1, brokers: [{ id: "hf-broker", label: "HF", url: "not-a-url", token_file: token }] },
      { version: 1, brokers: [{ id: "hf-broker", label: "HF", url: "http://user@127.0.0.1:1", token_file: token }] },
      { version: 1, brokers: [{ id: "hf-broker", label: "HF", url: "http://127.0.0.1:1/path", token_file: token }] },
      { version: 1, brokers: [{ id: "hf-broker", label: "HF", url: "http://127.0.0.1:1", token_file: "relative" }] },
      {
        version: 1,
        brokers: [{ id: "hf-broker", label: "HF", url: "http://127.0.0.1:1", token_file: token, token: "inline" }],
      },
    ];
    for (const [index, value] of invalid.entries()) {
      const file = path.join(root, `invalid-${index}.json`);
      await fs.writeFile(file, JSON.stringify(value), "utf8");
      expect(() => loadOperatorBrokers(file)).toThrow();
    }
    const duplicate = path.join(root, "duplicate.json");
    await fs.writeFile(
      duplicate,
      JSON.stringify({
        version: 1,
        brokers: [
          { id: "hf-broker", label: "HF", url: "http://127.0.0.1:1", token_file: token },
          { id: "hf-broker", label: "HF 2", url: "http://127.0.0.1:2", token_file: token },
        ],
      }),
      "utf8",
    );
    expect(() => loadOperatorBrokers(duplicate)).toThrow("invalid or duplicated");
    await fs.writeFile(
      duplicate,
      JSON.stringify({
        version: 1,
        brokers: [
          { id: "hf-broker", label: "HF", url: "http://127.0.0.1:1", token_file: token },
          { id: "gh-broker", label: "GH", url: "http://127.0.0.1:1", token_file: token },
        ],
      }),
      "utf8",
    );
    expect(() => loadOperatorBrokers(duplicate)).toThrow("URL is duplicated");
    expect(() => loadOperatorBrokers("relative.json")).toThrow("must be absolute");
    expect(() => loadOperatorBrokers(path.join(root, "missing.json"))).toThrow("could not be read");
    await fs.writeFile(token, "short", "utf8");
    const shortToken = path.join(root, "short-token.json");
    await fs.writeFile(
      shortToken,
      JSON.stringify({
        version: 1,
        brokers: [{ id: "hf-broker", label: "HF", url: "http://127.0.0.1:1", token_file: token }],
      }),
      "utf8",
    );
    expect(() => loadOperatorBrokers(shortToken)).toThrow("token is invalid");
    const invalidJson = path.join(root, "invalid-json.json");
    await fs.writeFile(invalidJson, "{", "utf8");
    expect(() => loadOperatorBrokers(invalidJson)).toThrow("valid JSON");
  });
});

async function listen(server: http.Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("missing test server address");
  }
  return address.port;
}

async function close(server: http.Server): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
