import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TAILSCALE_TIMEOUT_MS = 5_000;

export type TailscaleDiscovery =
  { ready: true; ipv4: string; dnsName?: string; tailnet?: string } | { ready: false; reason: string };

export type TailscaleServeMapping = {
  dnsName: string;
  httpsPort: number;
  target: string;
};

export type TailscaleServeState = "free" | "owned" | "conflict";

export type TailscaleRunner = {
  discover(): Promise<TailscaleDiscovery>;
  mappingState(mapping: TailscaleServeMapping): Promise<TailscaleServeState>;
  ensureMapping(mapping: TailscaleServeMapping): Promise<"created" | "unchanged">;
  removeMapping(mapping: TailscaleServeMapping): Promise<"removed" | "missing" | "drifted">;
};

type CommandResult = { stdout: string; stderr: string };

export class CliTailscaleRunner implements TailscaleRunner {
  constructor(private readonly run: (args: string[]) => Promise<CommandResult> = runTailscale) {}

  async discover(): Promise<TailscaleDiscovery> {
    let status: unknown;
    try {
      status = JSON.parse((await this.run(["status", "--json"])).stdout);
    } catch (error) {
      return { ready: false, reason: commandErrorMessage(error) };
    }
    return parseTailscaleStatus(status);
  }

  async mappingState(mapping: TailscaleServeMapping): Promise<TailscaleServeState> {
    const config = await this.readServeConfig();
    return tailscaleServeMappingState(config, mapping);
  }

  async ensureMapping(mapping: TailscaleServeMapping): Promise<"created" | "unchanged"> {
    const state = await this.mappingState(mapping);
    if (state === "owned") {
      return "unchanged";
    }
    if (state === "conflict") {
      throw new Error(`Tailscale Serve HTTPS port ${mapping.httpsPort} is already in use`);
    }
    try {
      await this.run(["serve", "--bg", "--yes", `--https=${mapping.httpsPort}`, mapping.target]);
    } catch (error) {
      const message = commandErrorMessage(error);
      const approvalUrl = extractTailscaleApprovalUrl(message);
      if (approvalUrl) throw new TailscaleApprovalRequiredError(approvalUrl, message);
      throw error;
    }
    if ((await this.mappingState(mapping)) !== "owned") {
      throw new Error("Tailscale Serve did not retain the requested ML Claw mapping");
    }
    return "created";
  }

  async removeMapping(mapping: TailscaleServeMapping): Promise<"removed" | "missing" | "drifted"> {
    const state = await this.mappingState(mapping);
    if (state === "free") {
      return "missing";
    }
    if (state === "conflict") {
      return "drifted";
    }
    await this.run(["serve", "--yes", `--https=${mapping.httpsPort}`, "off"]);
    if ((await this.mappingState(mapping)) !== "free") {
      throw new Error("Tailscale Serve did not remove the ML Claw mapping");
    }
    return "removed";
  }

  private async readServeConfig(): Promise<unknown> {
    const { stdout } = await this.run(["serve", "status", "--json"]);
    try {
      return JSON.parse(stdout || "{}");
    } catch {
      throw new Error("Tailscale Serve returned invalid JSON");
    }
  }
}

export function parseTailscaleStatus(value: unknown): TailscaleDiscovery {
  const status = recordValue(value);
  if (!status) {
    return { ready: false, reason: "Tailscale returned an invalid status" };
  }
  if (status.BackendState !== "Running") {
    return { ready: false, reason: `Tailscale is ${stringValue(status.BackendState) ?? "not running"}` };
  }
  const self = recordValue(status.Self);
  if (self?.Online === false) {
    return { ready: false, reason: "Tailscale is offline" };
  }
  const ipv4 = arrayValue(self?.TailscaleIPs)?.find(
    (candidate) => typeof candidate === "string" && isTailscaleIpv4(candidate),
  );
  if (typeof ipv4 !== "string") return { ready: false, reason: "Tailscale IPv4 address is unavailable" };
  const dnsName = normalizeTailscaleDnsName(stringValue(self?.DNSName));
  const tailnet = stringValue(recordValue(status.CurrentTailnet)?.Name);
  return { ready: true, ipv4, ...(dnsName ? { dnsName } : {}), ...(tailnet ? { tailnet } : {}) };
}

export class TailscaleApprovalRequiredError extends Error {
  constructor(
    readonly approvalUrl: string,
    message: string,
  ) {
    super(message);
    this.name = "TailscaleApprovalRequiredError";
  }
}

export function extractTailscaleApprovalUrl(message: string): string | undefined {
  const match = message.match(/https:\/\/login\.tailscale\.com\/[A-Za-z0-9_?&=./%-]+/);
  if (!match) return undefined;
  try {
    const url = new URL(match[0]);
    return url.protocol === "https:" && url.hostname === "login.tailscale.com" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function tailscaleServeMappingState(value: unknown, mapping: TailscaleServeMapping): TailscaleServeState {
  const config = recordValue(value);
  if (!config) {
    throw new Error("Tailscale Serve returned an invalid configuration");
  }
  const tcp = recordValue(config.TCP);
  const web = recordValue(config.Web);
  const foreground = recordValue(config.Foreground);
  const expectedHostPort = `${mapping.dnsName}:${mapping.httpsPort}`;
  if (recordValue(config.AllowFunnel)?.[expectedHostPort] === true) {
    return "conflict";
  }
  if (Object.values(foreground ?? {}).some((candidate) => serveConfigUsesPort(candidate, mapping.httpsPort))) {
    return "conflict";
  }
  const tcpHandler = recordValue(tcp?.[String(mapping.httpsPort)]);
  const webEntries = Object.entries(web ?? {}).filter(([hostPort]) => hostPort.endsWith(`:${mapping.httpsPort}`));
  const portIsFree = !tcpHandler && webEntries.length === 0;
  if (portIsFree) {
    return "free";
  }
  if (tcpHandler?.HTTPS !== true || webEntries.length !== 1 || webEntries[0]?.[0] !== expectedHostPort) {
    return "conflict";
  }
  const webConfig = recordValue(webEntries[0][1]);
  const handlers = recordValue(webConfig?.Handlers);
  const handlerEntries = Object.entries(handlers ?? {});
  if (handlerEntries.length !== 1 || handlerEntries[0]?.[0] !== "/") {
    return "conflict";
  }
  const rootHandler = recordValue(handlerEntries[0][1]);
  return rootHandler?.Proxy === mapping.target ? "owned" : "conflict";
}

function serveConfigUsesPort(value: unknown, port: number): boolean {
  const config = recordValue(value);
  if (!config) {
    return false;
  }
  if (recordValue(config.TCP)?.[String(port)]) {
    return true;
  }
  return Object.keys(recordValue(config.Web) ?? {}).some((hostPort) => hostPort.endsWith(`:${port}`));
}

export function tailscaleAccessOrigin(mapping: Pick<TailscaleServeMapping, "dnsName" | "httpsPort">): string {
  return `https://${mapping.dnsName}${mapping.httpsPort === 443 ? "" : `:${mapping.httpsPort}`}`;
}

function normalizeTailscaleDnsName(value: string | undefined): string | undefined {
  const normalized = value?.trim().replace(/\.$/, "").toLowerCase();
  if (!normalized || normalized.length > 253 || !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(normalized)) {
    return undefined;
  }
  return normalized;
}

async function runTailscale(args: string[]): Promise<CommandResult> {
  try {
    return await execFileAsync("tailscale", args, {
      encoding: "utf8",
      timeout: TAILSCALE_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    throw new Error(commandErrorMessage(error), { cause: error });
  }
}

function commandErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
  if (stderr) {
    return stderr;
  }
  const stdout = "stdout" in error && typeof error.stdout === "string" ? error.stdout.trim() : "";
  if (stdout) {
    return stdout;
  }
  if ("code" in error && error.code === "ENOENT") {
    return "Tailscale is not installed";
  }
  if ("killed" in error && error.killed === true) {
    return "Tailscale command timed out";
  }
  return error.message;
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function arrayValue(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function isTailscaleIpv4(value: string): boolean {
  const octets = value.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false;
  return octets[0] === 100 && (octets[1] as number) >= 64 && (octets[1] as number) <= 127;
}
