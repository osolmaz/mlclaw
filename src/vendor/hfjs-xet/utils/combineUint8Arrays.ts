// @ts-nocheck -- vendored upstream code, kept verbatim; our strict tsconfig does not apply.
// Vendored from huggingface/huggingface.js@f8fdf6be (packages/hub/src/utils/combineUint8Arrays.ts), MIT License.
// Delete this directory when bucket support is upstreamed to @huggingface/hub.
export function combineUint8Arrays(
	a: Uint8Array<ArrayBufferLike>,
	b: Uint8Array<ArrayBufferLike>,
): Uint8Array<ArrayBuffer> {
	const aLength = a.length;
	const combinedBytes = new Uint8Array(aLength + b.length);
	combinedBytes.set(a);
	combinedBytes.set(b, aLength);
	return combinedBytes;
}
