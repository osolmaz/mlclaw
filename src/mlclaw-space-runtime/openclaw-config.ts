import fs from "node:fs/promises";
import path from "node:path";
import type { SpaceRuntimeConfig } from "./config.js";
import { managedMcpServerConfig } from "./mcp-integrations.js";
import { displayNameFromModelId, parseOpenClawModelRef, type ModelChoice } from "./model-choices.js";

export async function configureOpenClawGateway(config: SpaceRuntimeConfig): Promise<void> {
  const raw = await fs.readFile(config.openclawConfigPath, "utf8");
  const openclawConfig = JSON.parse(raw) as Record<string, unknown>;
  const gateway = object(openclawConfig, "gateway");
  gateway.mode = "local";
  gateway.bind = "loopback";
  gateway.port = config.openclawPort;
  gateway.auth = {
    mode: "trusted-proxy",
    trustedProxy: {
      userHeader: "x-forwarded-user",
      requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],
      allowLoopback: true,
    },
  };
  gateway.trustedProxies = ["127.0.0.1", "::1"];
  gateway.controlUi = {
    ...(typeof gateway.controlUi === "object" && gateway.controlUi ? gateway.controlUi : {}),
    dangerouslyDisableDeviceAuth: true,
    allowedOrigins: [config.publicUrl],
  };
  configureOpenClawModels(openclawConfig, config);
  configureManagedMcpServers(openclawConfig, config);

  await fs.mkdir(path.dirname(config.openclawConfigPath), { recursive: true });
  await fs.writeFile(config.openclawConfigPath, `${JSON.stringify(openclawConfig, null, 2)}\n`, { mode: 0o600 });
  await fs.chmod(config.openclawConfigPath, 0o600);
  if (process.getuid?.() === 0) {
    await fs.chown(config.openclawConfigPath, config.openclawUid, config.openclawGid);
  }
}

export async function managedMcpServerStatus(config: SpaceRuntimeConfig): Promise<Array<{
  id: string;
  name: string;
  enabled: boolean;
}>> {
  const raw = JSON.parse(await fs.readFile(config.openclawConfigPath, "utf8")) as Record<string, unknown>;
  const servers = object(object(raw, "mcp"), "servers");
  return [
    { id: "huggingface", name: "Hugging Face MCP" },
    { id: "research-agent", name: "Research Agent" },
  ].map((server) => ({
    ...server,
    enabled: objectValue(servers[server.id])?.enabled !== false,
  }));
}

function configureManagedMcpServers(openclawConfig: Record<string, unknown>, config: SpaceRuntimeConfig): void {
  const mcp = object(openclawConfig, "mcp");
  const servers = object(mcp, "servers");
  for (const [name, managed] of Object.entries(managedMcpServerConfig(config))) {
    const existing = servers[name];
    const userFields = existing && typeof existing === "object" && !Array.isArray(existing)
      ? existing as Record<string, unknown>
      : {};
    servers[name] = {
      ...userFields,
      ...managed,
      ...(userFields.enabled === false ? { enabled: false } : { enabled: true }),
      ...(userFields.toolFilter && typeof userFields.toolFilter === "object"
        ? { toolFilter: userFields.toolFilter }
        : {}),
    };
  }
}

function configureOpenClawModels(openclawConfig: Record<string, unknown>, config: SpaceRuntimeConfig): void {
  const agents = object(openclawConfig, "agents");
  const defaults = object(agents, "defaults");
  const existingModel = defaults.model && typeof defaults.model === "object" && !Array.isArray(defaults.model)
    ? defaults.model as Record<string, unknown>
    : {};
  defaults.model = {
    ...existingModel,
    primary: config.model,
  };
  defaults.models = Object.fromEntries(
    config.modelChoices.map((choice) => [
      choice.openclawModel,
      {
        alias: aliasForChoice(choice),
      },
    ]),
  );

  const models = object(openclawConfig, "models");
  const providers = object(models, "providers");
  const huggingface = object(providers, "huggingface");
  huggingface.baseUrl = "https://router.huggingface.co/v1";
  huggingface.api = "openai-completions";
  huggingface.models = config.modelChoices.map(modelDefinitionFromChoice);
}

function modelDefinitionFromChoice(choice: ModelChoice): Record<string, unknown> {
  const providerModelId = providerModelIdFromChoice(choice);
  return {
    id: providerModelId,
    name: `${choice.label} (${choice.provider})`,
    input: inputModalitiesForChoice(choice),
    contextWindow: choice.contextLength ?? contextWindowForModel(choice.modelId),
    maxTokens: 8192,
    reasoning: isReasoningModel(choice.modelId),
    cost: {
      input: choice.pricing?.input ?? 0,
      output: choice.pricing?.output ?? 0,
      cacheRead: 0,
      cacheWrite: 0,
    },
    api: "openai-completions",
    compat: {
      supportsTools: choice.supportsTools ?? true,
      supportsStrictMode: choice.supportsStructuredOutput ?? false,
    },
  };
}

function providerModelIdFromChoice(choice: ModelChoice): string {
  const parsed = parseOpenClawModelRef(choice.openclawModel);
  return parsed ? `${parsed.modelId}:${parsed.provider}` : `${choice.modelId}:${choice.provider}`;
}

function inputModalitiesForChoice(choice: ModelChoice): string[] {
  if (choice.inputModalities?.length) {
    return choice.inputModalities.filter((item) => item === "text" || item === "image");
  }
  return isLikelyImageModel(choice.modelId) ? ["text", "image"] : ["text"];
}

function aliasForChoice(choice: ModelChoice): string {
  const base = displayNameFromModelId(choice.modelId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "model";
  return `${base}-${choice.provider}`.slice(0, 64);
}

function isLikelyImageModel(id: string): boolean {
  const lower = id.toLowerCase();
  return lower.includes("-vl") ||
    lower.includes("vision") ||
    lower.includes("multimodal") ||
    lower.includes("gemma-3") ||
    lower.includes("gemma-4") ||
    lower.includes("llama-4") ||
    lower.includes("qwen3.6");
}

function contextWindowForModel(id: string): number {
  const lower = id.toLowerCase();
  if (lower.includes("gemma-4") || lower.includes("qwen3.6")) {
    return 262144;
  }
  if (lower.includes("qwen3-8b") || lower.includes("qwen3-14b")) {
    return 40960;
  }
  return 131072;
}

function isReasoningModel(id: string): boolean {
  return /r1|reason|thinking|reasoner|qwq|qwen/i.test(id);
}

function object(parent: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = parent[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  const created: Record<string, unknown> = {};
  parent[key] = created;
  return created;
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}
