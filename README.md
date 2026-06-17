<p align="center">
  <img src="https://raw.githubusercontent.com/osolmaz/huggingclaw/main/assets/huggingclaw.svg" alt="Hugging Claw" width="180">
</p>

# Hugging Claw

Your own private [OpenClaw](https://openclaw.ai) agent, backed by your Hugging
Face account — and it never forgets.

One command creates a private Storage Bucket that keeps the agent's memory, then
runs the gateway either on your machine or in a private Hugging Face Space. The
gateway is disposable: rebuild it, restart it, move it between local and Space,
and the agent comes back with its memory intact.

## Install

With Node.js:

```bash
npx huggingclaw bootstrap
```

Without Node.js — the launcher fetches a pinned Node runtime into your user
cache, then runs the same package:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.sh)
```

On Windows:

```powershell
irm https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.ps1 | iex
```

Everything runs on your machine with your own credentials — you never paste a
Hugging Face token into someone else's app.

You need:

- A Hugging Face account, with a token from `HF_TOKEN`, `HF_TOKEN_PATH`,
  `$HF_HOME/token`, or `hf auth login`.
- A Telegram bot token from [BotFather](https://t.me/botfather). Paste it when
  prompted; Hugging Claw calls Telegram `getMe`, removes a trailing `_bot` from
  the username, and names the Space and bucket after the bot.

For automation, pass the same answers as flags:

```bash
npx huggingclaw bootstrap \
  --gateway local \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890 \
  --yes
```

Choose a different Hugging Face Router model with `--model`:

```bash
npx huggingclaw bootstrap \
  --model huggingface/Qwen/Qwen3.6-35B-A3B
```

Recommended router-compatible options:

- `huggingface/google/gemma-4-26B-A4B-it`: default quality target.
- `huggingface/Qwen/Qwen3.6-35B-A3B`: stronger Qwen option with tool support.
- `huggingface/Qwen/Qwen3-8B`: cheaper small-model option.

For a fully hosted Space gateway:

```bash
npx huggingclaw bootstrap \
  --gateway space \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890 \
  --hardware cpu-upgrade \
  --sleep-time -1 \
  --yes
```

The install creates a private Storage Bucket and a local deployment manifest.
With `--gateway local`, it starts a Docker container on your machine. With
`--gateway space`, it creates a private Docker Space and sets the Space
variables and write-only secrets that connect it. If it generates an OpenClaw
gateway token, it prints that token **once** — save it; secret stores are
write-only, so it cannot be read back later.

## Gateway location

Gateway location decides where the live OpenClaw gateway runs:

- **local:** runs on your machine. This is the default, avoids paid Space
  hardware for Telegram/Discord, and requires Docker plus an online machine.
- **space:** runs in a private Hugging Face Space. This is fully hosted, but
  Telegram/Discord currently require paid upgraded Space hardware.

Move the gateway without losing bucket-backed state:

```bash
hclaw gateway migrate research --to space --hardware cpu-upgrade --sleep-time -1
hclaw gateway migrate research --to local
```

Useful local operations:

```bash
hclaw gateway status research
hclaw gateway logs research
hclaw gateway stop research
hclaw gateway start research
```

Local Docker deployments are pinned to the Docker context used at bootstrap
time. If your machine has Docker Desktop, Colima, or OrbStack, choose the
target explicitly:

```bash
hclaw bootstrap --gateway local --docker-context desktop-linux
hclaw gateway rebind research --docker-context desktop-linux
```

`rebind` moves the local gateway through the bucket snapshot/restore path. It
does not copy Docker volumes between engines.

## Keep it healthy

Update a Space gateway to the current Hugging Claw source (its bucket — the
memory — is never touched):

```bash
hclaw update your-hf-username/research-agent
```

Check a deployment, and apply safe configuration repairs:

```bash
hclaw doctor your-hf-username/research-agent
hclaw doctor your-hf-username/research-agent --fix
```

`doctor --fix` only changes Space configuration. It never reads secret values
and never modifies bucket contents.

## How the agent keeps its memory

The agent runs against the Space's local disk; the bucket is never mounted
(live databases on network mounts corrupt). Instead, every 60 seconds and on
shutdown, the supervisor takes a verified snapshot — consistent SQLite copies,
integrity-checked, compressed — and uploads it to the bucket. On every boot,
the newest verified snapshot is restored; a corrupt snapshot is skipped in
favor of an older one. Secrets are never included in snapshots.

So the gateway is cattle, the bucket is the brain. Deleting the local container
or Space and starting again with the same bucket brings the same agent back.

## What it costs

Honest numbers, since "deploy your own agent" tends to hide them:

- **Gateway hardware:** local gateway mode has no fixed paid Space cost. Space
  gateway mode currently requires upgraded paid Space hardware for
  Telegram/Discord. The cheapest paid CPU tier is enough for the gateway.
- **Inference:** requests use your Hugging Face Inference Providers credits
  ($0.10/month on free accounts, $2.00 with PRO), then pay-as-you-go at
  provider rates. The default model is
  `huggingface/google/gemma-4-26B-A4B-it`; choose a cheaper router-compatible
  model if message volume matters more than quality.

## Telegram notes

- Private Spaces use long polling, not webhooks — Telegram cannot reach a
  private Space URL, and that is fine.
- Fully hosted Space gateway deployments currently require upgraded paid Space
  hardware.
- Local gateway deployments avoid that Space egress restriction because
  Telegram traffic originates from your machine.
- Keep the Space private.

## Space hardware

If you choose `--gateway space`, use upgraded Space hardware. Free `cpu-basic`
Spaces are not expected to keep Telegram connections working. The cheapest paid
CPU tier is enough for the gateway:

```bash
hclaw settings your-hf-username/research-agent --hardware cpu-upgrade --sleep-time -1
```

Hugging Claw warns before requesting paid hardware. In automation, pass `--yes`
to confirm the cost prompt.

Hugging Face uses `--sleep-time -1` to keep upgraded hardware always on. The
equivalent API call is `POST /api/spaces/{owner}/{space}/hardware` with:

```json
{
  "flavor": "cpu-upgrade",
  "sleepTimeSeconds": -1
}
```

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
npm run check:secrets
```

The notable internals: `src/hclaw/` (the CLI), `src/hf-state-sync/` (snapshot
and restore supervisor that runs inside the Space), `src/hf-bucket-client/`
(a TypeScript Storage Bucket client), and `src/vendor/hfjs-xet/` (the Xet
upload path from `huggingface.js`, vendored until bucket support is exported
upstream).

## License

[MIT](LICENSE)
