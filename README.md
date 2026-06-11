<p align="center">
  <img src="assets/huggingclaw.svg" alt="Hugging Claw" width="180">
</p>

# Hugging Claw

Deploy a private [OpenClaw](https://openclaw.ai) agent to Hugging Face from
your own machine.

Hugging Claw creates a private Hugging Face Docker Space for the agent and a
private Hugging Face Storage Bucket for durable state. The Space can be rebuilt
or restarted; the bucket keeps the agent's snapshots.

## Requirements

- A Hugging Face account.
- A Hugging Face token available through `HF_TOKEN`, `HF_TOKEN_PATH`,
  `$HF_HOME/token`, or `hf auth login`.
- Optional: a Telegram bot token from BotFather.

## Deploy

If you have Node.js installed, run:

```bash
npx huggingclaw \
  bootstrap \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890
```

Or install it globally:

```bash
npm install -g huggingclaw
hclaw bootstrap
```

If you do not have Node.js installed, use the launcher. It downloads a pinned
Node runtime into your user cache, then runs the same npm package.

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.sh) bootstrap
```

On Windows:

```powershell
irm https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.ps1 | iex
```

Hugging Claw runs locally. It does not ask you to paste Hugging Face credentials
into a hosted app.

## What It Creates

- A private Hugging Face Docker Space.
- A private Hugging Face Storage Bucket.
- Space variables and write-only Space secrets.
- Generated Space source from this repo.

If Hugging Claw generates an OpenClaw gateway token, it prints that token once.
Save it when you see it. Hugging Face stores Space secrets as write-only values,
so the installer cannot read it back later.

## Commands

Update an existing deployment from the current Hugging Claw source:

```bash
hclaw update your-hf-username/research-agent
```

Check a deployment:

```bash
hclaw doctor your-hf-username/research-agent
```

`doctor --fix` only applies safe Space configuration repairs. It does not read
secret values and does not modify bucket objects.

## Telegram Notes

Private Spaces use Telegram long polling, not webhooks. Telegram cannot call a
private Space webhook because Hugging Face requires authentication before the
request reaches the app.

Free Hugging Face Spaces can block outbound bot-platform traffic such as
Telegram or Discord to prevent abuse. If Telegram logs connection timeouts on a
free Space, upgrade the Space to paid hardware. That is the expected production
path.

Keep the Space private. Use `TELEGRAM_PROXY` or `TELEGRAM_API_ROOT` only when
you intentionally want to route Telegram traffic through your own proxy.

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
npm run check:secrets
```

## License

[MIT](LICENSE)
