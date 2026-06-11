import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkIntegrity, findSqliteFiles, vacuumInto } from "../src/hf-state-sync/sqlite.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "sqlite-test-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

function createDb(file: string): void {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT)");
  db.prepare("INSERT INTO notes (body) VALUES (?)").run("remember me");
  db.close();
}

describe("sqlite helpers", () => {
  it("vacuums a WAL-mode db into a consistent standalone copy", async () => {
    const source = path.join(dir, "state.sqlite");
    createDb(source);
    const dest = path.join(dir, "copy.sqlite");
    vacuumInto(source, dest);

    expect(checkIntegrity(dest)).toEqual({ kind: "ok" });
    const db = new DatabaseSync(dest, { readOnly: true });
    const row = db.prepare("SELECT body FROM notes").get() as { body: string };
    db.close();
    expect(row.body).toBe("remember me");
    // The copy must be standalone: no WAL/SHM sidecars.
    await expect(fs.access(`${dest}-wal`)).rejects.toThrow();
  });

  it("flags garbage files as corrupt", async () => {
    const garbage = path.join(dir, "broken.sqlite");
    await fs.writeFile(garbage, "this is not a database at all");
    expect(checkIntegrity(garbage).kind).toBe("corrupt");
  });

  it("finds sqlite files recursively", async () => {
    await fs.mkdir(path.join(dir, "agents/main/agent"), { recursive: true });
    createDb(path.join(dir, "state.sqlite"));
    createDb(path.join(dir, "agents/main/agent", "agent.sqlite"));
    await fs.writeFile(path.join(dir, "notes.txt"), "not a db");

    const found = await findSqliteFiles(dir);
    expect(found.map((f) => path.relative(dir, f))).toEqual([
      "agents/main/agent/agent.sqlite",
      "state.sqlite",
    ]);
  });
});
