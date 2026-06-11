import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTarZst,
  extractTarZst,
  sha256File,
  stageLiveDir,
} from "../src/hf-state-sync/archive.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "archive-test-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

function createDb(file: string): void {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("CREATE TABLE t (v TEXT)");
  db.prepare("INSERT INTO t (v) VALUES (?)").run("durable");
  db.close();
}

async function buildFakeLiveDir(): Promise<string> {
  const live = path.join(dir, "live");
  const state = path.join(live, ".openclaw");
  await fs.mkdir(path.join(state, "credentials"), { recursive: true });
  await fs.mkdir(path.join(state, "agents/main/agent"), { recursive: true });
  await fs.mkdir(path.join(state, "tmp"), { recursive: true });
  await fs.mkdir(path.join(state, "cache"), { recursive: true });
  await fs.mkdir(path.join(live, "workspace"), { recursive: true });
  await fs.writeFile(path.join(state, "openclaw.json"), '{"agent":true}');
  await fs.writeFile(path.join(state, ".env"), "SECRET=topsecret");
  await fs.writeFile(path.join(state, "credentials/telegram.json"), '{"token":"secret"}');
  await fs.writeFile(path.join(state, "tmp/scratch.txt"), "scratch");
  await fs.writeFile(path.join(state, "gateway.log"), "log line");
  await fs.writeFile(path.join(live, "workspace/draft.md"), "user work");
  // Workspace content named like scratch must still survive (scoped excludes).
  await fs.mkdir(path.join(live, "workspace/logs"), { recursive: true });
  await fs.writeFile(path.join(live, "workspace/logs/research.log"), "durable user log");
  await fs.symlink("draft.md", path.join(live, "workspace/link-to-draft"));
  createDb(path.join(state, "agents/main/agent/agent.sqlite"));
  // DBs under excluded dirs must stay out of the snapshot entirely.
  createDb(path.join(state, "cache/scratch.sqlite"));
  return live;
}

describe("staging", () => {
  it("excludes secrets/scratch, keeps workspace, vacuums only non-excluded dbs", async () => {
    const live = await buildFakeLiveDir();
    const staging = path.join(dir, "staging");
    const result = await stageLiveDir(live, staging);
    expect(result).toEqual({
      kind: "staged",
      databases: [".openclaw/agents/main/agent/agent.sqlite"],
    });

    await expect(fs.access(path.join(staging, ".openclaw/openclaw.json"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(staging, "workspace/draft.md"))).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(staging, "workspace/logs/research.log")),
    ).resolves.toBeUndefined();
    expect(await fs.readlink(path.join(staging, "workspace/link-to-draft"))).toBe("draft.md");
    await expect(
      fs.access(path.join(staging, ".openclaw/agents/main/agent/agent.sqlite")),
    ).resolves.toBeUndefined();
    await expect(fs.access(path.join(staging, ".openclaw/.env"))).rejects.toThrow();
    await expect(fs.access(path.join(staging, ".openclaw/credentials"))).rejects.toThrow();
    await expect(fs.access(path.join(staging, ".openclaw/tmp"))).rejects.toThrow();
    await expect(fs.access(path.join(staging, ".openclaw/cache"))).rejects.toThrow();
    await expect(fs.access(path.join(staging, ".openclaw/gateway.log"))).rejects.toThrow();
    await expect(
      fs.access(path.join(staging, ".openclaw/agents/main/agent/agent.sqlite-wal")),
    ).rejects.toThrow();
  });
});

describe("tar.zst round-trip", () => {
  it("preserves contents and hashes deterministically per archive", async () => {
    const source = path.join(dir, "src");
    await fs.mkdir(path.join(source, "nested"), { recursive: true });
    await fs.writeFile(path.join(source, "nested/file.txt"), "hello snapshots");

    const archive = path.join(dir, "out.tar.zst");
    await createTarZst(source, archive);
    const digest = await sha256File(archive);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);

    const dest = path.join(dir, "extracted");
    await extractTarZst(archive, dest);
    expect(await fs.readFile(path.join(dest, "nested/file.txt"), "utf8")).toBe("hello snapshots");
  });
});
