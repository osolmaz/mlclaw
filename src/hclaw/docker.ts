import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type DockerRunner = {
  pull(image: string): Promise<void>;
  run(params: DockerRunParams): Promise<void>;
  start(containerName: string): Promise<void>;
  stop(containerName: string): Promise<void>;
  rm(containerName: string): Promise<void>;
  disableRestart(containerName: string): Promise<void>;
  logs(containerName: string, tail?: number): Promise<string>;
  inspect(containerName: string): Promise<DockerInspect | null>;
};

export type DockerRunParams = {
  containerName: string;
  image: string;
  envFile: string;
  volumeName: string;
  port: number;
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
      "-p",
      `127.0.0.1:${params.port}:${params.port}`,
      "-v",
      `${params.volumeName}:/tmp/openclaw-live`,
      params.image,
    ]);
  }

  async start(containerName: string): Promise<void> {
    await docker(["start", containerName]);
  }

  async stop(containerName: string): Promise<void> {
    await docker(["stop", containerName]);
  }

  async rm(containerName: string): Promise<void> {
    await docker(["rm", containerName]);
  }

  async disableRestart(containerName: string): Promise<void> {
    await docker(["update", "--restart", "no", containerName]);
  }

  async logs(containerName: string, tail = 200): Promise<string> {
    const { stdout } = await docker(["logs", "--tail", String(tail), containerName]);
    return stdout;
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

function isMissingContainerError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("No such object") || message.includes("No such container");
}
