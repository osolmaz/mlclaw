import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateSpaceRepo } from "../src/mlclaw/git.js";
import { BROKERKIT_PLUGIN_VERSION, BROKERKIT_VERSION, OPENCLAW_BASE_IMAGE } from "../src/mlclaw/runtime-image.js";

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)))
    .sort();
}

describe("generated Space repository", () => {
  it("uses an explicit runtime image when requested", async () => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-space-test-"));
    await generateSpaceRepo(process.cwd(), outDir, { runtimeImage: "example/runtime:test" });

    const files = await listFiles(outDir);
    const required = [
      ".gitattributes",
      "Dockerfile",
      "README.md",
      "assets/assistant-avatar.svg",
      "assets/hf-logo.svg",
      "assets/hf-logo.png.base64",
      "assets/mlclaw.svg",
      "assets/mlclaw-control-ui/index.html",
      "assets/hf-tooling/manifest.json",
      "assets/hf-tooling/skills/hf-cli/SKILL.md",
    ];

    for (const file of required) {
      expect(files).toContain(file);
    }
    expect(files.some((file) => /^assets\/mlclaw-control-ui\/assets\/.*\.js$/.test(file))).toBe(true);
    expect(files.some((file) => /^assets\/mlclaw-control-ui\/assets\/.*\.css$/.test(file))).toBe(true);
    for (const file of files) {
      expect(
        file === ".gitattributes" || file === "Dockerfile" || file === "README.md" || file.startsWith("assets/"),
      ).toBe(true);
    }

    expect(files.some((file) => file.startsWith("src/mlclaw/"))).toBe(false);
    expect(files.some((file) => file.startsWith("src/"))).toBe(false);
    expect(files).not.toContain("scripts/parity-probe.ts");
    expect(files.some((file) => file.startsWith("dist/"))).toBe(false);
    await expect(fs.readFile(path.join(outDir, "README.md"), "utf8")).resolves.toContain("assets/mlclaw.svg");
    const readme = await fs.readFile(path.join(outDir, "README.md"), "utf8");
    expect(readme).toContain("hf_oauth_scopes:");
    expect(readme).toContain("  - read-mcp");
    expect(readme).toContain("  - jobs");
    expect(readme).not.toContain("  - openid");
    expect(readme).not.toContain("  - profile");
    await expect(fs.readFile(path.join(outDir, "Dockerfile"), "utf8")).resolves.toBe("FROM example/runtime:test\n");
  });

  it("bundles the Space runtime by default", async () => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "mlclaw-space-test-"));
    await generateSpaceRepo(process.cwd(), outDir);

    const files = await listFiles(outDir);
    const required = [
      ".gitattributes",
      "Dockerfile",
      "README.md",
      "assets/assistant-avatar.svg",
      "assets/hf-logo.svg",
      "assets/hf-logo.png.base64",
      "assets/mlclaw.svg",
      "assets/mlclaw-control-ui/index.html",
      "assets/hf-tooling/manifest.json",
      "assets/hf-tooling/skills/hf-cli/SKILL.md",
      "runtime/entrypoint.sh",
      "runtime/hf-state-sync.js",
      "runtime/hf-broker.scope.json",
      "runtime/hf-tooling-seed.js",
      "runtime/mlclaw-space-runtime.js",
      "runtime/openclaw.default.json",
      "runtime/scripts/configure-huggingface-model.mjs",
      "runtime/scripts/configure-telegram.mjs",
      "runtime/scripts/report-telegram-probe.mjs",
    ];

    for (const file of required) {
      expect(files).toContain(file);
    }
    expect(files.some((file) => /^assets\/mlclaw-control-ui\/assets\/.*\.js$/.test(file))).toBe(true);
    expect(files.some((file) => /^assets\/mlclaw-control-ui\/assets\/.*\.css$/.test(file))).toBe(true);
    for (const file of files) {
      expect(
        file === ".gitattributes" ||
          file === "Dockerfile" ||
          file === "README.md" ||
          file.startsWith("assets/") ||
          file.startsWith("runtime/"),
      ).toBe(true);
    }
    expect(files.some((file) => file.startsWith("src/"))).toBe(false);
    expect(files.some((file) => file.startsWith("docs/"))).toBe(false);
    expect(files).not.toContain("scripts/parity-probe.ts");

    const dockerfile = await fs.readFile(path.join(outDir, "Dockerfile"), "utf8");
    expect(dockerfile).toContain(`FROM ${OPENCLAW_BASE_IMAGE}`);
    expect(dockerfile).toContain(`ARG BROKERKIT_PLUGIN_VERSION=${BROKERKIT_PLUGIN_VERSION}`);
    expect(dockerfile).toContain(`ARG BROKERKIT_VERSION=${BROKERKIT_VERSION}`);
    expect(dockerfile).toContain(
      'git -C /src fetch --depth=1 https://github.com/osolmaz/brokerkit.git "$BROKERKIT_VERSION"',
    );
    expect(dockerfile).toContain('test "$(git -C /src rev-parse HEAD)" = "$BROKERKIT_VERSION"');
    expect(dockerfile).toContain("GOWORK=off go build -trimpath -o /out/hf-broker ./brokers/huggingface/cmd/hf-broker");
    expect(dockerfile).not.toContain("github.com/osolmaz/hf-broker.git");
    expect(dockerfile).toContain(
      "COPY --from=brokerkit-plugin-build /out/openclaw-brokerkit-${BROKERKIT_PLUGIN_VERSION}.tgz",
    );
    expect(dockerfile).toContain("/opt/openclaw-plugins/node_modules/openclaw-brokerkit/openclaw.plugin.json");
    expect(dockerfile).toContain(
      "ENV MLCLAW_BROKERKIT_PLUGIN_PATH=/opt/openclaw-plugins/node_modules/openclaw-brokerkit",
    );
    expect(dockerfile).toContain("COPY runtime/hf-broker.scope.json /app/hf-broker.scope.json");
    expect(dockerfile).toContain("base64 -d /app/assets/hf-logo.png.base64 > /app/assets/hf-logo.png");
    const encodedHfLogo = await fs.readFile(path.join(outDir, "assets/hf-logo.png.base64"), "utf8");
    expect([...Buffer.from(encodedHfLogo.trim(), "base64").subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const brokerScope = JSON.parse(await fs.readFile(path.join(outDir, "runtime/hf-broker.scope.json"), "utf8")) as {
      rules: Array<{ operations: string[] }>;
    };
    expect(brokerScope.rules.some((rule) => rule.operations.includes("inference.models.list"))).toBe(true);
    expect(brokerScope.rules.some((rule) => rule.operations.includes("inference.chat.complete"))).toBe(true);
    expect(dockerfile).toContain("COPY --chown=node:node runtime/hf-state-sync.js /app/hf-state-sync.js");
    expect(dockerfile).toContain("COPY --chown=node:node runtime/hf-tooling-seed.js /app/hf-tooling-seed.js");
    expect(dockerfile).toContain('"hf-discover==1.3.7"');
    expect(dockerfile).toContain('"uv==0.11.28"');
    expect(dockerfile).toContain('CMD ["/app/entrypoint.sh"]');
    await expect(fs.readFile(path.join(outDir, "runtime/openclaw.default.json"), "utf8")).resolves.toContain(
      '"dangerouslyDisableDeviceAuth": true',
    );
  });
});
