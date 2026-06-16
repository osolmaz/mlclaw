import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SyncConfig } from "../src/hf-state-sync/paths.js";
import { supervise } from "../src/hf-state-sync/supervise.js";
import { createFakeHub } from "./fake-hub.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "supervise-test-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("supervise", () => {
  it("propagates the child exit code and takes a final snapshot", async () => {
    const liveDir = path.join(dir, "live");
    const stateDir = path.join(liveDir, ".openclaw");
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(path.join(stateDir, "openclaw.json"), "{}");
    const config: SyncConfig = {
      liveDir,
      bucket: "tester/bucket",
      bucketPrefix: "openclaw-state",
      intervalSeconds: 3600,
      handoffPollSeconds: 1,
      keepSnapshots: 2,
      runId: "run-supervise",
      runtimeId: "local-test-agent",
      agentName: "test-agent",
      gatewayLocation: "local",
      runtimeImage: "example/runtime:test",
    };
    const hub = createFakeHub();

    const exitCode = await supervise({
      config,
      hub,
      command: [process.execPath, "-e", "process.exit(7)"],
    });

    expect(exitCode).toBe(7);
    expect(hub.objects.has("openclaw-state/manifest.json")).toBe(true);
    expect([...hub.objects.keys()].some((k) => k.startsWith("openclaw-state/snapshots/"))).toBe(true);
  });

  it("acknowledges a handoff request after taking a final snapshot", async () => {
    const liveDir = path.join(dir, "live");
    const stateDir = path.join(liveDir, ".openclaw");
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(path.join(stateDir, "openclaw.json"), "{}");
    const config: SyncConfig = {
      liveDir,
      bucket: "tester/bucket",
      bucketPrefix: "openclaw-state",
      intervalSeconds: 3600,
      handoffPollSeconds: 1,
      keepSnapshots: 2,
      runId: "run-space-test-agent",
      runtimeId: "space-test-agent",
      agentName: "test-agent",
      gatewayLocation: "space",
      runtimeImage: "example/runtime:test",
    };
    const hub = createFakeHub();
    const running = supervise({
      config,
      hub,
      command: [process.execPath, "-e", "setInterval(() => {}, 1000)"],
    });

    await delay(50);
    hub.objects.set("openclaw-state/runtime/handoff-request.json", Buffer.from(JSON.stringify({
      schemaVersion: 1,
      requestId: "request-1",
      agent: "test-agent",
      runtimeId: "space-test-agent",
      requestedAt: "2026-06-16T00:00:00.000Z",
      targetRuntimeId: "local-test-agent",
    }) + "\n"));

    await expect(running).resolves.toBe(0);
    expect(hub.objects.has("openclaw-state/manifest.json")).toBe(true);
    expect(hub.objects.has("openclaw-state/runtime/handoff-request.json")).toBe(false);
    const ack = JSON.parse(hub.objects.get("openclaw-state/runtime/handoff-ack.json")?.toString("utf8") ?? "{}");
    expect(ack).toMatchObject({
      schemaVersion: 1,
      requestId: "request-1",
      agent: "test-agent",
      runtimeId: "space-test-agent",
      gatewayLocation: "space",
    });
    expect(ack.lastSnapshotId).toEqual(expect.stringContaining("snapshots/state-"));
  });

  it("does not acknowledge a handoff request when the final snapshot upload fails", async () => {
    const liveDir = path.join(dir, "live");
    const stateDir = path.join(liveDir, ".openclaw");
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(path.join(stateDir, "openclaw.json"), "{}");
    const config: SyncConfig = {
      liveDir,
      bucket: "tester/bucket",
      bucketPrefix: "openclaw-state",
      intervalSeconds: 3600,
      handoffPollSeconds: 1,
      keepSnapshots: 2,
      runId: "run-space-test-agent",
      runtimeId: "space-test-agent",
      agentName: "test-agent",
      gatewayLocation: "space",
      runtimeImage: "example/runtime:test",
    };
    const baseHub = createFakeHub();
    const hub = {
      ...baseHub,
      async upload(localPath: string, remotePath: string) {
        if (remotePath.startsWith("openclaw-state/snapshots/")) {
          throw new Error("bucket upload failed");
        }
        await baseHub.upload(localPath, remotePath);
      },
    };
    const running = supervise({
      config,
      hub,
      command: [process.execPath, "-e", "setInterval(() => {}, 1000)"],
    });

    await delay(50);
    hub.objects.set("openclaw-state/runtime/handoff-request.json", Buffer.from(JSON.stringify({
      schemaVersion: 1,
      requestId: "request-1",
      agent: "test-agent",
      runtimeId: "space-test-agent",
      requestedAt: "2026-06-16T00:00:00.000Z",
      targetRuntimeId: "local-test-agent",
    }) + "\n"));

    await expect(running).rejects.toThrow("final snapshot did not upload");
    expect(hub.objects.has("openclaw-state/runtime/handoff-ack.json")).toBe(false);
    expect(hub.objects.has("openclaw-state/runtime/handoff-request.json")).toBe(true);
  });
});
