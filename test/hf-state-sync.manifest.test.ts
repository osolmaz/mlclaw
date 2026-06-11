import { describe, expect, it } from "vitest";
import {
  type Manifest,
  type SnapshotEntry,
  parseManifest,
  promoteSnapshot,
  serializeManifest,
} from "../src/hf-state-sync/manifest.js";

function entry(id: string): SnapshotEntry {
  return {
    id,
    path: `snapshots/state-${id}.tar.zst`,
    createdAt: "2026-06-11T00:00:00.000Z",
    sha256: "a".repeat(64),
    sizeBytes: 100,
    runId: "run-1",
    bootTime: "2026-06-11T00:00:00.000Z",
  };
}

describe("manifest", () => {
  it("round-trips through serialize/parse", () => {
    const manifest: Manifest = { version: 1, current: entry("a"), previous: [entry("b")] };
    const parsed = parseManifest(serializeManifest(manifest));
    expect(parsed).toEqual({ kind: "ok", manifest });
  });

  it("rejects malformed JSON and wrong shapes", () => {
    expect(parseManifest("{nope").kind).toBe("invalid");
    expect(parseManifest('{"version":2}').kind).toBe("invalid");
    expect(parseManifest('{"version":1,"current":{"id":""},"previous":[]}').kind).toBe("invalid");
  });

  it("rejects snapshot ids that cannot be used as local filenames", () => {
    const manifest: Manifest = { version: 1, current: entry("../../escape"), previous: [] };
    expect(parseManifest(serializeManifest(manifest)).kind).toBe("invalid");
  });

  it("promotes a snapshot and reports expired entries beyond keep", () => {
    const existing: Manifest = {
      version: 1,
      current: entry("c"),
      previous: [entry("b"), entry("a")],
    };
    const { manifest, expired } = promoteSnapshot({ existing, entry: entry("d"), keep: 3 });
    expect(manifest.current.id).toBe("d");
    expect(manifest.previous.map((e) => e.id)).toEqual(["c", "b"]);
    expect(expired.map((e) => e.id)).toEqual(["a"]);
  });

  it("starts a fresh manifest when none exists", () => {
    const { manifest, expired } = promoteSnapshot({ existing: null, entry: entry("a"), keep: 3 });
    expect(manifest.previous).toEqual([]);
    expect(expired).toEqual([]);
  });
});
