import type { SpaceRuntimeConfig } from "./config.js";

export const RECOMMENDED_MODELS = [
  {
    id: "huggingface/google/gemma-4-26B-A4B-it",
    label: "Gemma 4 26B A4B",
    note: "Default quality target",
  },
  {
    id: "huggingface/Qwen/Qwen3.6-35B-A3B",
    label: "Qwen 3.6 35B A3B",
    note: "Stronger Qwen option",
  },
  {
    id: "huggingface/Qwen/Qwen3-8B",
    label: "Qwen 3 8B",
    note: "Lower cost option",
  },
] as const;

export type RuntimeSettings = {
  agentName: string | null;
  model: string;
  stateBucket: string | null;
  statePrefix: string | null;
  gatewayLocation: string | null;
  runtimeImage: string | null;
  runtimeId: string | null;
  templateRev: string | null;
  allowedUsers: string[];
  adminUsers: string[];
  recommendedModels: typeof RECOMMENDED_MODELS;
};

export function runtimeSettings(config: SpaceRuntimeConfig): RuntimeSettings {
  return {
    agentName: config.agentName ?? null,
    model: config.model,
    stateBucket: config.stateBucket ?? null,
    statePrefix: config.statePrefix ?? null,
    gatewayLocation: config.gatewayLocation ?? null,
    runtimeImage: config.runtimeImage ?? null,
    runtimeId: config.runtimeId ?? null,
    templateRev: config.templateRev ?? null,
    allowedUsers: config.allowedUsers,
    adminUsers: config.adminUsers,
    recommendedModels: RECOMMENDED_MODELS,
  };
}

export function normalizeModel(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 240 || /[\r\n\t]/.test(trimmed) || /\s/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export async function setCurrentSpaceVariable(
  config: SpaceRuntimeConfig,
  key: string,
  value: string,
): Promise<void> {
  if (!config.spaceId || !config.hfToken) {
    throw new Error("Space mutation requires SPACE_ID and HF_TOKEN");
  }
  await hubRequest(config, `/api/spaces/${config.spaceId}/variables`, {
    method: "POST",
    body: JSON.stringify({ key, value }),
    headers: { "content-type": "application/json" },
  });
}

export async function setCurrentSpaceSecret(
  config: SpaceRuntimeConfig,
  key: string,
  value: string,
): Promise<void> {
  if (!config.spaceId || !config.hfToken) {
    throw new Error("Space mutation requires SPACE_ID and HF_TOKEN");
  }
  await hubRequest(config, `/api/spaces/${config.spaceId}/secrets`, {
    method: "POST",
    body: JSON.stringify({ key, value }),
    headers: { "content-type": "application/json" },
  });
}

export async function restartCurrentSpace(config: SpaceRuntimeConfig): Promise<boolean> {
  if (!config.spaceId || !config.hfToken) {
    return false;
  }
  await hubRequest(config, `/api/spaces/${config.spaceId}/restart`, {
    method: "POST",
    body: JSON.stringify({ factoryReboot: false }),
    headers: { "content-type": "application/json" },
  });
  return true;
}

async function hubRequest(config: SpaceRuntimeConfig, path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${config.hubUrl.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${config.hfToken}`,
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Hub request failed: ${response.status} ${await response.text()}`);
  }
  return response;
}
