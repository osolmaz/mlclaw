<p align="center">
  <img src="https://raw.githubusercontent.com/osolmaz/mlclaw/main/assets/mlclaw.svg" alt="ML Claw" width="180">
</p>

# ML Claw

ML Claw deploys an OpenClaw agent on Hugging Face with durable state in a
private Storage Bucket. The default deployment is a private Hugging Face Space
with a browser gateway protected by Hugging Face OAuth.

The browser never receives an OpenClaw gateway token. ML Claw authenticates the
signed-in Hugging Face user, then proxies HTTP and WebSocket traffic to
OpenClaw on loopback using OpenClaw trusted-proxy auth.

## Install

With Node.js:

```bash
npx mlclaw@latest bootstrap
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
npx mlclaw@latest bootstrap --name mlclaw
```

This creates:

- a private Storage Bucket for OpenClaw state;
- a private Docker Space for the browser gateway;
- a Docker Space that starts from the prebuilt `ghcr.io/osolmaz/mlclaw` image;
- Hugging Face OAuth metadata in the Space README;
- Space variables and write-only secrets for state sync and session signing;
- a local deployment manifest under `~/.config/mlclaw`.

Open the Space, sign in with your Hugging Face account, and use the OpenClaw
browser gateway directly. The gateway includes a small ML Claw control link
for settings, status, credentials, and sign out.

Create a public Space only when you explicitly want a public demo or template:

```bash
npx mlclaw@latest bootstrap --name mlclaw --public-space
```

Choose a Hugging Face Router model with `--model`:

```bash
npx mlclaw@latest bootstrap \
  --name mlclaw \
  --model huggingface/google/gemma-4-26B-A4B-it:deepinfra
```

Recommended router-compatible options:

- `huggingface/google/gemma-4-26B-A4B-it:deepinfra`: default quality target.
- `huggingface/Qwen/Qwen3.6-35B-A3B:deepinfra`: strong Qwen 3.6 option with tool and structured-output support.
- `huggingface/Qwen/Qwen3.6-27B:deepinfra`: live Qwen 3.6 option with tool and structured-output support.
- `huggingface/zai-org/GLM-5.2:deepinfra`: long-context GLM option with tool and structured-output support.
- `huggingface/moonshotai/Kimi-K2.7-Code:deepinfra`: coding-focused Kimi option with tool and structured-output support.
- `huggingface/openai/gpt-oss-120b:deepinfra`: larger GPT-OSS option with tool and structured-output support.
- `huggingface/openai/gpt-oss-20b:deepinfra`: lower-cost GPT-OSS option with tool and structured-output support.
- `huggingface/deepseek-ai/DeepSeek-V4-Flash:deepinfra`: low-cost long-context DeepSeek V4 option.
- `huggingface/deepseek-ai/DeepSeek-V4-Pro:deepinfra`: higher-quality long-context DeepSeek V4 option.
- `huggingface/MiniMaxAI/MiniMax-M3:together`: long-context MiniMax option with tool and structured-output support.

## Optional Telegram

Telegram is optional. If you provide a Telegram bot token, ML Claw calls
Telegram `getMe`, removes a trailing `_bot` from the username, and can derive
the Space and bucket names from the bot username.

```bash
npx mlclaw@latest bootstrap \
  --telegram-token-file ~/secrets/mlclaw_bot.env \
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
npx mlclaw@latest bootstrap --gateway local --name mlclaw
```

Local mode uses Docker on your machine and the same private Storage Bucket.
It avoids Hugging Face messaging egress limits because Telegram traffic comes
from your network.

Move between local and Space without losing state:

```bash
mlclaw gateway migrate mlclaw --to local
mlclaw gateway migrate mlclaw --to space
```

Useful operations:

```bash
mlclaw gateway status mlclaw
mlclaw gateway logs mlclaw
mlclaw gateway stop mlclaw
mlclaw gateway start mlclaw
```

Local Docker deployments are pinned to the Docker context used at bootstrap
time. Rebind explicitly if you move between Docker Desktop, OrbStack, Colima,
or another Docker engine:

```bash
mlclaw gateway rebind mlclaw --docker-context desktop-linux
```

## Update and Repair

Update an existing Space to the current ML Claw implementation:

```bash
mlclaw update your-hf-username/mlclaw
```

Check a deployment and apply safe configuration repairs:

```bash
mlclaw doctor your-hf-username/mlclaw
mlclaw doctor your-hf-username/mlclaw --fix
```

`doctor --fix` may update Space variables and missing session-secret plumbing.
It never reads secret values and never modifies bucket contents.

`mlclaw update` also refreshes the generated Space Dockerfile and runtime
metadata, so older Spaces can move to the current implementation without
recreating their bucket.

## Browser Settings

After signing into the Space, open:

```text
/mlclaw
```

Use the browser control UI for:

- `/mlclaw/settings`: choose Router model/provider rows, update `OPENCLAW_MODEL`
  and `MLCLAW_MODEL_CHOICES`, and request a Space restart.
- `/mlclaw/status`: inspect runtime, bucket, model, and OAuth status.
- `/mlclaw/credentials`: submit an OpenAI API key.
- `/mlclaw/logout`: clear the ML Claw session cookie.

The same control UI is linked from the OpenClaw gateway. Settings changes
mutate only the current Space, inferred from `SPACE_ID`.

## Branding

ML Claw white-labels the browser-facing gateway by default. App Spaces use the
agent name as the browser title, PWA name, login heading, and ML Claw control
link label. The ML Claw logo is reserved for the control UI brand mark. The
gateway shortcut, login logo, and default browser icons use the Hugging Face
logo. The OpenClaw assistant fallback avatar defaults to a neutral assistant
icon.

Override branding with Space variables:

```text
MLCLAW_BRAND_NAME=Bob Lab
MLCLAW_BRAND_SHORT_NAME=Bob
MLCLAW_BRAND_THEME_COLOR=#111827
MLCLAW_BRAND_LOGO=mlclaw.svg
MLCLAW_BRAND_FAVICON=hf-logo.svg
MLCLAW_BRAND_FAVICON_32=hf-logo.svg
MLCLAW_BRAND_FAVICON_ICO=hf-logo.svg
MLCLAW_BRAND_APPLE_TOUCH_ICON=assistant-avatar.svg
MLCLAW_BRAND_ASSISTANT_AVATAR=assistant-avatar.svg
```

Brand asset paths are relative to the Space `assets/` directory. ML Claw serves
them through `/assets/brand/logo`, `/favicon.svg`, `/favicon-32.png`,
`/favicon.ico`, `/apple-touch-icon.png`, and `/manifest.webmanifest`.

## OpenAI Credentials

After signing into the Space, open:

```text
/mlclaw/credentials
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
