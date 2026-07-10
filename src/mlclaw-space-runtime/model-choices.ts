export type ModelPricing = {
  input?: number;
  output?: number;
};

export type ModelChoice = {
  key: string;
  modelId: string;
  provider: string;
  openclawModel: string;
  label: string;
  note?: string;
  contextLength?: number;
  pricing?: ModelPricing;
  supportsTools?: boolean;
  supportsStructuredOutput?: boolean;
  firstTokenLatencyMs?: number;
  throughput?: number;
  status?: string;
  inputModalities?: string[];
  outputModalities?: string[];
  preset?: boolean;
};

export const DEFAULT_ROUTER_PROVIDER = "deepinfra";
export const DEFAULT_ROUTER_MODEL_ID = "google/gemma-4-26B-A4B-it";
export const DEFAULT_MODEL = formatOpenClawModelRef(DEFAULT_ROUTER_MODEL_ID, DEFAULT_ROUTER_PROVIDER);

export const PRESET_MODEL_CHOICES: ModelChoice[] = [
  freezeChoice({
    modelId: "google/gemma-4-26B-A4B-it",
    provider: "deepinfra",
    label: "Gemma 4 26B A4B",
    note: "Default quality target on DeepInfra",
    contextLength: 262144,
    pricing: { input: 0.07, output: 0.34 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 414.2,
    throughput: 34.79003450519141,
    status: "live",
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "Qwen/Qwen3.6-35B-A3B",
    provider: "deepinfra",
    label: "Qwen 3.6 35B A3B",
    note: "Strong Qwen 3.6 preset on DeepInfra",
    contextLength: 262144,
    pricing: { input: 0.15, output: 0.95 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 401,
    throughput: 43.13170843671405,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "Qwen/Qwen3.6-27B",
    provider: "deepinfra",
    label: "Qwen 3.6 27B",
    note: "Live Qwen 3.6 preset on DeepInfra",
    contextLength: 262144,
    pricing: { input: 0.32, output: 3.2 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 347.8,
    throughput: 39.47002845464158,
    status: "live",
    inputModalities: ["text", "image"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "zai-org/GLM-5.2",
    provider: "deepinfra",
    label: "GLM 5.2",
    note: "Long-context GLM preset on DeepInfra",
    contextLength: 1048576,
    pricing: { input: 0.93, output: 3 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 467.5,
    throughput: 16.52283992136833,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "moonshotai/Kimi-K2.7-Code",
    provider: "deepinfra",
    label: "Kimi K2.7 Code",
    note: "Kimi K2.7 coding preset on DeepInfra",
    contextLength: 262144,
    pricing: { input: 0.74, output: 3.5 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 692,
    throughput: 29.26330731892916,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "openai/gpt-oss-120b",
    provider: "deepinfra",
    label: "GPT-OSS 120B",
    note: "Large GPT-OSS preset on DeepInfra",
    contextLength: 131072,
    pricing: { input: 0.037, output: 0.17 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 362.2,
    throughput: 32.98392643597656,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "openai/gpt-oss-20b",
    provider: "deepinfra",
    label: "GPT-OSS 20B",
    note: "Lower-cost GPT-OSS preset on DeepInfra",
    contextLength: 131072,
    pricing: { input: 0.03, output: 0.14 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 255,
    throughput: 115.64765388606148,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "deepseek-ai/DeepSeek-V4-Flash",
    provider: "deepinfra",
    label: "DeepSeek V4 Flash",
    note: "Lower-cost DeepSeek V4 preset on DeepInfra",
    contextLength: 1048576,
    pricing: { input: 0.09, output: 0.18 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 719.8,
    throughput: 24.5757632831937,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "deepseek-ai/DeepSeek-V4-Pro",
    provider: "deepinfra",
    label: "DeepSeek V4 Pro",
    note: "Higher-quality DeepSeek V4 preset on DeepInfra",
    contextLength: 1048576,
    pricing: { input: 1.3, output: 2.6 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 489.2,
    throughput: 37.30647476533069,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "MiniMaxAI/MiniMax-M3",
    provider: "together",
    label: "MiniMax M3",
    note: "Long-context MiniMax preset on Together",
    contextLength: 524288,
    pricing: { input: 0.3, output: 1.2 },
    supportsTools: true,
    supportsStructuredOutput: true,
    firstTokenLatencyMs: 505.6,
    throughput: 59.79726580207129,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "zai-org/GLM-5.2",
    provider: "fireworks-ai",
    label: "GLM 5.2",
    note: "Long-context GLM alternative on Fireworks",
    contextLength: 1048576,
    pricing: { input: 1.4, output: 4.4 },
    supportsTools: true,
    supportsStructuredOutput: false,
    firstTokenLatencyMs: 931,
    throughput: 44.001300948170254,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "moonshotai/Kimi-K2.7-Code",
    provider: "fireworks-ai",
    label: "Kimi K2.7 Code",
    note: "Kimi K2.7 coding alternative on Fireworks",
    contextLength: 262144,
    pricing: { input: 0.95, output: 4 },
    supportsTools: true,
    supportsStructuredOutput: false,
    firstTokenLatencyMs: 598.8,
    throughput: 139.36660684183386,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "openai/gpt-oss-120b",
    provider: "fireworks-ai",
    label: "GPT-OSS 120B",
    note: "Large GPT-OSS alternative on Fireworks",
    contextLength: 131072,
    pricing: { input: 0.15, output: 0.6 },
    supportsTools: true,
    supportsStructuredOutput: false,
    firstTokenLatencyMs: 436.8,
    throughput: 150.7430218155076,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "openai/gpt-oss-20b",
    provider: "fireworks-ai",
    label: "GPT-OSS 20B",
    note: "Lower-cost GPT-OSS alternative on Fireworks",
    contextLength: 131072,
    pricing: { input: 0.07, output: 0.3 },
    supportsTools: true,
    supportsStructuredOutput: false,
    firstTokenLatencyMs: 576.4,
    throughput: 48.80341799488286,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "deepseek-ai/DeepSeek-V4-Flash",
    provider: "fireworks-ai",
    label: "DeepSeek V4 Flash",
    note: "Lower-cost DeepSeek V4 alternative on Fireworks",
    contextLength: 1048576,
    pricing: { input: 0.14, output: 0.28 },
    supportsTools: true,
    supportsStructuredOutput: false,
    firstTokenLatencyMs: 556.2,
    throughput: 112.3238326192391,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "deepseek-ai/DeepSeek-V4-Pro",
    provider: "fireworks-ai",
    label: "DeepSeek V4 Pro",
    note: "Higher-quality DeepSeek V4 alternative on Fireworks",
    contextLength: 1048576,
    pricing: { input: 1.74, output: 3.48 },
    supportsTools: true,
    supportsStructuredOutput: false,
    firstTokenLatencyMs: 787.2,
    throughput: 59.92780906440809,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
  freezeChoice({
    modelId: "MiniMaxAI/MiniMax-M3",
    provider: "fireworks-ai",
    label: "MiniMax M3",
    note: "Long-context MiniMax alternative on Fireworks",
    contextLength: 512000,
    pricing: { input: 0.3, output: 1.2 },
    supportsTools: true,
    supportsStructuredOutput: false,
    firstTokenLatencyMs: 756,
    throughput: 131.4435735979844,
    status: "live",
    inputModalities: ["text"],
    outputModalities: ["text"],
    preset: true,
  }),
] as const;

export function parseModelChoicesEnv(value: string | undefined, activeModel: string): ModelChoice[] {
  const parsed = parseJsonArray(value);
  const choices = parsed
    ? parsed.flatMap((item) => {
        const choice = normalizeModelChoice(item);
        return choice ? [choice] : [];
      })
    : PRESET_MODEL_CHOICES;
  return ensureActiveModelChoice(dedupeModelChoices(choices), activeModel);
}

export function normalizeModelChoice(value: unknown): ModelChoice | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const item = value as Record<string, unknown>;
  const parsed = parseOpenClawModelRef(stringValue(item.openclawModel));
  const modelId = normalizeModelId(stringValue(item.modelId) ?? parsed?.modelId);
  const provider = normalizeProvider(stringValue(item.provider) ?? parsed?.provider);
  if (!modelId || !provider) {
    return undefined;
  }
  return freezeChoice({
    modelId,
    provider,
    label: cleanLabel(stringValue(item.label)) ?? displayNameFromModelId(modelId),
    ...optional("note", cleanNote(stringValue(item.note))),
    ...optional("contextLength", positiveInteger(item.contextLength)),
    ...optional("pricing", normalizePricing(item.pricing)),
    ...optional("supportsTools", optionalBoolean(item.supportsTools)),
    ...optional("supportsStructuredOutput", optionalBoolean(item.supportsStructuredOutput)),
    ...optional("firstTokenLatencyMs", positiveNumber(item.firstTokenLatencyMs)),
    ...optional("throughput", positiveNumber(item.throughput)),
    ...optional("status", cleanStatus(stringValue(item.status))),
    ...optional("inputModalities", normalizeModalities(item.inputModalities)),
    ...optional("outputModalities", normalizeModalities(item.outputModalities)),
    ...(optionalBoolean(item.preset) === true ? { preset: true } : {}),
  });
}

export function normalizeModelChoices(value: unknown, activeModel: string): ModelChoice[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const choices = value.flatMap((item) => {
    const choice = normalizeModelChoice(item);
    return choice ? [choice] : [];
  });
  if (choices.length === 0 || choices.length > 80) {
    return undefined;
  }
  return ensureActiveModelChoice(dedupeModelChoices(choices), activeModel);
}

export function serializeModelChoices(choices: readonly ModelChoice[]): string {
  return JSON.stringify(choices.map(serializableChoice));
}

export function ensureActiveModelChoice(
  choices: readonly ModelChoice[],
  activeModel: string,
): ModelChoice[] {
  const parsed = parseOpenClawModelRef(activeModel);
  if (!parsed) {
    return [...choices];
  }
  const active = freezeChoice({
    ...PRESET_MODEL_CHOICES.find(
      (choice) => choice.modelId === parsed.modelId && choice.provider === parsed.provider,
    ),
    modelId: parsed.modelId,
    provider: parsed.provider,
    label: displayNameFromModelId(parsed.modelId),
  });
  return dedupeModelChoices([active, ...choices]);
}

export function dedupeModelChoices(choices: readonly ModelChoice[]): ModelChoice[] {
  const seen = new Set<string>();
  const deduped: ModelChoice[] = [];
  for (const choice of choices) {
    if (seen.has(choice.key)) {
      continue;
    }
    seen.add(choice.key);
    deduped.push(choice);
  }
  return deduped;
}

export function formatOpenClawModelRef(modelId: string, provider: string): string {
  return `huggingface/${modelId}:${provider}`;
}

export function parseOpenClawModelRef(value: string | undefined): { modelId: string; provider: string } | undefined {
  const normalized = normalizeModelRef(value);
  if (!normalized?.startsWith("huggingface/")) {
    return undefined;
  }
  const rest = normalized.slice("huggingface/".length);
  const split = rest.lastIndexOf(":");
  const modelId = normalizeModelId(split >= 0 ? rest.slice(0, split) : rest);
  const provider = normalizeProvider(split >= 0 ? rest.slice(split + 1) : DEFAULT_ROUTER_PROVIDER);
  return modelId && provider ? { modelId, provider } : undefined;
}

export function normalizeModelRef(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 260 || /[\r\n\t]/.test(trimmed) || /\s/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function choiceKey(modelId: string, provider: string): string {
  return `${provider}::${modelId}`;
}

export function displayNameFromModelId(id: string): string {
  const base = id.split("/").pop() || id;
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function freezeChoice(params: Omit<ModelChoice, "key" | "openclawModel">): ModelChoice {
  const modelId = normalizeModelId(params.modelId) ?? params.modelId;
  const provider = normalizeProvider(params.provider) ?? params.provider;
  return {
    ...params,
    modelId,
    provider,
    key: choiceKey(modelId, provider),
    openclawModel: formatOpenClawModelRef(modelId, provider),
  };
}

function serializableChoice(choice: ModelChoice): ModelChoice {
  return {
    key: choice.key,
    modelId: choice.modelId,
    provider: choice.provider,
    openclawModel: choice.openclawModel,
    label: choice.label,
    ...(choice.note ? { note: choice.note } : {}),
    ...(choice.contextLength ? { contextLength: choice.contextLength } : {}),
    ...(choice.pricing ? { pricing: choice.pricing } : {}),
    ...(choice.supportsTools !== undefined ? { supportsTools: choice.supportsTools } : {}),
    ...(choice.supportsStructuredOutput !== undefined
      ? { supportsStructuredOutput: choice.supportsStructuredOutput }
      : {}),
    ...(choice.firstTokenLatencyMs ? { firstTokenLatencyMs: choice.firstTokenLatencyMs } : {}),
    ...(choice.throughput ? { throughput: choice.throughput } : {}),
    ...(choice.status ? { status: choice.status } : {}),
    ...(choice.inputModalities ? { inputModalities: choice.inputModalities } : {}),
    ...(choice.outputModalities ? { outputModalities: choice.outputModalities } : {}),
    ...(choice.preset ? { preset: true } : {}),
  };
}

function normalizeModelId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 220 || /[\r\n\t:]/.test(trimmed) || /\s/.test(trimmed) || !trimmed.includes("/")) {
    return undefined;
  }
  return trimmed;
}

function normalizeProvider(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function normalizePricing(value: unknown): ModelPricing | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const input = positiveNumber(raw.input);
  const output = positiveNumber(raw.output);
  if (input === undefined && output === undefined) {
    return undefined;
  }
  return {
    ...(input !== undefined ? { input } : {}),
    ...(output !== undefined ? { output } : {}),
  };
}

function normalizeModalities(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const modalities = [...new Set(value.flatMap((item) => {
    const normalized = typeof item === "string" ? item.trim().toLowerCase() : "";
    return /^[a-z][a-z0-9_-]{0,31}$/.test(normalized) ? [normalized] : [];
  }))];
  return modalities.length > 0 ? modalities : undefined;
}

function parseJsonArray(value: string | undefined): unknown[] | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function cleanLabel(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 80 ? trimmed : undefined;
}

function cleanNote(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 160 ? trimmed : undefined;
}

function cleanStatus(value: string | undefined): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && /^[a-z][a-z0-9_-]{0,31}$/.test(trimmed) ? trimmed : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function optional<K extends string, T>(key: K, value: T | undefined): Record<K, T> | {} {
  return value === undefined ? {} : { [key]: value } as Record<K, T>;
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = positiveNumber(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
