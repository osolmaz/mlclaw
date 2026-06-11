#!/usr/bin/env bash
set -euo pipefail

exec bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.sh) "$@"
