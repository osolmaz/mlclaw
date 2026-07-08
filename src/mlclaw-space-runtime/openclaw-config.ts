import fs from "node:fs/promises";
import path from "node:path";
import type { SpaceRuntimeConfig } from "./config.js";

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

  await fs.mkdir(path.dirname(config.openclawConfigPath), { recursive: true });
  await fs.writeFile(config.openclawConfigPath, `${JSON.stringify(openclawConfig, null, 2)}\n`, { mode: 0o600 });
  await fs.chmod(config.openclawConfigPath, 0o600);
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
