import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { DelegatedBrokerKit } from "../src/mlclaw-space-runtime/delegated-brokerkit.js";
import { OperatorBrokerRegistry } from "../src/mlclaw-space-runtime/operator-brokers.js";

function request(id: string, revision = 1, status = "pending") {
  return {
    id,
    revision,
    requester: "bob",
    operation: "repo.update",
    status,
    requested_at: "2026-07-12T00:00:00Z",
    pending_expires_at: "2026-07-12T01:00:00Z",
    ...(status === "active" ? { active_expires_at: "2026-07-12T02:00:00Z" } : {}),
    requested_duration_seconds: 300,
    requested_max_uses: 1,
    granted_max_uses: status === "active" ? 1 : null,
    used_count: 0,
    presentation: {
      risk: "high",
      title: "Update repository",
      target: "osolmaz/example",
      facts: [{ label: "Repository", value: "osolmaz/example" }],
      warnings: [{ severity: "high", text: "This changes repository metadata." }],
      plan_hash: "sha256:delegated-contract-test",
    },
    allowed_actions: status === "pending" ? ["approve", "deny"] : ["revoke"],
    approval_bounds: { max_duration_seconds: 300, max_uses: 1 },
  };
}

function registry(fetchImpl: typeof fetch): OperatorBrokerRegistry {
  return new OperatorBrokerRegistry(
    [
      { id: "hf-broker", label: "Hugging Face", baseUrl: "https://hf.example", token: "h".repeat(32) },
      { id: "gh-broker", label: "GitHub", baseUrl: "https://gh.example", token: "g".repeat(32) },
    ],
    fetchImpl,
  );
}

describe("DelegatedBrokerKit", () => {
  it("issues short-lived audience-bound tokens and rejects tampering and expiry", () => {
    let now = new Date("2026-07-12T00:00:00Z");
    const secret = "s".repeat(48);
    const delegated = new DelegatedBrokerKit(new OperatorBrokerRegistry([]), secret, () => now);
    const session = delegated.issueSession("alice", "decide");
    expect(session.api_version).toBe("brokerkit.io/delegated-web/v1");
    expect(session.access).toBe("decide");
    expect(session.renewal_transport).toBe("direct");
    expect(delegated.authorize(session.token)).toBe("alice");
    expect(delegated.authorizeSession(session.token)).toEqual({
      actor: "alice",
      sessionId: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/u),
      access: "decide",
    });
    expect(delegated.authorize(`Bearer ${session.token}`)).toBeUndefined();
    expect(delegated.authorize(`${session.token}, ${session.token}`)).toBeUndefined();
    expect(delegated.authorize(` ${session.token}`)).toBeUndefined();
    expect(delegated.authorize(`${session.token}x`)).toBeUndefined();
    expect(delegated.authorize("x".repeat(4_097))).toBeUndefined();
    expect(
      delegated.authorize(
        signedSessionToken(secret, {
          version: 1,
          audience: "another-service",
          subject: "alice",
          issuedAt: Math.floor(now.getTime() / 1_000),
          expiresAt: Math.floor(now.getTime() / 1_000) + 60,
          nonce: "nonce",
          access: "decide",
        }),
      ),
    ).toBeUndefined();
    now = new Date("2026-07-12T00:05:00Z");
    expect(delegated.authorize(session.token)).toBeUndefined();
  });

  it("isolates source failures and assigns distinct opaque handles", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "gh.example") {
        return Response.json(
          { error: { code: "tenant_alice_database_down", message: "secret internal detail" } },
          { status: 503 },
        );
      }
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      if (url.searchParams.get("status") === "active") return Response.json({ requests: [] });
      return Response.json({ requests: [request("shared-id")] });
    });
    const delegated = new DelegatedBrokerKit(
      registry(fetchImpl),
      "s".repeat(48),
      () => new Date("2026-07-12T00:00:00Z"),
    );
    const snapshot = await delegated.snapshot();
    expect(snapshot.sources).toEqual([
      expect.objectContaining({ id: "hf-broker", healthy: true }),
      expect.objectContaining({ id: "gh-broker", healthy: false, error: "source_unavailable" }),
    ]);
    expect(snapshot.requests).toHaveLength(1);
    expect(snapshot.requests[0]?.handle).toMatch(/^[A-Za-z0-9_-]{24}$/u);
    expect(JSON.stringify(snapshot)).not.toContain("secret internal detail");
  });

  it("keeps issued handles through another session's transiently empty snapshot", async () => {
    let visible = true;
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      if (url.pathname.endsWith("/request-1")) return Response.json(request("request-1"));
      if (url.searchParams.get("status") === "active") return Response.json({ requests: [] });
      return Response.json({ requests: visible ? [request("request-1")] : [] });
    });
    const delegated = new DelegatedBrokerKit(
      new OperatorBrokerRegistry(
        [{ id: "hf-broker", label: "Hugging Face", baseUrl: "https://hf.example", token: "h".repeat(32) }],
        fetchImpl,
      ),
      "s".repeat(48),
      () => new Date("2026-07-12T00:00:00Z"),
    );

    const issued = (await delegated.snapshot()).requests[0];
    if (!issued) throw new Error("missing request");
    visible = false;
    expect((await delegated.snapshot()).requests).toEqual([]);
    await expect(delegated.detail(issued.handle)).resolves.toMatchObject({
      request: { id: "request-1", revision: 1 },
    });
  });

  it("coalesces concurrent snapshot fan-out", async () => {
    let releasePending!: () => void;
    let markPendingStarted!: () => void;
    const pendingGate = new Promise<void>((resolve) => {
      releasePending = resolve;
    });
    const pendingStarted = new Promise<void>((resolve) => {
      markPendingStarted = resolve;
    });
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      if (url.searchParams.get("status") === "pending") {
        markPendingStarted();
        await pendingGate;
        return Response.json({ requests: [request("request-1")] });
      }
      return Response.json({ requests: [] });
    });
    const delegated = new DelegatedBrokerKit(
      new OperatorBrokerRegistry(
        [{ id: "hf-broker", label: "Hugging Face", baseUrl: "https://hf.example", token: "h".repeat(32) }],
        fetchImpl,
      ),
      "s".repeat(48),
    );

    const first = delegated.snapshot();
    await pendingStarted;
    const second = delegated.snapshot();
    releasePending();
    const [left, right] = await Promise.all([first, second]);
    expect(left).toEqual(right);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("publishes cursor-only invalidations and expires foreign cursors", async () => {
    let visible = true;
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      if (url.searchParams.get("status") === "active") return Response.json({ requests: [] });
      return Response.json({ requests: visible ? [request("request-1")] : [] });
    });
    const delegated = new DelegatedBrokerKit(
      new OperatorBrokerRegistry(
        [{ id: "hf-broker", label: "Hugging Face", baseUrl: "https://hf.example", token: "h".repeat(32) }],
        fetchImpl,
      ),
      "s".repeat(48),
    );
    const first = await delegated.snapshot();
    visible = false;
    const changed = await delegated.events(first.cursor, 2);
    expect(changed).toEqual({
      api_version: "brokerkit.io/operator-ui/v1",
      cursor: expect.not.stringMatching(first.cursor),
      changed: true,
    });
    await expect(delegated.events("foreign.1", 1)).rejects.toMatchObject({ code: "cursor_expired" });
    const summary = await delegated.summary();
    expect(summary).toMatchObject({ cursor: changed.cursor, pending: 0, healthy: true });
  });

  it("refetches broker truth and sends an actor-bound idempotent decision", async () => {
    const decisionBodies: Record<string, unknown>[] = [];
    let approved = false;
    let approveAttempts = 0;
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      if (url.pathname.endsWith("/approve")) {
        decisionBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
        approveAttempts += 1;
        approved = true;
        if (approveAttempts === 1) throw new Error("response connection closed after commit");
        return Response.json(request("request-1", 2, "active"));
      }
      if (url.pathname.endsWith("/revoke")) return Response.json(request("request-1", 3, "revoked"));
      if (url.pathname.endsWith("/request-1")) {
        return Response.json(approved ? request("request-1", 2, "active") : request("request-1"));
      }
      if (url.searchParams.get("status") === "active") {
        return Response.json({ requests: approved ? [request("request-1", 2, "active")] : [] });
      }
      return Response.json({ requests: approved ? [] : [request("request-1")] });
    });
    const delegated = new DelegatedBrokerKit(
      new OperatorBrokerRegistry(
        [{ id: "hf-broker", label: "Hugging Face", baseUrl: "https://hf.example", token: "h".repeat(32) }],
        fetchImpl,
      ),
      "s".repeat(48),
      () => new Date("2026-07-12T00:00:00Z"),
    );
    const pending = (await delegated.snapshot()).requests[0];
    if (!pending) throw new Error("missing request");
    await expect(
      delegated.decide(pending.handle, "approve", 1, "alice", { durationSeconds: 301, maxUses: 1 }),
    ).rejects.toMatchObject({ code: "action_not_allowed" });
    const updated = await delegated.decide(pending.handle, "approve", 1, "alice", {
      durationSeconds: 300,
      maxUses: 1,
    });
    expect(updated.request.status).toBe("active");
    expect(updated.handle).not.toBe(pending.handle);
    expect(decisionBodies).toHaveLength(2);
    expect(decisionBodies[0]).toEqual(decisionBodies[1]);
    expect(decisionBodies[1]).toMatchObject({
      expected_revision: 1,
      on_behalf_of: "mlclaw:alice",
      constraints: { duration_seconds: 300, max_uses: 1 },
    });
    expect(decisionBodies[1]?.idempotency_key).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect((await delegated.snapshot()).requests).toEqual([
      expect.objectContaining({ request: expect.objectContaining({ status: "active" }) }),
    ]);
    await expect(delegated.decide(updated.handle, "revoke", 2, "alice")).resolves.toMatchObject({
      request: { status: "revoked" },
    });
  });

  it("caps large snapshots before assigning usable handles", async () => {
    const requests = new Map<string, ReturnType<typeof request>>();
    let round = 0;
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        round += 1;
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      if (url.pathname.startsWith("/api/operator/v1/requests/request-")) {
        return Response.json(requests.get(url.pathname.split("/").at(-1) ?? ""));
      }
      const status = url.searchParams.get("status") ?? "pending";
      const page = Number(url.searchParams.get("cursor") ?? "0");
      const pageCount = status === "pending" ? 32 : 9;
      const items = Array.from({ length: 100 }, (_, index) => {
        const id =
          round === 2 && status === "pending" && page === 0 && index === 0
            ? "request-pending-0-0"
            : `${round === 1 ? "request" : "next"}-${status}-${page}-${index}`;
        const item = request(id, status === "active" ? 2 : 1, status);
        requests.set(id, item);
        return item;
      });
      return Response.json({ requests: items, ...(page + 1 < pageCount ? { next_cursor: String(page + 1) } : {}) });
    });
    const delegated = new DelegatedBrokerKit(
      new OperatorBrokerRegistry(
        [{ id: "hf-broker", label: "Hugging Face", baseUrl: "https://hf.example", token: "h".repeat(32) }],
        fetchImpl,
      ),
      "s".repeat(48),
      () => new Date("2026-07-12T00:00:00Z"),
    );
    const snapshot = await delegated.snapshot();
    expect(snapshot.requests).toHaveLength(4_096);
    await expect(delegated.detail(snapshot.requests[0]?.handle ?? "")).resolves.toBeTruthy();
    await expect(delegated.detail(snapshot.requests.at(-1)?.handle ?? "")).resolves.toBeTruthy();
    const refreshed = await delegated.snapshot();
    const retained = refreshed.requests.find((item) => item.request.id === "request-pending-0-0");
    expect(retained?.handle).toBe(snapshot.requests.find((item) => item.request.id === retained?.request.id)?.handle);
    await expect(delegated.detail(retained?.handle ?? "")).resolves.toMatchObject({
      request: { id: "request-pending-0-0" },
    });
  });

  it("keeps bounded partial pages instead of discarding a busy source", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      if (url.searchParams.get("status") === "active") return Response.json({ requests: [] });
      const page = Number(url.searchParams.get("cursor") ?? "0");
      return Response.json({ requests: [request(`pending-${page}`)], next_cursor: String(page + 1) });
    });
    const delegated = new DelegatedBrokerKit(
      new OperatorBrokerRegistry(
        [{ id: "hf-broker", label: "Hugging Face", baseUrl: "https://hf.example", token: "h".repeat(32) }],
        fetchImpl,
      ),
      "s".repeat(48),
    );
    const snapshot = await delegated.snapshot();
    expect(snapshot.sources).toEqual([expect.objectContaining({ healthy: false, error: "source_truncated" })]);
    expect(snapshot.requests).toHaveLength(32);
  });

  it("shares a capped inbox fairly across sources and statuses", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      const status = url.searchParams.get("status") ?? "pending";
      const page = Number(url.searchParams.get("cursor") ?? "0");
      const items = Array.from({ length: 100 }, (_, index) =>
        request(`${url.hostname}-${status}-${page}-${index}`, status === "active" ? 2 : 1, status),
      );
      return Response.json({ requests: items, ...(page < 31 ? { next_cursor: String(page + 1) } : {}) });
    });
    const delegated = new DelegatedBrokerKit(registry(fetchImpl), "s".repeat(48));
    const snapshot = await delegated.snapshot();
    expect(snapshot.requests).toHaveLength(4_096);
    for (const sourceId of ["hf-broker", "gh-broker"]) {
      for (const status of ["pending", "active"]) {
        expect(
          snapshot.requests.filter((item) => item.source_id === sourceId && item.request.status === status),
        ).toHaveLength(1_024);
      }
    }
  });

  it("bounds slow pagination per source and keeps pages fetched before the deadline", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      const page = Number(url.searchParams.get("cursor") ?? "0");
      const status = url.searchParams.get("status") ?? "pending";
      const item = request(`${url.hostname}-${status}-first`, status === "active" ? 2 : 1, status);
      if (url.hostname === "gh.example") return Response.json({ requests: [item] });
      if (page === 0) {
        return Response.json({ requests: [item], next_cursor: "1" });
      }
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => reject(init?.signal?.reason ?? new Error("aborted"));
        init?.signal?.addEventListener("abort", onAbort, { once: true });
        setTimeout(resolve, 5_000).unref();
      });
      return Response.json({ requests: [] });
    });
    const delegated = new DelegatedBrokerKit(registry(fetchImpl), "s".repeat(48), () => new Date(), 25);
    const started = Date.now();
    const snapshot = await delegated.snapshot();
    expect(Date.now() - started).toBeLessThan(500);
    expect(snapshot.sources).toEqual([
      expect.objectContaining({ id: "hf-broker", healthy: false, error: "broker_timeout" }),
      expect.objectContaining({ id: "gh-broker", healthy: true }),
    ]);
    expect(snapshot.requests.map((item) => item.request.id).sort()).toEqual([
      "gh.example-active-first",
      "gh.example-pending-first",
      "hf.example-active-first",
      "hf.example-pending-first",
    ]);
  });

  it("keeps only the newest revision returned across status queries", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      return Response.json({
        requests: [
          url.searchParams.get("status") === "active"
            ? request("transitioning", 2, "active")
            : request("transitioning", 1, "pending"),
        ],
      });
    });
    const delegated = new DelegatedBrokerKit(
      new OperatorBrokerRegistry(
        [{ id: "hf-broker", label: "Hugging Face", baseUrl: "https://hf.example", token: "h".repeat(32) }],
        fetchImpl,
      ),
      "s".repeat(48),
    );
    expect((await delegated.snapshot()).requests).toEqual([
      expect.objectContaining({
        request: expect.objectContaining({ id: "transitioning", revision: 2, status: "active" }),
      }),
    ]);
  });
});

function signedSessionToken(secret: string, payload: Record<string, unknown>): string {
  const key = createHmac("sha256", secret).update("mlclaw/brokerkit-delegated-web/v1", "utf8").digest();
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", key).update(encoded, "utf8").digest("base64url");
  return `${encoded}.${signature}`;
}
