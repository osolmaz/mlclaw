---
name: mlclaw
description: Use when setting up, operating, migrating, repairing, or explaining an OpenClaw deployment on Hugging Face with the ML Claw `mlclaw` CLI. Covers the browser Space gateway, Hugging Face OAuth, local gateway mode, private Storage Buckets, Telegram as an optional connector, Docker context pinning, model selection through the Hugging Face Router, OpenAI API key setup, costs, diagnostics, and state safety.
---

# ML Claw

## Core Rule

Use the `mlclaw` CLI as the source of truth. Do not hand-create Hugging Face
Spaces, buckets, secrets, or Docker containers unless debugging a failed
`mlclaw` operation. Keep credentials local to the user's machine.

Default to the browser Space gateway unless the user explicitly asks for local
gateway mode.

## What ML Claw Creates

An ML Claw deployment has:

- a private Hugging Face Storage Bucket for durable OpenClaw state snapshots;
- a private Hugging Face Docker Space for the default browser gateway;
- Hugging Face OAuth enabled on the Space;
- a local deployment manifest under `~/.config/mlclaw/deployments/`;
- local secrets under `~/.config/mlclaw/secrets/`;
- optional local Docker gateway mode for users who want the gateway on their
  own machine;
- Hugging Face Router model configuration for OpenClaw inference.

The bucket is the durable state source. The live gateway is disposable. Do not
mount a bucket as the live OpenClaw database filesystem.

## Required Inputs

Collect or confirm:

- Hugging Face token access: `HF_TOKEN`, `HF_TOKEN_PATH`, `$HF_HOME/token`, or
  `hf auth login`.
- Agent name, unless a Telegram bot token is supplied and the user wants the
  name derived from the bot username.
- Gateway mode:
  - `space`: default browser gateway, private Space, HF OAuth protected.
  - `local`: Docker gateway on the user's machine.
- Optional model override.
- Optional Docker context for local mode.
- Optional Telegram bot token and allowed user ID.
- Optional explicit owner, name, or bucket only when the user needs them.

If a Telegram token is provided, ML Claw calls Telegram `getMe`, removes a
trailing `_bot` from the bot username, and can derive the agent, bucket, and
Space names from that.

## Install And Run

With Node.js:

```bash
npx mlclaw bootstrap --name mlclaw
```

Without Node.js on macOS/Linux:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.sh) --name mlclaw
```

On Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.ps1 | iex
```

For repo-local development, use:

```bash
npm install
npm run build
node dist/mlclaw.mjs --help
```

## Recommended First Setup: Browser Space Gateway

Interactive:

```bash
npx mlclaw bootstrap --name mlclaw
```

Automation:

```bash
npx mlclaw bootstrap \
  --name mlclaw \
  --model huggingface/google/gemma-4-26B-A4B-it \
  --yes
```

After the Space builds, open it in the browser and sign in with the user's
Hugging Face account. The Space server proxies authenticated browser traffic to
OpenClaw on loopback using trusted-proxy auth. Do not ask the user for an
OpenClaw gateway token for the browser Space path.

Create a public Space only when the user explicitly asks for a public demo or
template-style deployment:

```bash
npx mlclaw bootstrap --name mlclaw --public-space
```

## Optional Telegram

Telegram is optional and should not be required for the default setup.

```bash
npx mlclaw bootstrap \
  --telegram-token-file ~/secrets/mlclaw_bot.env \
  --telegram-user-id 1234567890 \
  --hardware cpu-upgrade \
  --sleep-time -1
```

Free Hugging Face Spaces intentionally block outbound TLS to some messaging
APIs for anti-abuse reasons. Telegram/Discord connectivity from a Space
requires upgraded paid Space hardware today. Local gateway mode avoids that
restriction because messaging traffic originates from the user's machine.

## Local Gateway Mode

Use local gateway mode when the user wants the gateway on their machine:

```bash
npx mlclaw bootstrap --gateway local --name mlclaw
```

If the user has multiple Docker engines, pin the intended context:

```bash
npx mlclaw bootstrap \
  --gateway local \
  --name mlclaw \
  --docker-context desktop-linux
```

Common Docker contexts on macOS are `desktop-linux`, `colima`, and `orbstack`.
After bootstrap, local gateway commands use the pinned context from the
manifest even if the shell's current Docker context changes.

## Model Selection

The `--model` value is the OpenClaw model identifier. For Hugging Face Router
models, use the `huggingface/` prefix.

Default/recommended:

```bash
npx mlclaw bootstrap \
  --name mlclaw \
  --model huggingface/google/gemma-4-26B-A4B-it
```

Known useful router-compatible choices:

- `huggingface/google/gemma-4-26B-A4B-it`: default quality target.
- `huggingface/Qwen/Qwen3.6-35B-A3B`: stronger Qwen option with tool support.
- `huggingface/Qwen/Qwen3-8B`: cheaper small-model option.

Do not assume every Hub model is a Router chat model. If exact current model
availability matters, check the Hugging Face Router catalog or run a direct
chat-completions probe.

## Operating A Deployment

Check status:

```bash
mlclaw gateway status <agent>
mlclaw doctor <owner/space>
```

Update a Space:

```bash
mlclaw update <owner/space>
mlclaw doctor <owner/space> --fix
```

Move gateway location without losing state:

```bash
mlclaw gateway migrate <agent> --to local
mlclaw gateway migrate <agent> --to space
```

Local gateway lifecycle:

```bash
mlclaw gateway logs <agent>
mlclaw gateway stop <agent>
mlclaw gateway start <agent>
```

## OpenAI Credentials

After signing into the Space, use the ML Claw control UI:

- `/mlclaw/settings` changes the Space `OPENCLAW_MODEL`.
- `/mlclaw/status` shows runtime, bucket, model, and OAuth status.
- `/mlclaw/credentials` stores an OpenAI API key.

The OpenAI key is stored as a Hugging Face Space Secret when possible and as a
0600 runtime file for immediate use. The key must never be logged or returned
to the browser.

## State Safety

OpenClaw uses local disk. The bucket stores verified snapshots only. On boot,
the runtime restores the newest valid snapshot. During runtime and shutdown,
`hf-state-sync` uploads new snapshots. Secrets are kept outside the snapshot
path.
