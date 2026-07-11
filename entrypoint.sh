#!/usr/bin/env bash
set -euo pipefail

LIVE_DIR="${OPENCLAW_LIVE_DIR:-/home/node/.local/share/mlclaw/live}"
OPENCLAW_UID="${MLCLAW_OPENCLAW_UID:-1000}"
OPENCLAW_GID="${MLCLAW_OPENCLAW_GID:-1000}"
OPENCLAW_IDENTITY="${OPENCLAW_UID}:${OPENCLAW_GID}"
export MLCLAW_OPENCLAW_UID="$OPENCLAW_UID"
export MLCLAW_OPENCLAW_GID="$OPENCLAW_GID"
HF_BROKER_ENABLED=0
HF_BROKER_RUN_DIR="/run/mlclaw-hf-broker"
STATE_HF_TOKEN=""
RESTORED_PROTECTED_STATE_DIR="$LIVE_DIR/.mlclaw-protected"
PROTECTED_STATE_DIR="/var/lib/mlclaw-protected"
HF_BROKER_STATE_DIR="$PROTECTED_STATE_DIR/hf-broker"

prepare_hf_broker() {
  local broker_token="${MLCLAW_BROKER_HF_TOKEN:-${HF_TOKEN:-${HUGGINGFACE_HUB_TOKEN:-${MLCLAW_ROUTER_TOKEN:-${HF_ROUTER_TOKEN:-}}}}}"
  if [ -z "$broker_token" ]; then
    echo "[hf-broker] MLCLAW_BROKER_HF_TOKEN is not configured; broker disabled"
    return
  fi

  local token_file="$HF_BROKER_RUN_DIR/hf-token"
  local agent_secret_file="$HF_BROKER_RUN_DIR/agent-secret"
  local operator_secret_file="$HF_BROKER_RUN_DIR/operator-secret"
  local broker_agent_secrets="$HF_BROKER_RUN_DIR/agent-secrets.conf"
  local broker_operator_secrets="$HF_BROKER_RUN_DIR/operator-secrets.conf"
  local operator_brokers_file="$HF_BROKER_RUN_DIR/operator-brokers.json"
  local agent_secret operator_secret

  install -d -m 0750 -o root -g hf-broker "$HF_BROKER_RUN_DIR"
  agent_secret="$(od -An -N48 -tx1 /dev/urandom | tr -d ' \n')"
  operator_secret="$(od -An -N48 -tx1 /dev/urandom | tr -d ' \n')"
  printf '%s\n' "$broker_token" > "$token_file"
  printf '%s\n' "$agent_secret" > "$agent_secret_file"
  printf '%s\n' "$operator_secret" > "$operator_secret_file"
  printf 'default = %s\n' "$agent_secret" > "$broker_agent_secrets"
  printf 'mlclaw-control = %s\n' "$operator_secret" > "$broker_operator_secrets"
  printf '{"version":1,"brokers":[{"id":"hf-broker","label":"Hugging Face","url":"http://127.0.0.1:7864","token_file":"%s"}]}\n' "$operator_secret_file" > "$operator_brokers_file"
  chown hf-broker:hf-broker "$token_file" "$broker_agent_secrets" "$broker_operator_secrets"
  chmod 0600 "$token_file" "$agent_secret_file" "$operator_secret_file" "$broker_agent_secrets" "$broker_operator_secrets" "$operator_brokers_file"

  if [ -z "${MLCLAW_STATE_MOUNT_DIR:-}" ]; then
    STATE_HF_TOKEN="${MLCLAW_BROKER_HF_TOKEN:-${HF_TOKEN:-${HUGGINGFACE_HUB_TOKEN:-$broker_token}}}"
  fi

  export MLCLAW_HF_BROKER_URL="http://127.0.0.1:7863"
  export MLCLAW_HF_BROKER_AGENT_SECRET_FILE="$agent_secret_file"
  if [ "${MLCLAW_GATEWAY_LOCATION:-}" = "local" ]; then
    export MLCLAW_TRUSTED_HF_TOKEN_FILE="$token_file"
  fi
  if [ -z "${MLCLAW_OPERATOR_BROKERS_FILE:-}" ]; then
    export MLCLAW_OPERATOR_BROKERS_FILE="$operator_brokers_file"
  fi
  HF_BROKER_ENABLED=1
}

restore_protected_state() {
  install -d -m 0710 -o root -g hf-broker "$PROTECTED_STATE_DIR"
  if [ -d "$RESTORED_PROTECTED_STATE_DIR" ]; then
    find "$PROTECTED_STATE_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
    cp -a "$RESTORED_PROTECTED_STATE_DIR/." "$PROTECTED_STATE_DIR/"
    rm -rf "$RESTORED_PROTECTED_STATE_DIR"
  fi
  install -d -m 0700 -o root -g root "$PROTECTED_STATE_DIR/control"
  install -d -m 0700 -o hf-broker -g hf-broker "$HF_BROKER_STATE_DIR"
  chown -R root:root "$PROTECTED_STATE_DIR/control"
  chown -R hf-broker:hf-broker "$HF_BROKER_STATE_DIR"
  chmod 0710 "$PROTECTED_STATE_DIR"
  chmod 0700 "$PROTECTED_STATE_DIR/control" "$HF_BROKER_STATE_DIR"
}

start_hf_broker() {
  if [ "$HF_BROKER_ENABLED" != "1" ]; then
    return
  fi

  install -d -m 0700 -o hf-broker -g hf-broker "$HF_BROKER_STATE_DIR"
  install -d -m 0700 -o hf-broker -g hf-broker "$HF_BROKER_STATE_DIR/grants"
  if [ ! -e "$HF_BROKER_STATE_DIR/grants/grants.json" ]; then
    printf '{"grants":[]}\n' > "$HF_BROKER_STATE_DIR/grants/grants.json"
    chown hf-broker:hf-broker "$HF_BROKER_STATE_DIR/grants/grants.json"
    chmod 0600 "$HF_BROKER_STATE_DIR/grants/grants.json"
  fi
  chown -R hf-broker:hf-broker "$HF_BROKER_STATE_DIR"
  chmod 0700 "$HF_BROKER_STATE_DIR"

  HF_BROKER_HF_TOKEN_FILE="$HF_BROKER_RUN_DIR/hf-token" \
  HF_BROKER_SECRETS_FILE="$HF_BROKER_RUN_DIR/agent-secrets.conf" \
  HF_BROKER_OPERATOR_SECRETS_FILE="$HF_BROKER_RUN_DIR/operator-secrets.conf" \
  HF_BROKER_BIND_ADDR=127.0.0.1 \
  HF_BROKER_PORT=7863 \
  HF_BROKER_OPERATOR_BIND_ADDR=127.0.0.1 \
  HF_BROKER_OPERATOR_PORT=7864 \
  HF_BROKER_SCOPE_FILE=/app/hf-broker.scope.json \
  HF_BROKER_STATE_DIR="$HF_BROKER_STATE_DIR" \
  gosu hf-broker:hf-broker /usr/local/bin/hf-broker &
  HF_BROKER_PID=$!

  for _ in $(seq 1 50); do
    if ! kill -0 "$HF_BROKER_PID" 2>/dev/null; then
      echo "[hf-broker] process exited during startup" >&2
      wait "$HF_BROKER_PID"
      return 1
    fi
    if node -e "fetch('http://127.0.0.1:7863/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
      echo "[hf-broker] agent and operator listeners ready"
      return
    fi
    sleep 0.1
  done
  echo "[hf-broker] startup timed out" >&2
  kill "$HF_BROKER_PID" 2>/dev/null || true
  return 1
}

chown_openclaw_live() {
  chown "$OPENCLAW_IDENTITY" "$LIVE_DIR"
  find "$LIVE_DIR" -mindepth 1 -maxdepth 1 ! -name .mlclaw-protected -exec chown -R "$OPENCLAW_IDENTITY" {} +
}

if [ "${MLCLAW_GATEWAY_DISABLED:-0}" = "1" ]; then
  echo "[mlclaw] gateway disabled"
  exit 0
fi

prepare_hf_broker
export MLCLAW_PROTECTED_STATE_DIR="$PROTECTED_STATE_DIR"
export MLCLAW_OPENAI_CREDENTIAL_STORE_FILE="$PROTECTED_STATE_DIR/control/openai-api-key.enc"
# The broad token and legacy Router token must not enter the control plane or
# OpenClaw. The token is already in the broker-owned runtime file before the
# environment is scrubbed; local bucket state sync receives a dedicated copy
# only around trusted restore and supervisor execution.
unset MLCLAW_BROKER_HF_TOKEN MLCLAW_ROUTER_TOKEN HF_ROUTER_TOKEN HF_TOKEN HUGGINGFACE_HUB_TOKEN

# State, workspace, and config paths are ALWAYS derived from the live dir,
# never inherited: older deployments set OPENCLAW_STATE_DIR=/data/... as Space
# variables, and any state written outside the live dir would be invisible to
# snapshot/restore — the bucket would back up an empty tree.
export OPENCLAW_STATE_DIR="$LIVE_DIR/.openclaw"
export OPENCLAW_WORKSPACE_DIR="$LIVE_DIR/workspace"
export OPENCLAW_CONFIG_PATH="$LIVE_DIR/.openclaw/openclaw.json"
export OPENCLAW_GATEWAY_PORT="${MLCLAW_OPENCLAW_PORT:-7861}"
STATE_DIR="$OPENCLAW_STATE_DIR"
WORKSPACE_DIR="$OPENCLAW_WORKSPACE_DIR"
CONFIG_PATH="$OPENCLAW_CONFIG_PATH"

# Restore durable state from the bucket BEFORE creating any live dirs: the
# restore target is the live dir itself and must not exist yet. Fails the boot
# if the bucket has state but its manifest or every snapshot is corrupt (never
# silently start fresh then snapshot over a bucket that still holds data).
echo "[hf-state-sync] starting restore"
RESTORE_TIMEOUT_SECONDS="${MLCLAW_RESTORE_TIMEOUT_SECONDS:-180}"
node /app/hf-state-sync.js prepare-restore
if command -v timeout >/dev/null 2>&1; then
  env MLCLAW_STATE_HF_TOKEN="$STATE_HF_TOKEN" timeout "${RESTORE_TIMEOUT_SECONDS}s" gosu "$OPENCLAW_IDENTITY" node /app/hf-state-sync.js restore
else
  env MLCLAW_STATE_HF_TOKEN="$STATE_HF_TOKEN" gosu "$OPENCLAW_IDENTITY" node /app/hf-state-sync.js restore
fi
echo "[hf-state-sync] restore complete"
restore_protected_state

if [ -n "${MLCLAW_STATE_MOUNT_DIR:-}" ]; then
  chown root:root "$MLCLAW_STATE_MOUNT_DIR"
  chmod 0700 "$MLCLAW_STATE_MOUNT_DIR"
fi

mkdir -p "$LIVE_DIR" "$WORKSPACE_DIR" "$STATE_DIR"
chown_openclaw_live
install -d -m 0710 -o root -g hf-broker "$PROTECTED_STATE_DIR"
install -d -m 0700 -o root -g root "$PROTECTED_STATE_DIR/control"
start_hf_broker

if [ -n "${OPENCLAW_AGENT_NAME:-}" ]; then
  printf "%s\n" "$OPENCLAW_AGENT_NAME" > "$STATE_DIR/agent-name.txt"
fi

if [ ! -f "$CONFIG_PATH" ]; then
  cp /app/openclaw.default.json "$CONFIG_PATH"
fi
chown_openclaw_live

# Let OpenClaw create its native workspace files. The ML Claw runtime waits for
# native onboarding to finish before adding workspace tooling; OpenClaw treats
# any preinstalled workspace skills as evidence that onboarding already ran.
echo "[openclaw-setup] initializing baseline workspace"
env \
  -u MLCLAW_CREDENTIAL_KEY \
  -u MLCLAW_SESSION_SECRET \
  -u SESSION_SECRET \
  -u OAUTH_CLIENT_SECRET \
  -u HF_TOKEN \
  -u HUGGINGFACE_HUB_TOKEN \
  HOME=/home/node USER=node LOGNAME=node \
  gosu "$OPENCLAW_IDENTITY" node /app/openclaw.mjs setup --baseline --workspace "$WORKSPACE_DIR"
echo "[openclaw-setup] baseline workspace ready"

if [ -n "${OPENCLAW_MODEL:-}" ]; then
  echo "[huggingface-config] configuring selected Hugging Face model"
  gosu "$OPENCLAW_IDENTITY" node /app/scripts/configure-huggingface-model.mjs "$CONFIG_PATH"
  echo "[huggingface-config] Hugging Face model configured"
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_ALLOWED_USERS:-}" ]; then
  echo "[telegram-config] configuring Telegram channel"
  gosu "$OPENCLAW_IDENTITY" node /app/scripts/configure-telegram.mjs "$CONFIG_PATH" "$TELEGRAM_ALLOWED_USERS"
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
      gosu "$OPENCLAW_IDENTITY" node /app/scripts/report-telegram-probe.mjs "$PROBE_OUT" || true
    else
      echo "[telegram-probe] curl getMe failed"
    fi
    rm -f "$PROBE_OUT"
  else
    echo "[telegram-probe] curl is unavailable; skipping"
  fi
fi

chown_openclaw_live
# The wrapper remains the trusted root supervisor so its OAuth credentials and
# process environment are not readable by the unprivileged OpenClaw child. The
# state supervisor stages live files in a separate secret-free node process;
# only the trusted parent uploads the resulting archive.
if [ -n "$STATE_HF_TOKEN" ]; then
  export MLCLAW_STATE_HF_TOKEN="$STATE_HF_TOKEN"
fi
exec node /app/hf-state-sync.js supervise -- node /app/mlclaw-space-runtime.js
