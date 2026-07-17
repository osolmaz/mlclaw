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

After signing in, an administrator can authorize the hosted Hugging Face MCP
server and Research Agent with the same Hugging Face account. Ordinary users
grant only identity scopes. Integration credentials stay in the trusted ML
Claw wrapper; the unprivileged OpenClaw process receives only loopback MCP
access.

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
`HF_TOKEN_PATH`, `$HF_HOME/token`, or `hf auth login`. If an interactive
bootstrap cannot find a token, it offers to install the official Hugging Face
CLI, asks whether you need to create an account, opens the appropriate browser
flow, and resumes after sign-in. Non-interactive runs never install software and
still require a token up front. You never paste that token into someone else's
app; the bootstrapper runs locally.

ML Claw checks whether the credential assigned to HF Broker exposes enough
permission metadata for the broker's operation catalog. When the active CLI
login is an opaque OAuth credential or is missing permissions, interactive
bootstrap can open Hugging Face's fine-grained token form with BrokerKit fields
preselected. You name and create the token on Hugging Face, then paste it into a
hidden local prompt. This does not replace or modify the active `hf` CLI login.
For automation, pass a `0600` file through `--broker-hf-token-file`; ML Claw
does not accept the token as a command-line value.

The broker owns the selected credential; OpenClaw receives only a separate
agent credential that can call the broker's typed, policy-checked routes. It
cannot read the token or use the admin-only operator API. Rerunning bootstrap
preserves and rechecks an existing broker token. You may continue with an
unverified credential, but individual broker operations can then fail with a
Hugging Face permission error. Existing dedicated inference tokens remain
supported through `MLCLAW_ROUTER_TOKEN`, `HF_ROUTER_TOKEN`, or
`--router-token-file` during migration.

## Default Flow

```bash
npx mlclaw@latest bootstrap --name mlclaw
```

This creates:

- a private Docker Space for the browser gateway when the account can host it;
- a private Storage Bucket for OpenClaw state after the Space is accepted;
- no explicit Space hardware request unless you pass `--hardware`;
- a Docker Space that starts from the prebuilt `ghcr.io/osolmaz/mlclaw` image;
- Hugging Face OAuth metadata for browser auth, Hugging Face MCP, and Research
  Agent access in the Space README;
- Space variables, a bucket volume mount for state sync, and separate
  write-only secrets for session signing and OAuth credential encryption;
- an `MLCLAW_BROKER_HF_TOKEN` Space secret consumed only by the isolated HF
  Broker process;
- a local deployment manifest under `~/.config/mlclaw`.

Hugging Face currently requires PRO for Docker Space hosting. When creation is
rejected for that reason, interactive bootstrap checks for a usable local
Docker or rootless Podman engine and offers to run the same gateway locally.
No bucket is created before hosted eligibility is known. Bootstrap does not
install a container engine or change daemon permissions.

Automation fails instead of changing execution location implicitly. Opt in to
the same fallback with:

```bash
npx mlclaw@latest bootstrap --yes --allow-local-fallback
```

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
  --model huggingface/zai-org/GLM-5.2:fireworks-ai
```

Recommended router-compatible options:

- `huggingface/zai-org/GLM-5.2:fireworks-ai`: default long-context model with tool support.
- `huggingface/google/gemma-4-26B-A4B-it:deepinfra`: lower-cost Gemma option with tool and structured-output support.
- `huggingface/Qwen/Qwen3.6-35B-A3B:deepinfra`: strong Qwen 3.6 option with tool and structured-output support.
- `huggingface/Qwen/Qwen3.6-27B:deepinfra`: live Qwen 3.6 option with tool and structured-output support.
- `huggingface/zai-org/GLM-5.2:deepinfra`: long-context GLM option with tool and structured-output support.
- `huggingface/moonshotai/Kimi-K2.7-Code:deepinfra`: coding-focused Kimi option with tool and structured-output support.
- `huggingface/openai/gpt-oss-120b:deepinfra`: larger GPT-OSS option with tool and structured-output support.
- `huggingface/openai/gpt-oss-20b:deepinfra`: lower-cost GPT-OSS option with tool and structured-output support.
- `huggingface/deepseek-ai/DeepSeek-V4-Flash:deepinfra`: low-cost long-context DeepSeek V4 option.
- `huggingface/deepseek-ai/DeepSeek-V4-Pro:deepinfra`: higher-quality long-context DeepSeek V4 option.
- `huggingface/MiniMaxAI/MiniMax-M3:together`: long-context MiniMax option with tool and structured-output support.

Fireworks options are also included for Kimi K2.7 Code, GPT-OSS 120B and 20B,
DeepSeek V4 Flash and Pro, and MiniMax M3. Use the provider suffix
`:fireworks-ai`. The current Router catalog does not expose the Gemma 4 or Qwen
3.6 presets through Fireworks.

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

Local mode uses a ready Docker-compatible engine or rootless Podman on your
machine and the same private Storage Bucket. Runtime selection is deterministic:
the existing manifest binding wins, an explicit choice comes next, and
`auto` probes Docker before Podman. Select one explicitly when needed:

```bash
npx mlclaw@latest bootstrap --gateway local --container-runtime docker
npx mlclaw@latest bootstrap --gateway local --container-runtime podman
```

Bootstrap is also the reconfiguration command. With one known deployment,
rerun `mlclaw bootstrap` or `mlclaw configure` without `--name`; ML Claw selects
it, shows only configuration changes, and verifies no-op runs without restarting
a healthy gateway. If the local cache is missing, interactive bootstrap can
recover a deployment from its validated marker in an owned Storage Bucket.
Recovery never invents a replacement encryption key: restore the deployment's
existing `MLCLAW_CREDENTIAL_KEY` in the environment for the recovery run. ML
Claw verifies its stored SHA-256 fingerprint before changing the runtime.

Cross-host reconciliation uses a generated private Hugging Face model repository
per deployment as its control lock. Parent-commit compare-and-swap prevents two
controllers from acquiring the same deployment lease concurrently.

The local control plane is published only on loopback. The default URL is
`http://127.0.0.1:7860`; choose another unprivileged port with `--local-port`
when needed. On a remote host, use the SSH forwarding command printed by the
CLI, then open the same loopback URL in your local browser. The CLI prints a
private fragment-based access link that is exchanged for an HTTP-only browser
session; rerun `mlclaw gateway status <agent>` to retrieve it.

To reach the gateway from other devices on your private tailnet, choose direct
HTTP over Tailscale or an HTTPS Tailscale Serve mapping:

```bash
npx mlclaw@latest bootstrap --gateway local --tailscale=direct
npx mlclaw@latest bootstrap --gateway local --tailscale=serve
mlclaw gateway start mlclaw --tailscale=off
```

Interactive bootstrap offers this option when Tailscale is installed, signed
in, and online; it remains off by default. Direct mode publishes only loopback
and the node's exact Tailscale IPv4 address. Traffic is HTTP in the browser but
encrypted between tailnet peers by Tailscale. Serve mode keeps the container on
loopback and owns one scoped HTTPS handler. ML Claw keeps its own browser
session authentication in front of OpenClaw in both modes, never enables
Funnel, and never resets unrelated Serve handlers. Use `--tailscale-port
<port>` for a non-default port. If Serve needs tailnet administrator approval,
the loopback gateway remains running; approve the printed URL and rerun
`mlclaw bootstrap` to resume.

Docker Desktop, OrbStack, Colima, Rancher Desktop, and other Docker-compatible
engines are used through Docker contexts. On Windows, Podman machine
connections are supported through the Podman CLI. Local mode avoids Hugging
Face messaging egress limits because Telegram traffic comes from your network.

Move between local and Space without losing state:

```bash
mlclaw gateway migrate mlclaw --to local
mlclaw gateway migrate mlclaw --to space
```

The local MCP proxy uses the Hugging Face token kept in the local deployment
environment. The trusted wrapper does not need the Space OAuth client, and the
encrypted Space OAuth credential remains in the bucket for migration back.

Useful operations:

```bash
mlclaw gateway status mlclaw
mlclaw gateway logs mlclaw
mlclaw gateway stop mlclaw
mlclaw gateway start mlclaw
```

Local deployments are pinned to their selected engine and connection. Rebind
Docker deployments explicitly if you move between Docker Desktop, OrbStack,
Colima, or another Docker engine:

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
recreating their bucket. For legacy deployments, ML Claw installs the active
local Hugging Face credential as `MLCLAW_BROKER_HF_TOKEN`, removes stale direct
token secrets, and restarts the Space with the broker boundary enabled.

## Browser Settings

After signing into the Space, open:

```text
/mlclaw
```

Use the browser control UI for:

- `/mlclaw/settings`: choose Router model/provider rows, update `OPENCLAW_MODEL`
  and `MLCLAW_MODEL_CHOICES`, and request a Space restart.
- `/mlclaw/status`: inspect runtime, bucket, model, OAuth, and integration status.

OpenClaw's BrokerKit plugin adds an **Approvals** tab to the gateway. The tab
merges every BrokerKit-compatible backend configured in
`MLCLAW_OPERATOR_BROKERS_FILE` and lets administrators inspect, approve, deny,
cancel, or revoke requests. The plugin registers the Gateway tab, while ML Claw
serves the immutable packaged UI from its trusted HTTP boundary and gives it a
small popover inside the Gateway. Administrators decide requests directly in
the sandboxed popover by default. Set
`MLCLAW_BROKERKIT_POPOVER_DECISIONS=false` only to make the popover read-only.
The popover uses a renewable, short-lived, admin-bound browser token.
Broker operator tokens remain in backend-only files and are never sent to the
browser or OpenClaw. See
[Operator Broker Configuration](docs/operator-brokers-config.md).

- `/mlclaw/credentials`: connect or disconnect Hugging Face MCP and Research
  Agent access, or submit an OpenAI API key.
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
MLCLAW_BRAND_FAVICON_32=hf-logo.png
MLCLAW_BRAND_FAVICON_ICO=hf-logo.svg
MLCLAW_BRAND_APPLE_TOUCH_ICON=hf-logo.png
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
models. ML Claw writes a `0600` runtime file for immediate use and an encrypted
durable credential protected by `MLCLAW_CREDENTIAL_KEY`, then restarts the
internal OpenClaw gateway with `OPENAI_API_KEY` set. When trusted Hub authority
is available, it also stores the key as a write-only Space secret. The key is
never returned to the browser, exposed to the agent except as its intended
OpenAI credential, or stored as plaintext in the state bucket. App Spaces do
not keep broad Hugging Face authority in the web control process.

## How State Works

OpenClaw runs against local disk inside the active runtime. In Space gateway
mode, ML Claw mounts the private Storage Bucket at `/data/mlclaw-state` and
uses that mounted directory only for verified snapshots. The live OpenClaw
state stays on local container disk at
`/home/node/.local/share/mlclaw/live`.

That keeps SQLite off bucket-backed storage while preserving the agent's memory
across Space rebuilds, local container replacement, and gateway migration. The
Space does not use `HF_TOKEN` or `HUGGINGFACE_HUB_TOKEN` secrets. Its broad
credential is stored as `MLCLAW_BROKER_HF_TOKEN`, written to a broker-owned
`0600` file during startup, and removed from child-process environments.
OpenClaw uses only the generated broker agent credential. Broker grant and
event state and encrypted control credentials live under the root-owned
`/var/lib/mlclaw-protected` tree. They are included in the durable snapshot
through a root-only `.mlclaw-protected` staging step, then restored outside the
agent-owned live directory before OpenClaw starts. Rebuildable Git mirrors, the
broad token, and operator credentials are never included in snapshots.
Local gateways pass the broad credential only to the trusted state-sync
supervisor for bucket I/O and to the trusted MCP integration proxy through a
protected token file. Neither path passes it to OpenClaw.

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
