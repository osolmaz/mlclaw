import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RUNTIME_IMAGE_REPOSITORY = "ghcr.io/osolmaz/huggingclaw-runtime";

export const DEFAULT_RUNTIME_IMAGE = `${RUNTIME_IMAGE_REPOSITORY}:${readPackageVersion()}`;

export function resolveRuntimeImage(value?: string, env: NodeJS.ProcessEnv = process.env): string {
  return value?.trim() || env.HUGGINGCLAW_RUNTIME_IMAGE?.trim() || DEFAULT_RUNTIME_IMAGE;
}

function readPackageVersion(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    const candidate = path.join(dir, "package.json");
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8")) as { version?: unknown };
      if (typeof parsed.version === "string" && parsed.version.trim()) {
        return parsed.version.trim();
      }
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
