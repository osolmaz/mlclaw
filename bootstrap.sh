#!/usr/bin/env bash
set -euo pipefail

TEMPLATE_SPACE="${OPENCLAW_HF_TEMPLATE_SPACE:-osolmaz/openclaw-huggingface}"
DEFAULT_SPACE_NAME="${OPENCLAW_HF_SPACE_NAME:-openclaw}"
DEFAULT_BUCKET_NAME="${OPENCLAW_HF_BUCKET_NAME:-openclaw-data}"
DEFAULT_MODEL="${OPENCLAW_MODEL:-huggingface/Qwen/Qwen3-8B}"
DEFAULT_MODEL_PROVIDER="${OPENCLAW_MODEL_PROVIDER:-huggingface}"
DEFAULT_MODEL_BASE_URL="${OPENCLAW_MODEL_BASE_URL:-https://router.huggingface.co/v1}"

G=$'\033[0;32m'
Y=$'\033[0;33m'
C=$'\033[0;36m'
R=$'\033[0;31m'
N=$'\033[0m'

say() { printf "${C}→${N} %s\n" "$*"; }
ok() { printf "${G}✓${N} %s\n" "$*"; }
warn() { printf "${Y}!${N} %s\n" "$*"; }
die() { printf "${R}✗${N} %s\n" "$*" >&2; exit 1; }
ask() { local __var="$1"; shift; read -r -p "  $* " "$__var" </dev/tty; }
ask_secret() { local __var="$1"; shift; read -r -s -p "  $* " "$__var" </dev/tty; printf "\n"; }
ask_default() {
  local __var="$1"
  local __default="$2"
  shift 2
  local __value=""
  if [ -t 0 ]; then
    read -r -p "  $* [$__default]: " __value </dev/tty
  fi
  printf -v "$__var" '%s' "${__value:-$__default}"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

random_token() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr -d '-'
  else
    date +%s | shasum -a 256 | awk '{print $1}'
  fi
}

trim_token() {
  awk 'NF { token=$0 } END { gsub(/[[:space:]]/, "", token); print token }'
}

telegram_api() {
  local token="$1"
  local method="$2"
  curl -fsSL "https://api.telegram.org/bot${token}/${method}"
}

json_get() {
  local expr="$1"
  python3 -c '
import json, sys
expr = sys.argv[1].split(".")
data = json.load(sys.stdin)
for part in expr:
    if not part:
        continue
    data = data.get(part, {}) if isinstance(data, dict) else {}
if data is None or isinstance(data, (dict, list)):
    raise SystemExit(1)
print(data)
' "$expr"
}

slugify() {
  python3 -c '
import re, sys
value = sys.stdin.read().strip().lower()
value = re.sub(r"(@|_?bot$|-?bot$)", "", value)
value = re.sub(r"[^a-z0-9]+", "-", value)
value = re.sub(r"-+", "-", value).strip("-")
print(value or "openclaw")
'
}

titleize_slug() {
  python3 -c '
import sys
value = sys.stdin.read().strip()
print(" ".join(part.capitalize() for part in value.replace("_", "-").split("-") if part) or "OpenClaw")
'
}

detect_telegram_user_id() {
  local token="$1"
  local json
  json="$(telegram_api "$token" getUpdates || true)"
  [ -n "$json" ] || return 1
  printf "%s" "$json" | python3 -c '
import json, sys
data = json.load(sys.stdin)
ids = []
for update in data.get("result", []):
    msg = update.get("message") or update.get("edited_message") or {}
    user = msg.get("from") or {}
    user_id = user.get("id")
    if user_id and user_id not in ids:
        ids.append(user_id)
for user_id in ids:
    print(user_id)
' | head -n 1
}

printf "\n${C}OpenClaw on Hugging Face — bootstrap${N}\n\n"

need_cmd hf
need_cmd curl
need_cmd git
need_cmd python3

if ! hf auth whoami >/dev/null 2>&1; then
  die "Not logged in to Hugging Face. Run: hf auth login"
fi

HF_USER="$(hf auth whoami | sed -n 's/^user=\([^ ]*\).*/\1/p' | head -n 1)"
[ -n "$HF_USER" ] || HF_USER="$(hf auth whoami | head -n 1 | awk '{print $1}')"
[ -n "$HF_USER" ] || die "Could not determine Hugging Face username."
ok "Hugging Face user: $HF_USER"

HF_TOKEN_VAL="${HF_TOKEN:-}"
[ -n "$HF_TOKEN_VAL" ] || HF_TOKEN_VAL="$(hf auth token 2>/dev/null | trim_token)"
[ -n "$HF_TOKEN_VAL" ] || die "Could not read HF token from hf CLI."
ok "HF token available from hf CLI"

TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_ALLOWED_USERS="${TELEGRAM_ALLOWED_USERS:-}"
TELEGRAM_BOT_USERNAME=""
TELEGRAM_BOT_FIRST_NAME=""
TELEGRAM_BOT_ID=""
TELEGRAM_PROXY="${TELEGRAM_PROXY:-${OPENCLAW_TELEGRAM_PROXY:-}}"
TELEGRAM_API_ROOT="${TELEGRAM_API_ROOT:-${OPENCLAW_TELEGRAM_API_ROOT:-}}"
AGENT_NAME="${OPENCLAW_AGENT_NAME:-}"

if [ -n "${TELEGRAM_BOT_TOKEN_FILE:-}" ] && [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  [ -f "$TELEGRAM_BOT_TOKEN_FILE" ] || die "Telegram token file not found: $TELEGRAM_BOT_TOKEN_FILE"
  TELEGRAM_BOT_TOKEN="$(tr -d '[:space:]' < "$TELEGRAM_BOT_TOKEN_FILE")"
fi

CONFIGURE_TELEGRAM="${OPENCLAW_CONFIGURE_TELEGRAM:-}"
if [ -z "$CONFIGURE_TELEGRAM" ]; then
  [ -n "$TELEGRAM_BOT_TOKEN" ] && CONFIGURE_TELEGRAM="y"
fi
if [ -z "$CONFIGURE_TELEGRAM" ]; then
  ask CONFIGURE_TELEGRAM "Configure Telegram bot now? [y/N]:"
  CONFIGURE_TELEGRAM="${CONFIGURE_TELEGRAM:-N}"
fi

if [[ "$CONFIGURE_TELEGRAM" =~ ^[Yy]([Ee][Ss])?$ ]]; then
  if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    ask_secret TELEGRAM_BOT_TOKEN "Telegram bot token:"
  fi
  [ -n "$TELEGRAM_BOT_TOKEN" ] || die "Telegram bot token cannot be empty."

  TELEGRAM_GETME="$(telegram_api "$TELEGRAM_BOT_TOKEN" getMe)" || die "Telegram bot token did not validate with Telegram getMe."
  TELEGRAM_BOT_USERNAME="$(printf "%s" "$TELEGRAM_GETME" | json_get result.username || true)"
  TELEGRAM_BOT_FIRST_NAME="$(printf "%s" "$TELEGRAM_GETME" | json_get result.first_name || true)"
  TELEGRAM_BOT_ID="$(printf "%s" "$TELEGRAM_GETME" | json_get result.id || true)"
  ok "Telegram bot detected: @${TELEGRAM_BOT_USERNAME:-unknown} (${TELEGRAM_BOT_FIRST_NAME:-unnamed})"

  if [ -z "$TELEGRAM_ALLOWED_USERS" ]; then
    DETECTED_USER_ID="$(detect_telegram_user_id "$TELEGRAM_BOT_TOKEN" || true)"
    if [ -n "$DETECTED_USER_ID" ]; then
      TELEGRAM_ALLOWED_USERS="$DETECTED_USER_ID"
      ok "Detected Telegram user id: $TELEGRAM_ALLOWED_USERS"
    else
      warn "Could not detect a Telegram user id yet."
      echo "  Message your bot once, then paste your numeric Telegram user id."
      echo "  You can also get it from @userinfobot."
      ask TELEGRAM_ALLOWED_USERS "Telegram allowed user id:"
    fi
  fi
  [ -n "$TELEGRAM_ALLOWED_USERS" ] || die "Telegram allowed user id cannot be empty."
fi

BASE_NAME_SOURCE="${TELEGRAM_BOT_USERNAME:-${TELEGRAM_BOT_FIRST_NAME:-openclaw}}"
DERIVED_SLUG="$(printf "%s" "$BASE_NAME_SOURCE" | slugify)"
DERIVED_AGENT_NAME="${TELEGRAM_BOT_FIRST_NAME:-$(printf "%s" "$DERIVED_SLUG" | titleize_slug)}"

SPACE_NAME="${OPENCLAW_HF_SPACE_NAME:-}"
if [ -z "$SPACE_NAME" ]; then
  ask_default SPACE_NAME "$DERIVED_SLUG" "Space name"
fi
TARGET_SPACE="$HF_USER/$SPACE_NAME"

BUCKET_NAME="${OPENCLAW_HF_BUCKET_NAME:-}"
if [ -z "$BUCKET_NAME" ]; then
  ask_default BUCKET_NAME "${SPACE_NAME}-data" "Bucket name"
fi
TARGET_BUCKET="$HF_USER/$BUCKET_NAME"

if [ -z "$AGENT_NAME" ]; then
  ask_default AGENT_NAME "$DERIVED_AGENT_NAME" "Agent display name"
fi

GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"
GENERATED_GATEWAY_TOKEN=0
if [ -z "$GATEWAY_TOKEN" ]; then
  if [ -t 0 ]; then
    ask_secret GATEWAY_TOKEN "OpenClaw gateway token [leave blank to generate]:"
  fi
fi
if [ -z "$GATEWAY_TOKEN" ]; then
  GATEWAY_TOKEN="$(random_token)"
  GENERATED_GATEWAY_TOKEN=1
fi

echo
say "This will create or update:"
echo "  Space:  $TARGET_SPACE (private Docker Space)"
echo "  Bucket: $TARGET_BUCKET (private, state snapshots via bucket API)"
echo "  Agent:  $AGENT_NAME"
echo "  Model:  $DEFAULT_MODEL"
echo
CONFIRM="${OPENCLAW_BOOTSTRAP_CONFIRM:-}"
if [ -z "$CONFIRM" ]; then
  ask CONFIRM "Continue? [Y/n]:"
fi
CONFIRM="${CONFIRM:-Y}"
[[ "$CONFIRM" =~ ^[Yy]([Ee][Ss])?$ ]] || die "Canceled."

say "Creating private bucket..."
hf buckets create "$TARGET_BUCKET" --private --exist-ok >/dev/null
ok "Bucket ready: $TARGET_BUCKET"

say "Creating private Docker Space..."
hf repo create "$TARGET_SPACE" --repo-type space --space-sdk docker --private --exist-ok >/dev/null
ok "Space ready: $TARGET_SPACE"

say "Copying template Space files..."
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
hf download "$TEMPLATE_SPACE" --repo-type space --local-dir "$WORKDIR" >/dev/null
(
  cd "$WORKDIR"
  git init -q
  git checkout -B main >/dev/null 2>&1
  git add .
  if ! git diff --cached --quiet; then
    git -c user.name="OpenClaw HF bootstrap" \
      -c user.email="openclaw@example.invalid" \
      commit -m "feat: initialize OpenClaw Hugging Face Space" >/dev/null
  fi
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://huggingface.co/spaces/$TARGET_SPACE"
  fi
  git push -u origin main --force >/dev/null
)
ok "Template uploaded"

say "Setting Space variables..."
# State lives on local disk inside the Space; the bucket is the durable
# snapshot store reached through the bucket API, never mounted (live SQLite on
# a bucket mount corrupts).
hf spaces variables add "$TARGET_SPACE" \
  -e OPENCLAW_GATEWAY_PORT=7860 \
  -e OPENCLAW_HF_STATE_BUCKET="$TARGET_BUCKET" \
  -e OPENCLAW_DISABLE_BONJOUR=1 \
  -e OPENCLAW_TELEGRAM_DNS_RESULT_ORDER=ipv4first \
  -e OPENCLAW_TELEGRAM_CONNECTIVITY_PROBE=1 \
  -e NODE_OPTIONS=--dns-result-order=ipv4first \
  -e OPENCLAW_AGENT_NAME="$AGENT_NAME" \
  -e OPENCLAW_MODEL="$DEFAULT_MODEL" \
  -e OPENCLAW_MODEL_PROVIDER="$DEFAULT_MODEL_PROVIDER" \
  -e OPENCLAW_MODEL_BASE_URL="$DEFAULT_MODEL_BASE_URL" >/dev/null
ok "Variables set"

say "Setting Space secrets..."
hf spaces secrets add "$TARGET_SPACE" \
  -s OPENCLAW_GATEWAY_TOKEN="$GATEWAY_TOKEN" \
  -s HF_TOKEN="$HF_TOKEN_VAL" >/dev/null

if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  TELEGRAM_SECRET_ARGS=(
    -s TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" \
    -s TELEGRAM_ALLOWED_USERS="$TELEGRAM_ALLOWED_USERS"
  )
  if [ -n "$TELEGRAM_PROXY" ]; then
    TELEGRAM_SECRET_ARGS+=(-s TELEGRAM_PROXY="$TELEGRAM_PROXY")
  fi
  if [ -n "$TELEGRAM_API_ROOT" ]; then
    TELEGRAM_SECRET_ARGS+=(-s TELEGRAM_API_ROOT="$TELEGRAM_API_ROOT")
  fi
  hf spaces secrets add "$TARGET_SPACE" "${TELEGRAM_SECRET_ARGS[@]}" >/dev/null
fi
ok "Secrets set"

say "Restarting Space..."
hf spaces restart "$TARGET_SPACE" >/dev/null || warn "Restart failed or was unnecessary; Hugging Face may already be rebuilding."

cat <<EOF

${G}OpenClaw deployment created.${N}

  Space repo: https://huggingface.co/spaces/$TARGET_SPACE
  App URL:    https://${HF_USER}-${SPACE_NAME}.hf.space
  Bucket:     https://huggingface.co/buckets/$TARGET_BUCKET

Open the app URL after the Space finishes building and authenticate with your
OpenClaw gateway token.
EOF

if [ "$GENERATED_GATEWAY_TOKEN" = "1" ]; then
  cat <<EOF

Generated OpenClaw gateway token:
  $GATEWAY_TOKEN

Save this token now. Hugging Face will store it as a Space Secret, but the
bootstrap cannot read it back later.
EOF
fi

if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  cat <<EOF

Telegram is configured for allowed user id:
  $TELEGRAM_ALLOWED_USERS

Message your bot to start using OpenClaw.
EOF
  if [ -z "$TELEGRAM_PROXY" ] && [ -z "$TELEGRAM_API_ROOT" ]; then
    cat <<EOF

If the Space logs Telegram connectivity errors such as:
  [telegram-probe] curl getMe failed
  UND_ERR_CONNECT_TIMEOUT

keep the Space private and rerun this bootstrap with TELEGRAM_PROXY set to a
reachable HTTP/SOCKS proxy, or TELEGRAM_API_ROOT set to an operator-controlled
Telegram Bot API proxy root. Private Spaces cannot use Telegram webhooks,
because Telegram cannot authenticate to the private Hugging Face app URL.
EOF
  fi
fi
