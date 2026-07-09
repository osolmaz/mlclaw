#!/usr/bin/env node
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/mlclaw-space-runtime/cli.ts
import process2 from "node:process";

// src/mlclaw-space-runtime/config.ts
import { randomBytes } from "node:crypto";

// src/mlclaw-space-runtime/branding.ts
var DEFAULT_BRAND_NAME = "ML Claw";
var DEFAULT_THEME_COLOR = "#111827";
var DEFAULT_LOGO_ASSET = "mlclaw.svg";
var DEFAULT_HUGGING_FACE_ASSET = "hf-logo.svg";
var DEFAULT_ASSISTANT_AVATAR_ASSET = "assistant-avatar.svg";
function resolveBranding(env, agentName) {
  const defaultName = defaultBrandName(agentName);
  const name = cleanText(env.MLCLAW_BRAND_NAME) ?? defaultName;
  return {
    name,
    shortName: cleanText(env.MLCLAW_BRAND_SHORT_NAME) ?? name,
    themeColor: normalizeThemeColor(env.MLCLAW_BRAND_THEME_COLOR) ?? DEFAULT_THEME_COLOR,
    logoAsset: normalizeAssetRef(env.MLCLAW_BRAND_LOGO, DEFAULT_LOGO_ASSET),
    faviconSvgAsset: normalizeAssetRef(
      env.MLCLAW_BRAND_FAVICON_SVG ?? env.MLCLAW_BRAND_FAVICON,
      DEFAULT_HUGGING_FACE_ASSET
    ),
    favicon32Asset: normalizeAssetRef(
      env.MLCLAW_BRAND_FAVICON_32 ?? env.MLCLAW_BRAND_FAVICON_PNG ?? env.MLCLAW_BRAND_FAVICON,
      DEFAULT_HUGGING_FACE_ASSET
    ),
    faviconIcoAsset: normalizeAssetRef(
      env.MLCLAW_BRAND_FAVICON_ICO ?? env.MLCLAW_BRAND_FAVICON,
      DEFAULT_HUGGING_FACE_ASSET
    ),
    appleTouchIconAsset: normalizeAssetRef(
      env.MLCLAW_BRAND_APPLE_TOUCH_ICON ?? env.MLCLAW_BRAND_ASSISTANT_AVATAR,
      DEFAULT_ASSISTANT_AVATAR_ASSET
    )
  };
}
function publicBranding(branding) {
  return {
    name: branding.name,
    shortName: branding.shortName,
    themeColor: branding.themeColor,
    logoUrl: "/assets/brand/logo"
  };
}
function brandingManifest(branding) {
  return `${JSON.stringify({
    name: branding.name,
    short_name: branding.shortName,
    description: `${branding.name} browser gateway`,
    start_url: "./",
    display: "standalone",
    theme_color: branding.themeColor,
    background_color: branding.themeColor,
    icons: [
      {
        src: "./favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "./favicon-32.png",
        sizes: "32x32",
        type: "image/png"
      },
      {
        src: "./apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  }, null, 2)}
`;
}
function defaultBrandName(agentName) {
  const cleaned = cleanText(agentName);
  if (!cleaned) {
    return DEFAULT_BRAND_NAME;
  }
  if (/^mlclaw$/i.test(cleaned)) {
    return DEFAULT_BRAND_NAME;
  }
  return cleaned.split(/[-_\s]+/).filter(Boolean).map((word) => /^mlclaw$/i.test(word) ? DEFAULT_BRAND_NAME : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join(" ");
}
function cleanText(value) {
  const cleaned = value?.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, 80) : void 0;
}
function normalizeThemeColor(value) {
  const cleaned = value?.trim();
  if (!cleaned) {
    return void 0;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    return `#${cleaned.slice(1).split("").map((char) => `${char}${char}`).join("")}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
    return cleaned.toLowerCase();
  }
  throw new Error("MLCLAW_BRAND_THEME_COLOR must be a #rgb or #rrggbb color");
}
function normalizeAssetRef(value, fallback) {
  const raw2 = value?.trim() || fallback;
  const withoutAssetsPrefix = raw2.replace(/^\/?assets\/+/, "");
  const normalized = withoutAssetsPrefix.split("/").filter(Boolean).join("/");
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../") || normalized.startsWith("/")) {
    throw new Error(`brand asset path must stay inside the Space assets directory: ${raw2}`);
  }
  return normalized;
}

// src/mlclaw-space-runtime/model-choices.ts
var DEFAULT_ROUTER_PROVIDER = "deepinfra";
var DEFAULT_ROUTER_MODEL_ID = "google/gemma-4-26B-A4B-it";
var DEFAULT_MODEL = formatOpenClawModelRef(DEFAULT_ROUTER_MODEL_ID, DEFAULT_ROUTER_PROVIDER);
var PRESET_MODEL_CHOICES = [
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
    preset: true
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
    preset: true
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
    preset: true
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
    preset: true
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
    preset: true
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
    preset: true
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
    preset: true
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
    preset: true
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
    preset: true
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
    preset: true
  })
];
function parseModelChoicesEnv(value, activeModel) {
  const parsed = parseJsonArray(value);
  const choices = parsed ? parsed.flatMap((item) => {
    const choice = normalizeModelChoice(item);
    return choice ? [choice] : [];
  }) : PRESET_MODEL_CHOICES;
  return ensureActiveModelChoice(dedupeModelChoices(choices), activeModel);
}
function normalizeModelChoice(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  const item = value;
  const parsed = parseOpenClawModelRef(stringValue(item.openclawModel));
  const modelId = normalizeModelId(stringValue(item.modelId) ?? parsed?.modelId);
  const provider = normalizeProvider(stringValue(item.provider) ?? parsed?.provider);
  if (!modelId || !provider) {
    return void 0;
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
    ...optionalBoolean(item.preset) === true ? { preset: true } : {}
  });
}
function normalizeModelChoices(value, activeModel) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const choices = value.flatMap((item) => {
    const choice = normalizeModelChoice(item);
    return choice ? [choice] : [];
  });
  if (choices.length === 0 || choices.length > 80) {
    return void 0;
  }
  return ensureActiveModelChoice(dedupeModelChoices(choices), activeModel);
}
function serializeModelChoices(choices) {
  return JSON.stringify(choices.map(serializableChoice));
}
function ensureActiveModelChoice(choices, activeModel) {
  const parsed = parseOpenClawModelRef(activeModel);
  if (!parsed) {
    return [...choices];
  }
  const active = freezeChoice({
    ...PRESET_MODEL_CHOICES.find(
      (choice) => choice.modelId === parsed.modelId && choice.provider === parsed.provider
    ),
    modelId: parsed.modelId,
    provider: parsed.provider,
    label: displayNameFromModelId(parsed.modelId)
  });
  return dedupeModelChoices([active, ...choices]);
}
function dedupeModelChoices(choices) {
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const choice of choices) {
    if (seen.has(choice.key)) {
      continue;
    }
    seen.add(choice.key);
    deduped.push(choice);
  }
  return deduped;
}
function formatOpenClawModelRef(modelId, provider) {
  return `huggingface/${modelId}:${provider}`;
}
function parseOpenClawModelRef(value) {
  const normalized = normalizeModelRef(value);
  if (!normalized?.startsWith("huggingface/")) {
    return void 0;
  }
  const rest = normalized.slice("huggingface/".length);
  const split = rest.lastIndexOf(":");
  const modelId = normalizeModelId(split >= 0 ? rest.slice(0, split) : rest);
  const provider = normalizeProvider(split >= 0 ? rest.slice(split + 1) : DEFAULT_ROUTER_PROVIDER);
  return modelId && provider ? { modelId, provider } : void 0;
}
function normalizeModelRef(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 260 || /[\r\n\t]/.test(trimmed) || /\s/.test(trimmed)) {
    return void 0;
  }
  return trimmed;
}
function choiceKey(modelId, provider) {
  return `${provider}::${modelId}`;
}
function displayNameFromModelId(id) {
  const base = id.split("/").pop() || id;
  return base.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
function freezeChoice(params) {
  const modelId = normalizeModelId(params.modelId) ?? params.modelId;
  const provider = normalizeProvider(params.provider) ?? params.provider;
  return {
    ...params,
    modelId,
    provider,
    key: choiceKey(modelId, provider),
    openclawModel: formatOpenClawModelRef(modelId, provider)
  };
}
function serializableChoice(choice) {
  return {
    key: choice.key,
    modelId: choice.modelId,
    provider: choice.provider,
    openclawModel: choice.openclawModel,
    label: choice.label,
    ...choice.note ? { note: choice.note } : {},
    ...choice.contextLength ? { contextLength: choice.contextLength } : {},
    ...choice.pricing ? { pricing: choice.pricing } : {},
    ...choice.supportsTools !== void 0 ? { supportsTools: choice.supportsTools } : {},
    ...choice.supportsStructuredOutput !== void 0 ? { supportsStructuredOutput: choice.supportsStructuredOutput } : {},
    ...choice.firstTokenLatencyMs ? { firstTokenLatencyMs: choice.firstTokenLatencyMs } : {},
    ...choice.throughput ? { throughput: choice.throughput } : {},
    ...choice.status ? { status: choice.status } : {},
    ...choice.inputModalities ? { inputModalities: choice.inputModalities } : {},
    ...choice.outputModalities ? { outputModalities: choice.outputModalities } : {},
    ...choice.preset ? { preset: true } : {}
  };
}
function normalizeModelId(value) {
  if (!value) {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 220 || /[\r\n\t:]/.test(trimmed) || /\s/.test(trimmed) || !trimmed.includes("/")) {
    return void 0;
  }
  return trimmed;
}
function normalizeProvider(value) {
  if (!value) {
    return void 0;
  }
  const trimmed = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(trimmed)) {
    return void 0;
  }
  return trimmed;
}
function normalizePricing(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return void 0;
  }
  const raw2 = value;
  const input = positiveNumber(raw2.input);
  const output = positiveNumber(raw2.output);
  if (input === void 0 && output === void 0) {
    return void 0;
  }
  return {
    ...input !== void 0 ? { input } : {},
    ...output !== void 0 ? { output } : {}
  };
}
function normalizeModalities(value) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const modalities = [...new Set(value.flatMap((item) => {
    const normalized = typeof item === "string" ? item.trim().toLowerCase() : "";
    return /^[a-z][a-z0-9_-]{0,31}$/.test(normalized) ? [normalized] : [];
  }))];
  return modalities.length > 0 ? modalities : void 0;
}
function parseJsonArray(value) {
  if (!value?.trim()) {
    return void 0;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
function stringValue(value) {
  return typeof value === "string" ? value : void 0;
}
function cleanLabel(value) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 80 ? trimmed : void 0;
}
function cleanNote(value) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 160 ? trimmed : void 0;
}
function cleanStatus(value) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && /^[a-z][a-z0-9_-]{0,31}$/.test(trimmed) ? trimmed : void 0;
}
function optionalBoolean(value) {
  return typeof value === "boolean" ? value : void 0;
}
function optional(key, value) {
  return value === void 0 ? {} : { [key]: value };
}
function positiveInteger(value) {
  const parsed = positiveNumber(value);
  return parsed === void 0 ? void 0 : Math.trunc(parsed);
}
function positiveNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}

// src/mlclaw-space-runtime/config.ts
function loadConfig(env = process.env) {
  const port = integer(env.PORT ?? env.MLCLAW_SPACE_PORT, 7860);
  const openclawPort = integer(env.MLCLAW_OPENCLAW_PORT ?? env.OPENCLAW_GATEWAY_PORT, 7861);
  const spaceId = trim(env.SPACE_ID);
  const canonicalSpaceId = trim(env.MLCLAW_CANONICAL_SPACE_ID) ?? "osolmaz/mlclaw";
  const canonicalCreatorUserId = trim(env.MLCLAW_CANONICAL_CREATOR_USER_ID);
  const spaceCreatorUserId = trim(env.SPACE_CREATOR_USER_ID);
  const mode = resolveMode({
    env,
    spaceId,
    canonicalSpaceId,
    canonicalCreatorUserId,
    spaceCreatorUserId
  });
  const owner = ownerFromSpaceId(spaceId);
  const configuredAllowedUsers = splitUsers(env.MLCLAW_ALLOWED_USERS ?? env.ALLOWED_USERS);
  const configuredAdmins = splitUsers(env.MLCLAW_ADMINS);
  const resolvedAdmins = uniqueUsers(configuredAdmins.length > 0 ? configuredAdmins : owner ? [owner] : configuredAllowedUsers.slice(0, 1));
  const allowedUsers = uniqueUsers([
    ...configuredAllowedUsers,
    ...resolvedAdmins,
    ...owner ? [owner] : []
  ]);
  const publicUrl = publicUrlFromEnv(env, port);
  const sessionSecret = trim(env.MLCLAW_SESSION_SECRET ?? env.SESSION_SECRET) ?? randomBytes(48).toString("base64url");
  const openclawCommand = trim(env.MLCLAW_OPENCLAW_COMMAND) ?? "openclaw";
  const openclawArgs = splitArgs(env.MLCLAW_OPENCLAW_ARGS) ?? ["gateway"];
  const model = trim(env.OPENCLAW_MODEL) ?? DEFAULT_MODEL;
  const agentName = trim(env.OPENCLAW_AGENT_NAME);
  return {
    port,
    openclawPort,
    openclawHost: trim(env.MLCLAW_OPENCLAW_HOST) ?? "127.0.0.1",
    publicUrl,
    providerUrl: trim(env.OPENID_PROVIDER_URL) ?? "https://huggingface.co",
    oauthClientId: trim(env.OAUTH_CLIENT_ID),
    oauthClientSecret: trim(env.OAUTH_CLIENT_SECRET),
    sessionSecret,
    sessionSecretGenerated: !trim(env.MLCLAW_SESSION_SECRET ?? env.SESSION_SECRET),
    cookieSecure: env.MLCLAW_COOKIE_SECURE === "0" ? false : !publicUrl.startsWith("http://"),
    spaceId,
    canonicalSpaceId,
    canonicalCreatorUserId,
    spaceCreatorUserId,
    allowedUsers,
    adminUsers: resolvedAdmins,
    allowAnySignedIn: env.MLCLAW_ALLOW_ANY_SIGNED_IN === "1" || env.MLCLAW_ALLOW_ANY_SIGNED_IN === "true",
    mode,
    hfToken: trim(env.HF_TOKEN ?? env.HUGGINGFACE_HUB_TOKEN),
    hubUrl: trim(env.HF_ENDPOINT) ?? "https://huggingface.co",
    openaiCredentialFile: trim(env.MLCLAW_OPENAI_CREDENTIAL_FILE) ?? "/tmp/mlclaw-secrets/openai.env",
    openclawConfigPath: trim(env.OPENCLAW_CONFIG_PATH) ?? "/tmp/openclaw-live/.openclaw/openclaw.json",
    openclawCommand,
    openclawArgs,
    agentName,
    model,
    modelChoices: parseModelChoicesEnv(env.MLCLAW_MODEL_CHOICES, model),
    routerModelsUrl: trim(env.MLCLAW_ROUTER_MODELS_URL) ?? "https://router.huggingface.co/v1/models",
    stateBucket: trim(env.OPENCLAW_HF_STATE_BUCKET),
    statePrefix: trim(env.OPENCLAW_HF_STATE_PREFIX),
    gatewayLocation: trim(env.MLCLAW_GATEWAY_LOCATION),
    runtimeImage: trim(env.MLCLAW_RUNTIME_IMAGE),
    runtimeId: trim(env.MLCLAW_RUNTIME_ID),
    templateRev: trim(env.MLCLAW_TEMPLATE_REV),
    assetsDir: trim(env.MLCLAW_ASSETS_DIR) ?? "/app/assets",
    branding: resolveBranding(env, agentName)
  };
}
function resolveMode(params) {
  if (params.env.MLCLAW_FORCE_TEMPLATE === "1") {
    return "template";
  }
  if (params.env.MLCLAW_FORCE_APP === "1") {
    return "app";
  }
  const isCanonicalSpace = Boolean(params.spaceId && params.spaceId === params.canonicalSpaceId);
  if (!isCanonicalSpace) {
    return "app";
  }
  if (!params.canonicalCreatorUserId || !params.spaceCreatorUserId) {
    return "template";
  }
  return params.canonicalCreatorUserId === params.spaceCreatorUserId ? "template" : "app";
}
function publicUrlFromEnv(env, port) {
  const host = trim(env.SPACE_HOST);
  if (host) {
    return host.startsWith("http") ? host.replace(/\/+$/, "") : `https://${host.replace(/\/+$/, "")}`;
  }
  return `http://127.0.0.1:${port}`;
}
function ownerFromSpaceId(spaceId) {
  const owner = spaceId?.split("/")[0]?.trim();
  return owner || void 0;
}
function integer(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function splitUsers(value) {
  return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}
function uniqueUsers(users) {
  return [...new Set(users)];
}
function splitArgs(value) {
  const trimmed = trim(value);
  return trimmed ? trimmed.split(/\s+/).filter(Boolean) : void 0;
}
function trim(value) {
  const trimmed = value?.trim();
  return trimmed || void 0;
}

// src/mlclaw-space-runtime/server.ts
import { spawn } from "node:child_process";
import http2 from "node:http";
import { Readable } from "node:stream";

// src/mlclaw-space-runtime/app.ts
import fs3 from "node:fs/promises";
import path3 from "node:path";

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType2) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType2.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
};

// node_modules/hono/dist/utils/body.js
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType2 = headers.get("Content-Type");
  const mediaType = contentType2?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path4) => {
  const paths = path4.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path: path4 } = extractGroupsFromPath(routePath);
  const paths = splitPath(path4);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path4) => {
  const groups = [];
  path4 = path4.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path: path4 };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path4 = url.slice(start, end);
      return tryDecodeURI(path4.includes("%25") ? path4.replace(/%25/g, "%2525") : path4);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path4) => {
  if (path4.charCodeAt(path4.length - 1) !== 63 || !path4.includes(":")) {
    return null;
  }
  const segments = path4.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path4 = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path4;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType2, headers) => {
  return {
    "Content-Type": contentType2,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object2, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object2),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path4, ...handlers) => {
      for (const p of [path4].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path4, app) {
    const subApp = this.basePath(path4);
    app.routes.map((r) => {
      let handler;
      if (app.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path4) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path4);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path4, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path4);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path4, "*"), handler);
    return this;
  }
  #addRoute(method, path4, handler, baseRoutePath) {
    method = method.toUpperCase();
    path4 = mergePath(this._basePath, path4);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path: path4,
      method,
      handler
    };
    this.router.add(method, path4, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path4 = this.getPath(request, { env });
    const matchResult = this.router.match(method, path4);
    const c = new Context(request, {
      path: path4,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path4) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path22) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path22];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path22.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path4);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path4, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path4 = path4.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path4.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path4) {
  return wildcardRegExpCache[path4] ??= new RegExp(
    path4 === "*" ? "" : `^${path4.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path4, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path4] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path4, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path4) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path4) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path4)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path4, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path4 === "/*") {
      path4 = "*";
    }
    const paramCount = (path4.match(/\/:/g) || []).length;
    if (/\*$/.test(path4)) {
      const re = buildWildcardRegExp(path4);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path4] ||= findMiddleware(middleware[m], path4) || findMiddleware(middleware[METHOD_NAME_ALL], path4) || [];
        });
      } else {
        middleware[method][path4] ||= findMiddleware(middleware[method], path4) || findMiddleware(middleware[METHOD_NAME_ALL], path4) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path4) || [path4];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path22 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path22] ||= [
            ...findMiddleware(middleware[m], path22) || findMiddleware(middleware[METHOD_NAME_ALL], path22) || []
          ];
          routes[m][path22].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path4) => [path4, r[method][path4]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path4) => [path4, r[METHOD_NAME_ALL][path4]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path4, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path4, handler]);
  }
  match(method, path4) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path4);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = (children) => {
  for (const _ in children) {
    return true;
  }
  return false;
};
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path4, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path4);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path4) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path4);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path4[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path4.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path4, handler) {
    const results = checkOptionalParameter(path4);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path4, handler);
  }
  match(method, path4) {
    return this.#node.search(method, path4);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// src/mlclaw-space-runtime/csrf.ts
import { createHmac, randomBytes as randomBytes2, timingSafeEqual } from "node:crypto";
var CSRF_TTL_SECONDS = 60 * 60;
function createCsrfToken(params) {
  const now = params.now ?? Date.now();
  const body = Buffer.from(JSON.stringify({
    username: params.username,
    nonce: randomBytes2(24).toString("base64url"),
    exp: Math.floor(now / 1e3) + CSRF_TTL_SECONDS
  })).toString("base64url");
  return `${body}.${sign(body, params.sessionSecret)}`;
}
function verifyCsrfToken(params) {
  if (!params.token) {
    return false;
  }
  const [body, signature] = params.token.split(".");
  if (!body || !signature || !signatureMatches(signature, sign(body, params.sessionSecret))) {
    return false;
  }
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== "object") {
    return false;
  }
  const payload = parsed;
  const now = Math.floor((params.now ?? Date.now()) / 1e3);
  return payload.username === params.username && typeof payload.exp === "number" && payload.exp > now && typeof payload.nonce === "string" && payload.nonce.length > 0;
}
function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}
function signatureMatches(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// src/mlclaw-space-runtime/hub-settings.ts
function runtimeSettings(config2) {
  return {
    agentName: config2.agentName ?? null,
    model: config2.model,
    stateBucket: config2.stateBucket ?? null,
    statePrefix: config2.statePrefix ?? null,
    gatewayLocation: config2.gatewayLocation ?? null,
    runtimeImage: config2.runtimeImage ?? null,
    runtimeId: config2.runtimeId ?? null,
    templateRev: config2.templateRev ?? null,
    allowedUsers: config2.allowedUsers,
    adminUsers: config2.adminUsers,
    modelChoices: config2.modelChoices,
    presetModels: PRESET_MODEL_CHOICES,
    branding: publicBranding(config2.branding)
  };
}
function normalizeModel(value) {
  return normalizeModelRef(value);
}
async function setCurrentSpaceVariable(config2, key, value) {
  if (!config2.spaceId || !config2.hfToken) {
    throw new Error("Space mutation requires SPACE_ID and HF_TOKEN");
  }
  await hubRequest(config2, `/api/spaces/${config2.spaceId}/variables`, {
    method: "POST",
    body: JSON.stringify({ key, value }),
    headers: { "content-type": "application/json" }
  });
}
async function setCurrentSpaceSecret(config2, key, value) {
  if (!config2.spaceId || !config2.hfToken) {
    throw new Error("Space mutation requires SPACE_ID and HF_TOKEN");
  }
  await hubRequest(config2, `/api/spaces/${config2.spaceId}/secrets`, {
    method: "POST",
    body: JSON.stringify({ key, value }),
    headers: { "content-type": "application/json" }
  });
}
async function restartCurrentSpace(config2) {
  if (!config2.spaceId || !config2.hfToken) {
    return false;
  }
  await hubRequest(config2, `/api/spaces/${config2.spaceId}/restart`, {
    method: "POST",
    body: JSON.stringify({ factoryReboot: false }),
    headers: { "content-type": "application/json" }
  });
  return true;
}
async function hubRequest(config2, path4, init) {
  const response = await fetch(`${config2.hubUrl.replace(/\/+$/, "")}${path4}`, {
    ...init,
    headers: {
      authorization: `Bearer ${config2.hfToken}`,
      ...init.headers
    }
  });
  if (!response.ok) {
    throw new Error(`Hub request failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object2) => {
    const keys = [];
    for (const key in object2) {
      if (Object.prototype.hasOwnProperty.call(object2, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path4, errorMaps, issueData } = params;
  const fullPath = [...path4, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path4, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path4;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// src/mlclaw-space-runtime/oauth.ts
var tokenResponseSchema = external_exports.object({
  access_token: external_exports.string().min(1)
}).passthrough();
var userInfoSchema = external_exports.object({
  preferred_username: external_exports.string().min(1)
}).passthrough();
function authorizeUrl(settings, state) {
  const url = new URL(`${settings.providerUrl.replace(/\/+$/, "")}/oauth/authorize`);
  url.searchParams.set("client_id", settings.clientId);
  url.searchParams.set("redirect_uri", settings.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", state);
  return url.toString();
}
async function exchangeCodeForIdentity(settings, code) {
  const fetchImpl = settings.fetchImpl ?? fetch;
  const providerUrl = settings.providerUrl.replace(/\/+$/, "");
  const basic = Buffer.from(`${settings.clientId}:${settings.clientSecret}`).toString("base64");
  const tokenResponse = await fetchImpl(`${providerUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${basic}`
    },
    body: new URLSearchParams({
      client_id: settings.clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: settings.redirectUri
    })
  });
  if (!tokenResponse.ok) {
    return void 0;
  }
  const tokenBody = tokenResponseSchema.safeParse(await tokenResponse.json());
  if (!tokenBody.success) {
    return void 0;
  }
  const userResponse = await fetchImpl(`${providerUrl}/oauth/userinfo`, {
    headers: { authorization: `Bearer ${tokenBody.data.access_token}` }
  });
  if (!userResponse.ok) {
    return void 0;
  }
  const userBody = userInfoSchema.safeParse(await userResponse.json());
  if (!userBody.success) {
    return void 0;
  }
  return { username: userBody.data.preferred_username };
}

// src/mlclaw-space-runtime/openclaw-config.ts
import fs from "node:fs/promises";
import path from "node:path";
async function configureOpenClawGateway(config2) {
  const raw2 = await fs.readFile(config2.openclawConfigPath, "utf8");
  const openclawConfig = JSON.parse(raw2);
  const gateway = object(openclawConfig, "gateway");
  gateway.mode = "local";
  gateway.bind = "loopback";
  gateway.port = config2.openclawPort;
  gateway.auth = {
    mode: "trusted-proxy",
    trustedProxy: {
      userHeader: "x-forwarded-user",
      requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],
      allowLoopback: true
    }
  };
  gateway.trustedProxies = ["127.0.0.1", "::1"];
  gateway.controlUi = {
    ...typeof gateway.controlUi === "object" && gateway.controlUi ? gateway.controlUi : {},
    dangerouslyDisableDeviceAuth: true,
    allowedOrigins: [config2.publicUrl]
  };
  configureOpenClawModels(openclawConfig, config2);
  await fs.mkdir(path.dirname(config2.openclawConfigPath), { recursive: true });
  await fs.writeFile(config2.openclawConfigPath, `${JSON.stringify(openclawConfig, null, 2)}
`, { mode: 384 });
  await fs.chmod(config2.openclawConfigPath, 384);
}
function configureOpenClawModels(openclawConfig, config2) {
  const agents = object(openclawConfig, "agents");
  const defaults = object(agents, "defaults");
  const existingModel = defaults.model && typeof defaults.model === "object" && !Array.isArray(defaults.model) ? defaults.model : {};
  defaults.model = {
    ...existingModel,
    primary: config2.model
  };
  defaults.models = Object.fromEntries(
    config2.modelChoices.map((choice) => [
      choice.openclawModel,
      {
        alias: aliasForChoice(choice)
      }
    ])
  );
  const models = object(openclawConfig, "models");
  const providers = object(models, "providers");
  const huggingface = object(providers, "huggingface");
  huggingface.baseUrl = "https://router.huggingface.co/v1";
  huggingface.api = "openai-completions";
  huggingface.models = config2.modelChoices.map(modelDefinitionFromChoice);
}
function modelDefinitionFromChoice(choice) {
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
      cacheWrite: 0
    },
    api: "openai-completions",
    compat: {
      supportsTools: choice.supportsTools ?? true,
      supportsStrictMode: choice.supportsStructuredOutput ?? false
    }
  };
}
function providerModelIdFromChoice(choice) {
  const parsed = parseOpenClawModelRef(choice.openclawModel);
  return parsed ? `${parsed.modelId}:${parsed.provider}` : `${choice.modelId}:${choice.provider}`;
}
function inputModalitiesForChoice(choice) {
  if (choice.inputModalities?.length) {
    return choice.inputModalities.filter((item) => item === "text" || item === "image");
  }
  return isLikelyImageModel(choice.modelId) ? ["text", "image"] : ["text"];
}
function aliasForChoice(choice) {
  const base = displayNameFromModelId(choice.modelId).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "model";
  return `${base}-${choice.provider}`.slice(0, 64);
}
function isLikelyImageModel(id) {
  const lower = id.toLowerCase();
  return lower.includes("-vl") || lower.includes("vision") || lower.includes("multimodal") || lower.includes("gemma-3") || lower.includes("gemma-4") || lower.includes("llama-4") || lower.includes("qwen3.6");
}
function contextWindowForModel(id) {
  const lower = id.toLowerCase();
  if (lower.includes("gemma-4") || lower.includes("qwen3.6")) {
    return 262144;
  }
  if (lower.includes("qwen3-8b") || lower.includes("qwen3-14b")) {
    return 40960;
  }
  return 131072;
}
function isReasoningModel(id) {
  return /r1|reason|thinking|reasoner|qwq|qwen/i.test(id);
}
function object(parent, key) {
  const value = parent[key];
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  const created = {};
  parent[key] = created;
  return created;
}

// src/mlclaw-space-runtime/openai-credentials.ts
import fs2 from "node:fs/promises";
import path2 from "node:path";
function openAiConfigured(env = process.env) {
  return Boolean(env.OPENAI_API_KEY?.trim());
}
async function loadOpenAiCredentialFile(file) {
  try {
    const raw2 = await fs2.readFile(file, "utf8");
    const match2 = raw2.match(/(?:^|\n)OPENAI_API_KEY=([^\n]+)/);
    return match2?.[1]?.trim() || void 0;
  } catch {
    return void 0;
  }
}
async function writeEphemeralOpenAiCredential(file, apiKey) {
  await fs2.mkdir(path2.dirname(file), { recursive: true, mode: 448 });
  await fs2.writeFile(file, `OPENAI_API_KEY=${apiKey.trim()}
`, { encoding: "utf8", mode: 384 });
  await fs2.chmod(file, 384);
}
function validateOpenAiApiKey(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!/^sk-[A-Za-z0-9_\-]{20,}$/.test(trimmed)) {
    return void 0;
  }
  return trimmed;
}

// src/mlclaw-space-runtime/pages.ts
function templatePage(config2) {
  return page("ML Claw", `
    <main>
      <img src="/assets/mlclaw.svg" alt="ML Claw" class="logo">
      <h1>ML Claw</h1>
      <p>Run the local bootstrapper to create a Hugging Face hosted OpenClaw agent for ML workflows.</p>
      <p class="notice">Do not set this up by only clicking Duplicate. The bootstrapper creates the private Space, private Storage Bucket, OAuth settings, secrets, model configuration, and local manifest.</p>
      <h2>With Node.js</h2>
      <pre><code>npx mlclaw@latest bootstrap --name mlclaw</code></pre>
      <h2>macOS or Linux without Node.js</h2>
      <pre><code>bash &lt;(curl -fsSL https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.sh) --name mlclaw</code></pre>
      <h2>Windows PowerShell</h2>
      <pre><code>irm https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.ps1 | iex</code></pre>
      <ol>
        <li>Run one of the commands above on your own machine.</li>
        <li>Follow the prompts and choose an agent name.</li>
        <li>Open the Space that ML Claw creates and sign in with Hugging Face.</li>
      </ol>
      <p class="muted">Manual duplication is for development or advanced setup only.</p>
      <p class="muted">Source Space: ${escapeHtml(config2.spaceId ?? config2.canonicalSpaceId)}</p>
    </main>
  `);
}
function loginPage(config2, message, next = "/") {
  const oauthReady = Boolean(config2.oauthClientId && config2.oauthClientSecret);
  const loginPath = next === "/" ? "/oauth/login" : `/oauth/login?next=${encodeURIComponent(next)}`;
  const loginHref = new URL(loginPath, config2.publicUrl).toString();
  return page(`${config2.branding.name} Login`, `
    <main>
      <img src="/assets/hf-logo.svg" alt="Hugging Face" class="logo">
      <h1>${escapeHtml(config2.branding.name)}</h1>
      ${message ? `<p class="notice">${escapeHtml(message)}</p>` : ""}
      ${oauthReady ? `<a class="button" href="${escapeHtml(loginHref)}" target="_blank" rel="noopener">Sign in with Hugging Face</a>` : `<p class="notice">Hugging Face OAuth is not configured for this Space. Update the Space README metadata to include <code>hf_oauth: true</code>, then rebuild.</p>`}
    </main>
  `);
}
function unauthorizedPage(username) {
  return page("ML Claw Access", `
    <main>
      <h1>Access not allowed</h1>
      <p>The signed-in Hugging Face account <strong>${escapeHtml(username)}</strong> is not allowed to operate this Space.</p>
      <p class="muted">Set <code>MLCLAW_ALLOWED_USERS</code> to a comma-separated list of usernames, then restart the Space.</p>
      <a class="button secondary" href="/mlclaw/logout">Sign out</a>
    </main>
  `);
}
function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="manifest" href="/manifest.webmanifest">
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f7fb; color: #111827; }
    main { width: min(680px, calc(100vw - 40px)); padding: 32px 0; }
    .logo { width: 72px; height: 72px; display: block; margin-bottom: 20px; }
    h1 { font-size: 42px; line-height: 1.05; margin: 0 0 16px; letter-spacing: 0; }
    h2 { font-size: 16px; line-height: 1.35; margin: 22px 0 8px; letter-spacing: 0; }
    p, li { font-size: 17px; line-height: 1.55; }
    ol { padding-left: 22px; }
    pre { overflow-x: auto; margin: 0 0 10px; padding: 14px 16px; border-radius: 8px; background: #111827; color: #f9fafb; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.95em; }
    label { display: block; font-weight: 650; margin-bottom: 8px; }
    input { box-sizing: border-box; width: 100%; padding: 12px 14px; border: 1px solid #c7d2fe; border-radius: 8px; font-size: 16px; margin-bottom: 14px; background: white; color: #111827; }
    .button { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 16px; border-radius: 8px; background: #111827; color: white; text-decoration: none; border: 0; font-size: 16px; cursor: pointer; }
    .secondary { background: #374151; }
    .muted { color: #4b5563; }
    .notice { color: #92400e; }
    .ok { color: #047857; }
    @media (prefers-color-scheme: dark) {
      body { background: #0b1020; color: #f9fafb; }
      pre { background: #020617; }
      input { background: #111827; color: #f9fafb; border-color: #374151; }
      .button { background: #f9fafb; color: #111827; }
      .secondary { background: #9ca3af; color: #111827; }
      .muted { color: #cbd5e1; }
      .notice { color: #fbbf24; }
      .ok { color: #34d399; }
    }
  </style>
</head>
<body>${body}</body>
</html>`;
}
function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// src/mlclaw-space-runtime/router-models.ts
var DEFAULT_ROUTER_MODELS_URL = "https://router.huggingface.co/v1/models";
var CACHE_TTL_MS = 10 * 60 * 1e3;
var cache;
async function loadRouterModelChoices(params = {}) {
  const now = params.now ?? Date.now();
  if (!params.force && cache && cache.expiresAt > now) {
    return { ok: true, models: cache.models, fetchedAt: new Date(now).toISOString() };
  }
  try {
    const response = await (params.fetchImpl ?? fetch)(params.url ?? DEFAULT_ROUTER_MODELS_URL, {
      headers: { accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Router model catalog failed with HTTP ${response.status}`);
    }
    const payload = await response.json();
    const models = mergePresets(normalizeRouterModelsPayload(payload));
    cache = {
      models,
      expiresAt: now + CACHE_TTL_MS
    };
    return { ok: true, models, fetchedAt: new Date(now).toISOString() };
  } catch (err) {
    return {
      ok: false,
      models: PRESET_MODEL_CHOICES,
      fetchedAt: null,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
function normalizeRouterModelsPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }
  const data = payload.data;
  if (!Array.isArray(data)) {
    return [];
  }
  const choices = [];
  for (const model of data) {
    if (!model || typeof model !== "object" || Array.isArray(model)) {
      continue;
    }
    const record = model;
    const modelId = stringValue2(record.id);
    if (!modelId || !modelId.includes("/")) {
      continue;
    }
    const architecture = record.architecture && typeof record.architecture === "object" ? record.architecture : {};
    const inputModalities = normalizeModalities2(architecture.input_modalities);
    const outputModalities = normalizeModalities2(architecture.output_modalities);
    if (outputModalities && !outputModalities.includes("text")) {
      continue;
    }
    const providers = Array.isArray(record.providers) ? record.providers : [];
    for (const provider of providers) {
      const normalized = normalizeProviderChoice({
        modelId,
        provider,
        ...inputModalities ? { inputModalities } : {},
        ...outputModalities ? { outputModalities } : {}
      });
      if (normalized) {
        choices.push(normalized);
      }
    }
  }
  return choices.sort(compareChoices);
}
function normalizeProviderChoice(params) {
  if (!params.provider || typeof params.provider !== "object" || Array.isArray(params.provider)) {
    return void 0;
  }
  const provider = params.provider;
  const providerId = stringValue2(provider.provider);
  if (!providerId || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(providerId)) {
    return void 0;
  }
  const status = stringValue2(provider.status) ?? "live";
  if (status !== "live") {
    return void 0;
  }
  const pricing = provider.pricing && typeof provider.pricing === "object" && !Array.isArray(provider.pricing) ? provider.pricing : void 0;
  const normalizedProvider = providerId.toLowerCase();
  const modelId = params.modelId.trim();
  const pricingValue = pricingForProvider(pricing);
  return {
    key: choiceKey(modelId, normalizedProvider),
    modelId,
    provider: normalizedProvider,
    openclawModel: formatOpenClawModelRef(modelId, normalizedProvider),
    label: displayNameFromModelId(modelId),
    ...optional2("contextLength", positiveInteger2(provider.context_length)),
    ...optional2("pricing", pricingValue),
    ...optional2("supportsTools", optionalBoolean2(provider.supports_tools)),
    ...optional2("supportsStructuredOutput", optionalBoolean2(provider.supports_structured_output)),
    ...optional2("firstTokenLatencyMs", positiveNumber2(provider.first_token_latency_ms)),
    ...optional2("throughput", positiveNumber2(provider.throughput)),
    status,
    ...params.inputModalities ? { inputModalities: params.inputModalities } : {},
    ...params.outputModalities ? { outputModalities: params.outputModalities } : {}
  };
}
function mergePresets(dynamicChoices) {
  const dynamicByKey = new Map(dynamicChoices.map((choice) => [choice.key, choice]));
  const presets = PRESET_MODEL_CHOICES.map((preset) => ({
    ...preset,
    ...dynamicByKey.get(preset.key) ?? {},
    preset: true,
    label: preset.label,
    ...preset.note ? { note: preset.note } : {}
  }));
  return dedupeModelChoices([...presets, ...dynamicChoices]).sort(compareChoices);
}
function compareChoices(left, right) {
  if (left.preset !== right.preset) {
    return left.preset ? -1 : 1;
  }
  const leftPrice = left.pricing?.input ?? Number.POSITIVE_INFINITY;
  const rightPrice = right.pricing?.input ?? Number.POSITIVE_INFINITY;
  if (leftPrice !== rightPrice) {
    return leftPrice - rightPrice;
  }
  return left.openclawModel.localeCompare(right.openclawModel);
}
function stringValue2(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function normalizeModalities2(value) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const modalities = [...new Set(value.flatMap((item) => {
    const normalized = typeof item === "string" ? item.trim().toLowerCase() : "";
    return normalized ? [normalized] : [];
  }))];
  return modalities.length > 0 ? modalities : void 0;
}
function optionalBoolean2(value) {
  return typeof value === "boolean" ? value : void 0;
}
function pricingForProvider(pricing) {
  if (!pricing) {
    return void 0;
  }
  const input = positiveNumber2(pricing.input);
  const output = positiveNumber2(pricing.output);
  if (input === void 0 && output === void 0) {
    return void 0;
  }
  return {
    ...input !== void 0 ? { input } : {},
    ...output !== void 0 ? { output } : {}
  };
}
function optional2(key, value) {
  return value === void 0 ? {} : { [key]: value };
}
function positiveInteger2(value) {
  const parsed = positiveNumber2(value);
  return parsed === void 0 ? void 0 : Math.trunc(parsed);
}
function positiveNumber2(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}

// src/mlclaw-space-runtime/cookies.ts
import { createHmac as createHmac2, randomBytes as randomBytes3, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
function createSignedCookie(options, payload) {
  const body = Buffer.from(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1e3) + options.maxAgeSeconds
  })).toString("base64url");
  const signature = sign2(body, options.secret);
  return serializeCookie(options.name, `${body}.${signature}`, {
    httpOnly: true,
    secure: options.secure,
    sameSite: "Lax",
    path: "/",
    maxAge: options.maxAgeSeconds
  });
}
function verifySignedCookie(cookieHeader, name, secret) {
  const value = parseCookies(cookieHeader).get(name);
  if (!value) {
    return void 0;
  }
  const [body, signature] = value.split(".");
  if (!body || !signature || !signatureMatches2(signature, sign2(body, secret))) {
    return void 0;
  }
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return void 0;
  }
  if (!parsed || typeof parsed !== "object") {
    return void 0;
  }
  const exp = parsed.exp;
  if (typeof exp !== "number" || exp <= Math.floor(Date.now() / 1e3)) {
    return void 0;
  }
  return parsed;
}
function clearCookie(name, secure) {
  return serializeCookie(name, "", {
    httpOnly: true,
    secure,
    sameSite: "Lax",
    path: "/",
    maxAge: 0
  });
}
function randomState() {
  return randomBytes3(24).toString("base64url");
}
function sign2(value, secret) {
  return createHmac2("sha256", secret).update(value).digest("base64url");
}
function signatureMatches2(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual2(left, right);
}
function parseCookies(header) {
  const cookies = /* @__PURE__ */ new Map();
  for (const part of (header ?? "").split(";")) {
    const equals = part.indexOf("=");
    if (equals <= 0) {
      continue;
    }
    const name = part.slice(0, equals).trim();
    if (!name) {
      continue;
    }
    try {
      cookies.set(name, decodeURIComponent(part.slice(equals + 1).trim()));
    } catch {
      continue;
    }
  }
  return cookies;
}
function serializeCookie(name, value, options) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Max-Age=${options.maxAge}`,
    `Path=${options.path}`,
    `SameSite=${options.sameSite}`
  ];
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

// src/mlclaw-space-runtime/session.ts
var SESSION_COOKIE = "mlclaw_session";
var STATE_COOKIE = "mlclaw_oauth";
var SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
var STATE_TTL_SECONDS = 60 * 10;
function createSessionCookie(params) {
  return createSignedCookie({
    name: SESSION_COOKIE,
    secret: params.sessionSecret,
    maxAgeSeconds: SESSION_TTL_SECONDS,
    secure: params.secure
  }, { username: params.username });
}
function createOauthStateCookie(params) {
  const state = params.state ?? randomState();
  return {
    state,
    cookie: createSignedCookie({
      name: STATE_COOKIE,
      secret: params.sessionSecret,
      maxAgeSeconds: STATE_TTL_SECONDS,
      secure: params.secure
    }, { state, next: normalizeNext(params.next) })
  };
}
function clearSessionCookie(secure) {
  return clearCookie(SESSION_COOKIE, secure);
}
function clearOauthStateCookie(secure) {
  return clearCookie(STATE_COOKIE, secure);
}
function readSession(cookieHeader, sessionSecret) {
  return verifySignedCookie(cookieHeader, SESSION_COOKIE, sessionSecret);
}
function readOauthState(cookieHeader, sessionSecret) {
  return verifySignedCookie(cookieHeader, STATE_COOKIE, sessionSecret);
}
function normalizeNext(value) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\r") || value.includes("\n")) {
    return "/";
  }
  return value;
}

// src/mlclaw-space-runtime/shell.ts
var SHELL_MARKER = "data-mlclaw-shell";
var BRANDING_MARKER = "data-mlclaw-branding";
var CONTROL_BRANDING_MARKER = "data-mlclaw-control-branding";
var CONTROL_BRANDING_SCRIPT_PATH = "/assets/mlclaw-control-branding.js";
var CONTROL_BRANDING_SCRIPT = `(function () {
  var productName = "ML Claw";
  var marker = "data-mlclaw-control-branded";
  var observedRoots = new WeakSet();
  function inTopLeftBrandArea(node) {
    try {
      var range = document.createRange();
      range.selectNodeContents(node);
      var rect = range.getBoundingClientRect();
      range.detach();
      return rect.width > 0 && rect.height > 0 && rect.top >= 0 && rect.top <= 140 && rect.left >= 0 && rect.left <= 280;
    } catch (_) {
      return false;
    }
  }
  function updateTextNode(node) {
    var value = node.nodeValue || "";
    var trimmed = value.trim();
    if ((trimmed !== "Control" && trimmed !== "OpenClaw") || !inTopLeftBrandArea(node)) {
      return;
    }
    if (trimmed === "Control") {
      node.nodeValue = "";
    } else {
      node.nodeValue = value.replace("OpenClaw", productName);
    }
  }
  function scan(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      updateTextNode(node);
    }
  }
  function observe(root) {
    if (!root || observedRoots.has(root)) return;
    observedRoots.add(root);
    var pending = false;
    function scheduleScan() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () {
        pending = false;
        scan(root);
      });
    }
    scan(root);
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].type === "characterData") {
          updateTextNode(mutations[i].target);
        } else {
          scheduleScan();
        }
      }
    }).observe(root, { childList: true, characterData: true, subtree: true });
  }
  function observeExistingShadowRoots(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll("*").forEach(function (element) {
      if (element.shadowRoot) {
        observe(element.shadowRoot);
        observeExistingShadowRoots(element.shadowRoot);
      }
    });
  }
  if (!document.documentElement.hasAttribute(marker)) {
    document.documentElement.setAttribute(marker, "1");
    var attachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function () {
      var shadow = attachShadow.apply(this, arguments);
      observe(shadow);
      return shadow;
    };
    observe(document);
    observeExistingShadowRoots(document);
    requestAnimationFrame(function () {
      observeExistingShadowRoots(document);
      scan(document);
    });
  }
})();
`;
var SERVICE_WORKER_RESET_SCRIPT = `self.addEventListener("install", function () {
  self.skipWaiting();
});
self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    if (self.caches && caches.keys) {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (key) { return caches.delete(key); }));
    }
    if (self.clients && clients.claim) {
      await clients.claim();
    }
    if (self.registration && self.registration.unregister) {
      await self.registration.unregister();
    }
  })());
});
`;
function shouldInjectShell(params) {
  const method = params.method ?? "GET";
  return (method === "GET" || method === "HEAD") && (params.requestAccept ?? "").includes("text/html") && (params.responseContentType ?? "").toLowerCase().includes("text/html") && !params.responseContentEncoding;
}
function rewriteOpenClawHtml(html, branding) {
  return injectMlClawShell(injectBranding(html, branding), branding);
}
function injectMlClawShell(html, branding) {
  const shell = `
<div ${SHELL_MARKER} style="position:fixed;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483647;">
  <a href="/mlclaw" aria-label="Open ${escapeHtml2(branding.name)} settings" title="${escapeHtml2(branding.name)}" style="box-sizing:border-box;display:flex;width:34px;height:34px;aspect-ratio:1/1;align-items:center;justify-content:center;border:1px solid rgba(15,23,42,.16);border-radius:8px;background:rgba(255,255,255,.94);box-shadow:0 8px 18px rgba(15,23,42,.14);color:#111827;text-decoration:none;">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;width:18px;height:18px;">
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  </a>
</div>
`;
  const brandingScript = `<script ${CONTROL_BRANDING_MARKER} src="${CONTROL_BRANDING_SCRIPT_PATH}"></script>
`;
  if (html.includes(SHELL_MARKER)) {
    return html;
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `${shell}${brandingScript}</body>`);
  }
  return `${html}${shell}${brandingScript}`;
}
function injectBranding(html, branding) {
  const title = `${escapeHtml2(branding.name)} Control`;
  let out = html;
  if (/<title>[\s\S]*?<\/title>/i.test(out)) {
    out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  } else if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>
<title>${title}</title>`);
  }
  const meta = `
<meta ${BRANDING_MARKER} name="application-name" content="${escapeHtml2(branding.name)}">
<meta ${BRANDING_MARKER} name="apple-mobile-web-app-title" content="${escapeHtml2(branding.shortName)}">
<meta ${BRANDING_MARKER} name="theme-color" content="${escapeHtml2(branding.themeColor)}">
`;
  if (!out.includes(BRANDING_MARKER) && out.includes("</head>")) {
    out = out.replace("</head>", `${meta}</head>`);
  }
  return out;
}
function escapeHtml2(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

// src/mlclaw-space-runtime/app.ts
function createSpaceRuntimeApp(config2, controls) {
  const app = new Hono2();
  app.get("/health", (c) => health(c, config2, controls));
  app.get("/healthz", (c) => health(c, config2, controls));
  app.get("/assets/mlclaw.svg", async () => serveFile(path3.join(config2.assetsDir, "mlclaw.svg"), "image/svg+xml; charset=utf-8"));
  app.get("/assets/hf-logo.svg", async () => serveFile(path3.join(config2.assetsDir, "hf-logo.svg"), "image/svg+xml; charset=utf-8"));
  app.get("/assets/assistant-avatar.svg", async () => serveFile(path3.join(config2.assetsDir, "assistant-avatar.svg"), "image/svg+xml; charset=utf-8"));
  app.get("/assets/mlclaw-control-branding.js", () => staticScript(CONTROL_BRANDING_SCRIPT));
  app.get("/assets/brand/logo", async () => serveBrandAsset(config2, config2.branding.logoAsset));
  app.get("/favicon.svg", async () => serveBrandAsset(config2, config2.branding.faviconSvgAsset));
  app.get("/favicon-32.png", async () => serveBrandAsset(config2, config2.branding.favicon32Asset));
  app.get("/favicon.ico", async () => serveBrandAsset(config2, config2.branding.faviconIcoAsset));
  app.get("/apple-touch-icon.png", async () => serveBrandAsset(config2, config2.branding.appleTouchIconAsset));
  app.get("/sw.js", () => staticScript(SERVICE_WORKER_RESET_SCRIPT));
  app.get("/manifest.webmanifest", () => new Response(brandingManifest(config2.branding), {
    headers: {
      "cache-control": "no-cache",
      "content-type": "application/manifest+json; charset=utf-8"
    }
  }));
  app.get("/oauth/login", (c) => handleOauthLogin(c, config2));
  app.get("/oauth/callback", (c) => handleOauthCallback(c, config2));
  app.get("/login", (c) => c.html(loginPage(config2, void 0, normalizeNext(c.req.query("next") ?? "/"))));
  app.get("/logout", (c) => logoutResponse(config2, false));
  app.get("/mlclaw/logout", (c) => logoutResponse(config2, false));
  app.post("/mlclaw/api/logout", (c) => logoutResponse(config2, true));
  app.get("/mlclaw/assets/*", async (c) => {
    const relative = c.req.path.slice("/mlclaw/assets/".length);
    const safe = safeRelativePath(relative);
    if (!safe) {
      return c.text("not found\n", 404);
    }
    const file = path3.join(config2.assetsDir, "mlclaw-control-ui", safe);
    return serveFile(file, contentType(file), true);
  });
  app.get("/mlclaw/openai", (c) => c.redirect("/mlclaw/credentials", 302));
  app.post("/mlclaw/openai", (c) => c.redirect("/mlclaw/credentials", 303));
  app.get("/mlclaw/api/session", (c) => {
    const auth = requireAllowed(c, config2);
    if (auth instanceof Response) {
      return auth;
    }
    return c.json({
      user: auth.username,
      admin: isAdmin(config2, auth.username),
      csrfToken: createCsrfToken({ username: auth.username, sessionSecret: config2.sessionSecret }),
      branding: publicBranding(config2.branding)
    });
  });
  app.get("/mlclaw/api/status", async (c) => {
    const auth = requireAllowed(c, config2);
    if (auth instanceof Response) {
      return auth;
    }
    return c.json(await statusPayload(config2, controls));
  });
  app.get("/mlclaw/api/settings", (c) => {
    const auth = requireAllowed(c, config2);
    if (auth instanceof Response) {
      return auth;
    }
    return c.json(runtimeSettings(config2));
  });
  app.get("/mlclaw/api/router-models", async (c) => {
    const auth = requireAllowed(c, config2);
    if (auth instanceof Response) {
      return auth;
    }
    return c.json(await loadRouterModelChoices({ url: config2.routerModelsUrl }));
  });
  app.post("/mlclaw/api/settings/model", async (c) => {
    const auth = requireAdmin(c, config2);
    if (auth instanceof Response) {
      return auth;
    }
    const csrf = requireCsrf(c, config2, auth.username);
    if (csrf) {
      return csrf;
    }
    if (config2.mode !== "app") {
      return c.json({ ok: false, error: "template mode cannot mutate settings" }, 403);
    }
    const body = await readJson(c);
    const model = normalizeModel(body?.model);
    if (!model) {
      return c.json({ ok: false, error: "model is required" }, 400);
    }
    const choices = normalizeModelChoices(body?.modelChoices, model);
    if (!choices) {
      return c.json({ ok: false, error: "at least one valid model choice is required" }, 400);
    }
    const selected = choices.find((choice) => choice.openclawModel === model);
    if (!selected) {
      return c.json({ ok: false, error: "active model must be included in model choices" }, 400);
    }
    await setCurrentSpaceVariable(config2, "OPENCLAW_MODEL", model);
    await setCurrentSpaceVariable(config2, "MLCLAW_MODEL_CHOICES", serializeModelChoices(choices));
    controls.setModelSettings(model, choices);
    await configureOpenClawGateway(config2);
    let restartPending = false;
    try {
      restartPending = await restartCurrentSpace(config2);
    } catch (err) {
      process.stderr.write(`[mlclaw] failed to restart Space after model update: ${formatError(err)}
`);
    }
    return c.json({ ok: true, model, modelChoices: choices, restartPending });
  });
  app.post("/mlclaw/api/credentials/openai", async (c) => {
    const auth = requireAdmin(c, config2);
    if (auth instanceof Response) {
      return auth;
    }
    const csrf = requireCsrf(c, config2, auth.username);
    if (csrf) {
      return csrf;
    }
    if (config2.mode !== "app") {
      return c.json({ ok: false, error: "template mode cannot mutate credentials" }, 403);
    }
    const body = await readJson(c);
    const apiKey = validateOpenAiApiKey(body?.apiKey);
    if (!apiKey) {
      return c.json({ ok: false, error: "valid OpenAI API key is required" }, 400);
    }
    let persistent = false;
    if (config2.spaceId && config2.hfToken) {
      try {
        await setCurrentSpaceSecret(config2, "OPENAI_API_KEY", apiKey);
        persistent = true;
      } catch {
        process.stderr.write("[mlclaw] failed to persist OpenAI key as Space Secret\n");
      }
    }
    await writeEphemeralOpenAiCredential(config2.openaiCredentialFile, apiKey);
    await controls.restartOpenClawWithOpenAi(apiKey);
    return c.json({ ok: true, configured: true, persistent });
  });
  app.post("/mlclaw/api/runtime/restart", async (c) => {
    const auth = requireAdmin(c, config2);
    if (auth instanceof Response) {
      return auth;
    }
    const csrf = requireCsrf(c, config2, auth.username);
    if (csrf) {
      return csrf;
    }
    if (config2.mode !== "app") {
      return c.json({ ok: false, error: "template mode cannot restart runtime" }, 403);
    }
    return c.json({ ok: true, restartPending: await restartCurrentSpace(config2) });
  });
  app.get("/mlclaw", (c) => controlUi(c, config2));
  app.get("/mlclaw/*", (c) => controlUi(c, config2));
  app.notFound((c) => {
    if (config2.mode === "template") {
      return c.html(templatePage(config2));
    }
    return new Response("", { status: 404, headers: { "x-mlclaw-fallback": "openclaw" } });
  });
  return app;
}
function health(c, config2, controls) {
  const healthy = config2.mode !== "app" || controls.openclawRunning();
  return c.text(healthy ? "ok\n" : "openclaw is not running\n", healthy ? 200 : 503);
}
function handleOauthLogin(c, config2) {
  const next = normalizeNext(c.req.query("next") ?? "/");
  if (!config2.oauthClientId || !config2.oauthClientSecret) {
    return c.html(loginPage(config2, "Hugging Face OAuth is not configured.", next));
  }
  const { state, cookie } = createOauthStateCookie({
    next,
    sessionSecret: config2.sessionSecret,
    secure: config2.cookieSecure
  });
  const redirectUri = `${config2.publicUrl}/oauth/callback`;
  const headers = new Headers({ location: authorizeUrl({
    clientId: config2.oauthClientId,
    clientSecret: config2.oauthClientSecret,
    providerUrl: config2.providerUrl,
    redirectUri
  }, state) });
  headers.append("set-cookie", cookie);
  return new Response(null, { status: 302, headers });
}
async function handleOauthCallback(c, config2) {
  const stateCookie = readOauthState(c.req.header("cookie"), config2.sessionSecret);
  const state = c.req.query("state");
  const code = c.req.query("code");
  if (!stateCookie || !state || stateCookie.state !== state || !code || !config2.oauthClientId || !config2.oauthClientSecret) {
    return c.html(loginPage(config2, "The Hugging Face sign-in attempt expired. Try again."), 401);
  }
  const identity = await exchangeCodeForIdentity({
    clientId: config2.oauthClientId,
    clientSecret: config2.oauthClientSecret,
    providerUrl: config2.providerUrl,
    redirectUri: `${config2.publicUrl}/oauth/callback`
  }, code);
  if (!identity) {
    return c.html(loginPage(config2, "Hugging Face sign-in failed. Try again."), 401);
  }
  const headers = new Headers({ location: normalizeNext(typeof stateCookie.next === "string" ? stateCookie.next : "/") });
  headers.append("set-cookie", createSessionCookie({
    username: identity.username,
    sessionSecret: config2.sessionSecret,
    secure: config2.cookieSecure
  }));
  headers.append("set-cookie", clearOauthStateCookie(config2.cookieSecure));
  return new Response(null, { status: 302, headers });
}
async function controlUi(c, config2) {
  const auth = requireAllowed(c, config2);
  if (auth instanceof Response) {
    return auth;
  }
  return serveFile(path3.join(config2.assetsDir, "mlclaw-control-ui", "index.html"), "text/html; charset=utf-8");
}
function logoutResponse(config2, json) {
  const headers = new Headers();
  headers.append("set-cookie", clearSessionCookie(config2.cookieSecure));
  if (json) {
    headers.set("content-type", "application/json; charset=utf-8");
    return new Response(`${JSON.stringify({ ok: true })}
`, { status: 200, headers });
  }
  headers.set("location", "/");
  return new Response(null, { status: 302, headers });
}
function requireAllowed(c, config2) {
  const session = readSession(c.req.header("cookie"), config2.sessionSecret);
  if (!session) {
    return unauthenticated(c, config2);
  }
  if (!isAllowed(config2, session.username)) {
    return c.html(unauthorizedPage(session.username), 403);
  }
  return session;
}
function requireAdmin(c, config2) {
  const allowed = requireAllowed(c, config2);
  if (allowed instanceof Response) {
    return allowed;
  }
  if (!isAdmin(config2, allowed.username)) {
    return c.json({ ok: false, error: "admin required" }, 403);
  }
  return allowed;
}
function requireCsrf(c, config2, username) {
  if (verifyCsrfToken({
    token: c.req.header("x-mlclaw-csrf"),
    username,
    sessionSecret: config2.sessionSecret
  })) {
    return void 0;
  }
  return c.json({ ok: false, error: "csrf token is invalid or missing" }, 403);
}
function unauthenticated(c, config2) {
  const next = normalizeNext(c.req.path + new URL(c.req.url).search);
  if (c.req.path.startsWith("/mlclaw/api/")) {
    return c.json({ ok: false, error: "authentication required" }, 401);
  }
  if (isBrowserNavigation(c)) {
    return c.redirect(`/login?next=${encodeURIComponent(next)}`, 302);
  }
  return c.html(loginPage(config2, void 0, next), 401);
}
function isBrowserNavigation(c) {
  const method = c.req.method;
  return (method === "GET" || method === "HEAD") && (c.req.header("accept") ?? "").includes("text/html");
}
function isAllowed(config2, username) {
  return config2.allowAnySignedIn || config2.allowedUsers.includes(username);
}
function isAdmin(config2, username) {
  return config2.adminUsers.includes(username);
}
async function statusPayload(config2, controls) {
  return {
    ok: true,
    mode: config2.mode,
    agent: config2.agentName ?? null,
    model: config2.model,
    space: config2.spaceId ?? null,
    stateBucket: config2.stateBucket ?? null,
    statePrefix: config2.statePrefix ?? null,
    gatewayLocation: config2.gatewayLocation ?? null,
    runtimeImage: config2.runtimeImage ?? null,
    runtimeId: config2.runtimeId ?? null,
    templateRev: config2.templateRev ?? null,
    openclaw: {
      running: controls.openclawRunning(),
      host: config2.openclawHost,
      port: config2.openclawPort
    },
    auth: {
      hfOAuthConfigured: Boolean(config2.oauthClientId && config2.oauthClientSecret),
      allowedUsers: config2.allowedUsers,
      adminUsers: config2.adminUsers,
      allowAnySignedIn: config2.allowAnySignedIn
    },
    openai: {
      configured: await controls.openAiConfigured(),
      environmentConfigured: openAiConfigured(),
      runtimeFileConfigured: Boolean(await loadOpenAiCredentialFile(config2.openaiCredentialFile))
    },
    branding: publicBranding(config2.branding)
  };
}
function staticScript(body) {
  return new Response(body, {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/javascript; charset=utf-8"
    }
  });
}
async function readJson(c) {
  try {
    const value = await c.req.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
  } catch {
    return void 0;
  }
}
async function serveFile(file, contentTypeHeader, immutable = false) {
  try {
    const body = await fs3.readFile(file);
    const headers = new Headers({ "content-type": contentTypeHeader });
    if (immutable) {
      headers.set("cache-control", "public, max-age=31536000, immutable");
    }
    return new Response(new Uint8Array(body), { status: 200, headers });
  } catch {
    return new Response("not found\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
}
async function serveBrandAsset(config2, asset) {
  const response = await serveFile(path3.join(config2.assetsDir, asset), contentType(asset));
  if (response.status !== 404 || asset === "mlclaw.svg") {
    return response;
  }
  return serveFile(path3.join(config2.assetsDir, "mlclaw.svg"), "image/svg+xml; charset=utf-8");
}
function safeRelativePath(value) {
  let decoded;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return void 0;
  }
  const normalized = path3.posix.normalize(decoded).replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    return void 0;
  }
  return normalized;
}
function formatError(err) {
  return err instanceof Error ? err.stack ?? err.message : String(err);
}
function contentType(file) {
  if (file.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (file.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (file.endsWith(".svg")) {
    return "image/svg+xml; charset=utf-8";
  }
  if (file.endsWith(".png")) {
    return "image/png";
  }
  if (file.endsWith(".ico")) {
    return "image/x-icon";
  }
  if (file.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  return "application/octet-stream";
}

// src/mlclaw-space-runtime/proxy.ts
import http from "node:http";
import net from "node:net";
var ADMIN_CONTROL_UI_SCOPES = [
  "operator.admin",
  "operator.read",
  "operator.write",
  "operator.approvals",
  "operator.pairing"
];
var USER_CONTROL_UI_SCOPES = [
  "operator.read",
  "operator.write",
  "operator.approvals"
];
var HOP_BY_HOP_HEADERS = /* @__PURE__ */ new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade"
]);
async function proxyHttp(req, res, config2, identity) {
  const headers = sanitizeHeaders(req.headers);
  headers.host = `${config2.openclawHost}:${config2.openclawPort}`;
  if (isHtmlNavigation(req)) {
    delete headers["accept-encoding"];
    delete headers["Accept-Encoding"];
  }
  addTrustedProxyHeaders(headers, config2, identity);
  const upstream = http.request({
    host: config2.openclawHost,
    port: config2.openclawPort,
    method: req.method,
    path: req.url,
    headers
  }, (upstreamResponse) => {
    const responseHeaders = sanitizeHeaders(upstreamResponse.headers);
    const inject = shouldInjectShell({
      method: req.method,
      requestAccept: String(req.headers.accept ?? ""),
      responseContentType: headerValue(upstreamResponse.headers["content-type"]),
      responseContentEncoding: headerValue(upstreamResponse.headers["content-encoding"])
    });
    if (!inject) {
      res.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
      upstreamResponse.pipe(res);
      return;
    }
    const chunks = [];
    upstreamResponse.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    upstreamResponse.on("end", () => {
      const body = rewriteOpenClawHtml(Buffer.concat(chunks).toString("utf8"), config2.branding);
      delete responseHeaders["content-length"];
      delete responseHeaders["Content-Length"];
      res.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
      res.end(body);
    });
  });
  upstream.on("error", (err) => {
    process.stderr.write(`[mlclaw] upstream HTTP proxy failed: ${err.stack ?? err.message}
`);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    res.end("OpenClaw gateway is not ready\n");
  });
  req.pipe(upstream);
}
function proxyWebSocket(req, socket, head, config2, identity) {
  const upstream = net.connect(config2.openclawPort, config2.openclawHost);
  let connected = false;
  const destroyBoth = () => {
    upstream.destroy();
    socket.destroy();
  };
  upstream.on("connect", () => {
    connected = true;
    const headers = sanitizeHeaders(req.headers);
    headers.host = `${config2.openclawHost}:${config2.openclawPort}`;
    headers.connection = "Upgrade";
    headers.upgrade = req.headers.upgrade ?? "websocket";
    addTrustedProxyHeaders(headers, config2, identity);
    upstream.write(`${req.method ?? "GET"} ${req.url ?? "/"} HTTP/${req.httpVersion}\r
`);
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          upstream.write(`${key}: ${item}\r
`);
        }
      } else if (value !== void 0) {
        upstream.write(`${key}: ${value}\r
`);
      }
    }
    upstream.write("\r\n");
    if (head.length > 0) {
      upstream.write(head);
    }
    upstream.pipe(socket);
    socket.pipe(upstream);
  });
  upstream.on("error", (err) => {
    process.stderr.write(`[mlclaw] upstream WebSocket proxy failed: ${err.stack ?? err.message}
`);
    if (!connected && !socket.destroyed) {
      socket.write("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
    }
    destroyBoth();
  });
  socket.on("error", destroyBoth);
  socket.on("close", () => upstream.destroy());
  upstream.on("close", () => socket.destroy());
}
function rejectWebSocket(socket) {
  socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
  socket.destroy();
}
function sanitizeHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      continue;
    }
    if (lower.startsWith("x-forwarded-") || lower.startsWith("x-openclaw-") || lower === "authorization") {
      continue;
    }
    out[key] = value;
  }
  return out;
}
function addTrustedProxyHeaders(headers, config2, identity) {
  headers["x-forwarded-user"] = identity.username;
  headers["x-forwarded-proto"] = config2.publicUrl.startsWith("https://") ? "https" : "http";
  headers["x-forwarded-host"] = new URL(config2.publicUrl).host;
  headers["x-openclaw-scopes"] = resolveControlUiScopes(config2, identity).join(",");
}
function resolveControlUiScopes(config2, identity) {
  return config2.adminUsers.includes(identity.username) ? ADMIN_CONTROL_UI_SCOPES : USER_CONTROL_UI_SCOPES;
}
function headerValue(value) {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  if (typeof value === "number") {
    return String(value);
  }
  return value;
}
function isHtmlNavigation(req) {
  return (req.method === "GET" || req.method === "HEAD") && String(req.headers.accept ?? "").includes("text/html");
}

// src/mlclaw-space-runtime/server.ts
var SpaceRuntimeServer = class {
  constructor(config2, options = {}) {
    this.config = config2;
    this.exitProcess = options.exitProcess ?? ((code) => process.exit(code));
    this.app = createSpaceRuntimeApp(config2, {
      openclawRunning: () => Boolean(this.openclaw && !this.openclaw.killed),
      openAiConfigured: async () => openAiConfigured() || Boolean(await loadOpenAiCredentialFile(this.config.openaiCredentialFile)),
      restartOpenClawWithOpenAi: (apiKey) => this.restartOpenClawWithOpenAi(apiKey),
      setModelSettings: (model, choices) => {
        this.config.model = model;
        this.config.modelChoices = choices;
      }
    });
  }
  openclaw;
  openclawStarting = false;
  openclawStopping = false;
  app;
  exitProcess;
  async start() {
    if (this.config.mode === "app") {
      await this.startOpenClaw();
    }
    const server2 = http2.createServer((req, res) => {
      this.handle(req, res).catch((err) => {
        process.stderr.write(`[mlclaw] request failed: ${formatError2(err)}
`);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        }
        res.end("Internal server error\n");
      });
    });
    server2.on("upgrade", (req, socket, head) => {
      const netSocket = socket;
      try {
        const session = readSession(req.headers.cookie, this.config.sessionSecret);
        if (!session || !this.isAllowed(session.username)) {
          rejectWebSocket(netSocket);
          return;
        }
        proxyWebSocket(req, netSocket, head, this.config, { username: session.username });
      } catch (err) {
        process.stderr.write(`[mlclaw] websocket upgrade failed: ${formatError2(err)}
`);
        rejectWebSocket(netSocket);
      }
    });
    try {
      await new Promise((resolve, reject) => {
        const onError = (err) => {
          server2.off("listening", onListening);
          reject(err);
        };
        const onListening = () => {
          server2.off("error", onError);
          resolve();
        };
        server2.once("error", onError);
        server2.once("listening", onListening);
        server2.listen(this.config.port, "0.0.0.0");
      });
    } catch (err) {
      await this.stop();
      server2.close();
      throw err;
    }
    process.stdout.write(`[mlclaw] listening on ${this.config.port} in ${this.config.mode} mode
`);
    return server2;
  }
  async stop() {
    const child = this.openclaw;
    if (!child || child.killed) {
      return;
    }
    this.openclawStopping = true;
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 1e4);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.openclawStopping = false;
  }
  async handle(req, res) {
    const url = new URL(req.url ?? "/", this.config.publicUrl);
    if (this.config.mode === "template" && !isTemplateRuntimePath(url.pathname)) {
      this.sendHtml(res, templatePage(this.config));
      return;
    }
    if (this.shouldRouteToMlClaw(url.pathname)) {
      const response = await this.app.fetch(nodeRequestToWebRequest(req, this.config.publicUrl));
      if (!response.headers.has("x-mlclaw-fallback")) {
        await sendWebResponse(res, response);
        return;
      }
    }
    const session = readSession(req.headers.cookie, this.config.sessionSecret);
    if (!session) {
      this.sendUnauthenticated(req, res, url);
      return;
    }
    if (!this.isAllowed(session.username)) {
      this.sendHtml(res, unauthorizedPage(session.username), 403);
      return;
    }
    await proxyHttp(req, res, this.config, { username: session.username });
  }
  shouldRouteToMlClaw(pathname) {
    return pathname === "/health" || pathname === "/healthz" || pathname === "/favicon.svg" || pathname === "/favicon-32.png" || pathname === "/favicon.ico" || pathname === "/apple-touch-icon.png" || pathname === "/manifest.webmanifest" || pathname === "/sw.js" || pathname === "/assets/hf-logo.svg" || pathname === "/assets/mlclaw.svg" || pathname === "/assets/assistant-avatar.svg" || pathname === "/assets/mlclaw-control-branding.js" || pathname === "/assets/brand/logo" || pathname === "/login" || pathname === "/logout" || pathname.startsWith("/oauth/") || pathname === "/mlclaw" || pathname.startsWith("/mlclaw/");
  }
  async startOpenClaw(extraEnv = {}) {
    if (this.openclawStarting || this.openclaw && !this.openclaw.killed) {
      return;
    }
    this.openclawStarting = true;
    try {
      await configureOpenClawGateway(this.config);
      const persistedOpenAiKey = await loadOpenAiCredentialFile(this.config.openaiCredentialFile);
      const env = {
        ...process.env,
        OPENCLAW_GATEWAY_PORT: String(this.config.openclawPort),
        OPENCLAW_MODEL: this.config.model,
        ...persistedOpenAiKey ? { OPENAI_API_KEY: persistedOpenAiKey } : {},
        ...extraEnv
      };
      this.openclaw = spawn(this.config.openclawCommand, this.config.openclawArgs, {
        stdio: "inherit",
        env
      });
      this.openclaw.once("exit", (code, signal) => {
        process.stdout.write(`[mlclaw] openclaw exited code=${code ?? "null"} signal=${signal ?? "null"}
`);
        this.openclaw = void 0;
        if (!this.openclawStopping) {
          const exitCode = typeof code === "number" && code !== 0 ? code : 1;
          this.exitProcess(exitCode);
        }
      });
    } finally {
      this.openclawStarting = false;
    }
  }
  async restartOpenClawWithOpenAi(apiKey) {
    await this.stop();
    await this.startOpenClaw({ OPENAI_API_KEY: apiKey });
  }
  isAllowed(username) {
    return this.config.allowAnySignedIn || this.config.allowedUsers.includes(username);
  }
  sendUnauthenticated(req, res, url) {
    const next = normalizeNext(`${url.pathname}${url.search}`);
    if (url.pathname === "/" && (req.method === "GET" || req.method === "HEAD")) {
      this.sendHtml(res, loginPage(this.config, void 0, next));
      return;
    }
    if (isBrowserNavigation2(req) && !isApiPath(url.pathname)) {
      this.sendRedirect(res, `/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (isApiPath(url.pathname)) {
      res.writeHead(401, { "content-type": "application/json; charset=utf-8" });
      res.end(`${JSON.stringify({ ok: false, error: "authentication required" })}
`);
      return;
    }
    this.sendHtml(res, loginPage(this.config, void 0, next), 401);
  }
  sendRedirect(res, location) {
    res.writeHead(302, { location });
    res.end();
  }
  sendHtml(res, body, status = 200) {
    res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
    res.end(body);
  }
};
function nodeRequestToWebRequest(req, publicUrl) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (value !== void 0) {
      headers.set(key, value);
    }
  }
  const init = {
    method: req.method ?? "GET",
    headers
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req);
    init.duplex = "half";
  }
  return new Request(new URL(req.url ?? "/", publicUrl).toString(), init);
}
async function sendWebResponse(res, response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "set-cookie") {
      headers[key] = value;
    }
  });
  const setCookies = response.headers.getSetCookie?.() ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")] : []);
  if (setCookies.length > 0) {
    headers["set-cookie"] = setCookies;
  }
  res.writeHead(response.status, headers);
  if (!response.body) {
    res.end();
    return;
  }
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!res.write(Buffer.from(value))) {
      await new Promise((resolve) => res.once("drain", resolve));
    }
  }
  res.end();
}
function isBrowserNavigation2(req) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }
  return String(req.headers.accept ?? "").includes("text/html");
}
function isApiPath(pathname) {
  return pathname.startsWith("/mlclaw/api/");
}
function isTemplateRuntimePath(pathname) {
  return pathname === "/health" || pathname === "/healthz" || pathname === "/favicon.svg" || pathname === "/favicon-32.png" || pathname === "/favicon.ico" || pathname === "/apple-touch-icon.png" || pathname === "/manifest.webmanifest" || pathname === "/assets/hf-logo.svg" || pathname === "/assets/mlclaw.svg" || pathname === "/assets/assistant-avatar.svg" || pathname === "/assets/brand/logo";
}
function formatError2(err) {
  return err instanceof Error ? err.stack ?? err.message : String(err);
}

// src/mlclaw-space-runtime/cli.ts
var config = loadConfig();
var server = new SpaceRuntimeServer(config);
if (config.sessionSecretGenerated && config.mode === "app") {
  process2.stderr.write("[mlclaw] MLCLAW_SESSION_SECRET is missing; generated an ephemeral session secret for this boot\n");
}
var httpServer = await server.start();
async function shutdown(signal) {
  process2.stdout.write(`[mlclaw] received ${signal}; shutting down
`);
  httpServer.close();
  await server.stop();
  process2.exit(0);
}
process2.on("SIGTERM", () => void shutdown("SIGTERM"));
process2.on("SIGINT", () => void shutdown("SIGINT"));
