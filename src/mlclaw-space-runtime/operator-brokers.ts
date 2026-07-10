import { isAbsolute } from "node:path";
import { readFileSync } from "node:fs";
import { z } from "zod";

const MAX_CONFIG_BYTES = 64 * 1024;
const MAX_TOKEN_BYTES = 4096;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const BROKER_ID = /^[a-z](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export type OperatorBrokerSummary = {
  id: string;
  label: string;
};

export type OperatorBrokerConfig = OperatorBrokerSummary & {
  baseUrl: string;
  token: string;
};

export type BrokerDisplayField = {
  label: string;
  value: string;
};

export type BrokerApproval = {
  id: string;
  revision: number;
  client: string;
  operation: string;
  status: string;
  requested_at: string;
  pending_expires_at: string;
  active_expires_at?: string;
  requested_duration_seconds: number;
  max_uses: number;
  used_count: number;
  reserved_count: number;
  reason?: string;
  decided_at?: string;
  decided_by?: string;
  decision_reason?: string;
  presentation: {
    risk: "unknown" | "low" | "medium" | "high" | "critical";
    title: string;
    summary?: string;
    target: string;
    fields?: BrokerDisplayField[];
    plan_hash?: string;
    audit?: BrokerDisplayField[];
  };
  presentation_unavailable?: boolean;
};

export type BrokerApprovalPage = {
  items: BrokerApproval[];
  next_cursor?: string;
  has_more: boolean;
};

export type BrokerDecision = {
  expectedRevision: number;
  expectedStatus?: string;
  reason?: string;
  durationSeconds?: number;
  maxUses?: number;
};

export type BrokerOperatorClientOptions = OperatorBrokerConfig & {
  fetch?: typeof fetch;
};

const displayFieldSchema = z
  .object({
    label: z.string().min(1).max(120),
    value: z.string().max(4_096),
  })
  .passthrough();

const approvalSchema = z
  .object({
    id: z.string().min(1).max(200),
    revision: z.number().int().positive(),
    client: z.string().min(1).max(200),
    operation: z.string().min(1).max(200),
    status: z.string().min(1).max(40),
    requested_at: z.string().min(1).max(80),
    pending_expires_at: z.string().min(1).max(80),
    active_expires_at: z.string().min(1).max(80).optional(),
    requested_duration_seconds: z.number().int().nonnegative(),
    max_uses: z.number().int().nonnegative(),
    used_count: z.number().int().nonnegative(),
    reserved_count: z.number().int().nonnegative(),
    reason: z.string().max(2_000).optional(),
    decided_at: z.string().min(1).max(80).optional(),
    decided_by: z.string().max(200).optional(),
    decision_reason: z.string().max(2_000).optional(),
    presentation: z
      .object({
        risk: z.enum(["unknown", "low", "medium", "high", "critical"]),
        title: z.string().min(1).max(240),
        summary: z.string().max(4_096).optional(),
        target: z.string().min(1).max(2_000),
        fields: z.array(displayFieldSchema).max(100).optional(),
        plan_hash: z.string().max(256).optional(),
        audit: z.array(displayFieldSchema).max(100).optional(),
      })
      .passthrough(),
    presentation_unavailable: z.boolean().optional(),
  })
  .passthrough();

const approvalPageSchema = z
  .object({
    items: z.array(approvalSchema),
    next_cursor: z.string().min(1).max(4_096).optional(),
    has_more: z.boolean(),
  })
  .passthrough();

const operatorErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1).max(200).optional(),
        message: z.string().min(1).max(2_000).optional(),
      })
      .optional(),
  })
  .passthrough();

export class BrokerOperatorError extends Error {
  constructor(
    readonly broker: OperatorBrokerSummary,
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

export class BrokerOperatorClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: BrokerOperatorClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetch ?? fetch;
  }

  summary(): OperatorBrokerSummary {
    return { id: this.options.id, label: this.options.label };
  }

  list(params: { status?: "pending" | "history"; cursor?: string; limit?: number } = {}): Promise<BrokerApprovalPage> {
    const query = new URLSearchParams();
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.cursor) {
      query.set("cursor", params.cursor);
    }
    if (params.limit) {
      query.set("limit", String(params.limit));
    }
    const suffix = query.size > 0 ? `?${query}` : "";
    return this.request<BrokerApprovalPage>(`/api/grants${suffix}`, undefined, approvalPageSchema, "grant list");
  }

  get(id: string): Promise<BrokerApproval> {
    return this.request<BrokerApproval>(`/api/grants/${approvalId(id)}`, undefined, approvalSchema, "grant");
  }

  decide(
    id: string,
    action: "approve" | "deny" | "cancel" | "revoke",
    decision: BrokerDecision,
  ): Promise<BrokerApproval> {
    return this.request<BrokerApproval>(
      `/api/grants/${approvalId(id)}/${action}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expected_revision: decision.expectedRevision,
          ...(decision.expectedStatus ? { expected_status: decision.expectedStatus } : {}),
          ...(decision.reason ? { reason: decision.reason } : {}),
          ...(decision.durationSeconds ? { duration_seconds: decision.durationSeconds } : {}),
          ...(decision.maxUses ? { max_uses: decision.maxUses } : {}),
        }),
      },
      approvalSchema,
      "grant",
    );
  }

  async events(lastEventId?: string, signal?: AbortSignal): Promise<Response> {
    const headers: Record<string, string> = {
      accept: "text/event-stream",
      authorization: `Bearer ${this.options.token}`,
    };
    if (lastEventId) {
      headers["last-event-id"] = lastEventId;
    }
    const response = await this.fetchImpl(`${this.baseUrl}/api/grants/events`, {
      headers,
      redirect: "error",
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      throw await this.operatorError(response);
    }
    if (!response.headers.get("content-type")?.toLowerCase().startsWith("text/event-stream")) {
      await response.body?.cancel();
      throw new BrokerOperatorError(
        this.summary(),
        502,
        "invalid_event_stream",
        "Broker returned an invalid event stream",
      );
    }
    return response;
  }

  private async request<T>(
    pathname: string,
    init: RequestInit | undefined,
    schema: z.ZodTypeAny,
    label: string,
  ): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("accept", "application/json");
    headers.set("authorization", `Bearer ${this.options.token}`);
    const response = await this.fetchImpl(`${this.baseUrl}${pathname}`, {
      ...(init ?? {}),
      headers,
      redirect: "error",
    });
    if (!response.ok) {
      throw await this.operatorError(response);
    }
    return validatedBrokerPayload(await boundedJson(response), schema, label);
  }

  private async operatorError(response: Response): Promise<BrokerOperatorError> {
    const fallback = `${this.options.label} operator request failed`;
    try {
      const value = validatedBrokerPayload<z.infer<typeof operatorErrorSchema>>(
        await boundedJson(response),
        operatorErrorSchema,
        "error",
      );
      const message = value.error?.message?.trim() || fallback;
      const code = value.error?.code?.trim();
      return new BrokerOperatorError(this.summary(), response.status, code, message);
    } catch {
      return new BrokerOperatorError(this.summary(), response.status, undefined, fallback);
    }
  }
}

export class OperatorBrokerRegistry {
  private readonly clients: Map<string, BrokerOperatorClient>;

  constructor(configs: OperatorBrokerConfig[], fetchImpl?: typeof fetch) {
    this.clients = new Map(
      configs.map((config) => [
        config.id,
        new BrokerOperatorClient({ ...config, ...(fetchImpl ? { fetch: fetchImpl } : {}) }),
      ]),
    );
  }

  list(): OperatorBrokerSummary[] {
    return [...this.clients.values()].map((client) => client.summary());
  }

  get(id: string): BrokerOperatorClient | undefined {
    return this.clients.get(id);
  }
}

export function loadOperatorBrokers(file: string | undefined): OperatorBrokerConfig[] {
  if (!file) {
    return [];
  }
  if (!isAbsolute(file)) {
    throw new Error("MLCLAW_OPERATOR_BROKERS_FILE must be absolute");
  }
  const raw = readBoundedFile(file, MAX_CONFIG_BYTES, "operator broker configuration");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("operator broker configuration must be valid JSON");
  }
  const root = strictRecord(parsed, ["version", "brokers"], "operator broker configuration");
  if (root.version !== 1) {
    throw new Error("operator broker configuration version must be 1");
  }
  if (!Array.isArray(root.brokers) || root.brokers.length > 16) {
    throw new Error("operator broker configuration must contain at most 16 brokers");
  }
  const ids = new Set<string>();
  const urls = new Set<string>();
  return root.brokers.map((value, index) => {
    const entry = strictRecord(value, ["id", "label", "url", "token_file"], `broker ${index}`);
    const id = requiredString(entry.id, `broker ${index} id`);
    if (!BROKER_ID.test(id) || ids.has(id)) {
      throw new Error(`broker ${index} id is invalid or duplicated`);
    }
    ids.add(id);
    const label = requiredString(entry.label, `broker ${index} label`);
    if ([...label].length > 80 || /\p{Cc}/u.test(label)) {
      throw new Error(`broker ${index} label is invalid`);
    }
    const baseUrl = operatorOrigin(requiredString(entry.url, `broker ${index} url`));
    if (urls.has(baseUrl)) {
      throw new Error(`broker ${index} URL is duplicated`);
    }
    urls.add(baseUrl);
    const tokenFile = requiredString(entry.token_file, `broker ${index} token_file`);
    if (!isAbsolute(tokenFile)) {
      throw new Error(`broker ${index} token_file must be absolute`);
    }
    const token = readBoundedFile(tokenFile, MAX_TOKEN_BYTES, `broker ${id} token`).trim();
    if (!/^[\x21-\x7e]{24,4096}$/u.test(token)) {
      throw new Error(`broker ${id} token is invalid`);
    }
    return { id, label, baseUrl, token };
  });
}

function operatorOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("broker URL must be an absolute HTTP URL");
  }
  const supportedProtocol = new Set(["http:", "https:"]).has(url.protocol);
  const hasAuthorityOrSuffix = [url.username, url.password, url.search, url.hash].some(Boolean);
  const hasPath = !["", "/"].includes(url.pathname);
  if (!supportedProtocol || hasAuthorityOrSuffix || hasPath) {
    throw new Error("broker URL must be one HTTP origin without credentials, path, query, or fragment");
  }
  return url.origin;
}

function strictRecord(value: unknown, keys: string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key)) || keys.some((key) => !(key in record))) {
    throw new Error(`${label} has missing or unknown fields`);
  }
  return record;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string`);
  }
  return value;
}

function readBoundedFile(file: string, maximum: number, label: string): string {
  let value: string;
  try {
    value = readFileSync(file, "utf8");
  } catch {
    throw new Error(`${label} could not be read`);
  }
  if (Buffer.byteLength(value) > maximum) {
    throw new Error(`${label} is too large`);
  }
  return value;
}

function approvalId(id: string): string {
  const normalized = id.trim();
  if (!normalized || normalized.length > 200 || normalized.includes("/") || normalized.includes("\\")) {
    throw new Error("invalid approval request id");
  }
  return encodeURIComponent(normalized);
}

async function boundedJson(response: Response): Promise<unknown> {
  if (!response.body) {
    throw new Error("broker response body is empty");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("broker response is too large");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function validatedBrokerPayload<T>(value: unknown, schema: z.ZodTypeAny, label: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new Error(`broker ${label} response is invalid`);
  }
  return parsed.data as T;
}
