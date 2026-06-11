import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/** Recursively find live SQLite database files under a directory. */
export async function findSqliteFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true, recursive: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".sqlite")) {
      found.push(path.join(entry.parentPath, entry.name));
    }
  }
  return found.sort();
}

/**
 * Produce a consistent standalone copy of a live SQLite DB. VACUUM INTO takes
 * its own read transaction, so this is safe while OpenClaw is writing; raw
 * file copies of a WAL-mode DB are not.
 */
export function vacuumInto(sourceDb: string, destDb: string): void {
  const db = new DatabaseSync(sourceDb);
  try {
    db.prepare("VACUUM INTO ?").run(destDb);
  } finally {
    db.close();
  }
}

export type IntegrityResult = { kind: "ok" } | { kind: "corrupt"; detail: string };

export function checkIntegrity(dbPath: string): IntegrityResult {
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
  } catch (err) {
    return { kind: "corrupt", detail: `cannot open: ${String(err)}` };
  }
  try {
    const row = db.prepare("PRAGMA integrity_check").get() as
      | { integrity_check?: unknown }
      | undefined;
    return row?.integrity_check === "ok"
      ? { kind: "ok" }
      : { kind: "corrupt", detail: String(row?.integrity_check ?? "no result") };
  } catch (err) {
    return { kind: "corrupt", detail: String(err) };
  } finally {
    db.close();
  }
}
