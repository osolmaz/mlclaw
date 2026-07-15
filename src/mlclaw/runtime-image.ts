import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_OPENCLAW_VERSION = "2026.7.1-beta.5";
const DEFAULT_BROKERKIT_PLUGIN_VERSION = "0.1.0";
export const DEFAULT_BROKERKIT_VERSION = "9d66b0ad6b7fc04eb56744bdfe5c0bbcc9fc08c6";
const DEFAULT_RUNTIME_IMAGE_REPOSITORY = "ghcr.io/osolmaz/mlclaw";

const PACKAGE_METADATA = readPackageMetadata();

export const PACKAGE_VERSION = packageString("version", "unknown");
export const OPENCLAW_VERSION = packageConfigString("openclawVersion", DEFAULT_OPENCLAW_VERSION);
export const OPENCLAW_BASE_IMAGE = `ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION}`;
export const BROKERKIT_PLUGIN_VERSION = packageConfigString("brokerkitPluginVersion", DEFAULT_BROKERKIT_PLUGIN_VERSION);
export const BROKERKIT_VERSION = packageConfigString("brokerkitVersion", DEFAULT_BROKERKIT_VERSION);
export const RUNTIME_IMAGE_REPOSITORY = packageConfigString("runtimeImageRepository", DEFAULT_RUNTIME_IMAGE_REPOSITORY);
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

type PackageMetadata = {
  version?: unknown;
  config?: Record<string, unknown>;
};

function packageString(key: keyof PackageMetadata, fallback: string): string {
  const value = PACKAGE_METADATA[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function packageConfigString(key: string, fallback: string): string {
  const value = PACKAGE_METADATA.config?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readPackageMetadata(): PackageMetadata {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    const candidate = path.join(dir, "package.json");
    try {
      return JSON.parse(fs.readFileSync(candidate, "utf8")) as PackageMetadata;
    } catch (err) {
      if (!isMissingFileError(err)) {
        throw err;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("could not find package.json while resolving default runtime image");
    }
    dir = parent;
  }
}

function isMissingFileError(err: unknown): boolean {
  return err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
}
