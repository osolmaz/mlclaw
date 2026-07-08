import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DOCKER_STOP_GRACE_SECONDS = 300;

export type DockerRunner = {
  currentContext(): Promise<string>;
  contextExists(context: string): Promise<boolean>;
  contextEndpoint(context: string): Promise<string | undefined>;
  pull(image: string, context?: string): Promise<void>;
  run(params: DockerRunParams): Promise<void>;
  start(containerName: string, context?: string): Promise<void>;
  stop(containerName: string, context?: string): Promise<void>;
  rm(containerName: string, context?: string): Promise<void>;
  rmVolume(volumeName: string, context?: string): Promise<void>;
  disableRestart(containerName: string, context?: string): Promise<void>;
  logs(containerName: string, tail?: number, context?: string): Promise<string>;
  inspect(containerName: string, context?: string): Promise<DockerInspect | null>;
};

export type DockerRunParams = {
  containerName: string;
  image: string;
  envFile: string;
  volumeName: string;
  volumeMountPath: string;
  liveDir: string;
  context?: string;
};

export type DockerInspect = {
  exists: boolean;
  running: boolean;
  status?: string;
  image?: string;
};

export class CliDockerRunner implements DockerRunner {
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

  async run(params: DockerRunParams): Promise<void> {
    await docker(withContext(params.context, [
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
      "-v",
      `${params.volumeName}:${params.volumeMountPath}`,
      params.image,
    ]));
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

  async inspect(containerName: string, context?: string): Promise<DockerInspect | null> {
    try {
      const { stdout } = await docker(withContext(context, [
        "inspect",
        containerName,
        "--format",
        "{{.State.Running}}\t{{.State.Status}}\t{{.Config.Image}}",
      ]));
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

async function docker(args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync("docker", args, { encoding: "utf8" });
  } catch (err) {
    if (err instanceof Error && "stderr" in err && typeof err.stderr === "string") {
      err.message = `${err.message}\n${err.stderr}`;
    }
    throw err;
  }
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
