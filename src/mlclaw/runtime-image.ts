import { RELEASE_CONFIG } from "./release-config.generated.js";

export const PACKAGE_VERSION = RELEASE_CONFIG.packageVersion;
export const OPENCLAW_VERSION = RELEASE_CONFIG.openclawVersion;
export const OPENCLAW_BASE_IMAGE = `ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION}`;
export const BROKERKIT_PLUGIN_VERSION = RELEASE_CONFIG.brokerkitPluginVersion;
export const BROKERKIT_VERSION = RELEASE_CONFIG.brokerkitVersion;
export const DEFAULT_BROKERKIT_VERSION = BROKERKIT_VERSION;
export const RUNTIME_IMAGE_REPOSITORY = RELEASE_CONFIG.runtimeImageRepository;
export const DEFAULT_RUNTIME_IMAGE_TAG = `${PACKAGE_VERSION}-openclaw-${OPENCLAW_VERSION}`;
export const DEFAULT_RUNTIME_IMAGE = `${RUNTIME_IMAGE_REPOSITORY}:${DEFAULT_RUNTIME_IMAGE_TAG}`;

export function resolveRuntimeImage(value?: string, env: NodeJS.ProcessEnv = process.env): string {
  return value?.trim() || env.MLCLAW_RUNTIME_IMAGE?.trim() || DEFAULT_RUNTIME_IMAGE;
}

export function resolveRuntimeImageOverride(value?: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  return value?.trim() || env.MLCLAW_RUNTIME_IMAGE?.trim() || undefined;
}

export function resolveSpaceRuntimeImage(
  opts: { runtimeImage?: string; bundledRuntime?: boolean },
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (opts.bundledRuntime) {
    if (opts.runtimeImage?.trim() || env.MLCLAW_RUNTIME_IMAGE?.trim()) {
      throw new Error("--bundled-runtime cannot be combined with --runtime-image or MLCLAW_RUNTIME_IMAGE");
    }
    return undefined;
  }
  return resolveRuntimeImage(opts.runtimeImage, env);
}

export function bundledSpaceRuntimeRef(templateRev: string): string {
  return `bundled:${templateRev}`;
}
