/**
 * Live parity probe for the TS bucket client, run manually:
 *   npm run build:probe && HF_TOKEN=$(hf auth token) node dist/parity-probe.mjs <bucket>
 * Uploads via the TS client, verifies with downloads and listings, deletes,
 * and prints PARITY-OK on success. Uses a dedicated prefix; cleans up.
 */
import { randomBytes } from "node:crypto";
import { BucketClient } from "../src/hf-bucket-client/client.js";

const bucket = process.argv[2];
const token = process.env.HF_TOKEN;
if (!bucket || !token) {
  console.error("usage: HF_TOKEN=... parity-probe <owner/bucket>");
  process.exit(2);
}

const PREFIX = "parity-probe";
const client = new BucketClient({ bucket, accessToken: token });

const small = Buffer.from("hello from the TS bucket client\n");
const large = randomBytes(4 * 1024 * 1024); // multi-chunk for the xet path

async function main(): Promise<void> {
  console.log("uploading 2 files via TS client (xet)...");
  await client.uploadFiles([
    { path: `${PREFIX}/small.txt`, content: new Blob([small]) },
    { path: `${PREFIX}/large.bin`, content: new Blob([large]) },
  ]);

  console.log("listing...");
  const listed = await client.listFiles(PREFIX);
  const files = listed.filter((e) => e.type === "file").map((e) => e.path).sort();
  if (JSON.stringify(files) !== JSON.stringify([`${PREFIX}/large.bin`, `${PREFIX}/small.txt`])) {
    throw new Error(`unexpected listing: ${JSON.stringify(listed)}`);
  }

  console.log("downloading back and comparing...");
  const smallBack = await client.downloadFile(`${PREFIX}/small.txt`);
  const largeBack = await client.downloadFile(`${PREFIX}/large.bin`);
  if (!smallBack || !largeBack) {
    throw new Error("downloaded null for existing file");
  }
  if (Buffer.compare(Buffer.from(await smallBack.arrayBuffer()), small) !== 0) {
    throw new Error("small.txt round-trip mismatch");
  }
  if (Buffer.compare(Buffer.from(await largeBack.arrayBuffer()), large) !== 0) {
    throw new Error("large.bin round-trip mismatch");
  }

  console.log("missing file returns null...");
  if ((await client.downloadFile(`${PREFIX}/does-not-exist`)) !== null) {
    throw new Error("expected null for missing file");
  }

  console.log("deleting...");
  await client.deleteFiles([`${PREFIX}/small.txt`, `${PREFIX}/large.bin`]);
  const after = (await client.listFiles(PREFIX)).filter((e) => e.type === "file");
  if (after.length !== 0) {
    throw new Error(`files remain after delete: ${JSON.stringify(after)}`);
  }

  console.log("PARITY-OK");
}

main().catch((err) => {
  console.error("PARITY-FAILED:", err);
  process.exit(1);
});
