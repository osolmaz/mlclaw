// @ts-nocheck -- vendored upstream code, kept verbatim; our strict tsconfig does not apply.
// Vendored from huggingface/huggingface.js@f8fdf6be (packages/hub/src/utils/sum.ts), MIT License.
// Delete this directory when bucket support is upstreamed to @huggingface/hub.
/**
 * Sum of elements in array
 */
export function sum(arr: number[]): number {
	return arr.reduce((a, b) => a + b, 0);
}
