<p align="center">
  <img src="assets/huggingclaw.svg" alt="Hugging Claw" width="180">
</p>

# Hugging Claw

Your own private [OpenClaw](https://openclaw.ai) agent, hosted entirely in your
Hugging Face account — and it never forgets.

One command creates a private Space that runs the agent and a private Storage
Bucket that keeps its memory. The Space is disposable: rebuild it, restart it,
or break it, and the agent comes back with its memory intact. Message it on
Telegram a few minutes after installing.

## Install

With Node.js:

```bash
npx huggingclaw
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
- Optional: a Telegram bot token from [BotFather](https://t.me/botfather). Pass
  it and Hugging Claw names the agent after your bot:

```bash
npx huggingclaw bootstrap \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890
```

The install creates a private Docker Space, a private Storage Bucket, and the
Space variables and write-only secrets that connect them. If it generates an
OpenClaw gateway token, it prints that token **once** — save it; Hugging Face
secrets are write-only, so it cannot be read back later.

## Keep it healthy

Update a deployment to the current Hugging Claw source (its bucket — the
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

So the Space is cattle, the bucket is the brain. Deleting the Space and
bootstrapping again with the same bucket brings the same agent back.

## What it costs

Honest numbers, since "deploy your own agent" tends to hide them:

- **Space hardware:** free CPU Spaces sleep and may block bot-platform egress
  (Telegram, Discord). For an always-on agent, use paid hardware — the
  cheapest tier works.
- **Inference:** requests use your Hugging Face Inference Providers credits
  ($0.10/month on free accounts, $2.00 with PRO), then pay-as-you-go at
  provider rates. Small models like Qwen3-8B keep this at a few dollars a
  month for personal use.

## Telegram notes

- Private Spaces use long polling, not webhooks — Telegram cannot reach a
  private Space URL, and that is fine.
- If Telegram logs connection timeouts on a free Space, that is the egress
  block above: upgrade the hardware.
- Keep the Space private.

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
