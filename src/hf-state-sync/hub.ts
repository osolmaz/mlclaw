import fs from "node:fs/promises";
import path from "node:path";
import { BucketClient, BucketHttpError } from "../hf-bucket-client/client.js";

/**
 * Transport to the durable bucket. Implementations must be safe to call with
 * untrusted remote state; callers verify all downloaded content separately.
 */
export interface BucketHub {
  download(remotePath: string, localPath: string): Promise<"downloaded" | "not-found">;
  upload(localPath: string, remotePath: string): Promise<void>;
  delete(remotePaths: string[]): Promise<void>;
}

/**
 * BucketHub backed by the shared TypeScript Storage Bucket client. Auth comes
 * from HF_TOKEN in the local gateway environment or an explicit caller token.
 * Space gateway mode should prefer createMountedBucketHub instead.
 */
export function createHfBucketHub(params: { bucket: string; token?: string }): BucketHub {
  const token = params.token ?? process.env.HF_TOKEN;
  if (!token) {
    throw new Error("HF_TOKEN is required when OPENCLAW_HF_STATE_BUCKET is set");
  }
  const client = new BucketClient({ bucket: params.bucket, accessToken: token });

  // A mistyped bucket id or a token without access also surfaces as a
  // not-found error from resolve URLs. Treating that as "object missing" would
  // make restore fresh-start a Space with NO durability, so a not-found is
  // only trusted after the bucket itself proves listable.
  let bucketAccessible = false;
  const assertBucketAccessible = async (): Promise<void> => {
    if (bucketAccessible) {
      return;
    }
    try {
      await client.assertBucketAccessible();
      bucketAccessible = true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`bucket ${params.bucket} is not accessible: ${message}`);
    }
  };

  return {
    async download(remotePath, localPath) {
      try {
        const blob = await client.downloadFile(remotePath);
        if (!blob) {
          await assertBucketAccessible();
          return "not-found";
        }
        await fs.writeFile(localPath, Buffer.from(await blob.arrayBuffer()));
        return "downloaded";
      } catch (err) {
        if (err instanceof BucketHttpError && err.status === 404) {
          await assertBucketAccessible();
          return "not-found";
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`bucket download failed for ${remotePath}: ${message}`);
      }
    },
    async upload(localPath, remotePath) {
      try {
        await client.uploadFiles([{ path: remotePath, content: new Blob([await fs.readFile(localPath)]) }]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`bucket upload failed for ${remotePath}: ${message}`);
      }
    },
    async delete(remotePaths) {
      try {
        await client.deleteFiles(remotePaths);
      } catch (err) {
        // Retention pruning is best-effort; a leftover file costs storage,
        // not correctness. Never fail a snapshot over it.
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[hf-state-sync] prune failed for ${remotePaths.join(", ")}: ${message}`);
      }
    },
  };
}

/** BucketHub backed by a read-write Storage Bucket volume mounted in the Space. */
export function createMountedBucketHub(params: { mountDir: string }): BucketHub {
  const root = path.resolve(params.mountDir);
  const assertMountRoot = async (): Promise<void> => {
    let stat;
    try {
      stat = await fs.stat(root);
    } catch (err) {
      if (isNotFound(err)) {
        throw new Error(`mounted bucket root is missing: ${root}`);
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`mounted bucket root is not accessible: ${root}: ${message}`);
    }
    if (!stat.isDirectory()) {
      throw new Error(`mounted bucket root is not a directory: ${root}`);
    }
  };
  const localPathFor = (remotePath: string): string => {
    const normalized = remotePath.replace(/^\/+/, "");
    const resolved = path.resolve(root, normalized);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error(`invalid bucket path outside mount: ${remotePath}`);
    }
    return resolved;
  };

  return {
    async download(remotePath, localPath) {
      await assertMountRoot();
      const source = localPathFor(remotePath);
      try {
        await fs.copyFile(source, localPath);
        return "downloaded";
      } catch (err) {
        if (isNotFound(err)) {
          return "not-found";
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`mounted bucket download failed for ${remotePath}: ${message}`);
      }
    },
    async upload(localPath, remotePath) {
      await assertMountRoot();
      const target = localPathFor(remotePath);
      const dir = path.dirname(target);
      const tmp = path.join(dir, `.tmp-${path.basename(target)}-${process.pid}-${Date.now()}`);
      try {
        await fs.mkdir(dir, { recursive: true });
        await fs.copyFile(localPath, tmp);
        await fs.rename(tmp, target);
      } catch (err) {
        await fs.rm(tmp, { force: true }).catch(() => undefined);
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`mounted bucket upload failed for ${remotePath}: ${message}`);
      }
    },
    async delete(remotePaths) {
      await assertMountRoot();
      for (const remotePath of remotePaths) {
        try {
          await fs.rm(localPathFor(remotePath), { force: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[hf-state-sync] prune failed for ${remotePath}: ${message}`);
        }
      }
    },
  };
}

function isNotFound(err: unknown): boolean {
  return err instanceof Error && "code" in err && err.code === "ENOENT";
}
