# OpenClaw Hugging Face Deployment Template: Implementation Plan

## Decision

Create a generic Hugging Face Docker Space template under:

```text
osolmaz/openclaw-huggingface
```

The template is not Telegram-specific. It runs a fully Hugging Face-hosted OpenClaw gateway/control UI, with Telegram as the first optional happy-path channel.

Create a Merve-style local bootstrap repo under:

```text
osolmaz/openclaw-bootstrap
```

The bootstrap script is the primary UX. It creates a private Space, creates a private bucket, mounts the bucket at `/data`, sets Space secrets, and starts the deployed OpenClaw runtime.

## Maintained Resources

Maintained by us:

```text
1 public HF Space template:
  osolmaz/openclaw-huggingface
1 public HF bootstrap repo:
  osolmaz/openclaw-bootstrap
```

Created per user:

```text
1 private HF Space
1 private HF Storage Bucket mounted read-write at /data
```

## Repository Contents

```text
README.md
Dockerfile
entrypoint.sh
openclaw.default.json
deploy-hf-openclaw.sh
scripts/
  configure-telegram.mjs
```

Bootstrap repo:

```text
README.md
bootstrap.sh
docs/
  openclaw-huggingface-implementation-plan.md
```

## Runtime Contract

The Space runs OpenClaw from the official image:

```text
ghcr.io/openclaw/openclaw:latest
```

It exposes the Hugging Face Space port:

```text
OPENCLAW_GATEWAY_PORT=7860
```

Persistent state lives under:

```text
OPENCLAW_STATE_DIR=/data/.openclaw
OPENCLAW_WORKSPACE_DIR=/data/workspace
OPENCLAW_CONFIG_PATH=/data/.openclaw/openclaw.json
```

Secrets live in Hugging Face Space Secrets:

```text
OPENCLAW_GATEWAY_TOKEN
HF_TOKEN
TELEGRAM_BOT_TOKEN
TELEGRAM_ALLOWED_USERS
TELEGRAM_PROXY
TELEGRAM_API_ROOT
```

Default model config uses Hugging Face Inference Providers, not a dedicated paid Inference Endpoint:

```text
provider: huggingface
base_url: https://router.huggingface.co/v1
model: huggingface/Qwen/Qwen3-8B
```

Inference Endpoints remain a later/pro option for users who explicitly want dedicated model infrastructure.

## Bootstrap Naming Flow

If the user configures Telegram, the bootstrap should derive sensible defaults from the bot token:

1. Prompt for `TELEGRAM_BOT_TOKEN`.
2. Call Telegram Bot API `getMe`.
3. Validate the token and display the detected bot.
4. Derive a base slug from the bot username by removing a trailing `_bot`, `-bot`, or `bot`.
5. Fallback to the bot `first_name` if no username exists.
6. Prompt with editable defaults.

Example:

```text
Telegram bot detected: @bob_research_bot (Bob Research)

Agent display name [Bob Research]:
Space name [bob-research]:
Bucket name [bob-research-data]:
Telegram allowed user id:
```

Normalization rules:

```text
@bob_research_bot -> bob-research
Bob Research      -> bob-research
bobbot            -> bob
```

Names remain configurable through prompts and environment overrides:

```bash
OPENCLAW_HF_SPACE_NAME=bob-research
OPENCLAW_HF_BUCKET_NAME=bob-research-data
OPENCLAW_AGENT_NAME="Bob Research"
```

## First-Boot Behavior

`entrypoint.sh`:

1. Creates `/data/.openclaw`, `/data/workspace`, and `/data/backups`.
2. Copies `openclaw.default.json` to `/data/.openclaw/openclaw.json` only if no config exists.
3. If Telegram secrets are present, enables Telegram in config and inserts the allowlist.
4. Starts `openclaw gateway`.

Existing user config is never overwritten.

## User Flows

### Secure default: local bootstrap

1. User runs `hf auth login`.
2. User runs the bootstrap one-liner from `osolmaz/openclaw-bootstrap`.
3. Script asks for optional Telegram bot token.
4. If Telegram is configured, script calls `getMe` and suggests agent, Space, and bucket names.
5. Script creates a private Space under the user's HF account.
6. Script creates a private bucket and mounts it at `/data`.
7. Script sets Space variables and secrets.
8. Space builds and starts.
9. User opens Control UI or messages the configured Telegram bot.

### Secondary path: duplicate in Hugging Face UI

1. User opens the public template Space.
2. User clicks **Duplicate this Space**.
3. User makes the duplicated Space private.
4. User adds persistent storage or a bucket mount.
5. User enters Space Secrets.
6. Space builds and starts.

The local bootstrap is preferred because it avoids a hosted launcher that asks for Hugging Face credentials while still automating the private Space/bucket setup.

## Security Defaults

- No credentials in git.
- No credentials in `/data` by default.
- Private duplicated Spaces for real use.
- Gateway auth required via `OPENCLAW_GATEWAY_TOKEN`.
- Telegram uses `dmPolicy: "allowlist"` when configured by the helper.
- Telegram long polling works with private Spaces because the runtime connects outbound.
- Telegram webhook mode is intentionally not the default for private Spaces. Telegram cannot deliver webhook requests to a private Hugging Face Space because unauthenticated requests do not reach the app.
- Some Hugging Face Space runtimes cannot reliably reach `api.telegram.org` directly. In that case, keep the private Space and configure `TELEGRAM_PROXY` or an operator-controlled `TELEGRAM_API_ROOT` instead of making the Space public.
- Bootstrap reads the HF token with `hf auth token`, not Python `huggingface_hub` imports.
- Bootstrap never prints secret values.

## Open Questions To Validate

1. Confirm the exact OpenClaw config schema for `gateway.auth.token` with `${OPENCLAW_GATEWAY_TOKEN}` substitution.
2. Confirm the official Docker image contains the `openclaw` CLI on PATH for `openclaw gateway`.
3. Confirm bucket mounts via `hf spaces volumes set <space> -v hf://buckets/<bucket>:/data` work reliably for private buckets.
4. Confirm `hf spaces variables add` and `hf spaces secrets add` command syntax against the installed CLI version before publishing the launcher.
5. Decide whether to pin `ghcr.io/openclaw/openclaw:<version>` instead of `latest` for reproducible template builds.
6. Confirm the OpenClaw config field for agent display name before wiring `OPENCLAW_AGENT_NAME` into runtime config.

## Next Implementation Steps

1. Implement/finish `osolmaz/openclaw-bootstrap/bootstrap.sh`.
2. Make bootstrap prompts derive defaults from Telegram `getMe`.
3. Create a private test Space and private test bucket from the bootstrap.
4. Mount the bucket at `/data`.
5. Set `OPENCLAW_GATEWAY_TOKEN`, `HF_TOKEN`, and Telegram secrets.
6. Configure default model as `huggingface/Qwen/Qwen3-8B` through HF Inference Providers.
7. Verify:
   - Build succeeds.
   - `/health` returns healthy.
   - Control UI accepts the gateway token.
   - `/data/.openclaw/openclaw.json` persists across restart.
   - Bot-derived names are correct for examples like `@bob_research_bot`.
   - Telegram DM from allowed user reaches OpenClaw.
   - Telegram DM from non-allowed user is rejected.
8. If the private Space logs Telegram `UND_ERR_CONNECT_TIMEOUT`, rerun with `TELEGRAM_PROXY` or `TELEGRAM_API_ROOT` and re-run the Telegram DM verification.
9. Iterate on config/schema issues.
10. Freeze a tested image tag.
11. Update README with the exact working bootstrap command and troubleshooting notes.
