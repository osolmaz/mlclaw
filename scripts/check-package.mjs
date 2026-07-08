import { execFileSync } from "node:child_process";
import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const expectedBins = {
  mlclaw: "dist/mlclaw.mjs",
};
for (const [name, target] of Object.entries(expectedBins)) {
  if (pkg.bin?.[name] !== target) {
    throw new Error(`package.json bin.${name} must point to ${target}`);
  }
}
if (pkg.private) {
  throw new Error("package.json must not be private; mlclaw is published to npm");
}

const raw = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const [pack] = JSON.parse(raw);
const files = new Set(pack.files.map((file) => file.path));

const required = [
  ".agents/skills/mlclaw/SKILL.md",
  ".agents/skills/mlclaw/agents/openai.yaml",
  "LICENSE",
  "README.md",
  "package.json",
  "dist/hf-state-sync.js",
  "dist/hf-tooling-seed.js",
  "dist/mlclaw.mjs",
  "dist/mlclaw-space-runtime.js",
  "mlclaw.sh",
  "mlclaw.ps1",
  "Dockerfile",
  "entrypoint.sh",
  "openclaw.default.json",
  "tsconfig.json",
  "assets/mlclaw.svg",
  "assets/hf-tooling/manifest.json",
  "assets/hf-tooling/skills/hf-cli/SKILL.md",
  "assets/hf-tooling/skills/hf-mem/SKILL.md",
  "assets/hf-tooling/skills/huggingface-best/SKILL.md",
  "assets/hf-tooling/skills/huggingface-datasets/SKILL.md",
  "assets/hf-tooling/skills/huggingface-gradio/SKILL.md",
  "assets/hf-tooling/skills/huggingface-local-models/SKILL.md",
  "assets/hf-tooling/skills/huggingface-papers/SKILL.md",
  "assets/hf-tooling/skills/huggingface-spaces/SKILL.md",
  "assets/hf-tooling/skills/huggingface-tool-builder/SKILL.md",
  "assets/hf-tooling/skills/huggingface-zerogpu/SKILL.md",
  "assets/hf-tooling/templates/.agents/mcp/huggingface.json",
  "assets/hf-tooling/templates/examples/huggingface/README.md",
  "space/README.md",
  "scripts/configure-telegram.mjs",
  "scripts/configure-huggingface-model.mjs",
  "scripts/report-telegram-probe.mjs",
  "src/hf-bucket-client/client.ts",
  "src/hf-state-sync/cli.ts",
  "src/vendor/hfjs-xet/utils/uploadShards.ts",
];

for (const file of required) {
  if (!files.has(file)) {
    throw new Error(`npm package is missing required file: ${file}`);
  }
}

for (const file of files) {
  if (
    file.startsWith("test/") ||
    file.startsWith("docs/") ||
    file.startsWith("src/mlclaw/") ||
    file.startsWith("src/mlclaw-space-runtime/") ||
    file === "scripts/parity-probe.ts" ||
    file === "dist/parity-probe.mjs"
  ) {
    throw new Error(`npm package includes dev-only file: ${file}`);
  }
}

console.log(`Package contents OK (${files.size} files).`);
