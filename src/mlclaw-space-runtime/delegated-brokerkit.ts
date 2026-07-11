import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  BrokerOperatorError,
  OperatorBrokerRegistry,
  type BrokerApproval,
  type BrokerDecision,
  type BrokerOperatorClient,
  type OperatorBrokerSummary,
} from "./operator-brokers.js";

const API_VERSION = "brokerkit.io/delegated-web/v1" as const;
const TOKEN_LIFETIME_SECONDS = 4 * 60;
const MAX_PAGES_PER_SOURCE = 32;
const MAX_HANDLES = 4_096;

export type DelegatedAction = "approve" | "deny" | "cancel" | "revoke";

export type DelegatedSourceHealth = OperatorBrokerSummary & {
  healthy: boolean;
  lastSyncAt?: string;
  error?: string;
};

export type DelegatedRequest = BrokerApproval & {
  sourceId: string;
  sourceLabel: string;
  handle: string;
};

export type DelegatedSnapshot = {
  sources: DelegatedSourceHealth[];
  requests: DelegatedRequest[];
  synchronizedAt: string;
};

type HandleRecord = {
  sourceId: string;
  requestId: string;
  revision: number;
  expiresAtMs: number;
};

type TokenPayload = {
  version: 1;
  audience: "brokerkit-delegated-web";
  subject: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export class DelegatedBrokerKit {
  private readonly key: Buffer;
  private readonly handles = new Map<string, HandleRecord>();
  private readonly handlesByIdentity = new Map<string, string>();

  constructor(
    private readonly registry: OperatorBrokerRegistry,
    sessionSecret: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.key = createHmac("sha256", sessionSecret).update("mlclaw/brokerkit-delegated-web/v1", "utf8").digest();
  }

  issueSession(actor: string): {
    api_version: typeof API_VERSION;
    actor: string;
    decision_token: string;
    expires_at: string;
  } {
    const issuedAt = Math.floor(this.now().getTime() / 1_000);
    const expiresAt = issuedAt + TOKEN_LIFETIME_SECONDS;
    const payload: TokenPayload = {
      version: 1,
      audience: "brokerkit-delegated-web",
      subject: actor,
      issuedAt,
      expiresAt,
      nonce: randomBytes(16).toString("base64url"),
    };
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = this.sign(encoded);
    return {
      api_version: API_VERSION,
      actor,
      decision_token: `${encoded}.${signature}`,
      expires_at: new Date(expiresAt * 1_000).toISOString(),
    };
  }

  authorize(header: string | undefined): string | undefined {
    const encoded = authenticatedTokenPayload(header, (value) => this.sign(value));
    if (!encoded) return undefined;
    const payload = parseTokenPayload(encoded);
    return payload && tokenIsCurrent(payload, this.now()) ? payload.subject : undefined;
  }

  async snapshot(): Promise<DelegatedSnapshot> {
    this.pruneHandles();
    const synchronizedAt = this.now().toISOString();
    const results = await Promise.all(
      this.registry.entries().map(async ([summary, client]) => this.sourceSnapshot(summary, client, synchronizedAt)),
    );
    return {
      sources: results.map((result) => result.source),
      requests: results.flatMap((result) => result.requests),
      synchronizedAt,
    };
  }

  async detail(handle: string): Promise<DelegatedRequest> {
    const record = this.resolveHandle(handle);
    const source = this.registry.get(record.sourceId);
    if (!source) throw delegatedError("source_unavailable");
    const request = await source.get(record.requestId);
    if (request.revision !== record.revision) throw delegatedError("revision_stale");
    return project(source.summary(), request, handle);
  }

  async decide(
    handle: string,
    action: DelegatedAction,
    expectedRevision: number,
    actor: string,
    options: { reason?: string; durationSeconds?: number; maxUses?: number } = {},
  ): Promise<DelegatedRequest> {
    const record = this.resolveHandle(handle);
    const source = this.registry.get(record.sourceId);
    if (!source) throw delegatedError("source_unavailable");
    const current = await source.get(record.requestId);
    if (current.revision !== record.revision || current.revision !== expectedRevision) {
      throw delegatedError("revision_stale");
    }
    if (!current.allowed_actions.includes(action)) throw delegatedError("action_not_allowed");
    const updated = await source.decide(
      record.requestId,
      action,
      decisionOptions(record, action, expectedRevision, actor, options),
    );
    if (updated.status === "pending" || updated.status === "active") {
      this.removeHandle(handle, record);
      return project(source.summary(), updated, this.handle(record.sourceId, updated));
    }
    this.removeHandle(handle, record);
    return project(source.summary(), updated, handle);
  }

  private async sourceSnapshot(
    summary: OperatorBrokerSummary,
    client: BrokerOperatorClient,
    synchronizedAt: string,
  ): Promise<{ source: DelegatedSourceHealth; requests: DelegatedRequest[] }> {
    try {
      await client.discover();
      const requests = (
        await Promise.all([
          this.sourceRequests(summary, client, "pending"),
          this.sourceRequests(summary, client, "active"),
        ])
      ).flat();
      return {
        source: { ...summary, healthy: true, lastSyncAt: synchronizedAt },
        requests,
      };
    } catch (error) {
      return {
        source: { ...summary, healthy: false, error: safeSourceError(error) },
        requests: [],
      };
    }
  }

  private async sourceRequests(
    summary: OperatorBrokerSummary,
    client: BrokerOperatorClient,
    status: "pending" | "active",
  ): Promise<DelegatedRequest[]> {
    const requests: DelegatedRequest[] = [];
    let cursor: string | undefined;
    for (let pageNumber = 0; pageNumber < MAX_PAGES_PER_SOURCE; pageNumber += 1) {
      const page = await client.list({ status, ...(cursor ? { cursor } : {}), limit: 100 });
      for (const request of page.requests) {
        requests.push(project(summary, request, this.handle(summary.id, request)));
      }
      cursor = page.next_cursor;
      if (!cursor) return requests;
    }
    throw delegatedError("source_protocol_error");
  }

  private handle(sourceId: string, request: BrokerApproval): string {
    const identity = `${sourceId}\0${request.id}\0${request.revision}`;
    const existing = this.handlesByIdentity.get(identity);
    if (existing && this.handles.has(existing)) return existing;
    if (this.handles.size >= MAX_HANDLES) this.pruneOldestHandle();
    const handle = randomBytes(18).toString("base64url");
    const requestExpiry = Date.parse(request.pending_expires_at ?? request.active_expires_at ?? "");
    const expiresAtMs = Number.isFinite(requestExpiry)
      ? Math.min(requestExpiry, this.now().getTime() + 24 * 60 * 60_000)
      : this.now().getTime() + 5 * 60_000;
    this.handles.set(handle, { sourceId, requestId: request.id, revision: request.revision, expiresAtMs });
    this.handlesByIdentity.set(identity, handle);
    return handle;
  }

  private resolveHandle(handle: string): HandleRecord {
    if (!/^[A-Za-z0-9_-]{24}$/u.test(handle)) throw delegatedError("request_not_found");
    const record = this.handles.get(handle);
    if (!record || record.expiresAtMs <= this.now().getTime()) {
      if (record) this.removeHandle(handle, record);
      throw delegatedError("request_not_found");
    }
    return record;
  }

  private pruneHandles(): void {
    for (const [handle, record] of this.handles) {
      if (record.expiresAtMs <= this.now().getTime()) this.removeHandle(handle, record);
    }
  }

  private pruneOldestHandle(): void {
    const oldest = this.handles.entries().next();
    if (!oldest.done) this.removeHandle(oldest.value[0], oldest.value[1]);
  }

  private removeHandle(handle: string, record: HandleRecord): void {
    this.handles.delete(handle);
    this.handlesByIdentity.delete(`${record.sourceId}\0${record.requestId}\0${record.revision}`);
  }

  private sign(encoded: string): string {
    return createHmac("sha256", this.key).update(encoded, "utf8").digest("base64url");
  }
}

export class DelegatedBrokerKitError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function delegatedError(code: string): DelegatedBrokerKitError {
  return new DelegatedBrokerKitError(code);
}

function project(source: OperatorBrokerSummary, request: BrokerApproval, handle: string): DelegatedRequest {
  return { ...request, sourceId: source.id, sourceLabel: source.label, handle };
}

function decisionKey(record: HandleRecord, action: DelegatedAction, actor: string): string {
  return createHash("sha256")
    .update(
      ["mlclaw-brokerkit-decision-v1", record.sourceId, record.requestId, String(record.revision), action, actor].join(
        "\0",
      ),
      "utf8",
    )
    .digest("base64url");
}

function decisionOptions(
  record: HandleRecord,
  action: DelegatedAction,
  expectedRevision: number,
  actor: string,
  options: { reason?: string; durationSeconds?: number; maxUses?: number },
): BrokerDecision {
  return {
    expectedRevision,
    idempotencyKey: decisionKey(record, action, actor),
    onBehalfOf: `mlclaw:${actor}`,
    ...(options.reason ? { reason: options.reason } : {}),
    ...(options.durationSeconds ? { durationSeconds: options.durationSeconds } : {}),
    ...(options.maxUses ? { maxUses: options.maxUses } : {}),
  };
}

function authenticatedTokenPayload(header: string | undefined, sign: (value: string) => string): string | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length);
  if (token.length > 4_096) return undefined;
  const [encoded, signature, extra] = token.split(".");
  return encoded && signature && extra === undefined && safeEqual(signature, sign(encoded)) ? encoded : undefined;
}

function parseTokenPayload(encoded: string): TokenPayload | undefined {
  try {
    const payload: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    return validTokenPayload(payload) ? payload : undefined;
  } catch {
    return undefined;
  }
}

function tokenIsCurrent(payload: TokenPayload, now: Date): boolean {
  const current = Math.floor(now.getTime() / 1_000);
  return (
    payload.issuedAt <= current + 5 &&
    payload.expiresAt > current &&
    payload.expiresAt - payload.issuedAt <= TOKEN_LIFETIME_SECONDS
  );
}

function validTokenPayload(value: unknown): value is TokenPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    hasExactTokenFields(record) && validTokenIdentity(record) && validTokenTimes(record) && validTokenNonce(record)
  );
}

function hasExactTokenFields(record: Record<string, unknown>): boolean {
  return Object.keys(record).sort().join(",") === "audience,expiresAt,issuedAt,nonce,subject,version";
}

function validTokenIdentity(record: Record<string, unknown>): boolean {
  return (
    record.version === 1 &&
    record.audience === "brokerkit-delegated-web" &&
    typeof record.subject === "string" &&
    record.subject.length >= 1 &&
    record.subject.length <= 200
  );
}

function validTokenTimes(record: Record<string, unknown>): boolean {
  return (
    typeof record.issuedAt === "number" &&
    Number.isSafeInteger(record.issuedAt) &&
    typeof record.expiresAt === "number" &&
    Number.isSafeInteger(record.expiresAt)
  );
}

function validTokenNonce(record: Record<string, unknown>): boolean {
  return typeof record.nonce === "string" && /^[A-Za-z0-9_-]{22}$/u.test(record.nonce);
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function safeSourceError(error: unknown): string {
  if (error instanceof BrokerOperatorError) return error.code ?? "source_unavailable";
  if (error instanceof DelegatedBrokerKitError) return error.code;
  return "source_unavailable";
}
