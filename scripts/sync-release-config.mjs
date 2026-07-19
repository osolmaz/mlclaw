import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageFile = path.join(root, "package.json");
const packageLockFile = path.join(root, "package-lock.json");
const dockerfile = path.join(root, "Dockerfile");
const generatedFile = path.join(root, "src/mlclaw/release-config.generated.ts");
const check = process.argv.includes("--check");
const pkg = JSON.parse(fs.readFileSync(packageFile, "utf8"));
const packageLock = JSON.parse(fs.readFileSync(packageLockFile, "utf8"));

const releaseConfig = {
  packageVersion: requiredString(pkg.version, "package version"),
  openclawVersion: requiredString(pkg.config?.openclawVersion, "OpenClaw version"),
  brokerkitVersion: requiredString(pkg.config?.brokerkitVersion, "BrokerKit version"),
  brokerkitPluginVersion: requiredString(pkg.config?.brokerkitPluginVersion, "BrokerKit plugin version"),
  runtimeImageRepository: requiredString(pkg.config?.runtimeImageRepository, "runtime image repository"),
};
if (pkg.dependencies?.["openclaw-brokerkit"] !== releaseConfig.brokerkitPluginVersion) {
  throw new Error("openclaw-brokerkit dependency must exactly match config.brokerkitPluginVersion");
}
if (
  packageLock.version !== releaseConfig.packageVersion ||
  packageLock.packages?.[""]?.version !== releaseConfig.packageVersion ||
  packageLock.packages?.[""]?.dependencies?.["openclaw-brokerkit"] !== releaseConfig.brokerkitPluginVersion
) {
  throw new Error("package-lock.json release metadata is stale; run npm install --package-lock-only");
}

const generated = `// Generated from package.json by scripts/sync-release-config.mjs. Do not edit.\nexport const RELEASE_CONFIG = ${JSON.stringify(releaseConfig, null, 2)} as const;\n`;
const runtimeImage = `${releaseConfig.runtimeImageRepository}:${releaseConfig.packageVersion}-openclaw-${releaseConfig.openclawVersion}`;
const dockerValues = new Map([
  ["OPENCLAW_VERSION", releaseConfig.openclawVersion],
  ["OPENCLAW_BASE_IMAGE", "ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION}"],
  ["BROKERKIT_PLUGIN_VERSION", releaseConfig.brokerkitPluginVersion],
  ["BROKERKIT_VERSION", releaseConfig.brokerkitVersion],
  ["MLCLAW_RUNTIME_IMAGE", runtimeImage],
]);
const currentDockerfile = fs.readFileSync(dockerfile, "utf8");
let synchronizedDockerfile = currentDockerfile;
for (const [name, value] of dockerValues) {
  const pattern = new RegExp(`^ARG ${name}=.*$`, "mu");
  if (!pattern.test(synchronizedDockerfile)) {
    throw new Error(`Dockerfile is missing ARG ${name}`);
  }
  synchronizedDockerfile = synchronizedDockerfile.replace(pattern, `ARG ${name}=${value}`);
}

if (check) {
  let stale = false;
  if (readOptional(generatedFile) !== generated) {
    process.stderr.write("src/mlclaw/release-config.generated.ts is stale\n");
    stale = true;
  }
  if (currentDockerfile !== synchronizedDockerfile) {
    process.stderr.write("Dockerfile release defaults are stale\n");
    stale = true;
  }
  if (stale) process.exit(1);
} else {
  fs.writeFileSync(generatedFile, generated);
  fs.writeFileSync(dockerfile, synchronizedDockerfile);
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string`);
  }
  return value;
}

function readOptional(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return "";
    throw error;
  }
}
