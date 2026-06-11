import fs from "node:fs/promises";
import type { BucketHub } from "../src/hf-state-sync/hub.js";

/** In-memory BucketHub for tests. */
export function createFakeHub(): BucketHub & {
  objects: Map<string, Buffer>;
  corrupt(remotePath: string): void;
} {
  const objects = new Map<string, Buffer>();
  return {
    objects,
    corrupt(remotePath) {
      const existing = objects.get(remotePath);
      if (!existing) {
        throw new Error(`no object at ${remotePath}`);
      }
      const broken = Buffer.from(existing);
      broken.fill(0, 0, Math.min(64, broken.length));
      objects.set(remotePath, broken);
    },
    async download(remotePath, localPath) {
      const data = objects.get(remotePath);
      if (!data) {
        return "not-found";
      }
      await fs.writeFile(localPath, data);
      return "downloaded";
    },
    async upload(localPath, remotePath) {
      objects.set(remotePath, await fs.readFile(localPath));
    },
    async delete(remotePaths) {
      for (const remotePath of remotePaths) {
        objects.delete(remotePath);
      }
    },
  };
}
