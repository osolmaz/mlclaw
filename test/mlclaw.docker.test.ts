import { describe, expect, it } from "vitest";
import {
  classifyContainerProbeError,
  isMissingContainerError,
  isMissingVolumeError,
  mergeDockerLogStreams,
  parsePodmanConnections,
  withContext,
  withPodmanConnection,
} from "../src/mlclaw/docker.js";

describe("Docker error matching", () => {
  it("matches missing resources regardless of Docker message casing", () => {
    expect(isMissingVolumeError(new Error("Error response from daemon: no such volume: mlclaw-test-live"))).toBe(true);
    expect(isMissingVolumeError(new Error("Error: No such volume: mlclaw-test-live"))).toBe(true);

    expect(isMissingContainerError(new Error("Error: No such container: mlclaw-test"))).toBe(true);
    expect(isMissingContainerError(new Error("Error response from daemon: no such object: mlclaw-test"))).toBe(true);
  });

  it("keeps stderr diagnostics in returned Docker logs", () => {
    expect(mergeDockerLogStreams("started\n", "snapshot failed\n")).toBe("started\nsnapshot failed\n");
  });

  it("prefixes Docker commands with an explicit context when provided", () => {
    expect(withContext("desktop-linux", ["ps"])).toEqual(["--context", "desktop-linux", "ps"]);
    expect(withContext(undefined, ["ps"])).toEqual(["ps"]);
  });

  it("uses local Podman by default and prefixes remote connections", () => {
    expect(withPodmanConnection(undefined, ["ps"])).toEqual(["ps"]);
    expect(withPodmanConnection("local", ["ps"])).toEqual(["ps"]);
    expect(withPodmanConnection("machine", ["ps"])).toEqual(["--connection", "machine", "ps"]);
  });

  it("parses and identifies Podman's named default connection", () => {
    expect(
      parsePodmanConnections(
        JSON.stringify([
          {
            Name: "podman-machine-default",
            URI: "ssh://core@127.0.0.1:51234/run/user/501/podman/podman.sock",
            Default: true,
          },
          { Name: "build-machine", URI: "ssh://core@127.0.0.1:51235/run/user/501/podman/podman.sock", Default: false },
          { Name: "" },
        ]),
      ),
    ).toEqual([
      {
        name: "podman-machine-default",
        uri: "ssh://core@127.0.0.1:51234/run/user/501/podman/podman.sock",
        isDefault: true,
      },
      {
        name: "build-machine",
        uri: "ssh://core@127.0.0.1:51235/run/user/501/podman/podman.sock",
        isDefault: false,
      },
    ]);
    expect(parsePodmanConnections("{}")).toEqual([]);
  });

  it("classifies missing, permission-denied, and unavailable engines", () => {
    const missing = Object.assign(new Error("spawn docker ENOENT"), { code: "ENOENT" });
    expect(classifyContainerProbeError("docker", missing)).toEqual({
      engine: "docker",
      status: "missing",
      detail: "Docker is not installed",
    });
    expect(classifyContainerProbeError("docker", new Error("permission denied"), "desktop-linux")).toEqual({
      engine: "docker",
      status: "permission-denied",
      context: "desktop-linux",
      detail: "Docker is installed but permission was denied",
    });
    expect(classifyContainerProbeError("podman", new Error("cannot connect"), "local")).toEqual({
      engine: "podman",
      status: "unavailable",
      context: "local",
      detail: "Podman is installed but its engine is unavailable",
    });
  });
});
