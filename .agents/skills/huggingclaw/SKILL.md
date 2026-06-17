---
name: huggingclaw
description: Use when setting up, operating, migrating, repairing, or explaining an OpenClaw deployment on Hugging Face with the HuggingClaw `hclaw` CLI. Covers local gateway mode, fully hosted paid Space mode, private Storage Buckets, Telegram bot configuration, Docker context pinning, model selection through the Hugging Face Router, costs, diagnostics, and state safety.
---

# HuggingClaw

## Core Rule

Use the `hclaw` CLI as the source of truth. Do not hand-create Hugging Face
Spaces, buckets, secrets, or Docker containers unless debugging a failed
`hclaw` operation. Keep credentials local to the user's machine.

Default to local gateway mode unless the user explicitly wants a fully hosted
Space and accepts paid upgraded Space hardware.

## What HuggingClaw Creates

A HuggingClaw deployment has:

- a private Hugging Face Storage Bucket for durable OpenClaw state snapshots;
- a local deployment manifest under `~/.config/huggingclaw/deployments/`;
- local secrets under `~/.config/huggingclaw/secrets/`;
- either a local Docker gateway container or a private Hugging Face Docker Space;
- Hugging Face Router model configuration for OpenClaw inference.

The bucket is the durable state source. The live gateway is disposable. Do not
mount a bucket as the live OpenClaw database filesystem.

## Required Inputs

Collect or confirm:

- Hugging Face token access: `HF_TOKEN`, `HF_TOKEN_PATH`, `$HF_HOME/token`, or
  `hf auth login`.
- Telegram bot token from BotFather. Prefer `--telegram-token-file` over
  pasting raw tokens into shell history.
- Telegram allowed user ID.
- Gateway mode:
  - `local`: default, no paid Space hardware, requires Docker and an online
    user machine.
  - `space`: fully hosted, requires paid upgraded Space hardware for Telegram.
- Optional model override.
- Optional Docker context for local mode.
- Optional explicit owner, name, or bucket only when the user needs them.

If no `--name` is provided, HuggingClaw calls Telegram `getMe`, removes a
trailing `_bot` from the bot username, and derives the agent, bucket, and Space
names from that.

## Install And Run

With Node.js:

```bash
npx huggingclaw bootstrap
```

Without Node.js on macOS/Linux:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.sh)
```

On Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.ps1 | iex
```

For repo-local development, use:

```bash
npm install
npm run build
node dist/hclaw.mjs --help
```

## Recommended First Setup: Local Gateway

Use local gateway mode for the first working deployment. It avoids the paid
Space egress requirement because Telegram traffic originates from the user's
machine.

Interactive:

```bash
npx huggingclaw bootstrap --gateway local
```

Automation:

```bash
npx huggingclaw bootstrap \
  --gateway local \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890 \
  --yes
```

If the user has multiple Docker engines, pin the intended context:

```bash
npx huggingclaw bootstrap \
  --gateway local \
  --docker-context desktop-linux \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890 \
  --yes
```

Common Docker contexts on macOS are `desktop-linux`, `colima`, and `orbstack`.
After bootstrap, local gateway commands use the pinned context from the
manifest even if the shell's current Docker context changes.

## Fully Hosted Setup: Paid Space Gateway

Use Space gateway mode when the user wants Hugging Face to host the gateway
continuously and accepts the cost.

```bash
npx huggingclaw bootstrap \
  --gateway space \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890 \
  --hardware cpu-upgrade \
  --sleep-time -1 \
  --yes
```

Important:

- Free `cpu-basic` Spaces are not a supported target for Telegram/Discord
  connectivity.
- Telegram/Discord egress from free Spaces is intentionally blocked or
  unreliable because of anti-abuse filtering.
- Private Spaces use Telegram long polling, not webhooks.
- `--sleep-time -1` keeps paid hardware always on.
- `cpu-upgrade` is the default paid gateway tier. Verify current pricing before
  promising exact costs.

## Model Selection

The `--model` value is the OpenClaw model identifier. For Hugging Face Router
models, use the `huggingface/` prefix.

Default/recommended:

```bash
npx huggingclaw bootstrap \
  --model huggingface/google/gemma-4-26B-A4B-it
```

Known useful router-compatible choices from repo docs:

- `huggingface/google/gemma-4-26B-A4B-it`: default quality target.
- `huggingface/Qwen/Qwen3.6-35B-A3B`: stronger Qwen option with tool support.
- `huggingface/Qwen/Qwen3-8B`: cheaper small-model option.

Do not assume every Hub model is a router chat model. If exact current model
availability matters, check the Hugging Face Router catalog or run a direct
chat-completions probe. The repo docs note that Gemma 4 12B and many GGUF or
Unsloth repos were not shared-router chat models during prior testing.

Provider suffixes can be useful for supported router-listed models:

```text
huggingface/google/gemma-4-26B-A4B-it:deepinfra
huggingface/google/gemma-4-26B-A4B-it:cheapest
huggingface/Qwen/Qwen3.6-35B-A3B:deepinfra
```

## Operating A Deployment

Check status:

```bash
hclaw gateway status <agent>
```

Read logs:

```bash
hclaw gateway logs <agent>
```

Start or stop:

```bash
hclaw gateway stop <agent>
hclaw gateway start <agent>
```

Update Space source files without touching the bucket:

```bash
hclaw update <owner>/<space>
```

Diagnose and repair Space configuration:

```bash
hclaw doctor <owner>/<space>
hclaw doctor <owner>/<space> --fix
```

`doctor --fix` changes Space configuration only. It does not read secret values
back from Hugging Face and does not modify bucket contents.

## Migrating Gateway Location

Move from local to Space:

```bash
hclaw gateway migrate <agent> \
  --to space \
  --hardware cpu-upgrade \
  --sleep-time -1
```

Move from Space to local:

```bash
hclaw gateway migrate <agent> --to local
```

When migrating to local and choosing a Docker context:

```bash
hclaw gateway migrate <agent> --to local --docker-context desktop-linux
```

Migration should use bucket snapshot/restore handoff. Do not copy Docker
volumes manually between machines or Docker engines.

## Docker Context Rebind

Use rebind when a local deployment should move between Docker engines on the
same machine:

```bash
hclaw gateway rebind <agent> --docker-context desktop-linux
```

If the old Docker context is gone:

```bash
hclaw gateway rebind <agent> --docker-context desktop-linux --takeover
```

Use `--takeover` only when replacing an unavailable or failed old runtime is
intentional. It may use the latest bucket snapshot instead of a fresh final
snapshot from the old context.

## State And Bucket Safety

The state sync supervisor snapshots OpenClaw live state every 60 seconds and on
shutdown. Snapshots include consistent SQLite copies and workspace files, but
not secrets.

When changing buckets:

```bash
hclaw state adopt <agent> --bucket <owner>/<bucket> --yes
```

Before adopting or changing a bucket, make sure it is the intended durable
identity for the agent. HuggingClaw should refuse unrelated non-HuggingClaw
bucket contents.

## Troubleshooting Checklist

If Telegram does not respond:

1. Run `hclaw gateway status <agent>`.
2. Run `hclaw gateway logs <agent>`.
3. Confirm the Telegram token and allowed user ID are configured.
4. Confirm only one gateway is active for the bot.
5. If using Space mode, confirm paid upgraded hardware, not free `cpu-basic`.
6. If using local mode, confirm Docker is running and the pinned context exists.

If local commands report a missing container:

- Check whether the shell Docker context changed.
- Use `hclaw gateway status <agent>` to see the pinned context.
- Use `hclaw gateway rebind <agent> --docker-context <context>` to move the
  gateway intentionally.

If model calls fail:

- Confirm the model is an OpenAI-compatible chat model on the HF Router.
- Try the default `huggingface/google/gemma-4-26B-A4B-it`.
- Avoid assuming base checkpoints, GGUF repos, or Unsloth repos are router
  chat models.

If state seems missing after migration:

- Check logs for restore and snapshot messages.
- Confirm the manifest points at the expected bucket.
- Do not reset volumes until the bucket snapshot path has been inspected.
- Avoid running two gateways against the same Telegram bot and bucket.

## Cost Guidance

Explain costs plainly:

- Local gateway: no fixed Hugging Face Space cost; requires the user's machine
  to be online.
- Space gateway: paid upgraded Space hardware is required for Telegram/Discord
  connectivity today.
- Inference: billed through Hugging Face Inference Providers credits and
  provider token pricing.
- Storage Bucket: usually small for normal personal state snapshots, but large
  workspace files can increase storage usage.

Before quoting exact prices, verify current Hugging Face pricing and current
router model pricing. Repo docs may include dated estimates, not guarantees.

## Security Rules

- Do not ask users to paste Hugging Face credentials into a third-party Space.
- Prefer local execution of `hclaw`; credentials stay on the user's machine.
- Prefer `--telegram-token-file` over raw token flags when possible.
- Do not print or commit tokens, local secrets, generated gateway tokens, or
  `.env` files.
- Tell users generated OpenClaw gateway tokens are printed once and cannot be
  read back from write-only secret stores.

## Verification After Setup

After bootstrap or migration:

```bash
hclaw gateway status <agent>
hclaw gateway logs <agent>
```

Expected signs:

- local mode shows Docker context, container status, and a live lease;
- Space mode shows stage, hardware, and logs with restore or fresh-start
  outcome;
- Telegram bot replies only to the allowed user;
- logs show snapshots uploading after activity or shutdown.

For repo development changes, also run:

```bash
npm run build
npm run typecheck
npm test
npm run check:secrets
```
