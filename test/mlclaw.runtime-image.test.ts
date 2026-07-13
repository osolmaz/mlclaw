import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  BROKERKIT_PLUGIN_VERSION,
  BROKERKIT_VERSION,
  DEFAULT_RUNTIME_IMAGE,
  OPENCLAW_BASE_IMAGE,
  OPENCLAW_VERSION,
  PACKAGE_VERSION,
} from "../src/mlclaw/runtime-image.js";

describe("runtime image Dockerfile", () => {
  it("healthchecks the ML Claw gateway port", async () => {
    const dockerfile = await fs.readFile("Dockerfile", "utf8");

    expect(dockerfile).toContain(`ARG OPENCLAW_VERSION=${OPENCLAW_VERSION}`);
    expect(dockerfile).toContain(`ARG BROKERKIT_PLUGIN_VERSION=${BROKERKIT_PLUGIN_VERSION}`);
    expect(dockerfile).toContain(`ARG BROKERKIT_VERSION=${BROKERKIT_VERSION}`);
    expect(OPENCLAW_BASE_IMAGE).toBe(`ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION}`);
    expect(dockerfile).toContain("ARG OPENCLAW_BASE_IMAGE=ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION}");
    expect(dockerfile).toContain(`ARG MLCLAW_RUNTIME_IMAGE=${DEFAULT_RUNTIME_IMAGE}`);
    expect(dockerfile).toContain("FROM ${OPENCLAW_BASE_IMAGE}");
    expect(dockerfile).toContain(
      'git -C /src fetch --depth=1 https://github.com/osolmaz/brokerkit.git "$BROKERKIT_VERSION"',
    );
    expect(dockerfile).toContain('test "$(git -C /src rev-parse HEAD)" = "$BROKERKIT_VERSION"');
    expect(dockerfile).toContain(
      "COPY --from=brokerkit-plugin-build /out/openclaw-brokerkit-${BROKERKIT_PLUGIN_VERSION}.tgz",
    );
    expect(dockerfile).toContain("/opt/openclaw-plugins/node_modules/openclaw-brokerkit/openclaw.plugin.json");
    expect(dockerfile).toContain(
      "ENV MLCLAW_BROKERKIT_PLUGIN_PATH=/opt/openclaw-plugins/node_modules/openclaw-brokerkit",
    );
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
    expect(dockerfile).toContain('"huggingface_hub==1.19.0"');
    expect(dockerfile).toContain('"datasets==5.0.0"');
    expect(dockerfile).toContain('"safetensors==0.8.0"');
    expect(dockerfile).toContain('"hf-discover==1.3.7"');
    expect(dockerfile).not.toContain("--no-deps");
    expect(dockerfile).toContain('"uv==0.11.28"');
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
    expect(entrypoint).toContain("node /app/hf-state-sync.js prepare-restore");
    expect(entrypoint).toContain('export MLCLAW_OPENCLAW_UID="$OPENCLAW_UID"');
    expect(entrypoint).toContain('export MLCLAW_OPENCLAW_GID="$OPENCLAW_GID"');
    expect(entrypoint).toContain('RESTORED_PROTECTED_STATE_DIR="$LIVE_DIR/.mlclaw-protected"');
    expect(entrypoint).toContain('PROTECTED_STATE_DIR="/var/lib/mlclaw-protected"');
    expect(entrypoint).toContain('HF_BROKER_STATE_DIR="$PROTECTED_STATE_DIR/hf-broker"');
    expect(entrypoint).toContain('install -d -m 0710 -o root -g hf-broker "$PROTECTED_STATE_DIR"');
    expect(entrypoint).toContain('chmod 0710 "$PROTECTED_STATE_DIR"');
    expect(entrypoint).not.toContain("printf '{\"grants\":[]}\\n'");
    expect(entrypoint).not.toContain("grant_store");
    expect(entrypoint).not.toContain('$HF_BROKER_STATE_DIR/grants');
    expect(entrypoint).toContain("HF_TOKEN:-${HUGGINGFACE_HUB_TOKEN:-${MLCLAW_ROUTER_TOKEN:-");
    expect(entrypoint).toContain('export MLCLAW_TRUSTED_HF_TOKEN_FILE="$token_file"');
    expect(entrypoint).toContain('chown "$OPENCLAW_IDENTITY" "$agent_secret_file"');
    expect(entrypoint).toContain('install -d -m 0711 -o root -g hf-broker "$HF_BROKER_RUN_DIR"');
    expect(entrypoint).toContain('export MLCLAW_PROTECTED_STATE_DIR="$PROTECTED_STATE_DIR"');
    expect(entrypoint).toContain('env MLCLAW_STATE_HF_TOKEN="$STATE_HF_TOKEN" timeout');
    expect(entrypoint).toContain('export MLCLAW_STATE_HF_TOKEN="$STATE_HF_TOKEN"');
    expect(entrypoint).toContain("! -name .mlclaw-protected");
    expect(entrypoint.indexOf("node /app/hf-state-sync.js prepare-restore")).toBeLessThan(
      entrypoint.lastIndexOf("\nstart_hf_broker\n"),
    );
    expect(entrypoint.indexOf("\nrestore_protected_state\n")).toBeLessThan(
      entrypoint.lastIndexOf("\nstart_hf_broker\n"),
    );
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
