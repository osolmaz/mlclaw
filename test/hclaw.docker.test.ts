import { describe, expect, it } from "vitest";
import { isMissingContainerError, isMissingVolumeError, mergeDockerLogStreams, withContext } from "../src/hclaw/docker.js";

describe("Docker error matching", () => {
  it("matches missing resources regardless of Docker message casing", () => {
    expect(isMissingVolumeError(new Error("Error response from daemon: no such volume: huggingclaw-test-live")))
      .toBe(true);
    expect(isMissingVolumeError(new Error("Error: No such volume: huggingclaw-test-live"))).toBe(true);

    expect(isMissingContainerError(new Error("Error: No such container: huggingclaw-test"))).toBe(true);
    expect(isMissingContainerError(new Error("Error response from daemon: no such object: huggingclaw-test")))
      .toBe(true);
  });

  it("keeps stderr diagnostics in returned Docker logs", () => {
    expect(mergeDockerLogStreams("started\n", "snapshot failed\n")).toBe("started\nsnapshot failed\n");
  });

  it("prefixes Docker commands with an explicit context when provided", () => {
    expect(withContext("desktop-linux", ["ps"])).toEqual(["--context", "desktop-linux", "ps"]);
    expect(withContext(undefined, ["ps"])).toEqual(["ps"]);
  });
});
