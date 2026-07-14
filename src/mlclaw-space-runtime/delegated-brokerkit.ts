import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  BrokerOperatorError,
  OperatorBrokerRegistry,
  type BrokerApproval,
  type BrokerDecision,
  type BrokerOperatorClient,
  type OperatorBrokerSummary,
} from "./operator-brokers.js";
import { DelegatedRevisions, type DelegatedSnapshotEvent } from "./delegated-revisions.js";

const API_VERSION = "brokerkit.io/delegated-web/v1" as const;
const TOKEN_LIFETIME_SECONDS = 4 * 60;
const MAX_PAGES_PER_SOURCE = 32;
const MAX_HANDLES = 4_096;
const SOURCE_DEADLINE_MS = 15_000;

export type DelegatedAction = "approve" | "deny" | "revoke";
export type DelegatedAccess = "read" | "decide";

export type DelegatedSourceHealth = OperatorBrokerSummary & {
  healthy: boolean;
  last_sync_at?: string;
  error?: string;
};

export type DelegatedRequest = {
  source_id: string;
  source_label: string;
  handle: string;
  request: BrokerApproval;
};

export type DelegatedSnapshot = {
  api_version: "brokerkit.io/operator-ui/v1";
  cursor: string;
  sources: DelegatedSourceHealth[];
  requests: DelegatedRequest[];
  synchronized_at: string;
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
  access: DelegatedAccess;
};

export type DelegatedSessionIdentity = {
  actor: string;
  sessionId: string;
  access: DelegatedAccess;
};

export class DelegatedBrokerKit {
  private readonly key: Buffer;
  private readonly handles = new Map<string, HandleRecord>();
  private readonly handlesByIdentity = new Map<string, string>();
  private snapshotInFlight: Promise<DelegatedSnapshot> | undefined;
  private readonly revisions = new DelegatedRevisions<DelegatedSnapshot>();

  constructor(
    private readonly registry: OperatorBrokerRegistry,
    sessionSecret: string,
    private readonly now: () => Date = () => new Date(),
    private readonly sourceDeadlineMs = SOURCE_DEADLINE_MS,
  ) {
    this.key = createHmac("sha256", sessionSecret).update("mlclaw/brokerkit-delegated-web/v1", "utf8").digest();
  }

  issueSession(
    actor: string,
    access: DelegatedAccess,
  ): {
    api_version: typeof API_VERSION;
    token: string;
    expires_at: string;
    access: DelegatedAccess;
    renewal_transport: "direct";
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
      access,
    };
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = this.sign(encoded);
    return {
      api_version: API_VERSION,
      token: `${encoded}.${signature}`,
      expires_at: new Date(expiresAt * 1_000).toISOString(),
      access,
      renewal_transport: "direct",
    };
  }

  authorize(token: string | undefined): string | undefined {
    return this.authorizeSession(token)?.actor;
  }

  authorizeSession(token: string | undefined): DelegatedSessionIdentity | undefined {
    const encoded = authenticatedTokenPayload(token, (value) => this.sign(value));
    if (!encoded) return undefined;
    const payload = parseTokenPayload(encoded);
    return payload && tokenIsCurrent(payload, this.now())
      ? { actor: payload.subject, sessionId: payload.nonce, access: payload.access }
      : undefined;
  }

  async snapshot(): Promise<DelegatedSnapshot> {
    if (this.snapshotInFlight) return this.snapshotInFlight;
    const pending = this.buildSnapshot();
    this.snapshotInFlight = pending;
    try {
      return await pending;
    } finally {
      if (this.snapshotInFlight === pending) this.snapshotInFlight = undefined;
    }
  }

  private async buildSnapshot(): Promise<DelegatedSnapshot> {
    this.pruneHandles();
    const synchronizedAt = this.now().toISOString();
    const results = await Promise.all(
      this.registry.entries().map(async ([summary, client]) => this.sourceSnapshot(summary, client, synchronizedAt)),
    );
    const selected = selectSnapshotRequests(results, MAX_HANDLES);
    const reservedHandles = this.selectedExistingHandles(selected);
    const sources = results.map((result) => result.source);
    const requests = selected.map(({ source, request }) =>
      project(source, request, this.handle(source.id, request, reservedHandles)),
    );
    const material = JSON.stringify({
      sources: sources.map((source) => ({
        id: source.id,
        label: source.label,
        healthy: source.healthy,
        ...(source.error ? { error: source.error } : {}),
      })),
      requests,
    });
    return this.revisions.publish(material, (cursor) => ({
      api_version: "brokerkit.io/operator-ui/v1",
      cursor,
      sources,
      requests,
      synchronized_at: synchronizedAt,
    }));
  }

  async events(cursor: string, waitSeconds: number, signal?: AbortSignal): Promise<DelegatedSnapshotEvent> {
    await this.snapshot();
    const waiting = this.revisions.wait(cursor, waitSeconds, signal);
    const refresh = setInterval(() => void this.snapshot().catch(() => undefined), 1_000);
    refresh.unref();
    try {
      return await waiting;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error.code === "cursor_expired" || error.code === "source_unavailable")
      ) {
        throw delegatedError(error.code);
      }
      throw error;
    } finally {
      clearInterval(refresh);
    }
  }

  async summary(): Promise<{
    api_version: "brokerkit.io/operator-ui/v1";
    cursor: string;
    pending: number;
    healthy: boolean;
  }> {
    const snapshot = await this.snapshot();
    return {
      api_version: snapshot.api_version,
      cursor: snapshot.cursor,
      pending: snapshot.requests.filter((value) => value.request.status === "pending").length,
      healthy: snapshot.sources.every((source) => source.healthy),
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
    options: { durationSeconds?: number; maxUses?: number | null } = {},
  ): Promise<DelegatedRequest> {
    const record = this.resolveHandle(handle);
    const source = this.registry.get(record.sourceId);
    if (!source) throw delegatedError("source_unavailable");
    const current = await source.get(record.requestId);
    assertDecisionAllowed(current, record, action, expectedRevision, options);
    const decision = decisionOptions(record, action, expectedRevision, actor, options);
    const updated = await decideWithRecovery(source, record.requestId, action, decision);
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
  ): Promise<{ source: DelegatedSourceHealth; requests: BrokerApproval[] }> {
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), this.sourceDeadlineMs);
    timer.unref?.();
    try {
      await client.discover(deadline.signal);
      const pages = await Promise.all([
        this.sourceRequests(client, "pending", deadline.signal),
        this.sourceRequests(client, "active", deadline.signal),
      ]);
      const requests = reconcileRequests(pages.map((page) => page.requests));
      return {
        source: deadline.signal.aborted
          ? { ...summary, healthy: false, error: "broker_timeout" }
          : pages.some((page) => page.truncated)
            ? { ...summary, healthy: false, error: "source_truncated" }
            : { ...summary, healthy: true, last_sync_at: synchronizedAt },
        requests,
      };
    } catch (error) {
      return {
        source: { ...summary, healthy: false, error: safeSourceError(error) },
        requests: [],
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private async sourceRequests(
    client: BrokerOperatorClient,
    status: "pending" | "active",
    signal: AbortSignal,
  ): Promise<{ requests: BrokerApproval[]; truncated: boolean }> {
    const requests: BrokerApproval[] = [];
    let cursor: string | undefined;
    try {
      for (let pageNumber = 0; pageNumber < MAX_PAGES_PER_SOURCE; pageNumber += 1) {
        const page = await client.list({ status, ...(cursor ? { cursor } : {}), limit: 100 }, signal);
        requests.push(...page.requests);
        cursor = page.next_cursor;
        if (!cursor) return { requests, truncated: false };
      }
    } catch (error) {
      if (!signal.aborted) throw error;
    }
    return { requests, truncated: Boolean(cursor) };
  }

  private selectedExistingHandles(selected: { source: DelegatedSourceHealth; request: BrokerApproval }[]): Set<string> {
    const handles = new Set<string>();
    for (const { source, request } of selected) {
      const handle = this.handlesByIdentity.get(requestIdentity(source.id, request.id, request.revision));
      if (handle && this.handles.has(handle)) handles.add(handle);
    }
    return handles;
  }

  private handle(sourceId: string, request: BrokerApproval, reservedHandles: Set<string> = new Set()): string {
    const identity = requestIdentity(sourceId, request.id, request.revision);
    const existing = this.handlesByIdentity.get(identity);
    if (existing && this.handles.has(existing)) {
      reservedHandles.add(existing);
      return existing;
    }
    if (this.handles.size >= MAX_HANDLES && !this.pruneOldestHandle(reservedHandles)) {
      throw delegatedError("source_unavailable");
    }
    const handle = randomBytes(18).toString("base64url");
    const requestExpiry = Date.parse(handleExpiry(request));
    const expiresAtMs = Number.isFinite(requestExpiry)
      ? Math.min(requestExpiry, this.now().getTime() + 24 * 60 * 60_000)
      : this.now().getTime() + 5 * 60_000;
    this.handles.set(handle, { sourceId, requestId: request.id, revision: request.revision, expiresAtMs });
    this.handlesByIdentity.set(identity, handle);
    reservedHandles.add(handle);
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

  private pruneOldestHandle(reservedHandles: Set<string>): boolean {
    for (const [handle, record] of this.handles) {
      if (reservedHandles.has(handle)) continue;
      this.removeHandle(handle, record);
      return true;
    }
    return false;
  }

  private removeHandle(handle: string, record: HandleRecord): void {
    this.handles.delete(handle);
    this.handlesByIdentity.delete(requestIdentity(record.sourceId, record.requestId, record.revision));
  }

  private sign(encoded: string): string {
    return createHmac("sha256", this.key).update(encoded, "utf8").digest("base64url");
  }
}

async function decideWithRecovery(
  source: BrokerOperatorClient,
  requestId: string,
  action: DelegatedAction,
  decision: BrokerDecision,
): Promise<BrokerApproval> {
  try {
    return await source.decide(requestId, action, decision);
  } catch (error) {
    if (error instanceof BrokerOperatorError) throw error;
    try {
      await source.get(requestId);
    } catch {
      throw delegatedError("source_unavailable");
    }
    try {
      return await source.decide(requestId, action, decision);
    } catch (retryError) {
      if (retryError instanceof BrokerOperatorError) throw retryError;
      throw delegatedError("source_unavailable");
    }
  }
}

function selectSnapshotRequests(
  results: { source: DelegatedSourceHealth; requests: BrokerApproval[] }[],
  limit: number,
): { source: DelegatedSourceHealth; request: BrokerApproval }[] {
  const buckets = results.flatMap((result) =>
    (["pending", "active"] as const).map((status) => ({
      source: result.source,
      requests: result.requests.filter((request) => request.status === status),
      index: 0,
    })),
  );
  const selected: { source: DelegatedSourceHealth; request: BrokerApproval }[] = [];
  while (selected.length < limit) {
    let added = false;
    for (const bucket of buckets) {
      const request = bucket.requests[bucket.index];
      if (!request) continue;
      selected.push({ source: bucket.source, request });
      bucket.index += 1;
      added = true;
      if (selected.length === limit) break;
    }
    if (!added) break;
  }
  return selected;
}

function reconcileRequests(pages: BrokerApproval[][]): BrokerApproval[] {
  const requests = new Map<string, BrokerApproval>();
  for (const request of pages.flat()) {
    const current = requests.get(request.id);
    if (
      !current ||
      request.revision > current.revision ||
      (request.revision === current.revision && request.status === "active" && current.status !== "active")
    ) {
      requests.set(request.id, request);
    }
  }
  return [...requests.values()];
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
  return { source_id: source.id, source_label: source.label, handle, request };
}

function requestIdentity(sourceId: string, requestId: string, revision: number): string {
  return `${sourceId}\0${requestId}\0${revision}`;
}

function handleExpiry(request: BrokerApproval): string {
  if (request.status === "active") return request.active_expires_at ?? "";
  return request.pending_expires_at ?? request.active_expires_at ?? "";
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
  options: { durationSeconds?: number; maxUses?: number | null },
): BrokerDecision {
  return {
    expectedRevision,
    idempotencyKey: decisionKey(record, action, actor),
    onBehalfOf: `mlclaw:${actor}`,
    ...(options.durationSeconds ? { durationSeconds: options.durationSeconds } : {}),
    ...(options.maxUses !== undefined ? { maxUses: options.maxUses } : {}),
  };
}

function decisionWithinBounds(
  action: DelegatedAction,
  request: BrokerApproval,
  options: { durationSeconds?: number; maxUses?: number | null },
): boolean {
  if (options.durationSeconds === undefined && options.maxUses === undefined) return true;
  const bounds = request.approval_bounds;
  return Boolean(
    action === "approve" &&
    bounds &&
    options.durationSeconds !== undefined &&
    options.durationSeconds <= bounds.max_duration_seconds &&
    useLimitWithinBounds(options.maxUses, bounds.max_uses),
  );
}

function useLimitWithinBounds(requested: number | null | undefined, maximum: number | null): boolean {
  if (requested === undefined) return false;
  if (requested === null) return maximum === null;
  return maximum === null || requested <= maximum;
}

function assertDecisionAllowed(
  request: BrokerApproval,
  record: HandleRecord,
  action: DelegatedAction,
  expectedRevision: number,
  options: { durationSeconds?: number; maxUses?: number | null },
): void {
  if (request.revision !== record.revision || request.revision !== expectedRevision) {
    throw delegatedError("revision_stale");
  }
  if (!request.allowed_actions.includes(action) || !decisionWithinBounds(action, request, options)) {
    throw delegatedError("action_not_allowed");
  }
}

function authenticatedTokenPayload(token: string | undefined, sign: (value: string) => string): string | undefined {
  if (!token || token.length > 4_096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(token)) return undefined;
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
  return Object.keys(record).sort().join(",") === "access,audience,expiresAt,issuedAt,nonce,subject,version";
}

function validTokenIdentity(record: Record<string, unknown>): boolean {
  return (
    record.version === 1 &&
    record.audience === "brokerkit-delegated-web" &&
    (record.access === "read" || record.access === "decide") &&
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
  const code =
    error instanceof BrokerOperatorError
      ? error.code
      : error instanceof DelegatedBrokerKitError
        ? error.code
        : undefined;
  if (code === "broker_timeout" || code === "unavailable" || code === "source_unavailable") return code;
  return "source_unavailable";
}
