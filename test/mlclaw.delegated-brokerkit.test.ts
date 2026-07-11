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
    requested_duration_seconds: 300,
    requested_max_uses: 1,
    granted_max_uses: status === "active" ? 1 : null,
    used_count: 0,
    presentation: {
      risk: "high",
      title: "Update repository",
      facts: [{ label: "Repository", value: "osolmaz/example" }],
    },
    allowed_actions: status === "pending" ? ["approve", "deny", "cancel"] : ["revoke"],
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
    const delegated = new DelegatedBrokerKit(new OperatorBrokerRegistry([]), "s".repeat(48), () => now);
    const session = delegated.issueSession("alice");
    expect(session.api_version).toBe("brokerkit.io/delegated-web/v1");
    expect(delegated.authorize(`Bearer ${session.decision_token}`)).toBe("alice");
    expect(delegated.authorize(`Bearer ${session.decision_token}x`)).toBeUndefined();
    now = new Date("2026-07-12T00:05:00Z");
    expect(delegated.authorize(`Bearer ${session.decision_token}`)).toBeUndefined();
  });

  it("isolates source failures and assigns distinct opaque handles", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.hostname === "gh.example") {
        return Response.json({ error: { code: "unavailable", message: "secret internal detail" } }, { status: 503 });
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
      expect.objectContaining({ id: "gh-broker", healthy: false, error: "unavailable" }),
    ]);
    expect(snapshot.requests).toHaveLength(1);
    expect(snapshot.requests[0]?.handle).toMatch(/^[A-Za-z0-9_-]{24}$/u);
    expect(JSON.stringify(snapshot)).not.toContain("secret internal detail");
  });

  it("refetches broker truth and sends an actor-bound idempotent decision", async () => {
    let decisionBody: Record<string, unknown> | undefined;
    let approved = false;
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname === "/.well-known/brokerkit-operator") {
        return Response.json({ api_version: "brokerkit.io/operator/v1" });
      }
      if (url.pathname.endsWith("/approve")) {
        decisionBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        approved = true;
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
    const updated = await delegated.decide(pending.handle, "approve", 1, "alice", {
      durationSeconds: 300,
      maxUses: 1,
    });
    expect(updated.status).toBe("active");
    expect(updated.handle).not.toBe(pending.handle);
    expect(decisionBody).toMatchObject({
      expected_revision: 1,
      on_behalf_of: "mlclaw:alice",
      constraints: { duration_seconds: 300, max_uses: 1 },
    });
    expect(decisionBody?.idempotency_key).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect((await delegated.snapshot()).requests).toEqual([expect.objectContaining({ status: "active" })]);
    await expect(delegated.decide(updated.handle, "revoke", 2, "alice")).resolves.toMatchObject({
      status: "revoked",
    });
  });
});
