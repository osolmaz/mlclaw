import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { DEFAULT_RUNTIME_IMAGE, OPENCLAW_BASE_IMAGE, OPENCLAW_VERSION, PACKAGE_VERSION } from "../src/mlclaw/runtime-image.js";

describe("runtime image Dockerfile", () => {
  it("healthchecks the ML Claw gateway port", async () => {
    const dockerfile = await fs.readFile("Dockerfile", "utf8");

    expect(dockerfile).toContain(`ARG OPENCLAW_VERSION=${OPENCLAW_VERSION}`);
    expect(OPENCLAW_BASE_IMAGE).toBe(`ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION}`);
    expect(dockerfile).toContain("ARG OPENCLAW_BASE_IMAGE=ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION}");
    expect(dockerfile).toContain(`ARG MLCLAW_RUNTIME_IMAGE=${DEFAULT_RUNTIME_IMAGE}`);
    expect(dockerfile).toContain("FROM ${OPENCLAW_BASE_IMAGE}");
    expect(dockerfile).not.toContain("ghcr.io/osolmaz/mlclaw-runtime");
    expect(DEFAULT_RUNTIME_IMAGE).toBe(`ghcr.io/osolmaz/mlclaw:${PACKAGE_VERSION}-openclaw-${OPENCLAW_VERSION}`);
    expect(dockerfile).toContain("ENV PORT=7860");
    expect(dockerfile).toContain("ENV OPENCLAW_GATEWAY_PORT=7861");
    expect(dockerfile).toContain("EXPOSE 7860");
    expect(dockerfile).toContain("HEALTHCHECK");
    expect(dockerfile).toContain("--interval=30s");
    expect(dockerfile).toContain("--start-period=60s");
    expect(dockerfile).toContain("process.env.PORT");
    expect(dockerfile).toContain("/health");
    expect(dockerfile).toContain("python3 -m pip install --break-system-packages --no-cache-dir");
    expect(dockerfile).toContain("\"huggingface_hub==1.19.0\"");
    expect(dockerfile).toContain("\"datasets==5.0.0\"");
    expect(dockerfile).toContain("\"safetensors==0.8.0\"");
    expect(dockerfile).toContain("\"hf-discover==1.3.7\"");
    expect(dockerfile).not.toContain("--no-deps");
    expect(dockerfile).toContain("\"uv==0.11.28\"");
    expect(dockerfile).toContain("COPY --from=sync-build /build/dist/hf-tooling-seed.js /app/hf-tooling-seed.js");
    expect(dockerfile).toContain("COPY package.json package-lock.json tsconfig.json vite.control-ui.config.ts ./");
    expect(dockerfile).not.toContain("18789/healthz");
  });

  it("pins OpenClaw's default workspace to the ML Claw live workspace", async () => {
    const config = JSON.parse(await fs.readFile("openclaw.default.json", "utf8")) as {
      agents?: { defaults?: { workspace?: string } };
    };
    expect(config.agents?.defaults?.workspace).toBe("${OPENCLAW_WORKSPACE_DIR}");
  });

  it("leaves workspace tooling seeding to the bootstrap-aware runtime", async () => {
    const entrypoint = await fs.readFile("entrypoint.sh", "utf8");
    const runtimeCli = await fs.readFile("src/mlclaw-space-runtime/cli.ts", "utf8");

    expect(entrypoint).toContain(
      'gosu "$OPENCLAW_IDENTITY" node /app/openclaw.mjs setup --baseline --workspace "$WORKSPACE_DIR"',
    );
    expect(entrypoint).toContain('gosu "$OPENCLAW_IDENTITY" node /app/hf-state-sync.js restore');
    expect(entrypoint).toContain('node /app/hf-state-sync.js prepare-restore');
    expect(entrypoint).toContain('export MLCLAW_OPENCLAW_UID="$OPENCLAW_UID"');
    expect(entrypoint).toContain('export MLCLAW_OPENCLAW_GID="$OPENCLAW_GID"');
    expect(entrypoint).toContain('if [ -z "${MLCLAW_OPERATOR_BROKERS_FILE:-}" ]; then');
    expect(entrypoint).toContain('export MLCLAW_OPERATOR_BROKERS_FILE="$operator_brokers_file"');
    expect(entrypoint).toContain('"id":"hf-broker"');
    expect(entrypoint).toContain('"token_file":"%s"');
    expect(entrypoint).not.toContain("MLCLAW_HF_BROKER_OPERATOR_SECRET_FILE");
    for (const secret of [
      "MLCLAW_CREDENTIAL_KEY",
      "MLCLAW_SESSION_SECRET",
      "OAUTH_CLIENT_SECRET",
      "HF_TOKEN",
      "HUGGINGFACE_HUB_TOKEN",
    ]) {
      expect(entrypoint).toContain(`-u ${secret}`);
    }
    expect(entrypoint).not.toContain("node /app/hf-tooling-seed.js");
    expect(runtimeCli).toContain("--wait-for-bootstrap");
    expect(runtimeCli).toContain("toolingSeedEnvironment");
    expect(runtimeCli).toContain('toolingSeeder.once("error"');
  });
});
