import fs from "node:fs";

const [configPath] = process.argv.slice(2);

if (!configPath) {
  console.error("Usage: configure-huggingface-model.mjs <config-path>");
  process.exit(2);
}

const modelRef = (process.env.OPENCLAW_MODEL || "").trim();
const prefix = "huggingface/";

if (!modelRef.startsWith(prefix)) {
  process.exit(0);
}

const providerModelId = modelRef.slice(prefix.length).trim();
if (!providerModelId) {
  process.exit(0);
}

function displayNameFromModelId(id) {
  const withoutPolicy = id.replace(/:(cheapest|fastest)$/i, "");
  const base = withoutPolicy.split("/").pop() || withoutPolicy;
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function isLikelyImageModel(id) {
  const lower = id.toLowerCase();
  return (
    lower.includes("-vl") ||
    lower.includes("vision") ||
    lower.includes("multimodal") ||
    lower.includes("gemma-3") ||
    lower.includes("gemma-4") ||
    lower.includes("llama-4")
  );
}

function contextWindowForModel(id) {
  const lower = id.toLowerCase();
  if (lower.includes("gemma-4") || lower.includes("qwen3.6")) return 262144;
  if (lower.includes("qwen3-8b") || lower.includes("qwen3-14b")) return 40960;
  return 131072;
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
config.models ||= {};
config.models.providers ||= {};
config.models.providers.huggingface ||= {};

const provider = config.models.providers.huggingface;
provider.baseUrl ||= "https://router.huggingface.co/v1";
provider.api ||= "openai-completions";
provider.models = Array.isArray(provider.models) ? provider.models : [];

const defaultEntry = {
  id: providerModelId,
  name: displayNameFromModelId(providerModelId),
  input: isLikelyImageModel(providerModelId) ? ["text", "image"] : ["text"],
  contextWindow: contextWindowForModel(providerModelId),
  maxTokens: 8192,
  reasoning: /r1|reason|thinking|reasoner|qwq/i.test(providerModelId),
  cost: {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
  },
  api: "openai-completions",
};

const existingIndex = provider.models.findIndex(
  (entry) => entry && typeof entry === "object" && entry.id === providerModelId,
);

if (existingIndex >= 0) {
  provider.models[existingIndex] = {
    ...defaultEntry,
    ...provider.models[existingIndex],
  };
} else {
  provider.models.push(defaultEntry);
}

fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
