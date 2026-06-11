import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
      keepSnapshots: 2,
      runId: "run-supervise",
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
});
