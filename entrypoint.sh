#!/usr/bin/env bash
set -euo pipefail

LIVE_DIR="${OPENCLAW_LIVE_DIR:-/tmp/openclaw-live}"

if [ "${HUGGINGCLAW_GATEWAY_DISABLED:-0}" = "1" ]; then
  echo "[huggingclaw] gateway disabled"
  exit 0
fi

if [ -z "${HUGGINGFACE_HUB_TOKEN:-}" ] && [ -n "${HF_TOKEN:-}" ]; then
  export HUGGINGFACE_HUB_TOKEN="$HF_TOKEN"
fi

# State, workspace, and config paths are ALWAYS derived from the live dir,
# never inherited: older deployments set OPENCLAW_STATE_DIR=/data/... as Space
# variables, and any state written outside the live dir would be invisible to
# snapshot/restore — the bucket would back up an empty tree.
export OPENCLAW_STATE_DIR="$LIVE_DIR/.openclaw"
export OPENCLAW_WORKSPACE_DIR="$LIVE_DIR/workspace"
export OPENCLAW_CONFIG_PATH="$LIVE_DIR/.openclaw/openclaw.json"
STATE_DIR="$OPENCLAW_STATE_DIR"
WORKSPACE_DIR="$OPENCLAW_WORKSPACE_DIR"
CONFIG_PATH="$OPENCLAW_CONFIG_PATH"

# Restore durable state from the bucket BEFORE creating any live dirs: the
# restore target is the live dir itself and must not exist yet. Fails the boot
# if the bucket has state but its manifest or every snapshot is corrupt (never
# silently start fresh then snapshot over a bucket that still holds data).
node /app/hf-state-sync.js restore

mkdir -p "$LIVE_DIR" "$WORKSPACE_DIR" "$STATE_DIR"
chown -R node:node "$LIVE_DIR"

if [ -n "${OPENCLAW_AGENT_NAME:-}" ]; then
  printf "%s\n" "$OPENCLAW_AGENT_NAME" > "$STATE_DIR/agent-name.txt"
fi

if [ ! -f "$CONFIG_PATH" ]; then
  cp /app/openclaw.default.json "$CONFIG_PATH"
fi
chown -R node:node "$LIVE_DIR"

if [ -n "${OPENCLAW_MODEL:-}" ]; then
  echo "[huggingface-config] configuring selected Hugging Face model"
  gosu node node /app/scripts/configure-huggingface-model.mjs "$CONFIG_PATH"
  echo "[huggingface-config] Hugging Face model configured"
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_ALLOWED_USERS:-}" ]; then
  echo "[telegram-config] configuring Telegram channel"
  gosu node node /app/scripts/configure-telegram.mjs "$CONFIG_PATH" "$TELEGRAM_ALLOWED_USERS"
  echo "[telegram-config] Telegram channel configured"
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ "${OPENCLAW_TELEGRAM_CONNECTIVITY_PROBE:-0}" = "1" ]; then
  if command -v curl >/dev/null 2>&1; then
    PROBE_OUT="/tmp/openclaw-telegram-probe.json"
    PROBE_PROXY=()
    PROBE_API_ROOT="${TELEGRAM_API_ROOT:-https://api.telegram.org}"
    PROBE_API_ROOT="${PROBE_API_ROOT%/}"
    if [ -n "${TELEGRAM_PROXY:-}" ]; then
      PROBE_PROXY=(--proxy "$TELEGRAM_PROXY")
    fi
    if curl -fsS --connect-timeout 20 --max-time 30 "${PROBE_PROXY[@]}" \
      "${PROBE_API_ROOT}/bot${TELEGRAM_BOT_TOKEN}/getMe" \
      -o "$PROBE_OUT"; then
      gosu node node /app/scripts/report-telegram-probe.mjs "$PROBE_OUT" || true
    else
      echo "[telegram-probe] curl getMe failed"
    fi
    rm -f "$PROBE_OUT"
  else
    echo "[telegram-probe] curl is unavailable; skipping"
  fi
fi

chown -R node:node "$LIVE_DIR"
exec gosu node node /app/hf-state-sync.js supervise -- openclaw gateway
