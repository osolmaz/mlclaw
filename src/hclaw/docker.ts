import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DOCKER_STOP_GRACE_SECONDS = 300;

export type DockerRunner = {
  pull(image: string): Promise<void>;
  run(params: DockerRunParams): Promise<void>;
  start(containerName: string): Promise<void>;
  stop(containerName: string): Promise<void>;
  rm(containerName: string): Promise<void>;
  rmVolume(volumeName: string): Promise<void>;
  disableRestart(containerName: string): Promise<void>;
  logs(containerName: string, tail?: number): Promise<string>;
  inspect(containerName: string): Promise<DockerInspect | null>;
};

export type DockerRunParams = {
  containerName: string;
  image: string;
  envFile: string;
  volumeName: string;
  volumeMountPath: string;
  liveDir: string;
};

export type DockerInspect = {
  exists: boolean;
  running: boolean;
  status?: string;
  image?: string;
};

export class CliDockerRunner implements DockerRunner {
  async pull(image: string): Promise<void> {
    await docker(["pull", image]);
  }

  async run(params: DockerRunParams): Promise<void> {
    await docker([
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
    ]);
  }

  async start(containerName: string): Promise<void> {
    await docker(["start", containerName]);
  }

  async stop(containerName: string): Promise<void> {
    await docker(["stop", "--time", String(DOCKER_STOP_GRACE_SECONDS), containerName]);
  }

  async rm(containerName: string): Promise<void> {
    await docker(["rm", containerName]);
  }

  async rmVolume(volumeName: string): Promise<void> {
    try {
      await docker(["volume", "rm", volumeName]);
    } catch (err) {
      if (isMissingVolumeError(err)) {
        return;
      }
      throw err;
    }
  }

  async disableRestart(containerName: string): Promise<void> {
    await docker(["update", "--restart", "no", containerName]);
  }

  async logs(containerName: string, tail = 200): Promise<string> {
    const { stdout, stderr } = await docker(["logs", "--tail", String(tail), containerName]);
    return mergeDockerLogStreams(stdout, stderr);
  }

  async inspect(containerName: string): Promise<DockerInspect | null> {
    try {
      const { stdout } = await docker([
        "inspect",
        containerName,
        "--format",
        "{{.State.Running}}\t{{.State.Status}}\t{{.Config.Image}}",
      ]);
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
  return `huggingclaw-${agent}`;
}

export function volumeNameFor(agent: string): string {
  return `huggingclaw-${agent}-live`;
}

export function mergeDockerLogStreams(stdout: string, stderr: string): string {
  return `${stdout}${stderr}`;
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
