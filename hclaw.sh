#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "hclaw requires Node.js 20 or newer" >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "hclaw requires Node.js 20 or newer; found $(node -v)" >&2
  exit 1
fi

TMP="$(mktemp "${TMPDIR:-/tmp}/hclaw.XXXXXX.mjs")"
cleanup() {
  rm -f "$TMP"
}
trap cleanup EXIT

curl -fsSL "https://raw.githubusercontent.com/osolmaz/huggingclaw/main/dist/hclaw.mjs" -o "$TMP"
node "$TMP" "$@"
