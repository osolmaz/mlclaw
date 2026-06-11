// @ts-nocheck -- vendored upstream code, kept verbatim; our strict tsconfig does not apply.
// Vendored from huggingface/huggingface.js@f8fdf6be (packages/hub/src/utils/checkCredentials.ts), MIT License.
// Delete this directory when bucket support is upstreamed to @huggingface/hub.
import type { CredentialsParams } from "../types/public";

export function checkAccessToken(accessToken: string): void {
	if (!accessToken.startsWith("hf_")) {
		throw new TypeError("Your access token must start with 'hf_'");
	}
}

export function checkCredentials(params: Partial<CredentialsParams>): string | undefined {
	if (params.accessToken) {
		checkAccessToken(params.accessToken);
		return params.accessToken;
	}
	if (params.credentials?.accessToken) {
		checkAccessToken(params.credentials.accessToken);
		return params.credentials.accessToken;
	}
}
