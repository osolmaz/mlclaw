import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DOCKER_STOP_GRACE_SECONDS = 300;

export type ContainerRunner = {
  readonly engine: ContainerEngine;
  probe(context?: string): Promise<ContainerRuntimeProbe>;
  currentContext(): Promise<string>;
  contextExists(context: string): Promise<boolean>;
  contextEndpoint(context: string): Promise<string | undefined>;
  pull(image: string, context?: string): Promise<void>;
  run(params: ContainerRunParams): Promise<void>;
  start(containerName: string, context?: string): Promise<void>;
  stop(containerName: string, context?: string): Promise<void>;
  rm(containerName: string, context?: string): Promise<void>;
  rmVolume(volumeName: string, context?: string): Promise<void>;
  disableRestart(containerName: string, context?: string): Promise<void>;
  logs(containerName: string, tail?: number, context?: string): Promise<string>;
  inspect(containerName: string, context?: string): Promise<ContainerInspect | null>;
};

export type ContainerEngine = "docker" | "podman";

export type ContainerProbeStatus = "ready" | "missing" | "permission-denied" | "unavailable";

export type ContainerRuntimeProbe = {
  engine: ContainerEngine;
  status: ContainerProbeStatus;
  context?: string;
  endpoint?: string;
  detail: string;
};

export type ContainerRunParams = {
  containerName: string;
  image: string;
  envFile: string;
  volumeName: string;
  volumeMountPath: string;
  liveDir: string;
  publishedPorts: PublishedPort[];
  context?: string;
};

export type PublishedPort = {
  hostAddress: string;
  hostPort: number;
  containerPort: number;
};

export type ContainerInspect = {
  exists: boolean;
  running: boolean;
  status?: string;
  image?: string;
};

type PodmanConnection = {
  name: string;
  uri?: string;
  isDefault: boolean;
};

export class CliDockerRunner implements ContainerRunner {
  readonly engine = "docker" as const;

  async probe(context?: string): Promise<ContainerRuntimeProbe> {
    try {
      const selected = context?.trim() || (await this.currentContext());
      if (!selected || !(await this.contextExists(selected))) {
        return unavailableProbe(this.engine, `Docker context ${selected || "<unknown>"} is not available`, selected);
      }
      await docker(withContext(selected, ["version", "--format", "{{.Server.Version}}"]), PROBE_TIMEOUT_MS);
      return {
        engine: this.engine,
        status: "ready",
        context: selected,
        ...(await this.contextEndpoint(selected).then((endpoint) => (endpoint ? { endpoint } : {}))),
        detail: `Docker context ${selected} is ready`,
      };
    } catch (err) {
      return classifyContainerProbeError(this.engine, err, context);
    }
  }

  async currentContext(): Promise<string> {
    const { stdout } = await docker(["context", "show"]);
    return stdout.trim();
  }

  async contextExists(context: string): Promise<boolean> {
    try {
      await docker(["context", "inspect", context]);
      return true;
    } catch {
      return false;
    }
  }

  async contextEndpoint(context: string): Promise<string | undefined> {
    try {
      const { stdout } = await docker(["context", "inspect", context, "--format", "{{json .Endpoints.docker.Host}}"]);
      const trimmed = stdout.trim();
      if (!trimmed || trimmed === "null") {
        return undefined;
      }
      return JSON.parse(trimmed) as string;
    } catch {
      return undefined;
    }
  }

  async pull(image: string, context?: string): Promise<void> {
    await docker(withContext(context, ["pull", image]));
  }

  async run(params: ContainerRunParams): Promise<void> {
    const ports = renderPublishedPorts(params.publishedPorts);
    await docker(
      withContext(params.context, [
        "run",
        "-d",
        "--name",
        params.containerName,
        "--restart",
        "unless-stopped",
        "--env-file",
        params.envFile,
        "-e",
        `OPENCLAW_LIVE_DIR=${params.liveDir}`,
        ...ports,
        "-v",
        `${params.volumeName}:${params.volumeMountPath}`,
        params.image,
      ]),
    );
  }

  async start(containerName: string, context?: string): Promise<void> {
    await docker(withContext(context, ["start", containerName]));
  }

  async stop(containerName: string, context?: string): Promise<void> {
    await docker(withContext(context, ["stop", "--time", String(DOCKER_STOP_GRACE_SECONDS), containerName]));
  }

  async rm(containerName: string, context?: string): Promise<void> {
    await docker(withContext(context, ["rm", containerName]));
  }

  async rmVolume(volumeName: string, context?: string): Promise<void> {
    try {
      await docker(withContext(context, ["volume", "rm", volumeName]));
    } catch (err) {
      if (isMissingVolumeError(err)) {
        return;
      }
      throw err;
    }
  }

  async disableRestart(containerName: string, context?: string): Promise<void> {
    await docker(withContext(context, ["update", "--restart", "no", containerName]));
  }

  async logs(containerName: string, tail = 200, context?: string): Promise<string> {
    const { stdout, stderr } = await docker(withContext(context, ["logs", "--tail", String(tail), containerName]));
    return mergeDockerLogStreams(stdout, stderr);
  }

  async inspect(containerName: string, context?: string): Promise<ContainerInspect | null> {
    try {
      const { stdout } = await docker(
        withContext(context, [
          "inspect",
          containerName,
          "--format",
          "{{.State.Running}}\t{{.State.Status}}\t{{.Config.Image}}",
        ]),
      );
      const [running, status, image] = stdout.trim().split("\t");
      return {
        exists: true,
        running: running === "true",
        ...(status ? { status } : {}),
        ...(image ? { image } : {}),
      };
    } catch (err) {
      if (isMissingContainerError(err)) {
        return null;
      }
      throw err;
    }
  }
}

export class CliPodmanRunner implements ContainerRunner {
  readonly engine = "podman" as const;

  async probe(context?: string): Promise<ContainerRuntimeProbe> {
    try {
      const selected = context?.trim() || (await this.currentContext());
      await podman(withPodmanConnection(selected, ["info", "--format", "json"]), PROBE_TIMEOUT_MS);
      return {
        engine: this.engine,
        status: "ready",
        context: selected,
        ...(await this.contextEndpoint(selected).then((endpoint) => (endpoint ? { endpoint } : {}))),
        detail:
          selected === LOCAL_PODMAN_CONNECTION
            ? "Podman default connection is ready"
            : `Podman connection ${selected} is ready`,
      };
    } catch (err) {
      return classifyContainerProbeError(this.engine, err, context?.trim());
    }
  }

  async currentContext(): Promise<string> {
    try {
      const { stdout } = await podman(["system", "connection", "list", "--format", "json"], PROBE_TIMEOUT_MS);
      return parsePodmanConnections(stdout).find((connection) => connection.isDefault)?.name ?? LOCAL_PODMAN_CONNECTION;
    } catch {
      return LOCAL_PODMAN_CONNECTION;
    }
  }

  async contextExists(context: string): Promise<boolean> {
    return (await this.probe(context)).status === "ready";
  }

  async contextEndpoint(context: string): Promise<string | undefined> {
    if (normalizePodmanConnection(context) === LOCAL_PODMAN_CONNECTION) {
      return undefined;
    }
    try {
      const { stdout } = await podman(["system", "connection", "list", "--format", "json"]);
      return parsePodmanConnections(stdout).find((connection) => connection.name === context)?.uri;
    } catch {
      return undefined;
    }
  }

  async pull(image: string, context?: string): Promise<void> {
    await podman(withPodmanConnection(context, ["pull", image]));
  }

  async run(params: ContainerRunParams): Promise<void> {
    const ports = renderPublishedPorts(params.publishedPorts);
    await podman(
      withPodmanConnection(params.context, [
        "run",
        "-d",
        "--name",
        params.containerName,
        "--restart",
        "unless-stopped",
        "--env-file",
        params.envFile,
        "-e",
        `OPENCLAW_LIVE_DIR=${params.liveDir}`,
        ...ports,
        "-v",
        `${params.volumeName}:${params.volumeMountPath}`,
        params.image,
      ]),
    );
  }

  async start(containerName: string, context?: string): Promise<void> {
    await podman(withPodmanConnection(context, ["start", containerName]));
  }

  async stop(containerName: string, context?: string): Promise<void> {
    await podman(withPodmanConnection(context, ["stop", "--time", String(DOCKER_STOP_GRACE_SECONDS), containerName]));
  }

  async rm(containerName: string, context?: string): Promise<void> {
    await podman(withPodmanConnection(context, ["rm", containerName]));
  }

  async rmVolume(volumeName: string, context?: string): Promise<void> {
    try {
      await podman(withPodmanConnection(context, ["volume", "rm", volumeName]));
    } catch (err) {
      if (!isMissingVolumeError(err)) {
        throw err;
      }
    }
  }

  async disableRestart(containerName: string, context?: string): Promise<void> {
    await podman(withPodmanConnection(context, ["update", "--restart", "no", containerName]));
  }

  async logs(containerName: string, tail = 200, context?: string): Promise<string> {
    const { stdout, stderr } = await podman(
      withPodmanConnection(context, ["logs", "--tail", String(tail), containerName]),
    );
    return mergeDockerLogStreams(stdout, stderr);
  }

  async inspect(containerName: string, context?: string): Promise<ContainerInspect | null> {
    try {
      const { stdout } = await podman(
        withPodmanConnection(context, [
          "inspect",
          containerName,
          "--format",
          "{{.State.Running}}\t{{.State.Status}}\t{{.Config.Image}}",
        ]),
      );
      const [running, status, image] = stdout.trim().split("\t");
      return {
        exists: true,
        running: running === "true",
        ...(status ? { status } : {}),
        ...(image ? { image } : {}),
      };
    } catch (err) {
      if (isMissingContainerError(err)) {
        return null;
      }
      throw err;
    }
  }
}

export function renderPublishedPorts(ports: PublishedPort[]): string[] {
  if (ports.length === 0) throw new Error("at least one published port is required");
  const seen = new Set<string>();
  return ports.flatMap((port) => {
    if (port.hostAddress === "0.0.0.0" || port.hostAddress === "::") {
      throw new Error("wildcard container port publishing is not allowed");
    }
    const key = `${port.hostAddress}:${port.hostPort}:${port.containerPort}`;
    if (seen.has(key)) throw new Error(`duplicate published port: ${key}`);
    seen.add(key);
    return ["-p", key];
  });
}

export function containerNameFor(agent: string): string {
  return `mlclaw-${agent}`;
}

export function volumeNameFor(agent: string): string {
  return `mlclaw-${agent}-live`;
}

export function mergeDockerLogStreams(stdout: string, stderr: string): string {
  return `${stdout}${stderr}`;
}

export function withContext(context: string | undefined, args: string[]): string[] {
  return context ? ["--context", context, ...args] : args;
}

export function withPodmanConnection(context: string | undefined, args: string[]): string[] {
  const selected = normalizePodmanConnection(context);
  return selected === LOCAL_PODMAN_CONNECTION ? args : ["--connection", selected, ...args];
}

export function classifyContainerProbeError(
  engine: ContainerEngine,
  err: unknown,
  context?: string,
): ContainerRuntimeProbe {
  const message = dockerErrorMessage(err);
  if (isCommandMissing(err)) {
    return { engine, status: "missing", detail: `${displayEngine(engine)} is not installed` };
  }
  if (message.includes("permission denied") || message.includes("access is denied")) {
    return unavailableProbe(
      engine,
      `${displayEngine(engine)} is installed but permission was denied`,
      context,
      "permission-denied",
    );
  }
  return unavailableProbe(engine, `${displayEngine(engine)} is installed but its engine is unavailable`, context);
}

export function parsePodmanConnections(raw: string): PodmanConnection[] {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.flatMap((value): PodmanConnection[] => {
    if (!value || typeof value !== "object") {
      return [];
    }
    const record = value as Record<string, unknown>;
    const name = record.Name ?? record.name;
    const uri = record.URI ?? record.uri;
    const isDefault = record.Default ?? record.default;
    if (typeof name !== "string" || !name.trim()) {
      return [];
    }
    return [
      {
        name: name.trim(),
        ...(typeof uri === "string" && uri.trim() ? { uri: uri.trim() } : {}),
        isDefault: isDefault === true,
      },
    ];
  });
}

const PROBE_TIMEOUT_MS = 5_000;
const LOCAL_PODMAN_CONNECTION = "local";

async function docker(args: string[], timeout?: number): Promise<{ stdout: string; stderr: string }> {
  return await containerCommand("docker", args, timeout);
}

async function podman(args: string[], timeout?: number): Promise<{ stdout: string; stderr: string }> {
  return await containerCommand("podman", args, timeout);
}

async function containerCommand(
  command: ContainerEngine,
  args: string[],
  timeout?: number,
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync(command, args, { encoding: "utf8", ...(timeout ? { timeout } : {}) });
  } catch (err) {
    if (err instanceof Error && "stderr" in err && typeof err.stderr === "string") {
      err.message = `${err.message}\n${err.stderr}`;
    }
    throw err;
  }
}

function unavailableProbe(
  engine: ContainerEngine,
  detail: string,
  context?: string,
  status: ContainerProbeStatus = "unavailable",
): ContainerRuntimeProbe {
  return { engine, status, ...(context ? { context } : {}), detail };
}

function normalizePodmanConnection(context: string | undefined): string {
  return context?.trim() || LOCAL_PODMAN_CONNECTION;
}

function displayEngine(engine: ContainerEngine): string {
  return engine === "docker" ? "Docker" : "Podman";
}

function isCommandMissing(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && err.code === "ENOENT");
}

export function isMissingContainerError(err: unknown): boolean {
  const message = dockerErrorMessage(err);
  return message.includes("no such object") || message.includes("no such container");
}

export function isMissingVolumeError(err: unknown): boolean {
  return dockerErrorMessage(err).includes("no such volume");
}

function dockerErrorMessage(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).toLowerCase();
}
