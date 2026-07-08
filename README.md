<p align="center">
  <img src="https://raw.githubusercontent.com/osolmaz/mlclaw/main/assets/mlclaw.svg" alt="ML Claw" width="180">
</p>

# ML Claw

ML Claw deploys an OpenClaw agent on Hugging Face with durable state in a
private Storage Bucket. The default deployment is a public Hugging Face Space
with a browser gateway protected by Hugging Face OAuth.

The browser never receives an OpenClaw gateway token. ML Claw authenticates the
signed-in Hugging Face user, then proxies HTTP and WebSocket traffic to
OpenClaw on loopback using OpenClaw trusted-proxy auth.

## Install

With Node.js:

```bash
npx mlclaw bootstrap
```

Without Node.js, the launcher fetches a pinned Node runtime into your user
cache and runs the same npm package:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.sh)
```

On Windows:

```powershell
irm https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.ps1 | iex
```

You need a Hugging Face account and a token available through `HF_TOKEN`,
`HF_TOKEN_PATH`, `$HF_HOME/token`, or `hf auth login`. You never paste that
token into someone else's app; the bootstrapper runs locally.

## Default Flow

```bash
npx mlclaw bootstrap --name research
```

This creates:

- a private Storage Bucket for OpenClaw state;
- a public Docker Space for the browser gateway;
- a self-contained Space runtime generated from the installed `mlclaw` package;
- Hugging Face OAuth metadata in the Space README;
- Space variables and write-only secrets for state sync and session signing;
- a local deployment manifest under `~/.config/mlclaw`.

Open the Space, sign in with your Hugging Face account, and use the OpenClaw
browser gateway directly.

Choose a Hugging Face Router model with `--model`:

```bash
npx mlclaw bootstrap \
  --name research \
  --model huggingface/google/gemma-4-26B-A4B-it
```

Recommended router-compatible options:

- `huggingface/google/gemma-4-26B-A4B-it`: default quality target.
- `huggingface/Qwen/Qwen3.6-35B-A3B`: stronger Qwen option with tool support.
- `huggingface/Qwen/Qwen3-8B`: cheaper small-model option.

## Optional Telegram

Telegram is optional. If you provide a Telegram bot token, ML Claw calls
Telegram `getMe`, removes a trailing `_bot` from the username, and can derive
the Space and bucket names from the bot username.

```bash
npx mlclaw bootstrap \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890 \
  --hardware cpu-upgrade \
  --sleep-time -1
```

Hugging Face free Spaces intentionally block outbound TLS to some messaging
APIs. Telegram/Discord connectivity therefore requires upgraded paid Space
hardware today. ML Claw warns before requesting paid hardware; pass `--yes`
only for automation.

## Local Gateway Mode

You can run the gateway locally instead of inside a Space:

```bash
npx mlclaw bootstrap --gateway local --name research
```

Local mode uses Docker on your machine and the same private Storage Bucket.
It avoids Hugging Face messaging egress limits because Telegram traffic comes
from your network.

Move between local and Space without losing state:

```bash
mlclaw gateway migrate research --to local
mlclaw gateway migrate research --to space
```

Useful operations:

```bash
mlclaw gateway status research
mlclaw gateway logs research
mlclaw gateway stop research
mlclaw gateway start research
```

Local Docker deployments are pinned to the Docker context used at bootstrap
time. Rebind explicitly if you move between Docker Desktop, OrbStack, Colima,
or another Docker engine:

```bash
mlclaw gateway rebind research --docker-context desktop-linux
```

## Update and Repair

Update an existing Space to the current ML Claw implementation:

```bash
mlclaw update your-hf-username/research
```

Check a deployment and apply safe configuration repairs:

```bash
mlclaw doctor your-hf-username/research
mlclaw doctor your-hf-username/research --fix
```

`doctor --fix` may update Space variables and missing session-secret plumbing.
It never reads secret values and never modifies bucket contents.

`mlclaw update` also refreshes the generated Space runtime files, so older
Spaces can move to the current implementation without recreating their bucket.

## OpenAI Credentials

After signing into the Space, open:

```text
/mlclaw/openai
```

Submit an OpenAI API key there if you want OpenClaw to use OpenAI-compatible
models. ML Claw stores the key as a Hugging Face Space Secret when possible,
writes a 0600 runtime file for immediate use, and restarts the internal
OpenClaw gateway with `OPENAI_API_KEY` set. The key is never returned to the
browser.

## How State Works

OpenClaw runs against local disk inside the active runtime. The Storage Bucket
is not mounted as a live filesystem. Instead, `hf-state-sync` restores the
newest verified snapshot on boot and uploads verified snapshots during runtime
and shutdown.

That keeps SQLite off network-mounted storage while preserving the agent's
memory across Space rebuilds, local container replacement, and gateway
migration.

## Costs

- Browser Space gateway: `cpu-basic` is enough for the default browser gateway.
- Telegram/Discord from a Space: requires paid upgraded Space hardware today.
- Inference: requests use your Hugging Face Inference Providers credits, then
  provider pay-as-you-go pricing.

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
npm run pack:check
npm run check:secrets
```

Core directories:

- `src/mlclaw/`: CLI and Hub orchestration.
- `src/mlclaw-space-runtime/`: Space OAuth proxy and browser gateway wrapper.
- `src/hf-state-sync/`: snapshot/restore supervisor.
- `src/hf-bucket-client/`: TypeScript Storage Bucket client.

## License

[MIT](LICENSE)
