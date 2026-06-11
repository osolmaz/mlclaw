---
tags:
  - openclaw
  - bootstrap
  - agent
  - huggingface-spaces
library_name: openclaw
---

# OpenClaw Bootstrap

Get your own private [OpenClaw](https://openclaw.ai) agent, fully hosted on Hugging Face, with one command:

```bash
bash <(curl -fsSL https://huggingface.co/osolmaz/openclaw-bootstrap/resolve/main/bootstrap.sh)
```

Paste a Telegram bot token when prompted and start talking to your agent minutes later. Everything runs under your own Hugging Face account: the Space hosts the agent, and a private bucket keeps its state, so nothing depends on anyone else's infrastructure.

The bootstrap creates:

- a private Hugging Face Docker Space from `osolmaz/openclaw-huggingface`
- a private Hugging Face Storage Bucket
- Space secrets for the gateway token, Hugging Face token, and optional Telegram bot

The resulting OpenClaw runtime is hosted on Hugging Face. The agent runs on local disk inside the Space; every 60 seconds (and on shutdown) a verified state snapshot is written to the private bucket through the bucket API, and the newest verified snapshot is restored on boot — the Space is disposable, the bucket is the agent's durable memory. The bucket is never mounted: live SQLite on a bucket mount corrupts. Secrets stay in Hugging Face Space Secrets and are never included in snapshots.

## Prerequisites

- Hugging Face CLI installed as `hf`
- `hf auth login` completed
- Optional Telegram bot token from BotFather
- Optional `TELEGRAM_PROXY` or `OPENCLAW_TELEGRAM_PROXY` if your Hugging Face Space cannot reach `api.telegram.org` directly
- Optional `TELEGRAM_API_ROOT` or `OPENCLAW_TELEGRAM_API_ROOT` for an operator-controlled Telegram Bot API proxy root

## Notes

- The generated Space is private by default.
- Telegram is allowlisted by default; do not make a personal agent open to everyone.
- The script reads the HF token with `hf auth token`, not Python package imports.
- Private Spaces should use Telegram long polling, not webhooks. Telegram cannot call a private Space webhook because Hugging Face requires Space access through Hugging Face auth.
- If the deployed Space logs `[telegram-probe] curl getMe failed` or Telegram `UND_ERR_CONNECT_TIMEOUT`, Hugging Face egress to Telegram is unavailable from that runtime. Rerun the bootstrap with `TELEGRAM_PROXY` set to a reachable HTTP/SOCKS proxy or `TELEGRAM_API_ROOT` set to a reachable Bot API proxy root.
