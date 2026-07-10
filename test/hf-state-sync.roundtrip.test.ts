import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseManifest } from "../src/hf-state-sync/manifest.js";
import type { SyncConfig } from "../src/hf-state-sync/paths.js";
import { createMountedBucketHub } from "../src/hf-state-sync/hub.js";
import { runRestore } from "../src/hf-state-sync/restore.js";
import { runSnapshot } from "../src/hf-state-sync/snapshot.js";
import { snapshotWorkerEnvironment, unprivilegedStageArchive } from "../src/hf-state-sync/stage-worker.js";
import { createFakeHub } from "./fake-hub.js";

const PREFIX = "openclaw-state";
const MANIFEST_KEY = `${PREFIX}/manifest.json`;

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "roundtrip-test-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

function configFor(liveDir: string, overrides?: Partial<SyncConfig>): SyncConfig {
  return {
    liveDir,
    bucket: "tester/bucket",
      stateMountDir: null,
    bucketPrefix: PREFIX,
    intervalSeconds: 60,
    handoffPollSeconds: 5,
    keepSnapshots: 2,
    runId: "run-test",
    runtimeId: "local-test-agent",
    agentName: "test-agent",
    gatewayLocation: "local",
    runtimeImage: "example/runtime:test",
    ...overrides,
  };
}

async function writeState(liveDir: string, marker: string): Promise<void> {
  const stateDir = path.join(liveDir, ".openclaw");
  await fs.mkdir(path.join(stateDir, "agents/main/agent"), { recursive: true });
  await fs.mkdir(path.join(liveDir, "workspace"), { recursive: true });
  await fs.writeFile(path.join(stateDir, "openclaw.json"), `{"marker":"${marker}"}`);
  await fs.writeFile(path.join(liveDir, "workspace/notes.md"), `workspace ${marker}`);
  const db = new DatabaseSync(path.join(stateDir, "agents/main/agent/agent.sqlite"));
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("CREATE TABLE IF NOT EXISTS memory (v TEXT)");
  db.prepare("INSERT INTO memory (v) VALUES (?)").run(marker);
  db.close();
}

const BOOT = "2026-06-11T00:00:00.000Z";

describe("snapshot/restore round-trip", () => {
  it("stages snapshots in a secret-free unprivileged worker", async () => {
    const hub = createFakeHub();
    const live = path.join(dir, "live-worker");
    await writeState(live, "worker");
    const uid = process.getuid?.();
    const gid = process.getgid?.();
    if (uid === undefined || gid === undefined) {
      return;
    }

    const snap = await runSnapshot({
      config: configFor(live),
      hub,
      bootTime: BOOT,
      stageArchive: unprivilegedStageArchive({
        uid,
        gid,
        scriptPath: path.resolve("dist/hf-state-sync.js"),
      }),
    });

    expect(snap.kind).toBe("uploaded");
    expect(snapshotWorkerEnvironment({
      PATH: "/bin",
      HF_TOKEN: "hf_secret",
      MLCLAW_CREDENTIAL_KEY: "credential-secret",
      MLCLAW_SESSION_SECRET: "session-secret",
    })).toEqual({ HOME: "/home/node", PATH: "/bin", TMPDIR: undefined });
  });

  it("snapshots state and workspace, then restores into a fresh live dir", async () => {
    const hub = createFakeHub();
    const liveA = path.join(dir, "live-a");
    await writeState(liveA, "turn-1");

    const snap = await runSnapshot({ config: configFor(liveA), hub, bootTime: BOOT });
    expect(snap.kind).toBe("uploaded");
    expect(hub.objects.has(MANIFEST_KEY)).toBe(true);

    const liveB = path.join(dir, "live-b");
    const restore = await runRestore({ config: configFor(liveB), hub });
    expect(restore.kind).toBe("restored");
    expect(await fs.readFile(path.join(liveB, ".openclaw/openclaw.json"), "utf8")).toContain(
      "turn-1",
    );
    // Workspace files are part of the durability contract, not just .openclaw.
    expect(await fs.readFile(path.join(liveB, "workspace/notes.md"), "utf8")).toBe(
      "workspace turn-1",
    );
    const db = new DatabaseSync(path.join(liveB, ".openclaw/agents/main/agent/agent.sqlite"), {
      readOnly: true,
    });
    const row = db.prepare("SELECT v FROM memory").get() as { v: string };
    db.close();
    expect(row.v).toBe("turn-1");
  });

  it("round-trips through a mounted bucket directory without Hub credentials", async () => {
    const mountDir = path.join(dir, "mounted-bucket");
    await fs.mkdir(mountDir);
    const hub = createMountedBucketHub({ mountDir });
    const liveA = path.join(dir, "live-mounted-a");
    await writeState(liveA, "mounted-bucket");

    const snap = await runSnapshot({
      config: configFor(liveA, { stateMountDir: mountDir }),
      hub,
      bootTime: BOOT,
    });
    expect(snap.kind).toBe("uploaded");
    await expect(fs.access(path.join(mountDir, MANIFEST_KEY))).resolves.toBeUndefined();

    const liveB = path.join(dir, "live-mounted-b");
    const restore = await runRestore({
      config: configFor(liveB, { stateMountDir: mountDir }),
      hub,
    });
    expect(restore.kind).toBe("restored");
    expect(await fs.readFile(path.join(liveB, "workspace/notes.md"), "utf8")).toBe(
      "workspace mounted-bucket",
    );
  });

  it("fails closed when the configured mounted bucket root is missing", async () => {
    const mountDir = path.join(dir, "missing-mounted-bucket");
    const hub = createMountedBucketHub({ mountDir });
    const live = path.join(dir, "live-missing-mount");
    await writeState(live, "missing-mount");

    const snap = await runSnapshot({
      config: configFor(live, { stateMountDir: mountDir }),
      hub,
      bootTime: BOOT,
    });

    expect(snap.kind).toBe("failed");
    if (snap.kind === "failed") {
      expect(snap.detail).toContain("mounted bucket root is missing");
    }
    await expect(fs.access(mountDir)).rejects.toThrow();
    await expect(runRestore({
      config: configFor(path.join(dir, "restore-missing-mount"), { stateMountDir: mountDir }),
      hub,
    })).rejects.toThrow("mounted bucket root is missing");
  });

  it("restores into a live dir child under an existing mounted volume root", async () => {
    const hub = createFakeHub();
    const source = path.join(dir, "source");
    await writeState(source, "mounted-volume-restore");
    const snap = await runSnapshot({ config: configFor(source), hub, bootTime: BOOT });
    expect(snap.kind).toBe("uploaded");

    const mountedRoot = path.join(dir, "mounted-volume");
    await fs.mkdir(mountedRoot);
    const liveDir = path.join(mountedRoot, "openclaw-live");
    const restore = await runRestore({ config: configFor(liveDir), hub });

    expect(restore.kind).toBe("restored");
    expect(await fs.readFile(path.join(liveDir, ".openclaw/openclaw.json"), "utf8")).toContain(
      "mounted-volume-restore",
    );
  });

  it("keeps every remote object under the configured prefix", async () => {
    const hub = createFakeHub();
    const live = path.join(dir, "live");
    await writeState(live, "p");
    const snap = await runSnapshot({
      config: configFor(live, { bucketPrefix: "custom/prefix" }),
      hub,
      bootTime: BOOT,
    });
    expect(snap.kind).toBe("uploaded");
    expect([...hub.objects.keys()].every((k) => k.startsWith("custom/prefix/"))).toBe(true);
  });

  it("falls back to the previous snapshot when the latest is corrupt", async () => {
    const hub = createFakeHub();
    const live = path.join(dir, "live");
    await writeState(live, "old");
    const first = await runSnapshot({
      config: configFor(live),
      hub,
      bootTime: BOOT,
      now: () => new Date("2026-06-11T00:01:00Z"),
    });
    expect(first.kind).toBe("uploaded");
    await writeState(live, "new");
    const second = await runSnapshot({
      config: configFor(live),
      hub,
      bootTime: BOOT,
      now: () => new Date("2026-06-11T00:02:00Z"),
    });
    expect(second.kind).toBe("uploaded");
    if (second.kind !== "uploaded") {
      throw new Error("unreachable");
    }
    hub.corrupt(second.entry.path);

    const target = path.join(dir, "restored");
    const restore = await runRestore({ config: configFor(target), hub });
    expect(restore.kind).toBe("restored");
    if (restore.kind !== "restored") {
      throw new Error("unreachable");
    }
    expect(restore.entry.id).not.toBe(second.entry.id);
  });

  it("fresh-starts on an empty bucket and fails closed when every snapshot is bad", async () => {
    const hub = createFakeHub();
    expect(await runRestore({ config: configFor(path.join(dir, "fresh")), hub })).toEqual({
      kind: "fresh-start",
      reason: "no-manifest",
    });

    const live = path.join(dir, "live");
    await writeState(live, "only");
    const snap = await runSnapshot({ config: configFor(live), hub, bootTime: BOOT });
    expect(snap.kind).toBe("uploaded");
    if (snap.kind !== "uploaded") {
      throw new Error("unreachable");
    }
    hub.corrupt(snap.entry.path);

    const target = path.join(dir, "fresh2");
    const failed = await runRestore({ config: configFor(target), hub });
    expect(failed.kind).toBe("all-snapshots-failed");
    // Fail closed: nothing may be written to the live dir.
    await expect(fs.access(target)).rejects.toThrow();
  });

  it("fails closed on an invalid manifest, for both restore and snapshot", async () => {
    const hub = createFakeHub();
    const live = path.join(dir, "live");
    await writeState(live, "v1");
    const snap = await runSnapshot({ config: configFor(live), hub, bootTime: BOOT });
    expect(snap.kind).toBe("uploaded");

    hub.objects.set(MANIFEST_KEY, Buffer.from("{broken json"));

    const restore = await runRestore({ config: configFor(path.join(dir, "target")), hub });
    expect(restore.kind).toBe("invalid-manifest");

    // Snapshot must refuse to overwrite an index it cannot read.
    const snap2 = await runSnapshot({ config: configFor(live), hub, bootTime: BOOT });
    expect(snap2.kind).toBe("failed");
    expect(String(hub.objects.get(MANIFEST_KEY))).toBe("{broken json");
  });

  it("never restores over an existing live dir", async () => {
    const hub = createFakeHub();
    const live = path.join(dir, "live");
    await writeState(live, "live-data");
    const outcome = await runRestore({ config: configFor(live), hub });
    expect(outcome).toEqual({ kind: "fresh-start", reason: "live-dir-exists" });
  });

  it("prunes snapshots beyond the retention limit", async () => {
    const hub = createFakeHub();
    const live = path.join(dir, "live");
    await writeState(live, "m");
    const ids: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const snap = await runSnapshot({
        config: configFor(live),
        hub,
        bootTime: BOOT,
        now: () => new Date(`2026-06-11T00:0${i}:00Z`),
      });
      expect(snap.kind).toBe("uploaded");
      if (snap.kind === "uploaded") {
        ids.push(snap.entry.id);
      }
    }
    // keep=2: the first snapshot's file must be pruned, the manifest must
    // reference exactly the surviving two.
    const manifestRaw = hub.objects.get(MANIFEST_KEY);
    expect(manifestRaw).toBeDefined();
    const parsed = parseManifest(String(manifestRaw));
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") {
      throw new Error("unreachable");
    }
    expect(parsed.manifest.current.id).toBe(ids[2]);
    expect(parsed.manifest.previous.map((e) => e.id)).toEqual([ids[1]]);
    const storedSnapshots = [...hub.objects.keys()].filter((k) =>
      k.startsWith(`${PREFIX}/snapshots/`),
    );
    expect(storedSnapshots.sort()).toEqual(
      [parsed.manifest.current.path, parsed.manifest.previous[0]?.path].sort(),
    );
  });
});
