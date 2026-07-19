import { spawn } from "node:child_process";
import http from "node:http";
import { afterEach, describe, expect, it } from "vitest";

const brokerBinary = process.env.MLCLAW_HF_BROKER_BINARY;
const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

describe.runIf(brokerBinary)("pinned BrokerKit agent tools", () => {
  it("advertises bounded transcript-safe submission and recovery schemas", async () => {
    const backend = await startAgentBackend();
    cleanups.push(backend.close);
    const response = await callMcp(backend.url, "tools/list");
    const tools = parseMcpTools(response.result.tools);
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    for (const name of ["hf_operation_get", "hf_operation_wait", "hf_operation_list"]) {
      expect(byName.has(name), name).toBe(true);
    }
    for (const tool of tools.filter((candidate) => candidate.inputSchema.properties.reason)) {
      expect(tool.inputSchema.properties.request_id, tool.name).toBeDefined();
      expect(tool.inputSchema.required ?? [], tool.name).not.toContain("request_id");
      expect(tool.inputSchema.properties, tool.name).not.toHaveProperty("idempotency_key");
      expect(tool.inputSchema.properties, tool.name).not.toHaveProperty("wait_seconds");
    }

    const variableArguments = schemaProperties(byName, "hf_space_variable_set", "arguments");
    expect(variableArguments).toHaveProperty("variable_name");
    expect(variableArguments).not.toHaveProperty("key");
    const secretArguments = schemaProperties(byName, "hf_space_secret_set", "arguments");
    expect(secretArguments).toHaveProperty("secret_name");
    expect(secretArguments).not.toHaveProperty("key");
    expect(byName.get("hf_operation_wait")?.inputSchema.properties.timeout_seconds).toMatchObject({ maximum: 25 });
    expect(byName.get("hf_grant_wait")?.inputSchema.properties.wait_seconds).toMatchObject({ maximum: 25 });
  });

  it("submits, replays, conflicts, and recovers operations without transcript corruption", async () => {
    const backend = await startAgentBackend();
    cleanups.push(backend.close);
    const first = operationResult(await submitRepo(backend.url, "alpha"));
    const second = operationResult(await submitRepo(backend.url, "beta"));
    expect(first.id).not.toBe(second.id);
    expect(first.request_id).not.toBe(second.request_id);

    const replayed = operationResult(await submitRepo(backend.url, "gamma", "exact-retry"));
    const replay = operationResult(await submitRepo(backend.url, "gamma", "exact-retry"));
    expect(replay).toEqual(replayed);

    const conflict = await submitRepo(backend.url, "different", "exact-retry", true);
    expect(conflict).toMatchObject({ code: "request_id_conflict", existing: { id: replayed.id } });

    const recovered = await toolResult(backend.url, "hf_operation_list", {
      request_id: first.request_id,
      limit: 1,
    });
    const recoveredOperations = arrayField(recovered, "operations");
    expect(recoveredOperations).toHaveLength(1);
    expect(recoveredOperations[0]).toMatchObject({ id: first.id, request_id: first.request_id });

    const transcript: unknown = JSON.parse(
      JSON.stringify({ role: "tool", content: [first, second, replayed, conflict] }),
    );
    const transcriptContent = arrayField(jsonObject(transcript, "transcript"), "content");
    expect(
      transcriptContent
        .map((value) => optionalStringField(jsonObject(value, "transcript content"), "request_id"))
        .filter(Boolean),
    ).toEqual([first.request_id, second.request_id, replayed.request_id]);
    expect(JSON.stringify(transcript)).not.toMatch(/\*\*\*|…|agent-secret|authorization/iu);
  });
});

async function submitRepo(url: string, name: string, requestId?: string, expectError = false): Promise<JsonObject> {
  return toolResult(
    url,
    "hf_repo_create",
    {
      target: { kind: "repo", type: "dataset", owner: "alice", name },
      arguments: { visibility: "private" },
      reason: `create ${name}`,
      ...(requestId ? { request_id: requestId } : {}),
    },
    expectError,
  );
}

async function toolResult(
  url: string,
  name: string,
  args: Record<string, unknown>,
  expectError = false,
): Promise<JsonObject> {
  const response = await callMcp(url, "tools/call", { name, arguments: args });
  expect(response.result.isError).toBe(expectError);
  return jsonObject(response.result.structuredContent, `${name} structured content`);
}

async function callMcp(url: string, method: string, params?: Record<string, unknown>): Promise<McpResponse> {
  if (!brokerBinary) throw new Error("MLCLAW_HF_BROKER_BINARY is required");
  const child = spawn(brokerBinary, ["mcp"], {
    env: {
      ...process.env,
      HF_BROKER_AGENT_ENDPOINT: `tcp://${new URL(url).host}`,
      HF_BROKER_SHARED_SECRET: "agent-secret-agent-secret-agent-secret-1234",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8").on("data", (chunk) => (stdout += chunk));
  child.stderr.setEncoding("utf8").on("data", (chunk) => (stderr += chunk));
  child.stdin.end(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method, ...(params ? { params } : {}) })}\n`);
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  if (exitCode !== 0) throw new Error(`hf-broker mcp exited ${String(exitCode)}: ${stderr}`);
  const parsed: unknown = JSON.parse(stdout.trim());
  const response = jsonObject(parsed, "MCP response");
  return { result: jsonObject(response.result, "MCP result") };
}

async function startAgentBackend(): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const operations = new Map<string, AgentOperation>();
  let sequence = 0;
  const server = http.createServer(async (request, response) => {
    response.setHeader("content-type", "application/json");
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.headers.authorization !== "Bearer agent-secret-agent-secret-agent-secret-1234") {
      response.writeHead(401).end(JSON.stringify({ error: { code: "unauthorized", message: "unauthorized" } }));
      return;
    }
    if (request.method === "GET" && url.pathname === "/.well-known/brokerkit-agent") {
      response.writeHead(200).end(
        JSON.stringify({
          api_version: "brokerkit.io/agent/v1",
          operations: ["repo.create", "space.secret.set", "space.variable.set"],
          credential: {
            ready: true,
            provider: "huggingface",
            credential_kind: "fine_grained_user_token",
            generation: 1,
            verification_state: "valid",
          },
        }),
      );
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/agent/v1/operations") {
      const submission = JSON.parse(await readBody(request)) as AgentSubmission;
      const existing = operations.get(submission.idempotency_key);
      if (existing) {
        const same =
          existing.operation === submission.operation &&
          JSON.stringify(existing.target) === JSON.stringify(submission.target) &&
          JSON.stringify(existing.arguments) === JSON.stringify(submission.arguments) &&
          existing.reason === submission.reason;
        if (!same) {
          response
            .writeHead(409)
            .end(
              JSON.stringify({ error: { code: "idempotency_conflict", message: "request identity already exists" } }),
            );
          return;
        }
        response.writeHead(200).end(JSON.stringify(existing));
        return;
      }
      sequence += 1;
      const operation = createOperation(sequence, submission);
      operations.set(submission.idempotency_key, operation);
      response.writeHead(201).end(JSON.stringify(operation));
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/agent/v1/operations") {
      const key = url.searchParams.get("idempotency_key") ?? "";
      const operation = operations.get(key);
      response.writeHead(200).end(
        JSON.stringify({
          api_version: "brokerkit.io/agent/v1",
          operations: operation ? [operationSummary(operation)] : [],
          next_cursor: null,
        }),
      );
      return;
    }
    response.writeHead(404).end(JSON.stringify({ error: { code: "not_found", message: "not found" } }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test backend did not bind TCP");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

function createOperation(sequence: number, submission: AgentSubmission): AgentOperation {
  const now = "2026-07-15T00:00:00.000000000Z";
  return {
    api_version: "brokerkit.io/agent/v1",
    id: `op_${sequence}`,
    broker: "hf-broker",
    client_id: "openclaw",
    idempotency_key: submission.idempotency_key,
    operation: submission.operation,
    target: submission.target,
    arguments: submission.arguments,
    reason: submission.reason,
    state: "pending",
    revision: 1,
    created_at: now,
    updated_at: now,
    presentation: { title: "Create repository", summary: "Awaiting approval" },
  };
}

function operationSummary(operation: AgentOperation): Record<string, unknown> {
  const { target: _target, arguments: _arguments, reason: _reason, ...summary } = operation;
  return summary;
}

async function readBody(request: http.IncomingMessage): Promise<string> {
  let body = "";
  for await (const chunk of request) body += String(chunk);
  return body;
}

function schemaProperties(byName: Map<string, McpTool>, toolName: string, field: string): Record<string, unknown> {
  const schema = objectValue(byName.get(toolName)?.inputSchema.properties[field]);
  return objectValue(schema?.properties) ?? {};
}

function parseMcpTools(value: unknown): McpTool[] {
  if (!Array.isArray(value)) throw new Error("MCP tools must be an array");
  return value.map((candidate) => {
    const tool = jsonObject(candidate, "MCP tool");
    const inputSchema = jsonObject(tool.inputSchema, "MCP tool input schema");
    const required = inputSchema.required;
    if (required !== undefined && (!Array.isArray(required) || !required.every((field) => typeof field === "string"))) {
      throw new Error("MCP tool required fields must be strings");
    }
    return {
      name: stringField(tool, "name"),
      inputSchema: {
        properties: jsonObject(inputSchema.properties, "MCP tool properties"),
        ...(required ? { required } : {}),
      },
    };
  });
}

function jsonObject(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as JsonObject;
}

function objectValue(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : undefined;
}

function arrayField(value: JsonObject, field: string): unknown[] {
  const result = value[field];
  if (!Array.isArray(result)) throw new Error(`${field} must be an array`);
  return result;
}

function stringField(value: JsonObject, field: string): string {
  const result = value[field];
  if (typeof result !== "string" || !result) throw new Error(`${field} must be a non-empty string`);
  return result;
}

function optionalStringField(value: JsonObject, field: string): string | undefined {
  const result = value[field];
  return typeof result === "string" ? result : undefined;
}

function operationResult(value: JsonObject): AgentToolResult {
  return {
    ...value,
    id: stringField(value, "id"),
    request_id: stringField(value, "request_id"),
  };
}

interface McpTool {
  name: string;
  inputSchema: {
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpResponse {
  result: JsonObject;
}

type JsonObject = Record<string, unknown>;

type AgentToolResult = JsonObject & {
  id: string;
  request_id: string;
};

interface AgentSubmission {
  idempotency_key: string;
  operation: string;
  target: Record<string, unknown>;
  arguments: Record<string, unknown>;
  reason: string;
}

interface AgentOperation extends AgentSubmission {
  api_version: string;
  id: string;
  broker: string;
  client_id: string;
  state: string;
  revision: number;
  created_at: string;
  updated_at: string;
  presentation: Record<string, string>;
}
