import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/hf-state-sync/hub.ts
import fs from "node:fs/promises";

// src/vendor/hfjs-xet/error.ts
async function createApiError(response, opts) {
  const error = new HubApiError(response.url, response.status, response.headers.get("X-Request-Id") ?? opts?.requestId);
  error.message = `Api error with status ${error.statusCode}${opts?.message ? `. ${opts.message}` : ""}`;
  const trailer = [`URL: ${error.url}`, error.requestId ? `Request ID: ${error.requestId}` : void 0].filter(Boolean).join(". ");
  if (response.headers.get("Content-Type")?.startsWith("application/json")) {
    const json = await response.json();
    error.message = json.error || json.message || error.message;
    if (json.error_description) {
      error.message = error.message ? error.message + `: ${json.error_description}` : json.error_description;
    }
    error.data = json;
  } else {
    error.data = { message: await response.text() };
  }
  error.message += `. ${trailer}`;
  throw error;
}
var HubApiError = class extends Error {
  statusCode;
  url;
  requestId;
  data;
  constructor(url, statusCode, requestId, message) {
    super(message);
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.url = url;
  }
};

// src/vendor/hfjs-xet/vendor/lz4js/util.ts
function hashU32(a) {
  a = a | 0;
  a = a + 2127912214 + (a << 12) | 0;
  a = a ^ -949894596 ^ a >>> 19;
  a = a + 374761393 + (a << 5) | 0;
  a = a + -744332180 ^ a << 9;
  a = a + -42973499 + (a << 3) | 0;
  return a ^ -1252372727 ^ a >>> 16 | 0;
}
function readU32(b, n) {
  let x = 0;
  x |= b[n++] << 0;
  x |= b[n++] << 8;
  x |= b[n++] << 16;
  x |= b[n++] << 24;
  return x;
}
function writeU32(b, n, x) {
  b[n++] = x >> 0 & 255;
  b[n++] = x >> 8 & 255;
  b[n++] = x >> 16 & 255;
  b[n++] = x >> 24 & 255;
}
function imul(a, b) {
  const ah = a >>> 16;
  const al = a & 65535;
  const bh = b >>> 16;
  const bl = b & 65535;
  return al * bl + (ah * bl + al * bh << 16) | 0;
}

// src/vendor/hfjs-xet/vendor/lz4js/xxh32.ts
var prime1 = 2654435761;
var prime2 = 2246822519;
var prime3 = 3266489917;
var prime4 = 668265263;
var prime5 = 374761393;
function rotl32(x, r) {
  x = x | 0;
  r = r | 0;
  return x >>> (32 - r | 0) | x << r | 0;
}
function rotmul32(h, r, m) {
  h = h | 0;
  r = r | 0;
  m = m | 0;
  return imul(h >>> (32 - r | 0) | h << r, m) | 0;
}
function shiftxor32(h, s) {
  h = h | 0;
  s = s | 0;
  return h >>> s ^ h | 0;
}
function xxhapply(h, src, m0, s, m1) {
  return rotmul32(imul(src, m0) + h, s, m1);
}
function xxh1(h, src, index) {
  return rotmul32(h + imul(src[index], prime5), 11, prime1);
}
function xxh4(h, src, index) {
  return xxhapply(h, readU32(src, index), prime3, 17, prime4);
}
function xxh16(h, src, index) {
  return [
    xxhapply(h[0], readU32(src, index + 0), prime2, 13, prime1),
    xxhapply(h[1], readU32(src, index + 4), prime2, 13, prime1),
    xxhapply(h[2], readU32(src, index + 8), prime2, 13, prime1),
    xxhapply(h[3], readU32(src, index + 12), prime2, 13, prime1)
  ];
}
function xxh32(seed, src, index, len) {
  let h;
  const l = len;
  if (len >= 16) {
    h = [seed + prime1 + prime2, seed + prime2, seed, seed - prime1];
    while (len >= 16) {
      h = xxh16(h, src, index);
      index += 16;
      len -= 16;
    }
    h = rotl32(h[0], 1) + rotl32(h[1], 7) + rotl32(h[2], 12) + rotl32(h[3], 18) + l;
  } else {
    h = seed + prime5 + len >>> 0;
  }
  while (len >= 4) {
    h = xxh4(h, src, index);
    index += 4;
    len -= 4;
  }
  while (len > 0) {
    h = xxh1(h, src, index);
    index++;
    len--;
  }
  h = shiftxor32(imul(shiftxor32(imul(shiftxor32(h, 15), prime2), 13), prime3), 16);
  return h >>> 0;
}
var hash = xxh32;

// src/vendor/hfjs-xet/vendor/lz4js/index.ts
var minMatch = 4;
var matchSearchLimit = 12;
var minTrailingLitterals = 5;
var skipTrigger = 6;
var hashSize = 1 << 16;
var mlBits = 4;
var mlMask = (1 << mlBits) - 1;
var runBits = 4;
var runMask = (1 << runBits) - 1;
var blockBuf = makeBuffer(5 << 20);
var hashTable = makeHashTable();
var magicNum = 407708164;
var fdVersion = 64;
var bsDefault = 7;
var bsShift = 4;
var bsMap = {
  4: 65536,
  5: 262144,
  6: 1048576,
  7: 4194304
};
function makeHashTable() {
  try {
    return new Uint32Array(hashSize);
  } catch (error) {
    const hashTable2 = new Array(hashSize);
    for (let i = 0; i < hashSize; i++) {
      hashTable2[i] = 0;
    }
    return hashTable2;
  }
}
function clearHashTable(table) {
  for (let i = 0; i < hashSize; i++) {
    table[i] = 0;
  }
}
function makeBuffer(size) {
  return new Uint8Array(size);
}
function sliceArray(array, start, end) {
  return array.slice(start, end);
}
function compressBound(n) {
  return n + n / 255 + 16 | 0;
}
function compressBlock(src, dst, sIndex, sLength, hashTable2) {
  let mIndex, mAnchor, mLength, mOffset, mStep;
  let literalCount, dIndex, sEnd, n;
  dIndex = 0;
  sEnd = sLength + sIndex;
  mAnchor = sIndex;
  let searchMatchCount = (1 << skipTrigger) + 3;
  while (sIndex <= sEnd - matchSearchLimit) {
    const seq = readU32(src, sIndex);
    let hash3 = hashU32(seq) >>> 0;
    hash3 = (hash3 >> 16 ^ hash3) >>> 0 & 65535;
    mIndex = hashTable2[hash3] - 1;
    hashTable2[hash3] = sIndex + 1;
    if (mIndex < 0 || sIndex - mIndex >>> 16 > 0 || readU32(src, mIndex) !== seq) {
      mStep = searchMatchCount++ >> skipTrigger;
      sIndex += mStep;
      continue;
    }
    searchMatchCount = (1 << skipTrigger) + 3;
    literalCount = sIndex - mAnchor;
    mOffset = sIndex - mIndex;
    sIndex += minMatch;
    mIndex += minMatch;
    mLength = sIndex;
    while (sIndex < sEnd - minTrailingLitterals && src[sIndex] === src[mIndex]) {
      sIndex++;
      mIndex++;
    }
    mLength = sIndex - mLength;
    const token = mLength < mlMask ? mLength : mlMask;
    if (literalCount >= runMask) {
      dst[dIndex++] = (runMask << mlBits) + token;
      for (n = literalCount - runMask; n >= 255; n -= 255) {
        dst[dIndex++] = 255;
      }
      dst[dIndex++] = n;
    } else {
      dst[dIndex++] = (literalCount << mlBits) + token;
    }
    for (let i = 0; i < literalCount; i++) {
      dst[dIndex++] = src[mAnchor + i];
    }
    dst[dIndex++] = mOffset;
    dst[dIndex++] = mOffset >> 8;
    if (mLength >= mlMask) {
      for (n = mLength - mlMask; n >= 255; n -= 255) {
        dst[dIndex++] = 255;
      }
      dst[dIndex++] = n;
    }
    mAnchor = sIndex;
  }
  if (mAnchor === 0) {
    return 0;
  }
  literalCount = sEnd - mAnchor;
  if (literalCount >= runMask) {
    dst[dIndex++] = runMask << mlBits;
    for (n = literalCount - runMask; n >= 255; n -= 255) {
      dst[dIndex++] = 255;
    }
    dst[dIndex++] = n;
  } else {
    dst[dIndex++] = literalCount << mlBits;
  }
  sIndex = mAnchor;
  while (sIndex < sEnd) {
    dst[dIndex++] = src[sIndex++];
  }
  return dIndex;
}
function compressFrame(src, dst) {
  let dIndex = 0;
  writeU32(dst, dIndex, magicNum);
  dIndex += 4;
  dst[dIndex++] = fdVersion;
  dst[dIndex++] = bsDefault << bsShift;
  dst[dIndex] = hash(0, dst, 4, dIndex - 4) >> 8;
  dIndex++;
  const maxBlockSize = bsMap[bsDefault];
  let remaining = src.length;
  let sIndex = 0;
  clearHashTable(hashTable);
  while (remaining > 0) {
    let compSize = 0;
    const blockSize = remaining > maxBlockSize ? maxBlockSize : remaining;
    compSize = compressBlock(src, blockBuf, sIndex, blockSize, hashTable);
    if (compSize > blockSize || compSize === 0) {
      writeU32(dst, dIndex, 2147483648 | blockSize);
      dIndex += 4;
      for (let z = sIndex + blockSize; sIndex < z; ) {
        dst[dIndex++] = src[sIndex++];
      }
      remaining -= blockSize;
    } else {
      writeU32(dst, dIndex, compSize);
      dIndex += 4;
      for (let j = 0; j < compSize; ) {
        dst[dIndex++] = blockBuf[j++];
      }
      sIndex += blockSize;
      remaining -= blockSize;
    }
  }
  writeU32(dst, dIndex, 0);
  dIndex += 4;
  return dIndex;
}
function compress(src, maxSize) {
  let dst, size;
  if (maxSize === void 0) {
    maxSize = compressBound(src.length);
  }
  dst = makeBuffer(maxSize);
  size = compressFrame(src, dst);
  if (size !== maxSize) {
    dst = sliceArray(dst, 0, size);
  }
  return dst;
}

// src/vendor/hfjs-xet/utils/XetBlob.ts
var XET_CHUNK_HEADER_BYTES = 8;
function bg4_split_bytes(bytes) {
  const ret = new Uint8Array(bytes.byteLength);
  const split = Math.floor(bytes.byteLength / 4);
  const rem = bytes.byteLength % 4;
  const g1_pos = split + (rem >= 1 ? 1 : 0);
  const g2_pos = g1_pos + split + (rem >= 2 ? 1 : 0);
  const g3_pos = g2_pos + split + (rem == 3 ? 1 : 0);
  for (let i = 0, j = 0; i < bytes.byteLength; i += 4, j++) {
    ret[j] = bytes[i];
  }
  for (let i = 1, j = g1_pos; i < bytes.byteLength; i += 4, j++) {
    ret[j] = bytes[i];
  }
  for (let i = 2, j = g2_pos; i < bytes.byteLength; i += 4, j++) {
    ret[j] = bytes[i];
  }
  for (let i = 3, j = g3_pos; i < bytes.byteLength; i += 4, j++) {
    ret[j] = bytes[i];
  }
  return ret;
}

// src/vendor/hfjs-xet/utils/ChunkCache.ts
var CHUNK_CACHE_INITIAL_SIZE = 1e4;
var CHUNK_CACHE_GROW_FACTOR = 1.5;
var CHUNK_CACHE_MAX_SIZE = 1e6;
var ChunkCache = class {
  index = 0;
  // Index >= 0 means local xorb, < 0 means remote xorb
  xorbIndices;
  // Max 8K chunks per xorb, less than 64K uint16_t
  chunkIndices;
  map = /* @__PURE__ */ new Map();
  // hash -> chunkCacheIndex. Less overhead that way, empty object is 60+B and empty array is 40+B
  hmacs = /* @__PURE__ */ new Set();
  // todo : remove old hmacs
  maxSize;
  constructor(maxSize = CHUNK_CACHE_MAX_SIZE) {
    if (maxSize < 1) {
      throw new Error("maxSize must be at least 1");
    }
    this.maxSize = maxSize;
    this.xorbIndices = new Int32Array(Math.min(CHUNK_CACHE_INITIAL_SIZE, maxSize));
    this.chunkIndices = new Uint16Array(Math.min(CHUNK_CACHE_INITIAL_SIZE, maxSize));
  }
  addChunkToCache(hash3, xorbIndex, chunkIndex, hmac2) {
    if (this.map.has(hash3)) {
      return;
    }
    if (this.map.values().next().value === this.index) {
      this.map.delete(this.map.keys().next().value);
    }
    this.map.set(hash3, this.index);
    if (hmac2 !== null) {
      this.hmacs.add(hmac2);
    }
    if (this.index >= this.xorbIndices.length) {
      const oldXorbIndices = this.xorbIndices;
      const oldChunkIndices = this.chunkIndices;
      this.xorbIndices = new Int32Array(Math.min(this.xorbIndices.length * CHUNK_CACHE_GROW_FACTOR, this.maxSize));
      this.chunkIndices = new Uint16Array(Math.min(this.chunkIndices.length * CHUNK_CACHE_GROW_FACTOR, this.maxSize));
      this.xorbIndices.set(oldXorbIndices);
      this.chunkIndices.set(oldChunkIndices);
    }
    this.xorbIndices[this.index] = xorbIndex;
    this.chunkIndices[this.index] = chunkIndex;
    this.index = (this.index + 1) % this.maxSize;
  }
  getChunk(hash3, hmacFunction) {
    let index = this.map.get(hash3);
    if (index === void 0 && hmacFunction !== null) {
      for (const hmac2 of this.hmacs) {
        index = this.map.get(hmacFunction(hash3, hmac2));
        if (index !== void 0) {
          break;
        }
      }
    }
    if (index === void 0) {
      return void 0;
    }
    return {
      xorbIndex: this.xorbIndices[index],
      chunkIndex: this.chunkIndices[index]
    };
  }
  updateChunkIndex(hash3, chunkIndex) {
    const index = this.map.get(hash3);
    if (index === void 0) {
      throw new Error(`Chunk not found in cache: ${hash3}`);
    }
    this.chunkIndices[index] = chunkIndex;
  }
  removeChunkFromCache(hash3) {
    this.map.delete(hash3);
  }
};

// src/vendor/hfjs-xet/utils/xetWriteToken.ts
var JWT_SAFETY_PERIOD = 6e4;
var JWT_CACHE_SIZE = 1e3;
var jwtPromises = /* @__PURE__ */ new Map();
var jwts = /* @__PURE__ */ new Map();
async function xetWriteToken(params) {
  if (params.xetParams.expiresAt && params.xetParams.casUrl && params.xetParams.accessToken && params.xetParams.expiresAt > new Date(Date.now() + JWT_SAFETY_PERIOD)) {
    return { accessToken: params.xetParams.accessToken, casUrl: params.xetParams.casUrl };
  }
  const key = params.xetParams.refreshWriteTokenUrl;
  const jwt = jwts.get(key);
  if (jwt && jwt.expiresAt > new Date(Date.now() + JWT_SAFETY_PERIOD)) {
    return { accessToken: jwt.accessToken, casUrl: jwt.casUrl };
  }
  const existingPromise = jwtPromises.get(key);
  if (existingPromise) {
    return existingPromise;
  }
  const promise = (async () => {
    const resp = await (params.fetch ?? fetch)(params.xetParams.refreshWriteTokenUrl, {
      headers: {
        ...params.accessToken ? {
          Authorization: `Bearer ${params.accessToken}`
        } : {},
        ...params.xetParams.sessionId ? { "X-Xet-Session-Id": params.xetParams.sessionId } : {}
      }
    });
    if (!resp.ok) {
      throw await createApiError(resp);
    }
    const json = await resp.json();
    const jwt2 = {
      accessToken: json.accessToken,
      expiresAt: new Date(json.exp * 1e3),
      casUrl: json.casUrl
    };
    jwtPromises.delete(key);
    for (const [key2, value] of jwts.entries()) {
      if (value.expiresAt < new Date(Date.now() + JWT_SAFETY_PERIOD)) {
        jwts.delete(key2);
      } else {
        break;
      }
    }
    if (jwts.size >= JWT_CACHE_SIZE) {
      const keyToDelete = jwts.keys().next().value;
      if (keyToDelete) {
        jwts.delete(keyToDelete);
      }
    }
    jwts.set(key, jwt2);
    return {
      accessToken: json.accessToken,
      casUrl: json.casUrl
    };
  })();
  jwtPromises.set(key, promise);
  return promise;
}

// src/vendor/hfjs-xet/utils/shardParser.ts
var HASH_LENGTH = 32;
var XORB_HASH_BOOKEND = "ff".repeat(HASH_LENGTH);
function readHashFromArray(array, offset) {
  let hash3 = "";
  for (let i = 0; i < HASH_LENGTH; i += 8) {
    hash3 += `${array[offset + i + 7].toString(16).padStart(2, "0")}${array[offset + i + 6].toString(16).padStart(2, "0")}${array[offset + i + 5].toString(16).padStart(2, "0")}${array[offset + i + 4].toString(16).padStart(2, "0")}${array[offset + i + 3].toString(16).padStart(2, "0")}${array[offset + i + 2].toString(16).padStart(2, "0")}${array[offset + i + 1].toString(16).padStart(2, "0")}${array[offset + i].toString(16).padStart(2, "0")}`;
  }
  return hash3;
}
async function parseShardData(shardBlob) {
  const shard = new Uint8Array(await shardBlob.arrayBuffer());
  const shardView = new DataView(shard.buffer);
  const magicTag = shard.slice(0, SHARD_MAGIC_TAG.length);
  if (!magicTag.every((byte, i) => byte === SHARD_MAGIC_TAG[i])) {
    throw new Error("Invalid shard magic tag");
  }
  const version = shardView.getBigUint64(SHARD_MAGIC_TAG.length, true);
  if (version !== SHARD_HEADER_VERSION) {
    throw new Error(`Invalid shard version: ${version}`);
  }
  const footerSize = Number(shardView.getBigUint64(SHARD_MAGIC_TAG.length + 8, true));
  const footerStart = shard.length - footerSize;
  const footerVersion = shardView.getBigUint64(footerStart, true);
  if (footerVersion !== SHARD_FOOTER_VERSION) {
    throw new Error(`Invalid shard footer version: ${footerVersion}`);
  }
  const xorbInfoStart = Number(shardView.getBigUint64(footerStart + 16, true));
  const fileLookupStart = Number(shardView.getBigUint64(footerStart + 24, true));
  const hmacKey = readHashFromArray(shard, footerStart + 72);
  const xorbs = [];
  let offset = xorbInfoStart;
  while (offset < fileLookupStart) {
    const xorbHash2 = readHashFromArray(shard, offset);
    offset += HASH_LENGTH;
    if (xorbHash2 === XORB_HASH_BOOKEND) {
      break;
    }
    offset += 4;
    const chunkCount = shardView.getUint32(offset, true);
    offset += 4;
    offset += 4;
    offset += 4;
    const chunks = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunkHash = readHashFromArray(shard, offset);
      offset += HASH_LENGTH;
      const startOffset = shardView.getUint32(offset, true);
      offset += 4;
      const length = shardView.getUint32(offset, true);
      offset += 4;
      offset += 8;
      chunks.push({
        hash: chunkHash,
        startOffset,
        unpackedLength: length
      });
    }
    xorbs.push({
      hash: xorbHash2,
      chunks
    });
  }
  return {
    hmacKey,
    xorbs
  };
}

// src/vendor/hfjs-xet/utils/sum.ts
function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

// src/vendor/hfjs-xet/utils/SplicedBlob.ts
var SplicedBlob = class _SplicedBlob extends Blob {
  originalBlob;
  spliceOperations;
  constructor(originalBlob, spliceOperations) {
    super();
    this.originalBlob = originalBlob;
    this.spliceOperations = spliceOperations;
  }
  static create(originalBlob, operations) {
    for (const op of operations) {
      if (op.start < 0 || op.end < 0) {
        throw new Error("Invalid start/end positions for SplicedBlob");
      }
      if (op.start > originalBlob.size || op.end > originalBlob.size) {
        throw new Error("Invalid start/end positions for SplicedBlob");
      }
      if (op.start > op.end) {
        throw new Error("Invalid start/end positions for SplicedBlob");
      }
    }
    const sortedOps = [...operations].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sortedOps.length - 1; i++) {
      if (sortedOps[i].end > sortedOps[i + 1].start) {
        throw new Error("Overlapping splice operations are not supported");
      }
    }
    return new _SplicedBlob(originalBlob, sortedOps);
  }
  /**
   * Returns the size of the spliced blob.
   * Size = original size - total replaced size + total insert size
   */
  get size() {
    let totalReplacedSize = 0;
    let totalInsertSize = 0;
    for (const op of this.spliceOperations) {
      totalReplacedSize += op.end - op.start;
      totalInsertSize += op.insert.size;
    }
    return this.originalBlob.size - totalReplacedSize + totalInsertSize;
  }
  /**
   * Returns the MIME type of the original blob.
   */
  get type() {
    return this.originalBlob.type;
  }
  /**
   * Returns a new instance of SplicedBlob that is a slice of the current one.
   *
   * The slice is inclusive of the start and exclusive of the end.
   * The slice method does not support negative start/end.
   *
   * @param start beginning of the slice
   * @param end end of the slice
   */
  slice(start = 0, end = this.size) {
    if (start < 0 || end < 0) {
      throw new TypeError("Unsupported negative start/end on SplicedBlob.slice");
    }
    start = Math.min(start, this.size);
    end = Math.min(end, this.size);
    if (start >= end) {
      return new Blob([]);
    }
    const segments = this.segments;
    const segmentBoundaries = [0];
    let cumulativeSize = 0;
    for (const segment of segments) {
      cumulativeSize += segment.size;
      segmentBoundaries.push(cumulativeSize);
    }
    const resultSegments = [];
    for (let i = 0; i < segments.length; i++) {
      const segmentStart = segmentBoundaries[i];
      const segmentEnd = segmentBoundaries[i + 1];
      if (segmentEnd <= start) {
        continue;
      }
      if (segmentStart >= end) {
        break;
      }
      const sliceStart = Math.max(0, start - segmentStart);
      const sliceEnd = Math.min(segments[i].size, end - segmentStart);
      if (sliceStart < sliceEnd) {
        resultSegments.push(segments[i].slice(sliceStart, sliceEnd));
      }
    }
    return new Blob(resultSegments);
  }
  get firstSpliceIndex() {
    return this.spliceOperations[0]?.start ?? Infinity;
  }
  /**
   * Read the spliced blob content and returns it as an ArrayBuffer.
   */
  async arrayBuffer() {
    const segments = this.segments;
    const buffers = await Promise.all(segments.map((segment) => segment.arrayBuffer()));
    const totalSize = sum(buffers.map((buffer) => buffer.byteLength));
    const result = new Uint8Array(totalSize);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    return result.buffer;
  }
  /**
   * Read the spliced blob content and returns it as a string.
   */
  async text() {
    const buffer = await this.arrayBuffer();
    return new TextDecoder().decode(buffer);
  }
  /**
   * Returns a stream around the spliced blob content.
   */
  stream() {
    const readable = new ReadableStream({
      start: async (controller) => {
        try {
          const segments = this.segments;
          for (const segment of segments) {
            const reader = segment.stream().getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                controller.enqueue(value);
              }
            } finally {
              reader.releaseLock();
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });
    return readable;
  }
  /**
   * Get all segments that make up the spliced blob.
   * This includes original blob segments between splice operations and insert blobs.
   */
  get segments() {
    const segments = [];
    let currentPosition = 0;
    const sortedOps = [...this.spliceOperations].sort((a, b) => a.start - b.start);
    for (const op of sortedOps) {
      if (currentPosition < op.start) {
        segments.push(this.originalBlob.slice(currentPosition, op.start));
      }
      if (op.insert.size > 0) {
        segments.push(op.insert);
      }
      currentPosition = op.end;
    }
    if (currentPosition < this.originalBlob.size) {
      segments.push(this.originalBlob.slice(currentPosition));
    }
    return segments;
  }
};

// node_modules/gearhash-jit/dist/esm/table.js
var GEAR_TABLE = [
  0xb088d3a9e840f559n,
  0x5652c7f739ed20d6n,
  0x45b28969898972abn,
  0x6b0a89d5b68ec777n,
  0x368f573e8b7a31b7n,
  0x1dc636dce936d94bn,
  0x207a4c4e5554d5b6n,
  0xa474b34628239acbn,
  0x3b06a83e1ca3b912n,
  0x90e78d6c2f02baf7n,
  0xe1c92df7150d9a8an,
  0x8e95053a1086d3adn,
  0x5a2ef4f1b83a0722n,
  0xa50fac949f807faen,
  0x0e7303eb80d8d681n,
  0x99b07edc1570ad0fn,
  0x689d2fb555fd3076n,
  0x00005082119ea468n,
  0xc4b08306a88fcc28n,
  0x3eb0678af6374afdn,
  0xf19f87ab86ad7436n,
  0xf2129fbfbe6bc736n,
  0x481149575c98a4edn,
  0x0000010695477bc5n,
  0x1fba37801a9ceaccn,
  0x3bf06fd663a49b6dn,
  0x99687e9782e3874bn,
  0x79a10673aa50d8e3n,
  0xe4accf9e6211f420n,
  0x2520e71f87579071n,
  0x2bd5d3fd781a8a9bn,
  0x00de4dcddd11c873n,
  0xeaa9311c5a87392fn,
  0xdb748eb617bc40ffn,
  0xaf579a8df620bf6fn,
  0x86a6e5da1b09c2b1n,
  0xcc2fc30ac322a12en,
  0x355e2afec1f74267n,
  0x2d99c8f4c021a47bn,
  0xbade4b4a9404cfc3n,
  0xf7b518721d707d69n,
  0x3286b6587bf32c20n,
  0x0000b68886af270cn,
  0xa115d6e4db8a9079n,
  0x484f7e9c97b2e199n,
  0xccca7bb75713e301n,
  0xbf2584a62bb0f160n,
  0xade7e813625dbcc8n,
  0x000070940d87955an,
  0x8ae69108139e626fn,
  0xbd776ad72fde38a2n,
  0xfb6b001fc2fcc0cfn,
  0xc7a474b8e67bc427n,
  0xbaf6f11610eb5d58n,
  0x09cb1f5b6de770d1n,
  0xb0b219e6977d4c47n,
  0x00ccbc386ea7ad4an,
  0xcc849d0adf973f01n,
  0x73a3ef7d016af770n,
  0xc807d2d386bdbdfen,
  0x7f2ac9966c791730n,
  0xd037a86bc6c504dan,
  0xf3f17c661eaa609dn,
  0xaca626b04daae687n,
  0x755a99374f4a5b07n,
  0x90837ee65b2caeden,
  0x6ee8ad93fd560785n,
  0x0000d9e11053edd8n,
  0x9e063bb2d21cdbd7n,
  0x07ab77f12a01d2b2n,
  0xec550255e6641b44n,
  0x78fb94a8449c14c6n,
  0xc7510e1bc6c0f5f5n,
  0x0000320b36e4cae3n,
  0x827c33262c8b1a2dn,
  0x14675f0b48ea4144n,
  0x267bd3a6498decebn,
  0xf1916ff982f5035en,
  0x86221b7ff434fb88n,
  0x9dbecee7386f49d8n,
  0xea58f8cac80f8f4an,
  0x008d198692fc64d8n,
  0x6d38704fbabf9a36n,
  0xe032cb07d1e7be4cn,
  0x228d21f6ad450890n,
  0x635cb1bfc02589a5n,
  0x4620a1739ca2ce71n,
  0xa7e7dfe3aae5fb58n,
  0x0c10ca932b3c0debn,
  0x2727fee884afed7bn,
  0xa2df1c6df9e2ab1fn,
  0x4dcdd1ac0774f523n,
  0x000070ffad33e24en,
  0xa2ace87bc5977816n,
  0x9892275ab4286049n,
  0xc2861181ddf18959n,
  0xbb9972a042483e19n,
  0xef70cd3766513078n,
  0x00000513abfc9864n,
  0xc058b61858c94083n,
  0x09e850859725e0den,
  0x9197fb3bf83e7d94n,
  0x7e1e626d12b64bcen,
  0x520c54507f7b57d1n,
  0xbee1797174e22416n,
  0x6fd9ac3222e95587n,
  0x0023957c9adfbf3en,
  0xa01c7d7e234bbe15n,
  0xaba2c758b8a38cbbn,
  0x0d1fa0ceec3e2b30n,
  0x0bb6a58b7e60b991n,
  0x4333dd5b9fa26635n,
  0xc2fd3b7d4001c1a3n,
  0xfb41802454731127n,
  0x65a56185a50d18cbn,
  0xf67a02bd8784b54fn,
  0x696f11dd67e65063n,
  0x00002022fca814abn,
  0x8cd6be912db9d852n,
  0x695189b6e9ae8a57n,
  0xee9453b50ada0c28n,
  0xd8fc5ea91a78845en,
  0xab86bf191a4aa767n,
  0x0000c6b5c86415e5n,
  0x267310178e08a22en,
  0xed2d101b078bca25n,
  0x3b41ed84b226a8fbn,
  0x13e622120f28dc06n,
  0xa315f5ebfb706d26n,
  0x8816c34e3301bacen,
  0xe9395b9cbb71fdaen,
  0x002ce9202e721648n,
  0x4283db1d2bb3c91cn,
  0xd77d461ad2b1a6a5n,
  0xe2ec17e46eeb866bn,
  0xb8e0be4039fbc47cn,
  0xdea160c4d5299d04n,
  0x7eec86c8d28c3634n,
  0x2119ad129f98a399n,
  0xa6ccf46b61a283efn,
  0x2c52cedef658c617n,
  0x2db4871169acdd83n,
  0x0000f0d6f39ecbe9n,
  0x3dd5d8c98d2f9489n,
  0x8a1872a22b01f584n,
  0xf282a4c40e7b3cf2n,
  0x8020ec2ccb1ba196n,
  0x6693b6e09e59e313n,
  0x0000ce19cc7c83ebn,
  0x20cb5735f6479c3bn,
  0x762ebf3759d75a5bn,
  0x207bfe823d693975n,
  0xd77dc112339cd9d5n,
  0x9ba7834284627d03n,
  0x217dc513e95f51e9n,
  0xb27b1a29fc5e7816n,
  0x00d5cd9831bb662dn,
  0x71e39b806d75734cn,
  0x7e572af006fb1a23n,
  0xa2734f2f6ae91f85n,
  0xbf82c6b5022cddf2n,
  0x5c3beac60761a0den,
  0xcdc893bb47416998n,
  0x6d1085615c187e01n,
  0x77f8ae30ac277c5dn,
  0x917c6b81122a2c91n,
  0x5b75b699add16967n,
  0x0000cf6ae79a069bn,
  0xf3c40afa60de1104n,
  0x2063127aa59167c3n,
  0x621de62269d1894dn,
  0xd188ac1de62b4726n,
  0x107036e2154b673cn,
  0x0000b85f28553a1dn,
  0xf2ef4e4c18236f3dn,
  0xd9d6de6611b9f602n,
  0xa1fc7955fb47911cn,
  0xeb85fd032f298dbdn,
  0xbe27502fb3befae1n,
  0xe3034251c4cd661en,
  0x441364d354071836n,
  0x0082b36c75f2983en,
  0xb145910316fa66f0n,
  0x021c069c9847caf7n,
  0x2910dfc75a4b5221n,
  0x735b353e1c57a8b5n,
  0xce44312ce98ed96cn,
  0xbc942e4506bdfa65n,
  0xf05086a71257941bn,
  0xfec3b215d351ceadn,
  0x00ae1055e0144202n,
  0xf54b40846f42e454n,
  0x00007fd9c8bcbcc8n,
  0xbfbd9ef317de9bfen,
  0xa804302ff2854e12n,
  0x39ce4957a5e5d8d4n,
  0xffb9e2a45637ba84n,
  0x55b9ad1d9ea0818bn,
  0x00008acbf319178an,
  0x48e2bfc8d0fbfb38n,
  0x8be39841e848b5e8n,
  0x0e2712160696a08bn,
  0xd51096e84b44242an,
  0x1101ba176792e13an,
  0xc22e770f4531689dn,
  0x1689eff272bbc56cn,
  0x00a92a197f5650ecn,
  0xbc765990bda1784en,
  0xc61441e392fcb8aen,
  0x07e13a2ced31e4a0n,
  0x92cbe984234e9d4dn,
  0x8f4ff572bb7d8ac5n,
  0x0b9670c00b963bd0n,
  0x62955a581a03eb01n,
  0x645f83e5ea000254n,
  0x41fce516cd88f299n,
  0xbbda9748da7a98cfn,
  0x0000aab2fe4845fan,
  0x19761b069bf56555n,
  0x8b8f5e8343b6ad56n,
  0x3e5d1cfd144821d9n,
  0xec5c1e2ca2b0cd8fn,
  0xfaf7e0fea7fbb57fn,
  0x000000d3ba12961bn,
  0xda3f90178401b18en,
  0x70ff906de33a5febn,
  0x0527d5a7c06970e7n,
  0x22d8e773607c13e9n,
  0xc9ab70df643c3bacn,
  0xeda4c6dc8abe12e3n,
  0xecef1f410033e78an,
  0x0024c2b274ac72cbn,
  0x06740d954fa900b4n,
  0x1d7a299b323d6304n,
  0xb3c37cb298cbead5n,
  0xc986e3c76178739bn,
  0x9fabea364b46f58an,
  0x6da214c5af85cc56n,
  0x17a43ed8b7a38f84n,
  0x6eccec511d9adbebn,
  0xf9cab30913335afbn,
  0x4a5e60c5f415eed2n,
  0x00006967503672b4n,
  0x9da51d121454bb87n,
  0x84321e13b9bbc816n,
  0xfb3d6fb6ab2fdd8dn,
  0x60305eed8e160a8dn,
  0xcbbf4b14e9946ce8n,
  0x00004f63381b10c3n,
  0x07d5b7816fcc4e10n,
  0xe5a536726a6a8155n,
  0x57afb23447a07fddn,
  0x18f346f7abc9d394n,
  0x636dc655d61ad33dn,
  0xcc8bab4939f7f3f6n,
  0x63c7a906c1dd187bn
];

// node_modules/gearhash-jit/dist/esm/wasm.js
var TABLE_OFFSET = 0;
var HASH_OFFSET = 2048;
var MASK_OFFSET = 2056;
var INPUT_OFFSET = 4096;
var PAGES = 8;
var MAX_INPUT_SIZE = PAGES * 65536 - INPUT_OFFSET;
var wasmMemory = null;
var wasmView = null;
var wasmFn = null;
function toSignedLeb128(n) {
  const bytes = [];
  let value = n | 0;
  for (; ; ) {
    const byte = value & 127;
    value >>= 7;
    if (value === 0 && (byte & 64) === 0 || value === -1 && (byte & 64) !== 0) {
      bytes.push(byte);
      return bytes;
    }
    bytes.push(byte | 128);
  }
}
function toLebU32Padded5(n) {
  return [
    n & 127 | 128,
    n >>> 7 & 127 | 128,
    n >>> 14 & 127 | 128,
    n >>> 21 & 127 | 128,
    n >>> 28 & 15
  ];
}
function generateWasmBytes() {
  const code = [];
  function emit(...bytes) {
    code.push(...bytes);
  }
  emit(0, 97, 115, 109);
  emit(1, 0, 0, 0);
  emit(1, 7, 1, 96, 2, 127, 127, 1, 127);
  emit(2, 11, 1, 2, 106, 115, 3, 109, 101, 109, 2, 0, PAGES);
  emit(3, 2, 1, 0);
  emit(7, 13, 1, 9, 110, 101, 120, 116, 77, 97, 116, 99, 104, 0, 0);
  emit(10);
  const sectionSizeOff = code.length;
  emit(0, 0, 0, 0, 0);
  emit(1);
  const funcSizeOff = code.length;
  emit(0, 0, 0, 0, 0);
  const bodyStart = code.length;
  emit(2, 2, 126, 2, 127);
  emit(65, ...toSignedLeb128(HASH_OFFSET));
  emit(41, 3, 0);
  emit(33, 2);
  emit(65, ...toSignedLeb128(MASK_OFFSET));
  emit(41, 3, 0);
  emit(33, 3);
  emit(32, 0);
  emit(33, 4);
  emit(32, 0);
  emit(32, 1);
  emit(106);
  emit(33, 5);
  emit(2, 64);
  emit(3, 64);
  emit(32, 4);
  emit(32, 5);
  emit(78);
  emit(13, 1);
  emit(32, 2);
  emit(66, 1);
  emit(134);
  emit(32, 4);
  emit(45, 0, 0);
  emit(65, 3);
  emit(116);
  emit(41, 3, 0);
  emit(124);
  emit(34, 2);
  emit(32, 3);
  emit(131);
  emit(80);
  emit(4, 64);
  emit(65, ...toSignedLeb128(HASH_OFFSET));
  emit(32, 2);
  emit(55, 3, 0);
  emit(32, 4);
  emit(32, 0);
  emit(107);
  emit(65, 1);
  emit(106);
  emit(15);
  emit(11);
  emit(32, 4);
  emit(65, 1);
  emit(106);
  emit(33, 4);
  emit(12, 0);
  emit(11);
  emit(11);
  emit(65, ...toSignedLeb128(HASH_OFFSET));
  emit(32, 2);
  emit(55, 3, 0);
  emit(65, 127);
  emit(11);
  const bodySize = code.length - bodyStart;
  const bsPatch = toLebU32Padded5(bodySize);
  for (let i = 0; i < 5; i++)
    code[funcSizeOff + i] = bsPatch[i];
  const secSize = code.length - sectionSizeOff - 5;
  const ssPatch = toLebU32Padded5(secSize);
  for (let i = 0; i < 5; i++)
    code[sectionSizeOff + i] = ssPatch[i];
  return new Uint8Array(code);
}
function initWasm() {
  if (wasmFn)
    return;
  const bytes = generateWasmBytes();
  wasmMemory = new WebAssembly.Memory({ initial: PAGES });
  const module = new WebAssembly.Module(bytes);
  const instance = new WebAssembly.Instance(module, { js: { mem: wasmMemory } });
  wasmFn = instance.exports.nextMatch;
  wasmView = new Uint8Array(wasmMemory.buffer);
  const dv = new DataView(wasmMemory.buffer);
  for (let i = 0; i < 256; i++) {
    dv.setBigUint64(TABLE_OFFSET + i * 8, GEAR_TABLE[i], true);
  }
}
function wasmNextMatch(inputStart, inputLen) {
  return wasmFn(inputStart, inputLen);
}
function getView() {
  return wasmView;
}

// node_modules/gearhash-jit/dist/esm/index.js
var Hasher = class {
  maskBytes;
  /**
   * The current 64-bit rolling hash state as 8 little-endian bytes.
   * Updated after every `nextMatch` call. Zeroed by `resetHash()`.
   */
  hash;
  constructor(mask) {
    initWasm();
    this.maskBytes = new Uint8Array(8);
    this.hash = new Uint8Array(8);
    new DataView(this.maskBytes.buffer).setBigUint64(0, mask, true);
  }
  /**
   * Scan `buf` for the next gear-hash match. The internal hash state
   * carries over between calls (for split-buffer scanning).
   *
   * @returns 1-based byte position of the match, or -1 if none found.
   */
  nextMatch(buf) {
    const len = buf.length;
    if (len === 0)
      return -1;
    if (len > MAX_INPUT_SIZE) {
      throw new RangeError(`Input too large: ${len} > ${MAX_INPUT_SIZE}`);
    }
    const view = getView();
    view.set(this.hash, HASH_OFFSET);
    view.set(this.maskBytes, MASK_OFFSET);
    view.set(buf, INPUT_OFFSET);
    const pos = wasmNextMatch(INPUT_OFFSET, len);
    this.hash.set(view.subarray(HASH_OFFSET, HASH_OFFSET + 8));
    return pos;
  }
  /** Reset rolling hash to zero (call when starting a new chunk). */
  resetHash() {
    this.hash.fill(0);
  }
};

// node_modules/@huggingface/blake3-jit/dist/esm/compress.js
function compress2(cv, cvOff, block, blockOff, out, outOff, full, counter, blockLen, flags) {
  let m0 = block[blockOff] | 0;
  let m1 = block[blockOff + 1] | 0;
  let m2 = block[blockOff + 2] | 0;
  let m3 = block[blockOff + 3] | 0;
  let m4 = block[blockOff + 4] | 0;
  let m5 = block[blockOff + 5] | 0;
  let m6 = block[blockOff + 6] | 0;
  let m7 = block[blockOff + 7] | 0;
  let m8 = block[blockOff + 8] | 0;
  let m9 = block[blockOff + 9] | 0;
  let m10 = block[blockOff + 10] | 0;
  let m11 = block[blockOff + 11] | 0;
  let m12 = block[blockOff + 12] | 0;
  let m13 = block[blockOff + 13] | 0;
  let m14 = block[blockOff + 14] | 0;
  let m15 = block[blockOff + 15] | 0;
  let s0 = cv[cvOff] | 0;
  let s1 = cv[cvOff + 1] | 0;
  let s2 = cv[cvOff + 2] | 0;
  let s3 = cv[cvOff + 3] | 0;
  let s4 = cv[cvOff + 4] | 0;
  let s5 = cv[cvOff + 5] | 0;
  let s6 = cv[cvOff + 6] | 0;
  let s7 = cv[cvOff + 7] | 0;
  let s8 = 1779033703;
  let s9 = 3144134277;
  let s10 = 1013904242;
  let s11 = 2773480762;
  let s12 = counter | 0;
  let s13 = counter / 4294967296 | 0;
  let s14 = blockLen | 0;
  let s15 = flags | 0;
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  {
    const t0 = m0, t1 = m1;
    m0 = m2;
    m2 = m3;
    m3 = m10;
    m10 = m12;
    m12 = m9;
    m9 = m11;
    m11 = m5;
    m5 = t0;
    m1 = m6;
    m6 = m4;
    m4 = m7;
    m7 = m13;
    m13 = m14;
    m14 = m15;
    m15 = m8;
    m8 = t1;
  }
  s0 = (s0 + s4 | 0) + m0 | 0;
  s12 ^= s0;
  s12 = s12 >>> 16 | s12 << 16;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 12 | s4 << 20;
  s0 = (s0 + s4 | 0) + m1 | 0;
  s12 ^= s0;
  s12 = s12 >>> 8 | s12 << 24;
  s8 = s8 + s12 | 0;
  s4 ^= s8;
  s4 = s4 >>> 7 | s4 << 25;
  s1 = (s1 + s5 | 0) + m2 | 0;
  s13 ^= s1;
  s13 = s13 >>> 16 | s13 << 16;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 12 | s5 << 20;
  s1 = (s1 + s5 | 0) + m3 | 0;
  s13 ^= s1;
  s13 = s13 >>> 8 | s13 << 24;
  s9 = s9 + s13 | 0;
  s5 ^= s9;
  s5 = s5 >>> 7 | s5 << 25;
  s2 = (s2 + s6 | 0) + m4 | 0;
  s14 ^= s2;
  s14 = s14 >>> 16 | s14 << 16;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 12 | s6 << 20;
  s2 = (s2 + s6 | 0) + m5 | 0;
  s14 ^= s2;
  s14 = s14 >>> 8 | s14 << 24;
  s10 = s10 + s14 | 0;
  s6 ^= s10;
  s6 = s6 >>> 7 | s6 << 25;
  s3 = (s3 + s7 | 0) + m6 | 0;
  s15 ^= s3;
  s15 = s15 >>> 16 | s15 << 16;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 12 | s7 << 20;
  s3 = (s3 + s7 | 0) + m7 | 0;
  s15 ^= s3;
  s15 = s15 >>> 8 | s15 << 24;
  s11 = s11 + s15 | 0;
  s7 ^= s11;
  s7 = s7 >>> 7 | s7 << 25;
  s0 = (s0 + s5 | 0) + m8 | 0;
  s15 ^= s0;
  s15 = s15 >>> 16 | s15 << 16;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 12 | s5 << 20;
  s0 = (s0 + s5 | 0) + m9 | 0;
  s15 ^= s0;
  s15 = s15 >>> 8 | s15 << 24;
  s10 = s10 + s15 | 0;
  s5 ^= s10;
  s5 = s5 >>> 7 | s5 << 25;
  s1 = (s1 + s6 | 0) + m10 | 0;
  s12 ^= s1;
  s12 = s12 >>> 16 | s12 << 16;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 12 | s6 << 20;
  s1 = (s1 + s6 | 0) + m11 | 0;
  s12 ^= s1;
  s12 = s12 >>> 8 | s12 << 24;
  s11 = s11 + s12 | 0;
  s6 ^= s11;
  s6 = s6 >>> 7 | s6 << 25;
  s2 = (s2 + s7 | 0) + m12 | 0;
  s13 ^= s2;
  s13 = s13 >>> 16 | s13 << 16;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 12 | s7 << 20;
  s2 = (s2 + s7 | 0) + m13 | 0;
  s13 ^= s2;
  s13 = s13 >>> 8 | s13 << 24;
  s8 = s8 + s13 | 0;
  s7 ^= s8;
  s7 = s7 >>> 7 | s7 << 25;
  s3 = (s3 + s4 | 0) + m14 | 0;
  s14 ^= s3;
  s14 = s14 >>> 16 | s14 << 16;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 12 | s4 << 20;
  s3 = (s3 + s4 | 0) + m15 | 0;
  s14 ^= s3;
  s14 = s14 >>> 8 | s14 << 24;
  s9 = s9 + s14 | 0;
  s4 ^= s9;
  s4 = s4 >>> 7 | s4 << 25;
  if (full) {
    out[outOff + 8] = s8 ^ cv[cvOff];
    out[outOff + 9] = s9 ^ cv[cvOff + 1];
    out[outOff + 10] = s10 ^ cv[cvOff + 2];
    out[outOff + 11] = s11 ^ cv[cvOff + 3];
    out[outOff + 12] = s12 ^ cv[cvOff + 4];
    out[outOff + 13] = s13 ^ cv[cvOff + 5];
    out[outOff + 14] = s14 ^ cv[cvOff + 6];
    out[outOff + 15] = s15 ^ cv[cvOff + 7];
  }
  out[outOff] = s0 ^ s8;
  out[outOff + 1] = s1 ^ s9;
  out[outOff + 2] = s2 ^ s10;
  out[outOff + 3] = s3 ^ s11;
  out[outOff + 4] = s4 ^ s12;
  out[outOff + 5] = s5 ^ s13;
  out[outOff + 6] = s6 ^ s14;
  out[outOff + 7] = s7 ^ s15;
}

// node_modules/@huggingface/blake3-jit/dist/esm/constants.js
var IV = new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var CHUNK_START = 1;
var CHUNK_END = 1 << 1;
var PARENT = 1 << 2;
var ROOT = 1 << 3;
var KEYED_HASH = 1 << 4;
var DERIVE_KEY_CONTEXT = 1 << 5;
var DERIVE_KEY_MATERIAL = 1 << 6;
var OUT_LEN = 32;
var KEY_LEN = 32;
var BLOCK_LEN = 64;
var CHUNK_LEN = 1024;
var MAX_DEPTH = 54;
var PERMUTATIONS = new Uint8Array([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  2,
  6,
  3,
  10,
  7,
  0,
  4,
  13,
  1,
  11,
  12,
  5,
  9,
  14,
  15,
  8,
  3,
  4,
  10,
  12,
  13,
  2,
  7,
  14,
  6,
  5,
  9,
  0,
  11,
  15,
  8,
  1,
  10,
  7,
  12,
  9,
  14,
  3,
  13,
  15,
  4,
  0,
  11,
  2,
  5,
  8,
  1,
  6,
  12,
  13,
  9,
  11,
  15,
  10,
  14,
  8,
  7,
  2,
  5,
  3,
  0,
  1,
  6,
  4,
  9,
  14,
  11,
  5,
  8,
  12,
  15,
  1,
  13,
  3,
  0,
  10,
  2,
  6,
  4,
  7,
  11,
  15,
  5,
  0,
  1,
  9,
  8,
  6,
  14,
  10,
  2,
  12,
  3,
  4,
  7,
  13
]);

// node_modules/@huggingface/blake3-jit/dist/esm/utils.js
var IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([16909060]).buffer)[0] === 4;
function readLittleEndianWordsFull(input, offset, words) {
  for (let i = 0; i < 16; ++i, offset += 4) {
    words[i] = input[offset] | input[offset + 1] << 8 | input[offset + 2] << 16 | input[offset + 3] << 24;
  }
}
function writeLittleEndianBytesPartial(words, wordOffset, output, byteOffset, byteCount) {
  const fullWords = byteCount >>> 2;
  let i = 0;
  for (; i < fullWords; ++i, byteOffset += 4) {
    const w = words[wordOffset + i];
    output[byteOffset] = w & 255;
    output[byteOffset + 1] = w >>> 8 & 255;
    output[byteOffset + 2] = w >>> 16 & 255;
    output[byteOffset + 3] = w >>> 24 & 255;
  }
  const remaining = byteCount & 3;
  if (remaining > 0) {
    const w = words[wordOffset + i];
    output[byteOffset] = w & 255;
    if (remaining > 1)
      output[byteOffset + 1] = w >>> 8 & 255;
    if (remaining > 2)
      output[byteOffset + 2] = w >>> 16 & 255;
  }
}
function encodeUTF8(str) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 128) {
      bytes.push(c);
    } else if (c < 2048) {
      bytes.push(192 | c >> 6, 128 | c & 63);
    } else if (c < 55296 || c >= 57344) {
      bytes.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63);
    } else {
      i++;
      c = 65536 + ((c & 1023) << 10 | str.charCodeAt(i) & 1023);
      bytes.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63);
    }
  }
  return new Uint8Array(bytes);
}
var CTZ32_TABLE = new Uint8Array([
  0,
  1,
  28,
  2,
  29,
  14,
  24,
  3,
  30,
  22,
  20,
  15,
  25,
  17,
  4,
  8,
  31,
  27,
  13,
  23,
  21,
  19,
  16,
  7,
  26,
  12,
  18,
  6,
  11,
  5,
  10,
  9
]);

// node_modules/@huggingface/blake3-jit/dist/esm/hasher.js
var XofReader = class {
  inputCv;
  blockWords;
  counter;
  blockLen;
  flags;
  outputBlock;
  outputBlockOffset;
  constructor(inputCv, blockWords, counter, blockLen, flags) {
    this.inputCv = inputCv;
    this.blockWords = blockWords;
    this.counter = counter;
    this.blockLen = blockLen;
    this.flags = flags | ROOT;
    this.outputBlock = new Uint32Array(16);
    this.outputBlockOffset = 64;
  }
  /**
   * Read the next `length` bytes of output.
   */
  read(length) {
    const output = new Uint8Array(length);
    let outputOffset = 0;
    while (outputOffset < length) {
      if (this.outputBlockOffset >= 64) {
        compress2(
          this.inputCv,
          0,
          this.blockWords,
          0,
          this.outputBlock,
          0,
          true,
          // full 64-byte output
          this.counter++,
          this.blockLen,
          this.flags
        );
        this.outputBlockOffset = 0;
      }
      const available = 64 - this.outputBlockOffset;
      const toCopy = Math.min(available, length - outputOffset);
      const wordOffset = this.outputBlockOffset >>> 2;
      const byteWithinWord = this.outputBlockOffset & 3;
      if (byteWithinWord === 0 && toCopy >= 4) {
        const fullWords = toCopy >>> 2;
        writeLittleEndianBytesPartial(this.outputBlock, wordOffset, output, outputOffset, fullWords << 2);
        const bytesCopied = fullWords << 2;
        outputOffset += bytesCopied;
        this.outputBlockOffset += bytesCopied;
      } else {
        for (let i = 0; i < toCopy; i++) {
          const wordIdx = this.outputBlockOffset + i >>> 2;
          const byteIdx = this.outputBlockOffset + i & 3;
          output[outputOffset + i] = this.outputBlock[wordIdx] >>> (byteIdx << 3) & 255;
        }
        outputOffset += toCopy;
        this.outputBlockOffset += toCopy;
      }
    }
    return output;
  }
};
var ChunkState = class {
  chainingValue;
  chunkCounter;
  blockWords;
  blockLen;
  blocksCompressed;
  flags;
  constructor(keyWords, chunkCounter, flags) {
    this.chainingValue = new Uint32Array(keyWords);
    this.chunkCounter = chunkCounter;
    this.blockWords = new Uint32Array(16);
    this.blockLen = 0;
    this.blocksCompressed = 0;
    this.flags = flags;
  }
  resetTo(keyWords, chunkCounter, flags) {
    this.chainingValue.set(keyWords);
    this.chunkCounter = chunkCounter;
    this.blockLen = 0;
    this.blocksCompressed = 0;
    this.flags = flags;
  }
  /**
   * Get the flags for the current block.
   */
  startFlag() {
    return this.blocksCompressed === 0 ? CHUNK_START : 0;
  }
  /**
   * Update the chunk state with input data.
   * Returns the number of bytes consumed.
   */
  update(input, inputOffset, inputLen) {
    let consumed = 0;
    while (inputLen > 0) {
      if (this.blockLen === BLOCK_LEN) {
        compress2(this.chainingValue, 0, this.blockWords, 0, this.chainingValue, 0, false, this.chunkCounter, BLOCK_LEN, this.flags | this.startFlag());
        this.blocksCompressed++;
        this.blockLen = 0;
      }
      const want = BLOCK_LEN - this.blockLen;
      const take = Math.min(want, inputLen);
      if (this.blockLen === 0 && take === BLOCK_LEN) {
        readLittleEndianWordsFull(input, inputOffset, this.blockWords);
      } else {
        for (let i = 0; i < take; i++) {
          const pos = this.blockLen + i;
          const wordIdx = pos >>> 2;
          const byteIdx = pos & 3;
          if (byteIdx === 0) {
            this.blockWords[wordIdx] = input[inputOffset + i];
          } else {
            this.blockWords[wordIdx] |= input[inputOffset + i] << (byteIdx << 3);
          }
        }
      }
      this.blockLen += take;
      inputOffset += take;
      inputLen -= take;
      consumed += take;
    }
    return consumed;
  }
  /**
   * Finalize this chunk and return its output.
   * Returns 8 words (chaining value) or 16 words (if root).
   */
  output() {
    const usedWords = this.blockLen + 3 >>> 2;
    for (let i = usedWords; i < 16; i++) {
      this.blockWords[i] = 0;
    }
    return {
      inputCv: this.chainingValue,
      blockWords: this.blockWords,
      blockLen: this.blockLen,
      counter: this.chunkCounter,
      flags: this.flags | this.startFlag() | CHUNK_END
    };
  }
  /**
   * Get the number of bytes in this chunk.
   */
  len() {
    return this.blocksCompressed * BLOCK_LEN + this.blockLen;
  }
};
var Hasher2 = class _Hasher {
  chunkState;
  keyWords;
  cvStack;
  cvStackLen;
  flags;
  parentBlock;
  parentCv;
  chunkCv;
  outWords;
  finalizeCv;
  /**
   * Create a new Hasher.
   *
   * @param keyWords - Initial key words (IV for regular hashing)
   * @param flags - Domain separation flags
   */
  constructor(keyWords, flags) {
    this.keyWords = keyWords ? new Uint32Array(keyWords) : new Uint32Array(IV);
    this.flags = flags ?? 0;
    this.chunkState = new ChunkState(this.keyWords, 0, this.flags);
    this.cvStack = new Uint32Array(MAX_DEPTH * 8);
    this.cvStackLen = 0;
    this.parentBlock = new Uint32Array(16);
    this.parentCv = new Uint32Array(8);
    this.chunkCv = new Uint32Array(8);
    this.outWords = new Uint32Array(16);
    this.finalizeCv = new Uint32Array(8);
  }
  /**
   * Reset the hasher to process a new message with the same key/flags.
   * Reuses all internal buffers — zero allocations.
   */
  reset() {
    this.chunkState.resetTo(this.keyWords, 0, this.flags);
    this.cvStackLen = 0;
    return this;
  }
  /**
   * Create a new keyed hasher (MAC).
   *
   * @param key - 32-byte key
   */
  static newKeyed(key) {
    if (key.length !== KEY_LEN) {
      throw new Error(`Key must be ${KEY_LEN} bytes, got ${key.length}`);
    }
    const keyWords = new Uint32Array(8);
    if (IS_LITTLE_ENDIAN) {
      const view = new Uint32Array(key.buffer, key.byteOffset, 8);
      keyWords.set(view);
    } else {
      for (let i = 0; i < 8; i++) {
        const off = i * 4;
        keyWords[i] = key[off] | key[off + 1] << 8 | key[off + 2] << 16 | key[off + 3] << 24;
      }
    }
    return new _Hasher(keyWords, KEYED_HASH);
  }
  /**
   * Create a new key derivation hasher.
   *
   * @param context - Context string for domain separation
   */
  static newDeriveKey(context) {
    const contextBytes = encodeUTF8(context);
    const contextHasher = new _Hasher(new Uint32Array(IV), DERIVE_KEY_CONTEXT);
    contextHasher.update(contextBytes);
    const contextKey = new Uint32Array(8);
    const output = contextHasher.finalizeOutput();
    compress2(output.inputCv, 0, output.blockWords, 0, contextKey, 0, false, output.counter, output.blockLen, output.flags | ROOT);
    return new _Hasher(contextKey, DERIVE_KEY_MATERIAL);
  }
  /**
   * Push a chaining value onto the stack.
   */
  pushCv(cv, cvOffset) {
    this.cvStack.set(cv.subarray(cvOffset, cvOffset + 8), this.cvStackLen * 8);
    this.cvStackLen++;
  }
  /**
   * Pop a chaining value from the stack.
   */
  popCv(out, outOffset) {
    this.cvStackLen--;
    out.set(this.cvStack.subarray(this.cvStackLen * 8, (this.cvStackLen + 1) * 8), outOffset);
  }
  /**
   * Add a chunk's chaining value and merge completed subtrees.
   */
  addChunkCv(newCv, newCvOffset, totalChunks) {
    const parentBlock = this.parentBlock;
    const parentCv = this.parentCv;
    while ((totalChunks & 1) === 0) {
      this.popCv(parentBlock, 0);
      parentBlock.set(newCv.subarray(newCvOffset, newCvOffset + 8), 8);
      compress2(this.keyWords, 0, parentBlock, 0, parentCv, 0, false, 0, BLOCK_LEN, this.flags | PARENT);
      newCv = parentCv;
      newCvOffset = 0;
      totalChunks >>>= 1;
    }
    this.pushCv(newCv, newCvOffset);
  }
  /**
   * Update the hasher with input data.
   *
   * @param input - Data to hash
   * @returns this (for chaining)
   */
  update(input) {
    let inputOffset = 0;
    let inputLen = input.length;
    while (inputLen > 0) {
      if (this.chunkState.len() === CHUNK_LEN) {
        const output = this.chunkState.output();
        const chunkCv = this.chunkCv;
        compress2(output.inputCv, 0, output.blockWords, 0, chunkCv, 0, false, output.counter, output.blockLen, output.flags);
        const totalChunks = this.chunkState.chunkCounter + 1;
        this.addChunkCv(chunkCv, 0, totalChunks);
        this.chunkState.resetTo(this.keyWords, totalChunks, this.flags);
      }
      const want = CHUNK_LEN - this.chunkState.len();
      const take = Math.min(want, inputLen);
      this.chunkState.update(input, inputOffset, take);
      inputOffset += take;
      inputLen -= take;
    }
    return this;
  }
  /**
   * Get the output parameters (for XOF mode or finalization).
   */
  finalizeOutput() {
    let output = this.chunkState.output();
    let parentBlock = this.parentBlock;
    let cv = this.finalizeCv;
    if (this.cvStackLen > 0) {
      compress2(output.inputCv, 0, output.blockWords, 0, cv, 0, false, output.counter, output.blockLen, output.flags);
      while (this.cvStackLen > 0) {
        this.cvStackLen--;
        parentBlock.set(this.cvStack.subarray(this.cvStackLen * 8, (this.cvStackLen + 1) * 8), 0);
        parentBlock.set(cv, 8);
        if (this.cvStackLen > 0) {
          compress2(this.keyWords, 0, parentBlock, 0, cv, 0, false, 0, BLOCK_LEN, this.flags | PARENT);
        } else {
          return {
            inputCv: this.keyWords,
            blockWords: parentBlock,
            blockLen: BLOCK_LEN,
            counter: 0,
            flags: this.flags | PARENT
          };
        }
      }
    }
    return output;
  }
  /**
   * Finalize the hash and return the result.
   *
   * @param outputLength - Number of bytes to output (default: 32)
   * @returns The hash output
   */
  finalize(outputLength = OUT_LEN) {
    const output = this.finalizeOutput();
    const result = new Uint8Array(outputLength);
    if (outputLength <= 64) {
      const outWords = this.outWords;
      compress2(
        output.inputCv,
        0,
        output.blockWords,
        0,
        outWords,
        0,
        outputLength > 32,
        // full output if > 32 bytes
        output.counter,
        output.blockLen,
        output.flags | ROOT
      );
      if (IS_LITTLE_ENDIAN) {
        const outBytes = new Uint8Array(outWords.buffer);
        result.set(outBytes.subarray(0, outputLength));
      } else {
        writeLittleEndianBytesPartial(outWords, 0, result, 0, outputLength);
      }
    } else {
      const xof = this.finalizeXof();
      const full = xof.read(outputLength);
      result.set(full);
    }
    return result;
  }
  /**
   * Finalize and return an XOF reader for arbitrary-length output.
   */
  finalizeXof() {
    const output = this.finalizeOutput();
    return new XofReader(new Uint32Array(output.inputCv), new Uint32Array(output.blockWords), output.counter, output.blockLen, output.flags);
  }
};

// node_modules/@huggingface/blake3-jit/dist/esm/wasm-simd.js
function toLebU32Min2(n) {
  return [n & 127 | 128, n >>> 7 & 127];
}
function toLebU32Padded52(n) {
  return [
    n & 127 | 128,
    n >>> 7 & 127 | 128,
    n >>> 14 & 127 | 128,
    n >>> 21 & 127 | 128,
    n >>> 28 & 15
    // Last byte has no continuation bit
  ];
}
function toSignedLeb128_i32(n) {
  const bytes = [];
  let value = n | 0;
  let more = true;
  while (more) {
    let byte = value & 127;
    value >>= 7;
    if (value === 0 && (byte & 64) === 0 || value === -1 && (byte & 64) !== 0) {
      more = false;
    } else {
      byte |= 128;
    }
    bytes.push(byte);
  }
  return bytes;
}
var MSG_ACCESS_ORDER = [
  // Round 1: 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  // Round 2: 2,6,3,10,7,0,4,13,1,11,12,5,9,14,15,8
  2,
  6,
  3,
  10,
  7,
  0,
  4,
  13,
  1,
  11,
  12,
  5,
  9,
  14,
  15,
  8,
  // Round 3: 3,4,10,12,13,2,7,14,6,5,9,0,11,15,8,1
  3,
  4,
  10,
  12,
  13,
  2,
  7,
  14,
  6,
  5,
  9,
  0,
  11,
  15,
  8,
  1,
  // Round 4: 10,7,12,9,14,3,13,15,4,0,11,2,5,8,1,6
  10,
  7,
  12,
  9,
  14,
  3,
  13,
  15,
  4,
  0,
  11,
  2,
  5,
  8,
  1,
  6,
  // Round 5: 12,13,9,11,15,10,14,8,7,2,5,3,0,1,6,4
  12,
  13,
  9,
  11,
  15,
  10,
  14,
  8,
  7,
  2,
  5,
  3,
  0,
  1,
  6,
  4,
  // Round 6: 9,14,11,5,8,12,15,1,13,3,0,10,2,6,4,7
  9,
  14,
  11,
  5,
  8,
  12,
  15,
  1,
  13,
  3,
  0,
  10,
  2,
  6,
  4,
  7,
  // Round 7: 11,15,5,0,1,9,8,6,14,10,2,12,3,4,7,13
  11,
  15,
  5,
  0,
  1,
  9,
  8,
  6,
  14,
  10,
  2,
  12,
  3,
  4,
  7,
  13
];
function generateWasmBytes2() {
  const code = [];
  function put(bytes) {
    code.push(...bytes);
  }
  put([0, 97, 115, 109]);
  put([1, 0, 0, 0]);
  put([1]);
  put([4]);
  put([1]);
  put([96, 0, 0]);
  put([2]);
  put([11]);
  put([1]);
  put([2, 106, 115]);
  put([3, 109, 101, 109]);
  put([2, 0, 1]);
  put([3]);
  put([4]);
  put([3]);
  put([0]);
  put([0]);
  put([0]);
  put([7]);
  put([50]);
  put([3]);
  put([10]);
  put([99, 111, 109, 112, 114, 101, 115, 115, 52, 120]);
  put([0, 0]);
  put([16]);
  put([
    99,
    111,
    109,
    112,
    114,
    101,
    115,
    115,
    67,
    104,
    117,
    110,
    107,
    115,
    52,
    120
  ]);
  put([0, 1]);
  put([14]);
  put([99, 111, 109, 112, 114, 101, 115, 115, 80, 97, 114, 101, 110, 116]);
  put([0, 2]);
  put([10]);
  const sectionSizeOffset = code.length;
  put([0, 0, 0, 0, 0]);
  put([3]);
  const funcSizeOffset = code.length;
  put([0, 0, 0, 0, 0]);
  const funcBodyStart = code.length;
  put([1]);
  put([32, 123]);
  for (let i = 0; i < 16; i++) {
    put([65, ...toLebU32Min2(i * 16)]);
    put([253, 0, 2, 0]);
    put([33, i]);
  }
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(512 + i * 16)]);
    put([253, 0, 2, 0]);
    put([33, 16 + i]);
  }
  const IV2 = [1779033703, 3144134277, 1013904242, 2773480762];
  for (let i = 0; i < 4; i++) {
    const ivBytes = [];
    for (let j = 0; j < 4; j++) {
      ivBytes.push(IV2[i] & 255);
      ivBytes.push(IV2[i] >>> 8 & 255);
      ivBytes.push(IV2[i] >>> 16 & 255);
      ivBytes.push(IV2[i] >>> 24 & 255);
    }
    put([253, 12, ...ivBytes]);
    put([33, 24 + i]);
  }
  put([65, ...toLebU32Min2(768)]);
  put([253, 0, 2, 0]);
  put([33, 28]);
  put([65, ...toLebU32Min2(784)]);
  put([253, 0, 2, 0]);
  put([33, 29]);
  put([65, ...toLebU32Min2(800)]);
  put([253, 0, 2, 0]);
  put([33, 30]);
  put([65, ...toLebU32Min2(816)]);
  put([253, 0, 2, 0]);
  put([33, 31]);
  let msgIdx = 0;
  function g(a, b, c, d) {
    const mx = MSG_ACCESS_ORDER[msgIdx++];
    const my = MSG_ACCESS_ORDER[msgIdx++];
    put([32, 16 + a]);
    put([32, 16 + b]);
    put([253, 174, 1]);
    put([32, mx]);
    put([253, 174, 1]);
    put([33, 16 + a]);
    put([32, 16 + d]);
    put([32, 16 + a]);
    put([253, 81]);
    put([34, 16 + d]);
    put([32, 16 + d]);
    put([253, 13, 2, 3, 0, 1, 6, 7, 4, 5, 10, 11, 8, 9, 14, 15, 12, 13]);
    put([33, 16 + d]);
    put([32, 16 + c]);
    put([32, 16 + d]);
    put([253, 174, 1]);
    put([33, 16 + c]);
    put([32, 16 + b]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b]);
    put([65, 12]);
    put([253, 173, 1]);
    put([32, 16 + b]);
    put([65, 20]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b]);
    put([32, 16 + a]);
    put([32, 16 + b]);
    put([253, 174, 1]);
    put([32, my]);
    put([253, 174, 1]);
    put([33, 16 + a]);
    put([32, 16 + d]);
    put([32, 16 + a]);
    put([253, 81]);
    put([34, 16 + d]);
    put([32, 16 + d]);
    put([253, 13, 1, 2, 3, 0, 5, 6, 7, 4, 9, 10, 11, 8, 13, 14, 15, 12]);
    put([33, 16 + d]);
    put([32, 16 + c]);
    put([32, 16 + d]);
    put([253, 174, 1]);
    put([33, 16 + c]);
    put([32, 16 + b]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b]);
    put([65, 7]);
    put([253, 173, 1]);
    put([32, 16 + b]);
    put([65, 25]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b]);
  }
  for (let round = 0; round < 7; round++) {
    g(0, 4, 8, 12);
    g(1, 5, 9, 13);
    g(2, 6, 10, 14);
    g(3, 7, 11, 15);
    g(0, 5, 10, 15);
    g(1, 6, 11, 12);
    g(2, 7, 8, 13);
    g(3, 4, 9, 14);
  }
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(640 + i * 16)]);
    put([32, 16 + i]);
    put([32, 24 + i]);
    put([253, 81]);
    put([253, 11, 2, 0]);
  }
  put([11]);
  const funcBodySize = code.length - funcBodyStart;
  const funcSizeBytes = toLebU32Padded52(funcBodySize);
  for (let i = 0; i < 5; i++) {
    code[funcSizeOffset + i] = funcSizeBytes[i];
  }
  const func1SizeOffset = code.length;
  put([0, 0, 0, 0, 0]);
  const func1BodyStart = code.length;
  const compressChunksBody = generateCompressChunks4xBody();
  put(compressChunksBody);
  const func1BodySize = code.length - func1BodyStart;
  const func1SizeBytes = toLebU32Padded52(func1BodySize);
  for (let i = 0; i < 5; i++) {
    code[func1SizeOffset + i] = func1SizeBytes[i];
  }
  const func2SizeOffset = code.length;
  put([0, 0, 0, 0, 0]);
  const func2BodyStart = code.length;
  const compressParentBody = generateCompressParentBody();
  put(compressParentBody);
  const func2BodySize = code.length - func2BodyStart;
  const func2SizeBytes = toLebU32Padded52(func2BodySize);
  for (let i = 0; i < 5; i++) {
    code[func2SizeOffset + i] = func2SizeBytes[i];
  }
  const sectionSize = code.length - sectionSizeOffset - 5;
  const sectionSizeBytes = toLebU32Padded52(sectionSize);
  for (let i = 0; i < 5; i++) {
    code[sectionSizeOffset + i] = sectionSizeBytes[i];
  }
  return new Uint8Array(code);
}
function generateCompressChunks4xBody() {
  const code = [];
  function put(bytes) {
    code.push(...bytes);
  }
  put([2]);
  put([32, 123]);
  put([1, 127]);
  const BATCH_BLOCK_WORDS = SIMD_MEMORY.BATCH_BLOCK_WORDS;
  const BATCH_CV = SIMD_MEMORY.BATCH_CV;
  const BATCH_COUNTER_LOW = SIMD_MEMORY.BATCH_COUNTER_LOW;
  const BATCH_FLAGS_BASE = SIMD_MEMORY.BATCH_FLAGS_BASE;
  const BATCH_OUTPUT = SIMD_MEMORY.BATCH_OUTPUT;
  const IV2 = [1779033703, 3144134277, 1013904242, 2773480762];
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(BATCH_CV + i * 16)]);
    put([253, 0, 2, 0]);
    put([33, 16 + i]);
  }
  put([65, 0]);
  put([33, 32]);
  put([2, 64]);
  put([3, 64]);
  for (let w = 0; w < 16; w++) {
    put([32, 32]);
    put([65, ...toLebU32Min2(256)]);
    put([108]);
    put([65, ...toLebU32Min2(BATCH_BLOCK_WORDS + w * 16)]);
    put([106]);
    put([253, 0, 2, 0]);
    put([33, w]);
  }
  for (let i = 0; i < 4; i++) {
    const ivBytes = [];
    for (let j = 0; j < 4; j++) {
      ivBytes.push(IV2[i] & 255);
      ivBytes.push(IV2[i] >>> 8 & 255);
      ivBytes.push(IV2[i] >>> 16 & 255);
      ivBytes.push(IV2[i] >>> 24 & 255);
    }
    put([253, 12, ...ivBytes]);
    put([33, 24 + i]);
  }
  put([65, ...toLebU32Min2(BATCH_COUNTER_LOW)]);
  put([253, 0, 2, 0]);
  put([33, 28]);
  put([253, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  put([33, 29]);
  const blockLen64 = [];
  for (let j = 0; j < 4; j++) {
    blockLen64.push(64, 0, 0, 0);
  }
  put([253, 12, ...blockLen64]);
  put([33, 30]);
  put([65, ...toLebU32Min2(BATCH_FLAGS_BASE)]);
  put([253, 0, 2, 0]);
  put([32, 32]);
  put([69]);
  put([32, 32]);
  put([65, 15]);
  put([70]);
  put([65, 1]);
  put([116]);
  put([114]);
  put([253, 17]);
  put([253, 80]);
  put([33, 31]);
  let msgIdx = 0;
  function g(a, b, c, d) {
    const mx = MSG_ACCESS_ORDER[msgIdx++];
    const my = MSG_ACCESS_ORDER[msgIdx++];
    put([32, 16 + a]);
    put([32, 16 + b]);
    put([253, 174, 1]);
    put([32, mx]);
    put([253, 174, 1]);
    put([33, 16 + a]);
    put([32, 16 + d]);
    put([32, 16 + a]);
    put([253, 81]);
    put([34, 16 + d]);
    put([32, 16 + d]);
    put([253, 13, 2, 3, 0, 1, 6, 7, 4, 5, 10, 11, 8, 9, 14, 15, 12, 13]);
    put([33, 16 + d]);
    put([32, 16 + c]);
    put([32, 16 + d]);
    put([253, 174, 1]);
    put([33, 16 + c]);
    put([32, 16 + b]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b]);
    put([65, 12]);
    put([253, 173, 1]);
    put([32, 16 + b]);
    put([65, 20]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b]);
    put([32, 16 + a]);
    put([32, 16 + b]);
    put([253, 174, 1]);
    put([32, my]);
    put([253, 174, 1]);
    put([33, 16 + a]);
    put([32, 16 + d]);
    put([32, 16 + a]);
    put([253, 81]);
    put([34, 16 + d]);
    put([32, 16 + d]);
    put([253, 13, 1, 2, 3, 0, 5, 6, 7, 4, 9, 10, 11, 8, 13, 14, 15, 12]);
    put([33, 16 + d]);
    put([32, 16 + c]);
    put([32, 16 + d]);
    put([253, 174, 1]);
    put([33, 16 + c]);
    put([32, 16 + b]);
    put([32, 16 + c]);
    put([253, 81]);
    put([34, 16 + b]);
    put([65, 7]);
    put([253, 173, 1]);
    put([32, 16 + b]);
    put([65, 25]);
    put([253, 171, 1]);
    put([253, 80]);
    put([33, 16 + b]);
  }
  for (let round = 0; round < 7; round++) {
    g(0, 4, 8, 12);
    g(1, 5, 9, 13);
    g(2, 6, 10, 14);
    g(3, 7, 11, 15);
    g(0, 5, 10, 15);
    g(1, 6, 11, 12);
    g(2, 7, 8, 13);
    g(3, 4, 9, 14);
  }
  for (let i = 0; i < 8; i++) {
    put([32, 16 + i]);
    put([32, 24 + i]);
    put([253, 81]);
    put([33, 16 + i]);
  }
  put([32, 32]);
  put([65, 1]);
  put([106]);
  put([34, 32]);
  put([65, 16]);
  put([73]);
  put([13, 0]);
  put([11]);
  put([11]);
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(BATCH_OUTPUT + i * 16)]);
    put([32, 16 + i]);
    put([253, 11, 2, 0]);
  }
  put([11]);
  return code;
}
function generateCompressParentBody() {
  const code = [];
  function put(bytes) {
    code.push(...bytes);
  }
  put([1]);
  put([32, 127]);
  const PARENT_BLOCK_OFFSET = SIMD_MEMORY.PARENT_BLOCK;
  const CHUNK_CV_OFFSET = SIMD_MEMORY.CHUNK_CV;
  const IV2 = [
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ];
  for (let i = 0; i < 16; i++) {
    put([65, ...toLebU32Min2(PARENT_BLOCK_OFFSET + i * 4)]);
    put([40, 2, 0]);
    put([33, i]);
  }
  for (let i = 0; i < 8; i++) {
    put([65, ...toSignedLeb128_i32(IV2[i])]);
    put([33, 16 + i]);
  }
  for (let i = 0; i < 4; i++) {
    put([65, ...toSignedLeb128_i32(IV2[i])]);
    put([33, 24 + i]);
  }
  put([65, 0]);
  put([33, 28]);
  put([65, 0]);
  put([33, 29]);
  put([65, 192, 0]);
  put([33, 30]);
  put([65, 4]);
  put([33, 31]);
  function g(a, b, c, d, mx, my) {
    const sa = 16 + a, sb = 16 + b, sc = 16 + c, sd = 16 + d;
    put([32, sa]);
    put([32, sb]);
    put([106]);
    put([32, mx]);
    put([106]);
    put([33, sa]);
    put([32, sd]);
    put([32, sa]);
    put([115]);
    put([65, 16]);
    put([120]);
    put([33, sd]);
    put([32, sc]);
    put([32, sd]);
    put([106]);
    put([33, sc]);
    put([32, sb]);
    put([32, sc]);
    put([115]);
    put([65, 12]);
    put([120]);
    put([33, sb]);
    put([32, sa]);
    put([32, sb]);
    put([106]);
    put([32, my]);
    put([106]);
    put([33, sa]);
    put([32, sd]);
    put([32, sa]);
    put([115]);
    put([65, 8]);
    put([120]);
    put([33, sd]);
    put([32, sc]);
    put([32, sd]);
    put([106]);
    put([33, sc]);
    put([32, sb]);
    put([32, sc]);
    put([115]);
    put([65, 7]);
    put([120]);
    put([33, sb]);
  }
  let msgIdx = 0;
  for (let round = 0; round < 7; round++) {
    g(0, 4, 8, 12, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(1, 5, 9, 13, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(2, 6, 10, 14, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(3, 7, 11, 15, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(0, 5, 10, 15, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(1, 6, 11, 12, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(2, 7, 8, 13, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
    g(3, 4, 9, 14, MSG_ACCESS_ORDER[msgIdx], MSG_ACCESS_ORDER[msgIdx + 1]);
    msgIdx += 2;
  }
  for (let i = 0; i < 8; i++) {
    put([65, ...toLebU32Min2(CHUNK_CV_OFFSET + i * 4)]);
    put([32, 16 + i]);
    put([32, 24 + i]);
    put([115]);
    put([54, 2, 0]);
  }
  put([11]);
  return code;
}
var wasmInstance = null;
var wasmMemory2 = null;
var wasmCompress4x = null;
var wasmCompressChunks4x = null;
var wasmCompressParent = null;
var wasmMemoryView = null;
var wasmMemoryView32 = null;
function isSimdSupported() {
  try {
    const simdTest = new Uint8Array([
      0,
      97,
      115,
      109,
      // magic: \0asm
      1,
      0,
      0,
      0,
      // version: 1
      // Type section (id=1): () -> v128
      1,
      // section id = 1 (type)
      5,
      // section length = 5
      1,
      // 1 type
      96,
      0,
      1,
      123,
      // func () -> v128
      // Function section (id=3)
      3,
      // section id = 3 (function)
      2,
      // section length = 2
      1,
      // 1 function
      0,
      // type index 0
      // Code section (id=10) with v128.const
      10,
      // section id = 10 (code)
      22,
      // section length = 22
      1,
      // 1 function body
      20,
      // body length = 20
      0,
      // 0 locals
      253,
      12,
      // v128.const opcode
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      11
      // end
    ]);
    return WebAssembly.validate(simdTest);
  } catch {
    return false;
  }
}
function setupArenaViews() {
  if (!wasmMemory2)
    return;
  const buffer = wasmMemory2.buffer;
  arenaCvStack = new Uint32Array(buffer, SIMD_MEMORY.CV_STACK, 64 * 8);
  arenaParentBlock = new Uint32Array(buffer, SIMD_MEMORY.PARENT_BLOCK, 16);
  arenaChunkCv = new Uint32Array(buffer, SIMD_MEMORY.CHUNK_CV, 8);
  arenaTempCvs = new Uint32Array(buffer, SIMD_MEMORY.TEMP_CVS, 32);
  arenaBatchBlockWords = new Uint32Array(buffer, SIMD_MEMORY.BATCH_BLOCK_WORDS, 16 * 16 * 4);
  arenaBatchCv = new Uint32Array(buffer, SIMD_MEMORY.BATCH_CV, 32);
  arenaBatchCounterLow = new Uint32Array(buffer, SIMD_MEMORY.BATCH_COUNTER_LOW, 4);
  arenaBatchFlagsBase = new Uint32Array(buffer, SIMD_MEMORY.BATCH_FLAGS_BASE, 4);
  arenaBatchOutput = new Uint32Array(buffer, SIMD_MEMORY.BATCH_OUTPUT, 32);
}
var cachedWasmBytes = null;
function initSimdSync() {
  if (wasmInstance)
    return true;
  if (!isSimdSupported()) {
    return false;
  }
  try {
    const wasmBytes = cachedWasmBytes || generateWasmBytes2();
    cachedWasmBytes = wasmBytes;
    wasmMemory2 = new WebAssembly.Memory({ initial: 1 });
    const importObject = {
      js: { mem: wasmMemory2 }
    };
    const module = new WebAssembly.Module(wasmBytes.buffer);
    wasmInstance = new WebAssembly.Instance(module, importObject);
    wasmCompress4x = wasmInstance.exports.compress4x;
    wasmCompressChunks4x = wasmInstance.exports.compressChunks4x;
    wasmCompressParent = wasmInstance.exports.compressParent;
    wasmMemoryView = new Uint8Array(wasmMemory2.buffer);
    wasmMemoryView32 = new Uint32Array(wasmMemory2.buffer);
    setupArenaViews();
    return true;
  } catch (e) {
    console.warn("Failed to initialize WASM SIMD:", e);
    return false;
  }
}
var SIMD_MEMORY = {
  // SIMD compress4x working area (used by WASM code) - single block
  BLOCK_WORDS: 0,
  // 4 x 16 words = 512 bytes (transposed layout)
  CHAINING_VALUES: 512,
  // 4 x 8 words = 128 bytes
  OUTPUT: 640,
  // 4 x 8 words = 128 bytes
  COUNTER_LOW: 768,
  // 4 words = 16 bytes
  COUNTER_HIGH: 784,
  // 4 words = 16 bytes
  BLOCK_LEN: 800,
  // 4 words = 16 bytes
  FLAGS: 816,
  // 4 words = 16 bytes
  // End of single-block SIMD working area: 832 bytes
  // SIMD compressChunks4x working area - 16 blocks batched
  // Each block position has 16 v128 values (one per message word) = 256 bytes
  // 16 block positions = 16 × 256 = 4096 bytes
  BATCH_BLOCK_WORDS: 832,
  // 16 positions × 256 bytes = 4096 bytes (transposed), ends at 4928
  BATCH_CV: 4928,
  // 4 × 8 words × 4 bytes = 128 bytes (working CVs), ends at 5056
  BATCH_COUNTER_LOW: 5056,
  // 4 words × 4 bytes = 16 bytes (per-chunk counters), ends at 5072
  BATCH_FLAGS_BASE: 5072,
  // 4 words × 4 bytes = 16 bytes (base flags, no START/END), ends at 5088
  BATCH_OUTPUT: 5088,
  // 4 × 8 words × 4 bytes = 128 bytes (final output), ends at 5216
  // End of batch working area: 5216 bytes
  // WASM Arena: JS working buffers (accessed via TypedArray views)
  CV_STACK: 5216,
  // 64 levels × 8 words × 4 bytes = 2048 bytes, ends at 7264
  PARENT_BLOCK: 7264,
  // 16 words × 4 bytes = 64 bytes, ends at 7328
  CHUNK_CV: 7328,
  // 8 words × 4 bytes = 32 bytes, ends at 7360
  TEMP_CVS: 7360
  // 4 × 8 words × 4 bytes = 128 bytes, ends at 7488
  // Total arena usage: ~7488 bytes (fits comfortably in 64KB page)
};
var arenaCvStack = null;
var arenaParentBlock = null;
var arenaChunkCv = null;
var arenaTempCvs = null;
var arenaBatchBlockWords = null;
var arenaBatchCv = null;
var arenaBatchCounterLow = null;
var arenaBatchFlagsBase = null;
var arenaBatchOutput = null;

// node_modules/@huggingface/blake3-jit/dist/esm/hash.js
var CV_STACK_DEPTH = 64;
var HYPER_CV_STACK = new Uint32Array(CV_STACK_DEPTH * 8);
var CV_POOL_SIZE = 64;
var CV_POOL = new Uint32Array(CV_POOL_SIZE * 8);
var CV_VIEWS = [];
for (let i = 0; i < CV_POOL_SIZE; i++) {
  CV_VIEWS.push(CV_POOL.subarray(i * 8, i * 8 + 8));
}
var simdAvailable = false;
var SIMD_THRESHOLD = 4 * CHUNK_LEN;
function ensureSimdSync() {
  if (simdAvailable)
    return true;
  simdAvailable = initSimdSync();
  return simdAvailable;
}
var simdChunkCvs = new Uint32Array(32);
var reusableTempCv = new Uint32Array(8);
var reusableChunkCv = new Uint32Array(8);
var reusablePureParentBlock = new Uint32Array(16);
var reusablePureParentCv = new Uint32Array(8);
var reusableSimdCvs = new Uint32Array(32);
var reusableSimdParentBlock = new Uint32Array(16);
var reusableSimdParentCv = new Uint32Array(8);
var reusableOffsets = new Uint32Array(4);
var reusableCounters = new Uint32Array(4);
var reusableBlockLens = new Uint32Array(4);
var reusableFlags = new Uint32Array(4);
var reusableOut8 = new Uint32Array(8);
var reusableOut8View = new Uint8Array(reusableOut8.buffer, 0, 32);
var SIMD_CV_BASE = SIMD_MEMORY.CHAINING_VALUES / 4;
var SIMD_OUT_BASE = SIMD_MEMORY.OUTPUT / 4;
var SIMD_COUNTER_LOW_BASE = SIMD_MEMORY.COUNTER_LOW / 4;
var SIMD_COUNTER_HIGH_BASE = SIMD_MEMORY.COUNTER_HIGH / 4;
var SIMD_BLOCK_LEN_BASE = SIMD_MEMORY.BLOCK_LEN / 4;
var BATCH_CV_BASE = SIMD_MEMORY.BATCH_CV / 4;
var BATCH_COUNTER_LOW_BASE = SIMD_MEMORY.BATCH_COUNTER_LOW / 4;
var BATCH_FLAGS_BASE_OFFSET = SIMD_MEMORY.BATCH_FLAGS_BASE / 4;
var BATCH_OUTPUT_BASE = SIMD_MEMORY.BATCH_OUTPUT / 4;
var batchChunkOffsets = new Uint32Array(4);
var SIMD_FLAGS_BASE = SIMD_MEMORY.FLAGS / 4;
function warmupSimd() {
  return ensureSimdSync();
}

// node_modules/@huggingface/blake3-jit/dist/esm/index.js
if (typeof globalThis !== "undefined" && typeof globalThis.document !== "undefined") {
  queueMicrotask(() => {
    warmupSimd();
  });
}

// node_modules/@huggingface/xetchunk-wasm/dist/esm/xet-chunker.js
var TARGET_CHUNK_SIZE = 64 * 1024;
var MINIMUM_CHUNK_DIVISOR = 8;
var MAXIMUM_CHUNK_MULTIPLIER = 2;
var HASH_WINDOW_SIZE = 64;
var BLAKE3_DATA_KEY = new Uint8Array([
  102,
  151,
  245,
  119,
  91,
  149,
  80,
  222,
  49,
  53,
  203,
  172,
  165,
  151,
  24,
  28,
  157,
  228,
  33,
  16,
  155,
  235,
  43,
  88,
  180,
  208,
  176,
  75,
  147,
  173,
  242,
  41
]);
var XetChunker = class {
  minimumChunk;
  maximumChunk;
  chunkBuf;
  curChunkLen;
  gear;
  blake3;
  constructor(targetChunkSize = TARGET_CHUNK_SIZE) {
    if (targetChunkSize <= 0) {
      throw new Error("Target chunk size must be greater than 0");
    }
    if ((targetChunkSize & targetChunkSize - 1) !== 0) {
      throw new Error("Target chunk size must be a power of 2");
    }
    if (targetChunkSize <= HASH_WINDOW_SIZE) {
      throw new Error("Target chunk size must be greater than hash window size");
    }
    if (targetChunkSize >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Target chunk size must be less than Number.MAX_SAFE_INTEGER");
    }
    let mask = BigInt(targetChunkSize - 1);
    let leadingZeros = 0;
    for (let i = 63; i >= 0; i--) {
      if ((mask & 1n << BigInt(i)) !== 0n) {
        break;
      }
      leadingZeros++;
    }
    mask = mask << BigInt(leadingZeros);
    const maximumChunk = targetChunkSize * MAXIMUM_CHUNK_MULTIPLIER;
    this.minimumChunk = targetChunkSize / MINIMUM_CHUNK_DIVISOR;
    this.maximumChunk = maximumChunk;
    this.chunkBuf = new Uint8Array(maximumChunk);
    this.curChunkLen = 0;
    this.gear = new Hasher(mask);
    this.blake3 = Hasher2.newKeyed(BLAKE3_DATA_KEY);
  }
  /**
   * Streaming entry point: accepts an arbitrary slice of data, accumulates
   * it, and emits a chunk when a boundary (or max size) is reached.
   * Data is copied into an internal buffer because it may span calls.
   */
  next(data, isFinal) {
    const nBytes = data.length;
    let createChunk = false;
    let consumeLen = 0;
    if (nBytes !== 0) {
      if (this.curChunkLen + HASH_WINDOW_SIZE < this.minimumChunk) {
        const maxAdvance = Math.min(this.minimumChunk - this.curChunkLen - HASH_WINDOW_SIZE - 1, nBytes - consumeLen);
        consumeLen += maxAdvance;
        this.curChunkLen += maxAdvance;
      }
      const readEnd = Math.min(nBytes, consumeLen + this.maximumChunk - this.curChunkLen);
      let bytesToNextBoundary;
      const position = this.gear.nextMatch(data.subarray(consumeLen, readEnd));
      if (position !== -1) {
        bytesToNextBoundary = position;
        createChunk = true;
      } else {
        bytesToNextBoundary = readEnd - consumeLen;
      }
      if (bytesToNextBoundary + this.curChunkLen >= this.maximumChunk) {
        bytesToNextBoundary = this.maximumChunk - this.curChunkLen;
        createChunk = true;
      }
      this.curChunkLen += bytesToNextBoundary;
      consumeLen += bytesToNextBoundary;
      this.chunkBuf.set(data.subarray(0, consumeLen), this.curChunkLen - consumeLen);
    }
    if (createChunk || isFinal && this.curChunkLen > 0) {
      const chunkData = this.chunkBuf.subarray(0, this.curChunkLen);
      const hash3 = this.blake3.reset().update(chunkData).finalize(32);
      const chunk = {
        length: chunkData.length,
        hash: hash3
      };
      this.curChunkLen = 0;
      this.gear.resetHash();
      return {
        chunk,
        bytesConsumed: consumeLen
      };
    }
    return {
      chunk: null,
      bytesConsumed: consumeLen
    };
  }
  /**
   * Batch entry point: processes a large contiguous buffer and returns all
   * complete chunks. Hashes directly from `data` — no intermediate copy
   * to chunkBuf — for every chunk whose bytes are fully within `data`.
   */
  nextBlock(data, isFinal) {
    const chunks = [];
    let pos = 0;
    while (pos < data.length && this.curChunkLen > 0) {
      const result = this.next(data.subarray(pos), false);
      if (result.chunk)
        chunks.push(result.chunk);
      pos += result.bytesConsumed;
    }
    const minSkip = this.minimumChunk > HASH_WINDOW_SIZE ? this.minimumChunk - HASH_WINDOW_SIZE - 1 : 0;
    while (pos < data.length) {
      const chunkStart = pos;
      const scanStart = Math.min(pos + minSkip, data.length);
      const scanEnd = Math.min(data.length, pos + this.maximumChunk);
      const position = this.gear.nextMatch(data.subarray(scanStart, scanEnd));
      let chunkEnd;
      let foundBoundary;
      if (position !== -1 && scanStart + position - chunkStart <= this.maximumChunk) {
        chunkEnd = scanStart + position;
        foundBoundary = true;
      } else if (scanEnd - chunkStart >= this.maximumChunk) {
        chunkEnd = chunkStart + this.maximumChunk;
        foundBoundary = true;
      } else {
        foundBoundary = false;
        chunkEnd = scanEnd;
      }
      if (foundBoundary) {
        const hash3 = this.blake3.reset().update(data.subarray(chunkStart, chunkEnd)).finalize(32);
        chunks.push({ length: chunkEnd - chunkStart, hash: hash3 });
        pos = chunkEnd;
        this.gear.resetHash();
      } else if (isFinal) {
        const hash3 = this.blake3.reset().update(data.subarray(chunkStart)).finalize(32);
        chunks.push({ length: data.length - chunkStart, hash: hash3 });
        pos = data.length;
      } else {
        this.chunkBuf.set(data.subarray(chunkStart), 0);
        this.curChunkLen = data.length - chunkStart;
        pos = data.length;
      }
    }
    return chunks;
  }
  finish() {
    if (this.curChunkLen > 0) {
      const chunkData = this.chunkBuf.subarray(0, this.curChunkLen);
      const hash3 = this.blake3.reset().update(chunkData).finalize(32);
      const chunk = { length: this.curChunkLen, hash: hash3 };
      this.curChunkLen = 0;
      this.gear.resetHash();
      return chunk;
    }
    return null;
  }
};
function createChunker(targetChunkSize = TARGET_CHUNK_SIZE) {
  return new XetChunker(targetChunkSize);
}
function nextBlock(chunker, data) {
  return chunker.nextBlock(data, false);
}
function finalize(chunker) {
  return chunker.finish();
}
function hashToHex(hash3) {
  const view = new DataView(hash3.buffer, hash3.byteOffset, hash3.byteLength);
  const u64 = view.getBigUint64(0, true);
  const u64_2 = view.getBigUint64(8, true);
  const u64_3 = view.getBigUint64(16, true);
  const u64_4 = view.getBigUint64(24, true);
  return u64.toString(16).padStart(16, "0") + u64_2.toString(16).padStart(16, "0") + u64_3.toString(16).padStart(16, "0") + u64_4.toString(16).padStart(16, "0");
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(32);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, BigInt("0x" + hex.slice(0, 16)), true);
  view.setBigUint64(8, BigInt("0x" + hex.slice(16, 32)), true);
  view.setBigUint64(16, BigInt("0x" + hex.slice(32, 48)), true);
  view.setBigUint64(24, BigInt("0x" + hex.slice(48, 64)), true);
  return bytes;
}

// node_modules/@huggingface/xetchunk-wasm/dist/esm/xorb-hash.js
var MEAN_CHUNK_PER_NODE = 4;
var BLAKE3_NODE_KEY = new Uint8Array([
  1,
  126,
  197,
  199,
  165,
  71,
  41,
  150,
  253,
  148,
  102,
  102,
  180,
  138,
  2,
  230,
  93,
  221,
  83,
  111,
  55,
  199,
  109,
  210,
  248,
  99,
  82,
  230,
  74,
  83,
  113,
  63
]);
var INDEX_OF_LAST_BYTE_OF_LAST_U64_IN_CHUNK_HASH = 3 * 8;
var nodeHasher = Hasher2.newKeyed(BLAKE3_NODE_KEY);
function xorbHash(chunks) {
  if (chunks.length === 0) {
    return new Uint8Array(32);
  }
  let currentChunks = chunks;
  while (currentChunks.length > 1) {
    const nodes = [];
    let currentIndex = 0;
    let numOfChildrenSoFar = 0;
    for (let i = 0; i < currentChunks.length; i++) {
      if (i === currentChunks.length - 1 || numOfChildrenSoFar === 2 * MEAN_CHUNK_PER_NODE || numOfChildrenSoFar >= 2 && currentChunks[i].hash[INDEX_OF_LAST_BYTE_OF_LAST_U64_IN_CHUNK_HASH] % MEAN_CHUNK_PER_NODE === 0) {
        nodes.push(mergedHashOfSequence(currentChunks.slice(currentIndex, i + 1)));
        currentIndex = i + 1;
        numOfChildrenSoFar = 0;
      } else {
        numOfChildrenSoFar++;
      }
    }
    currentChunks = nodes;
  }
  return currentChunks[0].hash;
}
function mergedHashOfSequence(chunks) {
  let text = "";
  let totalLength = 0;
  for (const chunk of chunks) {
    text += hashToHex(chunk.hash) + " : " + chunk.length + "\n";
    totalLength += chunk.length;
  }
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i);
  }
  const hash3 = nodeHasher.reset().update(bytes).finalize(32);
  return { hash: hash3, length: totalLength };
}

// node_modules/@huggingface/xetchunk-wasm/dist/esm/hash-utils.js
var ZERO_KEY = new Uint8Array(32);
var VERIFICATION_KEY = new Uint8Array([
  127,
  24,
  87,
  214,
  206,
  86,
  237,
  102,
  18,
  127,
  249,
  19,
  231,
  165,
  195,
  243,
  164,
  205,
  38,
  213,
  181,
  219,
  73,
  230,
  65,
  36,
  152,
  127,
  40,
  251,
  148,
  195
]);
var fileHasher = Hasher2.newKeyed(ZERO_KEY);
var verificationHasher = Hasher2.newKeyed(VERIFICATION_KEY);
function fileHash(chunks) {
  const xorb = xorbHash(chunks);
  return fileHasher.reset().update(xorb).finalize(32);
}
function hmac(hash3, key) {
  return Hasher2.newKeyed(key).update(hash3).finalize(32);
}
function verificationHash(chunkHashes) {
  const combined = new Uint8Array(chunkHashes.length * 32);
  for (let i = 0; i < chunkHashes.length; i++) {
    combined.set(chunkHashes[i], i * 32);
  }
  return verificationHasher.reset().update(combined).finalize(32);
}

// src/vendor/hfjs-xet/utils/createXorbs.ts
var TARGET_CHUNK_SIZE2 = 64 * 1024;
var MAX_CHUNK_SIZE = 2 * TARGET_CHUNK_SIZE2;
var XORB_SIZE = 64 * 1024 * 1024;
var MAX_XORB_CHUNKS = 8 * 1024;
var INTERVAL_BETWEEN_REMOTE_DEDUP = 4e6;
var PROCESSING_PROGRESS_RATIO = 0.1;
var UPLOADING_PROGRESS_RATIO = 1 - PROCESSING_PROGRESS_RATIO;
function computeXorbHashHex(chunks) {
  const chunkObjs = chunks.map((c) => ({ hash: hexToBytes(c.hash), length: c.length }));
  return hashToHex(xorbHash(chunkObjs));
}
function computeHmacHex(hash3, key) {
  return hashToHex(hmac(hexToBytes(hash3), hexToBytes(key)));
}
function computeVerificationHashHex(hashes) {
  return hashToHex(verificationHash(hashes.map(hexToBytes)));
}
function computeFileHashHex(chunks) {
  const chunkObjs = chunks.map((c) => ({ hash: hexToBytes(c.hash), length: c.length }));
  return hashToHex(fileHash(chunkObjs));
}
function addDataToChunker(data, chunker) {
  return nextBlock(chunker, data).map((c) => ({ hash: hashToHex(c.hash), length: c.length, dedup: false }));
}
function finalizeChunker(chunker) {
  const last = finalize(chunker);
  if (!last) {
    return [];
  }
  return [{ hash: hashToHex(last.hash), length: last.length, dedup: false }];
}
var CurrentXorbInfo = class {
  id;
  offset;
  chunks;
  fileProcessedBytes;
  fileUploadedBytes;
  fileSize;
  data;
  immutableData;
  constructor() {
    this.id = 0;
    this.offset = 0;
    this.chunks = [];
    this.fileProcessedBytes = {};
    this.fileUploadedBytes = {};
    this.fileSize = {};
    this.data = new Uint8Array(XORB_SIZE);
    this.immutableData = null;
  }
  event(computeXorbHash) {
    const xorbChunksCleaned = this.chunks.map((chunk) => ({
      hash: chunk.hash,
      length: chunk.length
    }));
    return {
      event: "xorb",
      xorb: this.data.subarray(0, this.offset),
      hash: computeXorbHash(xorbChunksCleaned),
      chunks: xorbChunksCleaned,
      id: this.id,
      files: Object.entries(this.fileProcessedBytes).map(([path6, processedBytes]) => ({
        path: path6,
        progress: processedBytes / this.fileSize[path6],
        lastSentProgress: ((this.fileUploadedBytes[path6] ?? 0) + (processedBytes - (this.fileUploadedBytes[path6] ?? 0)) * PROCESSING_PROGRESS_RATIO) / this.fileSize[path6]
      }))
    };
  }
};
async function* createXorbs(fileSources, params) {
  const alreadyDoneFileSha256s = /* @__PURE__ */ new Set();
  let xorbId = 0;
  const chunkCache = new ChunkCache();
  let xorb = new CurrentXorbInfo();
  const nextXorb = (currentFile) => {
    const event = xorb.event(computeXorbHashHex);
    xorbId++;
    xorb = new CurrentXorbInfo();
    xorb.id = xorbId;
    xorb.fileUploadedBytes = {
      [currentFile.path]: currentFile.uploadedBytes
    };
    xorb.fileSize[currentFile.path] = currentFile.size;
    return event;
  };
  const pendingFileEvents = [];
  const remoteXorbHashes = [""];
  for await (const fileSource of fileSources) {
    params.yieldCallback?.({
      event: "fileProgress",
      path: fileSource.path,
      progress: 0
    });
    if (fileSource.sha256 && alreadyDoneFileSha256s.has(fileSource.sha256)) {
      params.yieldCallback?.({
        event: "fileProgress",
        path: fileSource.path,
        progress: 1
      });
      continue;
    }
    if (fileSource.sha256) {
      alreadyDoneFileSha256s.add(fileSource.sha256);
    }
    const chunker = createChunker(TARGET_CHUNK_SIZE2);
    {
      xorb.fileSize[fileSource.path] = fileSource.content.size;
      if (fileSource.content instanceof SplicedBlob && fileSource.content.firstSpliceIndex < MAX_CHUNK_SIZE) {
        await loadDedupInfoToCache(
          fileSource.content.originalBlob.slice(0, MAX_CHUNK_SIZE),
          remoteXorbHashes,
          params,
          chunkCache,
          computeHmacHex,
          {
            maxChunks: 1,
            isAtBeginning: true
          }
        );
      }
      let bytesSinceRemoteDedup = Infinity;
      let bytesSinceLastProgressEvent = 0;
      let isFirstFileChunk = true;
      const sourceChunks = [];
      const reader = fileSource.content.stream().getReader();
      let processedBytes = 0;
      let dedupedBytes = 0;
      const fileChunks = [];
      const chunkMetadata = [];
      const addChunks = async function* (chunks) {
        for (const chunk of chunks) {
          if (isFirstFileChunk) {
            chunk.dedup = true;
            isFirstFileChunk = false;
          }
          let chunkIndex = xorb.chunks.length;
          let chunkXorbId = xorbId;
          const chunkToCopy = removeChunkFromSourceData(sourceChunks, chunk.length);
          let cacheData = chunkCache.getChunk(chunk.hash, computeHmacHex);
          if (cacheData === void 0 && chunk.dedup && bytesSinceRemoteDedup >= INTERVAL_BETWEEN_REMOTE_DEDUP) {
            const token = await xetWriteToken(params);
            bytesSinceRemoteDedup = 0;
            const shardResp = await (params.fetch ?? fetch)(token.casUrl + "/v1/chunks/default/" + chunk.hash, {
              headers: {
                Authorization: `Bearer ${token.accessToken}`
              }
            });
            if (shardResp.ok) {
              const shard = await shardResp.blob();
              const shardData = await parseShardData(shard);
              for (const xorb2 of shardData.xorbs) {
                const remoteXorbId = -remoteXorbHashes.length;
                remoteXorbHashes.push(xorb2.hash);
                let i = 0;
                for (const chunk2 of xorb2.chunks) {
                  chunkCache.addChunkToCache(chunk2.hash, remoteXorbId, i++, shardData.hmacKey);
                }
              }
              cacheData = chunkCache.getChunk(chunk.hash, computeHmacHex);
              const oldDedupedBytes = dedupedBytes;
              dedupedBytes = backtrackDedup(xorb, computeHmacHex, shardData, chunkCache, chunkMetadata, dedupedBytes);
              if (dedupedBytes > oldDedupedBytes) {
                xorb.fileUploadedBytes[fileSource.path] ??= 0;
                xorb.fileUploadedBytes[fileSource.path] += dedupedBytes - oldDedupedBytes;
              }
            }
          }
          if (cacheData === void 0) {
            if (!writeChunk(xorb, chunkToCopy, chunk.hash)) {
              yield nextXorb({ path: fileSource.path, uploadedBytes: processedBytes, size: fileSource.content.size });
              chunkIndex = 0;
              chunkXorbId = xorbId;
              for (const event of pendingFileEvents) {
                event.representation = event.representation.map((rep) => ({
                  ...rep,
                  xorbId: rep.xorbId >= 0 ? rep.xorbId : remoteXorbHashes[-rep.xorbId]
                }));
                yield event;
              }
              pendingFileEvents.length = 0;
              if (!writeChunk(xorb, chunkToCopy, chunk.hash)) {
                throw new Error("Failed to write chunk into xorb");
              }
            }
            chunkCache.addChunkToCache(chunk.hash, xorbId, chunkIndex, null);
          } else {
            chunkXorbId = cacheData.xorbIndex;
            chunkIndex = cacheData.chunkIndex;
            dedupedBytes += chunk.length;
            xorb.fileUploadedBytes[fileSource.path] ??= 0;
            xorb.fileUploadedBytes[fileSource.path] += chunk.length;
          }
          bytesSinceRemoteDedup += chunk.length;
          bytesSinceLastProgressEvent += chunk.length;
          fileChunks.push({ hash: chunk.hash, length: chunk.length });
          chunkMetadata.push({
            xorbId: chunkXorbId,
            chunkIndex,
            length: chunk.length
          });
          xorb.fileProcessedBytes[fileSource.path] = processedBytes;
          if (bytesSinceLastProgressEvent >= 1e6) {
            bytesSinceLastProgressEvent = 0;
            params.yieldCallback?.({
              event: "fileProgress",
              path: fileSource.path,
              progress: ((xorb.fileUploadedBytes[fileSource.path] ?? 0) + (xorb.fileProcessedBytes[fileSource.path] - (xorb.fileUploadedBytes[fileSource.path] ?? 0)) * PROCESSING_PROGRESS_RATIO) / fileSource.content.size
            });
          }
          if (xorb.chunks.length >= MAX_XORB_CHUNKS) {
            yield nextXorb({ path: fileSource.path, uploadedBytes: processedBytes, size: fileSource.content.size });
            for (const event of pendingFileEvents) {
              event.representation = event.representation.map((rep) => ({
                ...rep,
                xorbId: rep.xorbId >= 0 ? rep.xorbId : remoteXorbHashes[-rep.xorbId]
              }));
              yield event;
            }
            pendingFileEvents.length = 0;
          }
        }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          yield* addChunks(finalizeChunker(chunker));
          break;
        }
        processedBytes += value.length;
        sourceChunks.push(value);
        yield* addChunks(addDataToChunker(value, chunker));
      }
      const fileRepresentation = buildFileRepresentation(chunkMetadata, fileChunks, computeVerificationHashHex);
      xorb.immutableData = {
        chunkIndex: xorb.chunks.length,
        offset: xorb.offset
      };
      const dedupRatio = fileSource.content.size > 0 ? dedupedBytes / fileSource.content.size : 0;
      pendingFileEvents.push({
        event: "file",
        path: fileSource.path,
        hash: computeFileHashHex(fileChunks),
        sha256: fileSource.sha256,
        dedupRatio,
        representation: fileRepresentation
      });
    }
  }
  if (xorb.offset > 0) {
    yield xorb.event(computeXorbHashHex);
  }
  for (const event of pendingFileEvents) {
    event.representation = event.representation.map((rep) => ({
      ...rep,
      xorbId: rep.xorbId >= 0 ? rep.xorbId : remoteXorbHashes[-rep.xorbId]
    }));
    yield event;
  }
}
function backtrackDedup(xorb, computeHmac, shardData, chunkCache, chunkMetadata, dedupedBytes) {
  const chunkIndexesToBacktrackFor = /* @__PURE__ */ new Map();
  for (let chunkToRecheckIndex = xorb.immutableData?.chunkIndex ?? 0; chunkToRecheckIndex < xorb.chunks.length; chunkToRecheckIndex++) {
    const chunk = xorb.chunks[chunkToRecheckIndex];
    const hmacHash = computeHmac(chunk.hash, shardData.hmacKey);
    const cacheData = chunkCache.getChunk(hmacHash, null);
    if (cacheData !== void 0) {
      chunkIndexesToBacktrackFor.set(chunkToRecheckIndex, {
        xorbId: cacheData.xorbIndex,
        chunkIndex: cacheData.chunkIndex
      });
      chunkCache.removeChunkFromCache(chunk.hash);
    }
  }
  for (const metadata of chunkMetadata) {
    if (metadata.xorbId === xorb.id && chunkIndexesToBacktrackFor.has(metadata.chunkIndex)) {
      const backtrackData = chunkIndexesToBacktrackFor.get(metadata.chunkIndex);
      if (backtrackData !== void 0) {
        metadata.xorbId = backtrackData.xorbId;
        metadata.chunkIndex = backtrackData.chunkIndex;
        dedupedBytes += metadata.length;
      }
    }
  }
  const xorbRangesToErase = [];
  for (let i = 0; i < xorb.chunks.length; i++) {
    const chunk = xorb.chunks[i];
    if (chunkIndexesToBacktrackFor.has(i)) {
      xorbRangesToErase.push({
        start: chunk.offset,
        end: i < xorb.chunks.length - 1 ? xorb.chunks[i + 1].offset : xorb.offset
      });
    }
  }
  const xorbRangesToKeep = [];
  let currentStart = 0;
  for (let i = 0; i < xorbRangesToErase.length; i++) {
    const range = xorbRangesToErase[i];
    if (currentStart !== range.start) {
      xorbRangesToKeep.push({ start: currentStart, end: range.start });
    }
    currentStart = range.end;
  }
  if (currentStart !== xorb.offset) {
    xorbRangesToKeep.push({ start: currentStart, end: xorb.offset });
  }
  let currentOffset = 0;
  for (const range of xorbRangesToKeep) {
    if (range.start !== currentOffset) {
      xorb.data.set(xorb.data.subarray(range.start, range.end), currentOffset);
    }
    currentOffset += range.end - range.start;
  }
  const newXorbChunks = [];
  const oldIndexToNewIndex = /* @__PURE__ */ new Map();
  let erasedOffset = 0;
  for (let i = 0; i < xorb.chunks.length; i++) {
    const chunk = xorb.chunks[i];
    if (chunkIndexesToBacktrackFor.has(i)) {
      if (i < xorb.chunks.length - 1) {
        erasedOffset += xorb.chunks[i + 1].offset - chunk.offset;
      }
    } else {
      newXorbChunks.push({
        hash: chunk.hash,
        length: chunk.length,
        offset: chunk.offset - erasedOffset
      });
      if (erasedOffset > 0) {
        oldIndexToNewIndex.set(i, newXorbChunks.length - 1);
      }
    }
  }
  xorb.chunks = newXorbChunks;
  xorb.offset = currentOffset;
  for (const chunk of chunkMetadata) {
    if (chunk.xorbId === xorb.id) {
      const newIndex = oldIndexToNewIndex.get(chunk.chunkIndex);
      if (newIndex !== void 0) {
        const cached = chunkCache.getChunk(xorb.chunks[newIndex].hash, null);
        if (cached !== void 0 && cached.xorbIndex === chunk.xorbId && cached.chunkIndex === chunk.chunkIndex) {
          chunkCache.updateChunkIndex(xorb.chunks[newIndex].hash, newIndex);
        }
        chunk.chunkIndex = newIndex;
      }
    }
  }
  return dedupedBytes;
}
function removeChunkFromSourceData(sourceChunks, chunkLength) {
  if (chunkLength === sourceChunks[0].length) {
    const chunkToCopy = sourceChunks[0];
    sourceChunks.shift();
    return chunkToCopy;
  } else if (chunkLength < sourceChunks[0].length) {
    const chunkToCopy = sourceChunks[0].subarray(0, chunkLength);
    sourceChunks[0] = sourceChunks[0].subarray(chunkLength);
    return chunkToCopy;
  } else {
    const chunkToCopy = new Uint8Array(chunkLength);
    let copyOffset = 0;
    let index = 0;
    let toSlice = -1;
    while (copyOffset < chunkLength) {
      const nToCopy = Math.min(sourceChunks[index].length, chunkLength - copyOffset);
      chunkToCopy.set(sourceChunks[index].subarray(0, nToCopy), copyOffset);
      copyOffset += nToCopy;
      if (nToCopy === sourceChunks[index].length) {
        index++;
      } else {
        toSlice = nToCopy;
      }
    }
    sourceChunks.splice(0, index);
    if (toSlice !== -1) {
      sourceChunks[0] = sourceChunks[0].subarray(toSlice);
    }
    return chunkToCopy;
  }
}
function writeChunk(xorb, chunk, hash3) {
  const regularCompressedChunk = compress(chunk);
  const bgCompressedChunk = compress(bg4_split_bytes(chunk));
  const compressedChunk = bgCompressedChunk.length < regularCompressedChunk.length ? bgCompressedChunk : regularCompressedChunk;
  const chunkToWrite = compressedChunk.length < chunk.length ? compressedChunk : chunk;
  if (xorb.offset + XET_CHUNK_HEADER_BYTES + chunkToWrite.length > XORB_SIZE) {
    return false;
  }
  xorb.data[xorb.offset] = 0;
  xorb.data[xorb.offset + 1] = chunkToWrite.length & 255;
  xorb.data[xorb.offset + 2] = chunkToWrite.length >> 8 & 255;
  xorb.data[xorb.offset + 3] = chunkToWrite.length >> 16 & 255;
  xorb.data[xorb.offset + 4] = chunkToWrite.length < chunk.length ? bgCompressedChunk.length < regularCompressedChunk.length ? 2 /* ByteGroupingLZ4 */ : 1 /* LZ4 */ : 0 /* None */;
  xorb.data[xorb.offset + 5] = chunk.length & 255;
  xorb.data[xorb.offset + 6] = chunk.length >> 8 & 255;
  xorb.data[xorb.offset + 7] = chunk.length >> 16 & 255;
  xorb.data.set(chunkToWrite, xorb.offset + XET_CHUNK_HEADER_BYTES);
  xorb.chunks.push({ hash: hash3, length: chunk.length, offset: xorb.offset });
  xorb.offset += XET_CHUNK_HEADER_BYTES + chunkToWrite.length;
  return true;
}
var buildFileRepresentation = (metadata, chunks, computeVerificationHash) => {
  if (metadata.length === 0) {
    return [];
  }
  const representation = [];
  let currentRange = {
    xorbId: metadata[0].xorbId,
    indexStart: metadata[0].chunkIndex,
    indexEnd: metadata[0].chunkIndex + 1,
    length: metadata[0].length,
    chunkHashStart: 0
  };
  for (let i = 1; i < metadata.length; i++) {
    const chunk = metadata[i];
    if (currentRange.xorbId === chunk.xorbId && currentRange.indexEnd === chunk.chunkIndex) {
      currentRange.indexEnd = chunk.chunkIndex + 1;
      currentRange.length += chunk.length;
    } else {
      const rangeHash2 = computeVerificationHash(chunks.slice(currentRange.chunkHashStart, i).map((x) => x.hash));
      representation.push({
        xorbId: currentRange.xorbId,
        indexStart: currentRange.indexStart,
        indexEnd: currentRange.indexEnd,
        length: currentRange.length,
        rangeHash: rangeHash2
      });
      currentRange = {
        xorbId: chunk.xorbId,
        indexStart: chunk.chunkIndex,
        indexEnd: chunk.chunkIndex + 1,
        length: chunk.length,
        chunkHashStart: i
      };
    }
  }
  const rangeHash = computeVerificationHash(chunks.slice(currentRange.chunkHashStart).map((x) => x.hash));
  representation.push({
    xorbId: currentRange.xorbId,
    indexStart: currentRange.indexStart,
    indexEnd: currentRange.indexEnd,
    length: currentRange.length,
    rangeHash
  });
  return representation;
};
async function loadDedupInfoToCache(content, remoteXorbHashes, params, chunkCache, computeHmacHex2, opts) {
  const chunker = createChunker(TARGET_CHUNK_SIZE2);
  const cache = chunkCache;
  let dedupedBytes = 0;
  let chunksProcessed = 0;
  let totalBytes = 0;
  let bytesSinceRemoteDedup = Infinity;
  const sourceChunks = [];
  const reader = content.stream().getReader();
  const processChunks = async (chunks) => {
    for (const chunk of chunks) {
      chunksProcessed++;
      if (opts?.isAtBeginning && chunksProcessed === 1) {
        chunk.dedup = true;
      }
      totalBytes += chunk.length;
      removeChunkFromSourceData(sourceChunks, chunk.length);
      let cacheData = cache.getChunk(chunk.hash, computeHmacHex2);
      if (cacheData !== void 0) {
        dedupedBytes += chunk.length;
        bytesSinceRemoteDedup += chunk.length;
        continue;
      }
      if (chunk.dedup && bytesSinceRemoteDedup >= INTERVAL_BETWEEN_REMOTE_DEDUP) {
        const token = await xetWriteToken(params);
        bytesSinceRemoteDedup = 0;
        const shardResp = await (params.fetch ?? fetch)(token.casUrl + "/v1/chunks/default/" + chunk.hash, {
          headers: {
            Authorization: `Bearer ${token.accessToken}`
          }
        });
        if (shardResp.ok) {
          const shard = await shardResp.blob();
          const shardData = await parseShardData(shard);
          for (const xorb of shardData.xorbs) {
            const remoteXorbId = -remoteXorbHashes.length;
            remoteXorbHashes.push(xorb.hash);
            let i = 0;
            for (const xorbChunk of xorb.chunks) {
              cache.addChunkToCache(xorbChunk.hash, remoteXorbId, i++, shardData.hmacKey);
            }
          }
          cacheData = cache.getChunk(chunk.hash, computeHmacHex2);
        }
      }
      if (cacheData !== void 0) {
        dedupedBytes += chunk.length;
      }
      bytesSinceRemoteDedup += chunk.length;
    }
  };
  while (true) {
    if (opts?.end !== void 0 && totalBytes >= opts.end) {
      break;
    }
    if (opts?.maxChunks !== void 0 && chunksProcessed >= opts.maxChunks) {
      break;
    }
    const { done, value } = await reader.read();
    if (done) {
      await processChunks(finalizeChunker(chunker));
      break;
    }
    sourceChunks.push(value);
    await processChunks(addDataToChunker(value, chunker));
  }
}

// src/vendor/hfjs-xet/utils/uploadShards.ts
var SHARD_MAX_SIZE = 64 * 1024 * 1024;
var SHARD_HEADER_SIZE = 48;
var SHARD_FOOTER_SIZE = 200;
var HASH_LENGTH2 = 32;
var XORB_FOOTER_LENGTH = 48;
var FILE_FOOTER_LENGTH = 48;
var SHARD_HEADER_VERSION = 2n;
var SHARD_FOOTER_VERSION = 1n;
var MDB_FILE_FLAG_WITH_VERIFICATION = 2147483648;
var MDB_FILE_FLAG_WITH_METADATA_EXT = 1073741824;
var SHARD_MAGIC_TAG = new Uint8Array([
  "H".charCodeAt(0),
  "F".charCodeAt(0),
  "R".charCodeAt(0),
  "e".charCodeAt(0),
  "p".charCodeAt(0),
  "o".charCodeAt(0),
  "M".charCodeAt(0),
  "e".charCodeAt(0),
  "t".charCodeAt(0),
  "a".charCodeAt(0),
  "D".charCodeAt(0),
  "a".charCodeAt(0),
  "t".charCodeAt(0),
  "a".charCodeAt(0),
  0,
  85,
  105,
  103,
  69,
  106,
  123,
  129,
  87,
  131,
  165,
  189,
  217,
  92,
  205,
  209,
  74,
  169
]);
async function* uploadShards(source, params) {
  const xorbHashes = [];
  const seenFileXetHashes = /* @__PURE__ */ new Set();
  const fileInfoSection = new Uint8Array(Math.floor(SHARD_MAX_SIZE - SHARD_HEADER_SIZE - SHARD_FOOTER_SIZE) * 0.25);
  const xorbInfoSection = new Uint8Array(Math.floor(SHARD_MAX_SIZE - SHARD_HEADER_SIZE - SHARD_FOOTER_SIZE) * 0.75);
  const xorbView = new DataView(xorbInfoSection.buffer);
  let xorbViewOffset = 0;
  const fileInfoView = new DataView(fileInfoSection.buffer);
  let fileViewOffset = 0;
  let xorbTotalSize = 0n;
  let fileTotalSize = 0n;
  let xorbTotalUnpackedSize = 0n;
  for await (const output of createXorbs(source, params)) {
    switch (output.event) {
      case "xorb": {
        xorbHashes.push(output.hash);
        const xorbEntrySize = HASH_LENGTH2 + 4 + 4 + 4 + 4;
        const chunksSize = output.chunks.length * (HASH_LENGTH2 + 4 + 4 + 8);
        const totalXorbSize = xorbEntrySize + chunksSize;
        if (xorbViewOffset + totalXorbSize > xorbInfoSection.length) {
          if (xorbViewOffset > 0 || fileViewOffset > 0) {
            await uploadShard(createShard(), params);
          }
        }
        writeHashToArray(output.hash, xorbInfoSection, xorbViewOffset);
        xorbViewOffset += HASH_LENGTH2;
        xorbView.setUint32(xorbViewOffset, 0, true);
        xorbViewOffset += 4;
        xorbView.setUint32(xorbViewOffset, output.chunks.length, true);
        xorbViewOffset += 4;
        const xorbUnpackedSize = sum(output.chunks.map((x) => x.length));
        xorbView.setUint32(xorbViewOffset, xorbUnpackedSize, true);
        xorbTotalUnpackedSize += BigInt(xorbUnpackedSize);
        xorbTotalSize += BigInt(output.xorb.byteLength);
        xorbViewOffset += 4;
        xorbView.setUint32(xorbViewOffset, output.xorb.byteLength, true);
        xorbViewOffset += 4;
        let chunkBytes = 0;
        for (const chunk of output.chunks) {
          writeHashToArray(chunk.hash, xorbInfoSection, xorbViewOffset);
          xorbViewOffset += HASH_LENGTH2;
          xorbView.setUint32(xorbViewOffset, chunkBytes, true);
          xorbViewOffset += 4;
          xorbView.setUint32(xorbViewOffset, chunk.length, true);
          xorbViewOffset += 4;
          xorbView.setBigUint64(xorbViewOffset, 0n, true);
          xorbViewOffset += 8;
          chunkBytes += chunk.length;
        }
        for (const file of output.files) {
          yield {
            event: "fileProgress",
            path: file.path,
            progress: file.lastSentProgress
          };
        }
        await uploadXorb(output, params);
        for (const file of output.files) {
          yield { event: "fileProgress", path: file.path, progress: file.progress };
        }
        break;
      }
      case "file": {
        yield {
          event: "file",
          path: output.path,
          xetHash: output.hash,
          sha256: output.sha256,
          dedupRatio: output.dedupRatio
        };
        if (seenFileXetHashes.has(output.hash)) {
          break;
        }
        seenFileXetHashes.add(output.hash);
        const fileHeaderSize = HASH_LENGTH2 + 4 + 4 + 8;
        const representationSize = output.representation.length * (HASH_LENGTH2 + 4 + 4 + 4 + 4);
        const verificationSize = output.representation.length * (HASH_LENGTH2 + 16);
        const fileSha256 = output.sha256;
        const hasMetadataExt = fileSha256 !== void 0;
        const metadataSize = hasMetadataExt ? HASH_LENGTH2 + 16 : 0;
        const totalFileSize = fileHeaderSize + representationSize + verificationSize + metadataSize;
        if (fileViewOffset + totalFileSize > fileInfoSection.length) {
          if (xorbViewOffset > 0 || fileViewOffset > 0) {
            await uploadShard(createShard(), params);
          }
        }
        writeHashToArray(output.hash, fileInfoSection, fileViewOffset);
        fileViewOffset += HASH_LENGTH2;
        fileInfoView.setUint32(
          fileViewOffset,
          MDB_FILE_FLAG_WITH_VERIFICATION + (hasMetadataExt ? MDB_FILE_FLAG_WITH_METADATA_EXT : 0),
          true
        );
        fileViewOffset += 4;
        fileInfoView.setUint32(fileViewOffset, output.representation.length, true);
        fileViewOffset += 4;
        fileInfoView.setBigUint64(fileViewOffset, 0n, true);
        fileViewOffset += 8;
        for (const repItem of output.representation) {
          writeHashToArray(
            typeof repItem.xorbId === "number" ? xorbHashes[repItem.xorbId] : repItem.xorbId,
            fileInfoSection,
            fileViewOffset
          );
          fileViewOffset += HASH_LENGTH2;
          fileInfoView.setUint32(fileViewOffset, 0, true);
          fileViewOffset += 4;
          fileInfoView.setUint32(fileViewOffset, repItem.length, true);
          fileViewOffset += 4;
          fileInfoView.setUint32(fileViewOffset, repItem.indexStart, true);
          fileViewOffset += 4;
          fileInfoView.setUint32(fileViewOffset, repItem.indexEnd, true);
          fileViewOffset += 4;
        }
        for (const repItem of output.representation) {
          writeHashToArray(repItem.rangeHash, fileInfoSection, fileViewOffset);
          fileViewOffset += HASH_LENGTH2;
          for (let i = 0; i < 16; i++) {
            fileInfoSection[fileViewOffset + i] = 0;
          }
          fileViewOffset += 16;
        }
        if (hasMetadataExt) {
          writeHashToArray(fileSha256, fileInfoSection, fileViewOffset);
          fileViewOffset += HASH_LENGTH2;
          for (let i = 0; i < 16; i++) {
            fileInfoSection[fileViewOffset + i] = 0;
          }
          fileViewOffset += 16;
        }
        break;
      }
    }
  }
  function createShard() {
    const shard = new Uint8Array(
      SHARD_HEADER_SIZE + SHARD_FOOTER_SIZE + xorbViewOffset + XORB_FOOTER_LENGTH + fileViewOffset + FILE_FOOTER_LENGTH
    );
    const shardView = new DataView(shard.buffer);
    let shardOffset = 0;
    shard.set(SHARD_MAGIC_TAG, shardOffset);
    shardOffset += SHARD_MAGIC_TAG.length;
    shardView.setBigUint64(shardOffset, SHARD_HEADER_VERSION, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, BigInt(SHARD_FOOTER_SIZE), true);
    shardOffset += 8;
    shard.set(fileInfoSection.slice(0, fileViewOffset), shardOffset);
    shardOffset += fileViewOffset;
    for (let i = 0; i < 32; i++) {
      shard[shardOffset + i] = 255;
    }
    shardOffset += 32;
    for (let i = 0; i < 16; i++) {
      shard[shardOffset + i] = 0;
    }
    shardOffset += 16;
    const xorbInfoOffset = shardOffset;
    shard.set(xorbInfoSection.slice(0, xorbViewOffset), shardOffset);
    shardOffset += xorbViewOffset;
    for (let i = 0; i < 32; i++) {
      shard[shardOffset + i] = 255;
    }
    shardOffset += 32;
    for (let i = 0; i < 16; i++) {
      shard[shardOffset + i] = 0;
    }
    shardOffset += 16;
    const footerOffset = shardOffset;
    shardView.setBigUint64(shardOffset, SHARD_FOOTER_VERSION, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, BigInt(SHARD_HEADER_SIZE), true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, BigInt(xorbInfoOffset), true);
    shardOffset += 8;
    for (let i = 0; i < 48; i++) {
      shardView.setUint8(shardOffset + i, 0);
    }
    shardOffset += 48;
    for (let i = 0; i < 32; i++) {
      shardView.setUint8(shardOffset + i, 0);
    }
    shardOffset += 32;
    shardView.setBigUint64(shardOffset, BigInt(Math.floor(Date.now() / 1e3)), true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, 0n, true);
    shardOffset += 8;
    for (let i = 0; i < 48; i++) {
      shardView.setUint8(shardOffset + i, 0);
    }
    shardOffset += 48;
    shardView.setBigUint64(shardOffset, xorbTotalSize, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, fileTotalSize, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, xorbTotalUnpackedSize, true);
    shardOffset += 8;
    shardView.setBigUint64(shardOffset, BigInt(footerOffset), true);
    xorbViewOffset = 0;
    fileViewOffset = 0;
    xorbTotalSize = 0n;
    xorbTotalUnpackedSize = 0n;
    fileTotalSize = 0n;
    return shard;
  }
  if (xorbViewOffset || fileViewOffset) {
    await uploadShard(createShard(), params);
  }
}
function writeHashToArray(hash3, array, offset) {
  for (let i = 0; i < hash3.length; i += 16) {
    array[offset + i / 2] = parseInt(hash3.substring(i + 2 * 7, i + 2 * 8), 16);
    array[offset + i / 2 + 1] = parseInt(hash3.substring(i + 2 * 6, i + 2 * 7), 16);
    array[offset + i / 2 + 2] = parseInt(hash3.substring(i + 2 * 5, i + 2 * 6), 16);
    array[offset + i / 2 + 3] = parseInt(hash3.substring(i + 2 * 4, i + 2 * 5), 16);
    array[offset + i / 2 + 4] = parseInt(hash3.substring(i + 2 * 3, i + 2 * 4), 16);
    array[offset + i / 2 + 5] = parseInt(hash3.substring(i + 2 * 2, i + 2 * 3), 16);
    array[offset + i / 2 + 6] = parseInt(hash3.substring(i + 2 * 1, i + 2 * 2), 16);
    array[offset + i / 2 + 7] = parseInt(hash3.substring(i + 2 * 0, i + 2 * 1), 16);
  }
}
async function uploadXorb(xorb, params) {
  const token = await xetWriteToken(params);
  const resp = await (params.fetch ?? fetch)(`${token.casUrl}/v1/xorbs/default/${xorb.hash}`, {
    method: "POST",
    body: xorb.xorb,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      ...params.xetParams.sessionId ? { "X-Xet-Session-Id": params.xetParams.sessionId } : {}
    },
    ...{
      progressHint: {
        progressCallback: (progress) => {
          for (const file of xorb.files) {
            params.yieldCallback?.({
              event: "fileProgress",
              path: file.path,
              progress: file.lastSentProgress + (file.progress - file.lastSentProgress) * progress
            });
          }
        }
      }
    }
  });
  if (!resp.ok) {
    throw await createApiError(resp);
  }
}
async function uploadShard(shard, params) {
  const token = await xetWriteToken(params);
  const resp = await (params.fetch ?? fetch)(`${token.casUrl}/v1/shards`, {
    method: "POST",
    body: shard,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      ...params.xetParams.sessionId ? { "X-Xet-Session-Id": params.xetParams.sessionId } : {}
    }
  });
  if (!resp.ok) {
    throw await createApiError(resp);
  }
}

// src/hf-bucket-client/client.ts
var HUB_URL = "https://huggingface.co";
var RETRY_STATUSES = /* @__PURE__ */ new Set([408, 429, 500, 502, 503, 504]);
var REQUEST_TIMEOUT_MS = 3e4;
function nextPageUrl(linkHeader) {
  if (!linkHeader) {
    return null;
  }
  for (const part of linkHeader.split(",")) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}
var BucketHttpError = class extends Error {
  constructor(status, url, body) {
    super(`bucket request failed: ${status} ${url}: ${body.slice(0, 500)}`);
    this.status = status;
    this.url = url;
    this.name = "BucketHttpError";
  }
};
var BucketClient = class {
  bucket;
  hubUrl;
  accessToken;
  fetchImpl;
  constructor(options) {
    this.bucket = options.bucket;
    this.hubUrl = options.hubUrl ?? HUB_URL;
    this.accessToken = options.accessToken;
    this.fetchImpl = options.fetch ?? fetch;
  }
  apiUrl(suffix) {
    return `${this.hubUrl}/api/buckets/${this.bucket}${suffix}`;
  }
  authHeaders() {
    return { Authorization: `Bearer ${this.accessToken}` };
  }
  async request(url, init) {
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      throw new BucketHttpError(response.status, url, await response.text());
    }
    return response;
  }
  async fetchWithRetry(url, init) {
    const attempts = 4;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      let response;
      try {
        response = await this.fetchImpl(url, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          headers: { ...this.authHeaders(), ...init?.headers }
        });
      } catch (err) {
        if (attempt < attempts - 1 && err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
          await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
          continue;
        }
        throw err;
      }
      if (!RETRY_STATUSES.has(response.status) || attempt === attempts - 1) {
        return response;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
    throw new Error("unreachable retry state");
  }
  /** Upload file contents via Xet, then register them in one batch call. */
  async uploadFiles(files) {
    if (files.length === 0) {
      return;
    }
    const hashes = /* @__PURE__ */ new Map();
    const source = (async function* () {
      for (const file of files) {
        yield { content: file.content, path: file.path };
      }
    })();
    for await (const event of uploadShards(source, {
      accessToken: this.accessToken,
      hubUrl: this.hubUrl,
      // All upload traffic goes to the CAS endpoint from the write token;
      // repo/rev are unused by the network path for buckets.
      repo: { type: "model", name: this.bucket },
      rev: "main",
      xetParams: {
        refreshWriteTokenUrl: this.apiUrl("/xet-write-token")
      },
      fetch: this.fetchImpl
    })) {
      if (event.event === "file") {
        hashes.set(event.path, event.xetHash);
      }
    }
    const missing = files.filter((file) => !hashes.has(file.path));
    if (missing.length > 0) {
      throw new Error(`xet upload returned no hash for: ${missing.map((f) => f.path).join(", ")}`);
    }
    await this.batch(
      files.map((file) => ({
        type: "addFile",
        path: file.path,
        xetHash: hashes.get(file.path),
        // Milliseconds, per the Python reference (`int(time.time() * 1000)`).
        mtime: Date.now()
      }))
    );
  }
  async deleteFiles(paths) {
    if (paths.length === 0) {
      return;
    }
    await this.batch(paths.map((path6) => ({ type: "deleteFile", path: path6 })));
  }
  async batch(operations) {
    const body = `${operations.map((op) => JSON.stringify(op)).join("\n")}
`;
    await this.request(this.apiUrl("/batch"), {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body
    });
  }
  /**
   * Download a file. Returns null when the file does not exist; throws on
   * any other failure (including bucket/auth errors), so a missing object is
   * never conflated with an unreachable bucket.
   */
  async downloadFile(path6) {
    const url = `${this.hubUrl}/buckets/${this.bucket}/resolve/${encodeURIComponent(path6)}`;
    const response = await this.fetchWithRetry(url);
    if (response.status === 404) {
      await this.assertBucketAccessible();
      return null;
    }
    if (!response.ok) {
      throw new BucketHttpError(response.status, url, await response.text());
    }
    return await response.blob();
  }
  /** List files under a prefix (recursive), following Link-header pagination. */
  async listFiles(prefix = "") {
    const entries = [];
    const encodedPrefix = prefix ? `/${encodeURIComponent(prefix)}` : "";
    let url = `${this.apiUrl(`/tree${encodedPrefix}`)}?recursive=true`;
    while (url) {
      const response = await this.request(url);
      const page = await response.json();
      for (const item of page) {
        entries.push({
          path: item.path,
          size: item.size ?? 0,
          type: item.type === "directory" ? "directory" : "file"
        });
      }
      url = nextPageUrl(response.headers.get("link"));
    }
    return entries;
  }
  async assertBucketAccessible() {
    await this.request(this.apiUrl(""));
  }
};

// src/hf-state-sync/hub.ts
function createHfBucketHub(params) {
  const token = params.token ?? process.env.HF_TOKEN;
  if (!token) {
    throw new Error("HF_TOKEN is required when OPENCLAW_HF_STATE_BUCKET is set");
  }
  const client = new BucketClient({ bucket: params.bucket, accessToken: token });
  let bucketAccessible = false;
  const assertBucketAccessible = async () => {
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
    async download(remotePath2, localPath) {
      try {
        const blob = await client.downloadFile(remotePath2);
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
        throw new Error(`bucket download failed for ${remotePath2}: ${message}`);
      }
    },
    async upload(localPath, remotePath2) {
      try {
        await client.uploadFiles([{ path: remotePath2, content: new Blob([await fs.readFile(localPath)]) }]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`bucket upload failed for ${remotePath2}: ${message}`);
      }
    },
    async delete(remotePaths) {
      try {
        await client.deleteFiles(remotePaths);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[hf-state-sync] prune failed for ${remotePaths.join(", ")}: ${message}`);
      }
    }
  };
}

// src/hf-state-sync/paths.ts
import { randomUUID } from "node:crypto";
var DEFAULT_LIVE_DIR = "/tmp/openclaw-live";
var DEFAULT_PREFIX = "openclaw-state";
var DEFAULT_INTERVAL_SECONDS = 60;
var DEFAULT_HANDOFF_POLL_SECONDS = 5;
var DEFAULT_KEEP = 5;
function positiveIntFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
function resolveSyncConfig(env = process.env) {
  const runId = env.HUGGINGCLAW_RUN_ID?.trim() || randomUUID();
  return {
    liveDir: env.OPENCLAW_LIVE_DIR?.trim() || DEFAULT_LIVE_DIR,
    bucket: env.OPENCLAW_HF_STATE_BUCKET?.trim() || null,
    bucketPrefix: (env.OPENCLAW_HF_STATE_PREFIX?.trim() || DEFAULT_PREFIX).replace(/\/+$/, ""),
    intervalSeconds: positiveIntFromEnv(env.HF_STATE_SYNC_INTERVAL_SECONDS, DEFAULT_INTERVAL_SECONDS),
    handoffPollSeconds: positiveIntFromEnv(env.HF_STATE_SYNC_HANDOFF_POLL_SECONDS, DEFAULT_HANDOFF_POLL_SECONDS),
    keepSnapshots: positiveIntFromEnv(env.HF_STATE_SYNC_KEEP, DEFAULT_KEEP),
    runId,
    runtimeId: env.HUGGINGCLAW_RUNTIME_ID?.trim() || runId,
    agentName: env.OPENCLAW_AGENT_NAME?.trim() || "openclaw",
    gatewayLocation: env.HUGGINGCLAW_GATEWAY_LOCATION === "local" || env.HUGGINGCLAW_GATEWAY_LOCATION === "space" ? env.HUGGINGCLAW_GATEWAY_LOCATION : "unknown",
    runtimeImage: env.HUGGINGCLAW_RUNTIME_IMAGE?.trim() || "unknown"
  };
}
function remotePath(config, name) {
  return `${config.bucketPrefix}/${name}`;
}
function log(message) {
  console.log(`[hf-state-sync] ${message}`);
}
function logError(message) {
  console.error(`[hf-state-sync] ${message}`);
}

// src/hf-state-sync/restore.ts
import fs4 from "node:fs/promises";
import os from "node:os";
import path3 from "node:path";

// src/hf-state-sync/archive.ts
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import fs3 from "node:fs/promises";
import path2 from "node:path";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

// src/hf-state-sync/sqlite.ts
import fs2 from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
async function findSqliteFiles(root) {
  const found = [];
  let entries;
  try {
    entries = await fs2.readdir(root, { withFileTypes: true, recursive: true });
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
function vacuumInto(sourceDb, destDb) {
  const db = new DatabaseSync(sourceDb);
  try {
    db.prepare("VACUUM INTO ?").run(destDb);
  } finally {
    db.close();
  }
}
function checkIntegrity(dbPath) {
  let db;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
  } catch (err) {
    return { kind: "corrupt", detail: `cannot open: ${String(err)}` };
  }
  try {
    const row = db.prepare("PRAGMA integrity_check").get();
    return row?.integrity_check === "ok" ? { kind: "ok" } : { kind: "corrupt", detail: String(row?.integrity_check ?? "no result") };
  } catch (err) {
    return { kind: "corrupt", detail: String(err) };
  } finally {
    db.close();
  }
}

// src/hf-state-sync/archive.ts
var execFileAsync = promisify(execFile);
var STATE_EXCLUDED_NAMES = /* @__PURE__ */ new Set([".env", "credentials", "tmp", "cache", "logs"]);
var STATE_EXCLUDED_SUFFIXES = [".log"];
var SIDECAR_SUFFIXES = [".sqlite-wal", ".sqlite-shm"];
var STATE_DIR_NAME = ".openclaw";
function isExcluded(name, inStateDir) {
  if (SIDECAR_SUFFIXES.some((suffix) => name.endsWith(suffix))) {
    return true;
  }
  if (!inStateDir) {
    return false;
  }
  return STATE_EXCLUDED_NAMES.has(name) || STATE_EXCLUDED_SUFFIXES.some((suffix) => name.endsWith(suffix));
}
async function copyTreeFiltered(params) {
  const { sourceDir, destDir, databases, rootDir, inStateDir, depth } = params;
  await fs3.mkdir(destDir, { recursive: true });
  const entries = await fs3.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (isExcluded(entry.name, inStateDir)) {
      continue;
    }
    const source = path2.join(sourceDir, entry.name);
    const dest = path2.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyTreeFiltered({
        sourceDir: source,
        destDir: dest,
        databases,
        rootDir,
        // Only the top-level .openclaw dir is OpenClaw state; a workspace
        // project may legitimately contain its own .openclaw directory.
        inStateDir: inStateDir || depth === 0 && entry.name === STATE_DIR_NAME,
        depth: depth + 1
      });
    } else if (entry.isFile()) {
      if (entry.name.endsWith(".sqlite")) {
        databases.push(path2.relative(rootDir, source));
      } else {
        await fs3.copyFile(source, dest);
      }
    } else if (entry.isSymbolicLink()) {
      await fs3.symlink(await fs3.readlink(source), dest);
    }
  }
}
async function stageLiveDir(liveDir, stagingDir) {
  const databases = [];
  await copyTreeFiltered({
    sourceDir: liveDir,
    destDir: stagingDir,
    databases,
    rootDir: liveDir,
    inStateDir: false,
    depth: 0
  });
  for (const relative of databases) {
    const staged = path2.join(stagingDir, relative);
    await fs3.mkdir(path2.dirname(staged), { recursive: true });
    vacuumInto(path2.join(liveDir, relative), staged);
    const integrity = checkIntegrity(staged);
    if (integrity.kind === "corrupt") {
      return { kind: "corrupt-database", database: relative, detail: integrity.detail };
    }
  }
  return { kind: "staged", databases };
}
async function createTarZst(sourceDir, outFile) {
  const tarFile = `${outFile}.tar`;
  await execFileAsync("tar", ["-cf", tarFile, "-C", sourceDir, "."]);
  await execFileAsync("zstd", ["-q", "-f", "--rm", tarFile, "-o", outFile]);
}
async function extractTarZst(archiveFile, destDir) {
  const tarFile = `${archiveFile}.extracted.tar`;
  await execFileAsync("zstd", ["-q", "-f", "-d", archiveFile, "-o", tarFile]);
  try {
    await fs3.mkdir(destDir, { recursive: true });
    await execFileAsync("tar", ["-xf", tarFile, "-C", destDir]);
  } finally {
    await fs3.rm(tarFile, { force: true });
  }
}
async function sha256File(file) {
  const hash3 = createHash("sha256");
  await pipeline(createReadStream(file), hash3);
  return hash3.digest("hex");
}

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path6, errorMaps, issueData } = params;
  const fullPath = [...path6, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path6, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path6;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// src/hf-state-sync/manifest.ts
var snapshotEntrySchema = external_exports.object({
  id: external_exports.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,255}$/),
  path: external_exports.string().min(1),
  createdAt: external_exports.string().datetime(),
  sha256: external_exports.string().regex(/^[0-9a-f]{64}$/),
  sizeBytes: external_exports.number().int().nonnegative(),
  runId: external_exports.string().min(1),
  bootTime: external_exports.string().datetime()
});
var manifestSchema = external_exports.object({
  version: external_exports.literal(1),
  current: snapshotEntrySchema,
  previous: external_exports.array(snapshotEntrySchema)
});
var MANIFEST_REMOTE_NAME = "manifest.json";
function parseManifest(raw) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return { kind: "invalid", reason: `not JSON: ${String(err)}` };
  }
  const result = manifestSchema.safeParse(json);
  return result.success ? { kind: "ok", manifest: result.data } : { kind: "invalid", reason: result.error.message };
}
function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}
`;
}
function promoteSnapshot(params) {
  const retainedPrevious = params.existing ? [params.existing.current, ...params.existing.previous] : [];
  const previous = retainedPrevious.slice(0, Math.max(params.keep - 1, 0));
  const expired = retainedPrevious.slice(Math.max(params.keep - 1, 0));
  return {
    manifest: { version: 1, current: params.entry, previous },
    expired
  };
}

// src/hf-state-sync/restore.ts
async function tryRestoreEntry(params) {
  const { hub, entry, workDir, liveDir } = params;
  const archivePath = path3.join(workDir, `candidate-${entry.id}.tar.zst`);
  const downloaded = await hub.download(entry.path, archivePath);
  if (downloaded === "not-found") {
    logError(`snapshot ${entry.id} missing from bucket`);
    return "failed";
  }
  const digest = await sha256File(archivePath);
  if (digest !== entry.sha256) {
    logError(`snapshot ${entry.id} checksum mismatch`);
    return "failed";
  }
  const extractDir = `${liveDir}.restoring-${entry.id}`;
  await fs4.rm(extractDir, { recursive: true, force: true });
  try {
    try {
      await extractTarZst(archivePath, extractDir);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logError(`snapshot ${entry.id} failed to extract: ${detail}`);
      return "failed";
    }
    for (const database of await findSqliteFiles(extractDir)) {
      const integrity = checkIntegrity(database);
      if (integrity.kind === "corrupt") {
        logError(`snapshot ${entry.id} db ${path3.basename(database)} corrupt: ${integrity.detail}`);
        return "failed";
      }
    }
    await fs4.mkdir(path3.dirname(liveDir), { recursive: true });
    await fs4.rename(extractDir, liveDir);
    return "restored";
  } finally {
    await fs4.rm(extractDir, { recursive: true, force: true });
  }
}
async function runRestore(params) {
  const { config, hub } = params;
  if (!config.bucket) {
    return { kind: "fresh-start", reason: "no-bucket" };
  }
  try {
    await fs4.access(config.liveDir);
    return { kind: "fresh-start", reason: "live-dir-exists" };
  } catch {
  }
  const workDir = await fs4.mkdtemp(path3.join(os.tmpdir(), "hf-state-restore-"));
  try {
    const manifestPath = path3.join(workDir, "manifest.json");
    const downloaded = await hub.download(remotePath(config, MANIFEST_REMOTE_NAME), manifestPath);
    if (downloaded === "not-found") {
      return { kind: "fresh-start", reason: "no-manifest" };
    }
    const parsed = parseManifest(await fs4.readFile(manifestPath, "utf8"));
    if (parsed.kind === "invalid") {
      return { kind: "invalid-manifest", reason: parsed.reason };
    }
    const candidates = [parsed.manifest.current, ...parsed.manifest.previous];
    const tried = [];
    for (const entry of candidates) {
      tried.push(entry.id);
      if (await tryRestoreEntry({ hub, entry, workDir, liveDir: config.liveDir }) === "restored") {
        log(`restored snapshot ${entry.id} (created ${entry.createdAt})`);
        return { kind: "restored", entry };
      }
    }
    return { kind: "all-snapshots-failed", tried };
  } finally {
    await fs4.rm(workDir, { recursive: true, force: true });
  }
}

// src/hf-state-sync/snapshot.ts
import fs5 from "node:fs/promises";
import os2 from "node:os";
import path4 from "node:path";
var snapshotCounter = 0;
function snapshotId(now, runId) {
  snapshotCounter += 1;
  const stamp = now.toISOString().replaceAll(":", "-").replace(".", "-");
  return `${stamp}-${runId.slice(0, 8)}-${snapshotCounter}`;
}
async function fetchManifest(config, hub, workDir) {
  const localPath = path4.join(workDir, "manifest.remote.json");
  const result = await hub.download(remotePath(config, MANIFEST_REMOTE_NAME), localPath);
  if (result === "not-found") {
    return { kind: "none" };
  }
  const parsed = parseManifest(await fs5.readFile(localPath, "utf8"));
  return parsed.kind === "ok" ? { kind: "ok", manifest: parsed.manifest } : { kind: "invalid", reason: parsed.reason };
}
async function runSnapshot(params) {
  const { config, hub } = params;
  if (!config.bucket) {
    return { kind: "skipped", reason: "no-bucket" };
  }
  try {
    await fs5.access(config.liveDir);
  } catch {
    return { kind: "skipped", reason: "empty-state" };
  }
  const workDir = await fs5.mkdtemp(path4.join(os2.tmpdir(), "hf-state-snapshot-"));
  try {
    const stagingDir = path4.join(workDir, "stage");
    const staged = await stageLiveDir(config.liveDir, stagingDir);
    if (staged.kind === "corrupt-database") {
      return {
        kind: "failed",
        detail: `live database ${staged.database} failed integrity check: ${staged.detail}`
      };
    }
    const now = (params.now ?? (() => /* @__PURE__ */ new Date()))();
    const id = snapshotId(now, config.runId);
    const archiveName = `state-${id}.tar.zst`;
    const archivePath = path4.join(workDir, archiveName);
    await createTarZst(stagingDir, archivePath);
    const entry = {
      id,
      path: remotePath(config, `snapshots/${archiveName}`),
      createdAt: now.toISOString(),
      sha256: await sha256File(archivePath),
      sizeBytes: (await fs5.stat(archivePath)).size,
      runId: config.runId,
      bootTime: params.bootTime
    };
    await hub.upload(archivePath, entry.path);
    const existing = await fetchManifest(config, hub, workDir);
    if (existing.kind === "invalid") {
      return {
        kind: "failed",
        detail: `remote manifest is invalid, refusing to overwrite it: ${existing.reason}`
      };
    }
    const { manifest, expired } = promoteSnapshot({
      existing: existing.kind === "ok" ? existing.manifest : null,
      entry,
      keep: config.keepSnapshots
    });
    const manifestPath = path4.join(workDir, "manifest.json");
    await fs5.writeFile(manifestPath, serializeManifest(manifest));
    await hub.upload(manifestPath, remotePath(config, MANIFEST_REMOTE_NAME));
    if (expired.length > 0) {
      await hub.delete(expired.map((e) => e.path));
    }
    log(`snapshot ${entry.id} uploaded (${entry.sizeBytes} bytes, ${staged.databases.length} dbs)`);
    return { kind: "uploaded", entry };
  } catch (err) {
    return { kind: "failed", detail: err instanceof Error ? err.message : String(err) };
  } finally {
    await fs5.rm(workDir, { recursive: true, force: true });
  }
}

// src/hf-state-sync/supervise.ts
import { spawn } from "node:child_process";
import fs6 from "node:fs/promises";
import os3 from "node:os";
import path5 from "node:path";
import { setTimeout as delay } from "node:timers/promises";
var LEASE_HEARTBEAT_MS = 6e4;
async function supervise(params) {
  const { config, hub, command } = params;
  const [binary, ...args] = command;
  if (!binary) {
    throw new Error("supervise: missing child command");
  }
  const bootTime = (/* @__PURE__ */ new Date()).toISOString();
  let lastSnapshotId;
  const handoffState = { request: null };
  const writeLease = async () => {
    const status = {
      schemaVersion: 1,
      agent: config.agentName,
      runtimeId: config.runtimeId,
      gatewayLocation: config.gatewayLocation,
      runtimeImage: config.runtimeImage,
      startedAt: bootTime,
      lastHeartbeatAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...lastSnapshotId ? { lastSnapshotId } : {}
    };
    const tmpDir = await fs6.mkdtemp(path5.join(os3.tmpdir(), "hf-state-lease-"));
    try {
      const file = path5.join(tmpDir, "status.json");
      await fs6.writeFile(file, JSON.stringify(status, null, 2) + "\n");
      await hub.upload(file, remotePath(config, "runtime/status.json"));
    } finally {
      await fs6.rm(tmpDir, { recursive: true, force: true });
    }
  };
  const readHandoffRequest = async () => {
    const tmpDir = await fs6.mkdtemp(path5.join(os3.tmpdir(), "hf-state-handoff-"));
    try {
      const file = path5.join(tmpDir, "request.json");
      const result = await hub.download(remotePath(config, "runtime/handoff-request.json"), file);
      if (result === "not-found") {
        return null;
      }
      const parsed = JSON.parse(await fs6.readFile(file, "utf8"));
      if (parsed?.schemaVersion !== 1 || parsed.agent !== config.agentName || parsed.runtimeId !== config.runtimeId || typeof parsed.requestId !== "string" || !parsed.requestId) {
        return null;
      }
      return parsed;
    } finally {
      await fs6.rm(tmpDir, { recursive: true, force: true });
    }
  };
  const writeHandoffAck = async (request) => {
    const ack = {
      schemaVersion: 1,
      requestId: request.requestId,
      agent: config.agentName,
      runtimeId: config.runtimeId,
      gatewayLocation: config.gatewayLocation,
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      ...lastSnapshotId ? { lastSnapshotId } : {}
    };
    const tmpDir = await fs6.mkdtemp(path5.join(os3.tmpdir(), "hf-state-handoff-ack-"));
    try {
      const file = path5.join(tmpDir, "ack.json");
      await fs6.writeFile(file, JSON.stringify(ack, null, 2) + "\n");
      await hub.upload(file, remotePath(config, "runtime/handoff-ack.json"));
      await hub.delete([remotePath(config, "runtime/handoff-request.json")]);
    } finally {
      await fs6.rm(tmpDir, { recursive: true, force: true });
    }
  };
  const child = spawn(binary, args, { stdio: "inherit" });
  const childExit = new Promise((resolve) => {
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 128 : 1)));
    child.on("error", (err) => {
      logError(`child failed to start: ${err.message}`);
      resolve(1);
    });
  });
  let stopping = false;
  let inFlight = null;
  const runOnce = async (label) => {
    try {
      const outcome = await runSnapshot({ config, hub, bootTime });
      if (outcome.kind === "failed") {
        logError(`${label}: snapshot failed: ${outcome.detail}`);
      } else if (outcome.kind === "uploaded") {
        lastSnapshotId = outcome.entry.path;
      }
      await writeLease().catch((err) => {
        logError(`${label}: lease heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
      });
      return outcome;
    } finally {
      inFlight = null;
    }
  };
  const snapshotInterval = async () => {
    if (inFlight) {
      log("interval: previous snapshot still running, skipping");
      return;
    }
    inFlight = runOnce("interval");
    await inFlight;
  };
  const snapshotFinal = async () => {
    if (inFlight) {
      await inFlight;
    }
    inFlight = runOnce("final");
    return await inFlight;
  };
  const snapshotLoop = (async () => {
    while (!stopping) {
      await delay(config.intervalSeconds * 1e3);
      if (stopping) {
        return;
      }
      await snapshotInterval();
    }
  })();
  void snapshotLoop;
  const heartbeatLoop = (async () => {
    await writeLease().catch((err) => logError(`initial lease failed: ${err instanceof Error ? err.message : String(err)}`));
    while (!stopping) {
      await delay(LEASE_HEARTBEAT_MS);
      if (stopping) {
        return;
      }
      await writeLease().catch((err) => {
        logError(`lease heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
  })();
  void heartbeatLoop;
  const handoffLoop = (async () => {
    while (!stopping && !handoffState.request) {
      await delay(config.handoffPollSeconds * 1e3);
      if (stopping || handoffState.request) {
        return;
      }
      try {
        const request = await readHandoffRequest();
        if (!request) {
          continue;
        }
        handoffState.request = request;
        log(`handoff ${request.requestId} requested for ${request.targetRuntimeId}`);
        stopping = true;
        child.kill("SIGTERM");
      } catch (err) {
        logError(`handoff poll failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  })();
  void handoffLoop;
  const forwardSignal = (signal) => {
    log(`received ${signal}, shutting down`);
    stopping = true;
    child.kill(signal);
  };
  process.on("SIGTERM", forwardSignal);
  process.on("SIGINT", forwardSignal);
  const exitCode = await childExit;
  stopping = true;
  log(`child exited with code ${exitCode}, taking final snapshot`);
  const finalOutcome = await snapshotFinal();
  if (handoffState.request) {
    const request = handoffState.request;
    if (finalOutcome.kind !== "uploaded") {
      throw new Error(`handoff ${request.requestId} final snapshot did not upload: ${snapshotFailureDetail(finalOutcome)}`);
    }
    await writeHandoffAck(request).catch((err) => {
      throw new Error(`handoff ${request.requestId} snapshot completed but ack failed: ${err instanceof Error ? err.message : String(err)}`);
    });
    log(`handoff ${request.requestId} acknowledged`);
    return 0;
  }
  return exitCode;
}
function snapshotFailureDetail(outcome) {
  switch (outcome.kind) {
    case "uploaded":
      return "uploaded";
    case "failed":
      return outcome.detail;
    case "skipped":
      return outcome.reason;
  }
}

// src/hf-state-sync/cli.ts
var USAGE = `usage:
  hf-state-sync restore
  hf-state-sync snapshot
  hf-state-sync supervise -- <command> [args...]`;
function makeHub(bucket) {
  return bucket ? createHfBucketHub({ bucket }) : null;
}
async function main(argv) {
  const config = resolveSyncConfig();
  const hub = makeHub(config.bucket);
  if (!hub) {
    logError("OPENCLAW_HF_STATE_BUCKET is not set; state will NOT survive restarts");
  }
  const mode = argv[0];
  switch (mode) {
    case "restore": {
      if (!hub) {
        return 0;
      }
      const outcome = await runRestore({ config, hub });
      switch (outcome.kind) {
        case "restored":
          return 0;
        case "fresh-start":
          log(`fresh start (${outcome.reason})`);
          return 0;
        case "invalid-manifest":
          logError(`manifest exists but is invalid, refusing fresh start: ${outcome.reason}`);
          return 1;
        case "all-snapshots-failed":
          logError(`all snapshots failed verification: ${outcome.tried.join(", ")}`);
          return 1;
      }
      break;
    }
    case "snapshot": {
      if (!hub) {
        return 1;
      }
      const outcome = await runSnapshot({ config, hub, bootTime: (/* @__PURE__ */ new Date()).toISOString() });
      if (outcome.kind === "failed") {
        logError(outcome.detail);
        return 1;
      }
      log(`snapshot outcome: ${outcome.kind}`);
      return 0;
    }
    case "supervise": {
      const separator = argv.indexOf("--");
      const command = separator >= 0 ? argv.slice(separator + 1) : [];
      if (command.length === 0) {
        logError(USAGE);
        return 2;
      }
      if (!hub) {
        const { spawn: spawn2 } = await import("node:child_process");
        const child = spawn2(command[0], command.slice(1), { stdio: "inherit" });
        return await new Promise((resolve) => {
          process.on("SIGTERM", () => child.kill("SIGTERM"));
          process.on("SIGINT", () => child.kill("SIGINT"));
          child.on("exit", (code) => resolve(code ?? 1));
        });
      }
      return await supervise({ config, hub, command });
    }
    default:
      logError(USAGE);
      return 2;
  }
  return 2;
}
main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    logError(err instanceof Error ? err.stack ?? err.message : String(err));
    process.exit(1);
  }
);
