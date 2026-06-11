import { z } from "zod";

const snapshotEntrySchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  createdAt: z.string().datetime(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  sizeBytes: z.number().int().nonnegative(),
  runId: z.string().min(1),
  bootTime: z.string().datetime(),
});

// Buckets are non-versioned: this manifest plus the snapshot files it
// references are the ONLY rollback path. Never drop an entry whose file
// has not been deleted, and never delete a file that is still referenced.
export const manifestSchema = z.object({
  version: z.literal(1),
  current: snapshotEntrySchema,
  previous: z.array(snapshotEntrySchema),
});

export type SnapshotEntry = z.infer<typeof snapshotEntrySchema>;
export type Manifest = z.infer<typeof manifestSchema>;

export const MANIFEST_REMOTE_NAME = "manifest.json";

export type ManifestParseResult =
  | { kind: "ok"; manifest: Manifest }
  | { kind: "invalid"; reason: string };

export function parseManifest(raw: string): ManifestParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return { kind: "invalid", reason: `not JSON: ${String(err)}` };
  }
  const result = manifestSchema.safeParse(json);
  return result.success
    ? { kind: "ok", manifest: result.data }
    : { kind: "invalid", reason: result.error.message };
}

export function serializeManifest(manifest: Manifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Promote a new snapshot: previous gets the old current, truncated so the
 * total retained count is `keep`. Returns the next manifest and the entries
 * whose files are no longer referenced and may be deleted from the bucket.
 */
export function promoteSnapshot(params: {
  existing: Manifest | null;
  entry: SnapshotEntry;
  keep: number;
}): { manifest: Manifest; expired: SnapshotEntry[] } {
  const retainedPrevious = params.existing
    ? [params.existing.current, ...params.existing.previous]
    : [];
  const previous = retainedPrevious.slice(0, Math.max(params.keep - 1, 0));
  const expired = retainedPrevious.slice(Math.max(params.keep - 1, 0));
  return {
    manifest: { version: 1, current: params.entry, previous },
    expired,
  };
}
