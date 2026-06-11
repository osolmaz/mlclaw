# Hugging Claw Implementation Plan

## Decision

`osolmaz/huggingclaw` is the single source of truth for Hugging Claw.

Hugging Claw deploys a private OpenClaw agent to Hugging Face by creating a
private Storage Bucket and a private Docker Space for each user. There is no
maintained Hugging Face template Space required for normal operation.

The local CLI is `hclaw`. It runs on the user's machine, uses the user's local
Hugging Face token, generates the Space repository contents, uploads those
files to the user's Space repo, sets variables/secrets, and restarts the Space.

The canonical distribution is the npm package:

```bash
npx huggingclaw bootstrap
```

The npm package name is `huggingclaw`. It exposes both CLI binary names:

```text
hclaw
huggingclaw
```

Users with Node installed can use npm directly:

```bash
npx huggingclaw bootstrap
npm install -g huggingclaw
hclaw bootstrap
```

Users without Node use the platform launcher. The launcher supplies a pinned
Node runtime when needed, then runs the same npm-distributed CLI:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.sh) bootstrap
```

There is no supported Hugging Face bootstrap compatibility URL. The cutover is
to npm plus the GitHub-hosted launcher only.

## Maintained Resources

Maintained by us:

```text
1 GitHub source repo:
  https://github.com/osolmaz/huggingclaw

1 npm package:
  huggingclaw

No maintained Hugging Face bootstrap repo.
```

Optional/non-authoritative:

```text
HF demo or test Spaces may exist, but they are generated outputs only.
They are not the source of truth and are not required by hclaw.
```

Created per user:

```text
1 private HF Docker Space repo
1 private HF Storage Bucket
```

## Repository Contents

```text
README.md
assets/
  huggingclaw.svg             # shared GitHub and generated Space branding
docs/
  openclaw-huggingface-implementation-plan.md
hclaw.sh                     # Unix launcher; installs/uses pinned Node if needed
hclaw.ps1                    # Windows launcher; installs/uses pinned Node if needed
src/
  hclaw/                      # CLI: bootstrap | update | doctor
  hf-bucket-client/           # typed Storage Bucket client
  hf-state-sync/              # runtime snapshot/restore supervisor
  vendor/hfjs-xet/            # vendored Xet upload path from huggingface.js
space/
  README.md                   # generated Space metadata/readme source
scripts/
  check-secrets.mjs
  parity-probe.ts
test/
dist/
  hclaw.mjs                   # npm-shipped one-file CLI bundle
```

## Distribution Contract

The npm package is the single canonical runnable artifact.

```json
{
  "name": "huggingclaw",
  "bin": {
    "hclaw": "dist/hclaw.mjs",
    "huggingclaw": "dist/hclaw.mjs"
  }
}
```

Publishing rules:

1. TypeScript source remains the maintained implementation.
2. `dist/hclaw.mjs` is built before publish and included in the npm package.
3. Users are never asked to clone or build this repo.
4. CI verifies build, typecheck, tests, secret scan, and package contents before
   publish.
5. The package should support the current pinned runtime target used by the
   launchers.

Launcher rules:

1. `hclaw.sh` and `hclaw.ps1` are convenience launchers, not separate
   implementations.
2. If a compatible Node runtime is already installed, the launcher uses it.
3. If Node is missing or too old, the launcher downloads a pinned official Node
   runtime into the user's cache, for example `~/.cache/huggingclaw/node/...`.
4. The launcher then runs the npm package `huggingclaw` with the user's
   arguments.
5. The launcher must not require Python, `git`, a source checkout, or a local
   build step.
6. The launcher may require network access to npm and the official Node
   distribution host.

User-facing commands:

```bash
npx huggingclaw bootstrap
hclaw bootstrap
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.sh) bootstrap
```

Windows:

```powershell
irm https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.ps1 | iex
```

## Runtime Contract

Generated Spaces run OpenClaw from:

```text
ghcr.io/openclaw/openclaw:latest
```

The generated Space exposes:

```text
OPENCLAW_GATEWAY_PORT=7860
```

OpenClaw state lives on local Space disk:

```text
OPENCLAW_LIVE_DIR=/tmp/openclaw-live
OPENCLAW_STATE_DIR=/tmp/openclaw-live/.openclaw
OPENCLAW_WORKSPACE_DIR=/tmp/openclaw-live/workspace
OPENCLAW_CONFIG_PATH=/tmp/openclaw-live/.openclaw/openclaw.json
```

Durability is handled by `hf-state-sync`:

1. On boot, restore the newest verified snapshot from the private bucket.
2. During runtime and shutdown, snapshot local state to a `tar.zst` archive.
3. Copy live SQLite databases via `VACUUM INTO` before archiving.
4. Upload archive and manifest through the TypeScript bucket client.
5. Never mount the bucket as a filesystem for live SQLite.

Space Secrets:

```text
OPENCLAW_GATEWAY_TOKEN
HF_TOKEN
TELEGRAM_BOT_TOKEN
TELEGRAM_ALLOWED_USERS
TELEGRAM_PROXY
TELEGRAM_API_ROOT
```

Space Variables:

```text
OPENCLAW_HF_STATE_BUCKET
OPENCLAW_HF_TEMPLATE_REV
OPENCLAW_MODEL
OPENCLAW_AGENT_NAME
```

Default model:

```text
huggingface/Qwen/Qwen3-8B
```

## CLI Contract

### `hclaw bootstrap`

Default command.

1. Read HF auth from `HF_TOKEN` or the standard Hugging Face token cache.
2. Optionally read Telegram token from `--telegram-token`,
   `--telegram-token-file`, or `TELEGRAM_BOT_TOKEN`.
3. If Telegram is present, call Telegram `getMe`.
4. Derive the default agent name from the bot username by removing a trailing
   `_bot`, `-bot`, or `bot`.
5. Create a private bucket named `<agent>-data`.
6. Create a private Docker Space named `<agent>`.
7. Choose Space hardware.
   - Default to `cpu-basic` only when no bot-platform integration is configured.
   - If Telegram or Discord is configured, require upgraded hardware such as
     `cpu-upgrade`.
   - Before requesting paid hardware, print a clear cost warning and require
     explicit user confirmation.
   - In non-interactive mode, fail unless the user has supplied both the paid
     hardware choice and an explicit confirmation flag.
8. Set Space sleep time from `--sleep-time` when provided. For bot-platform
   deployments, recommend `--sleep-time -1`.
9. Generate the Space files from this GitHub source tree.
10. Upload/commit the generated files into the user's Space repo.
11. Set variables/secrets.
12. Restart the Space and print Space/bucket URLs.
13. If the gateway token was generated by `hclaw`, print it once so the user
    can save it. If the user supplied a token, do not echo it back.

Example:

```bash
hclaw bootstrap \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890
```

Production bot-platform example:

```bash
hclaw bootstrap \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890 \
  --hardware cpu-upgrade \
  --sleep-time -1 \
  --yes
```

### `hclaw update <owner/space>`

1. Confirm the target looks like a Hugging Claw deployment, unless `--force`.
2. Regenerate Space files from the current source repo.
3. Force-push the generated files into the target Space repo.
4. Re-stamp `OPENCLAW_HF_TEMPLATE_REV`.
5. Restart the Space.
6. Run doctor checks.

The update command never writes to the state bucket.

### `hclaw doctor <owner/space>`

Report-only by default; `--fix` applies safe Space config repairs.

Checks:

- Required variables present.
- Required secret names present.
- State bucket is accessible.
- No legacy `/data` path variables are set.
- Runtime logs show restore/fresh-start and snapshot upload outcomes.
- Template rev is present.

`doctor --fix` may delete stale path variables or set a missing bucket variable
when `--bucket` is provided. It never reads secret values and never modifies
bucket objects.

### `hclaw settings <owner/space>`

Update operational Space settings after bootstrap. The command should mirror
Hugging Face CLI naming instead of inventing aliases:

```bash
hclaw settings your-hf-username/research-agent --hardware cpu-upgrade --sleep-time -1
```

- `--hardware <flavor>` requests a Hugging Face Space hardware flavor.
- `--sleep-time <seconds>` configures upgraded hardware sleep behavior.
- `--sleep-time -1` keeps upgraded hardware always on.
- Telegram or Discord deployments require `cpu-upgrade` or larger paid
  hardware today. Free `cpu-basic` is only for non-bot testing.
- Any command that requests paid hardware must warn that Hugging Face will bill
  the user's account and require explicit confirmation. Automation can pass
  `--yes`; interactive use should ask the user to confirm.

## Security Defaults

- The user runs `hclaw` locally; no hosted launcher asks for HF credentials.
- No credentials are committed to git.
- User-supplied secret values are write-only and never printed.
- A generated gateway token is printed once because Hugging Face stores Space
  Secrets as write-only values.
- Generated Spaces are private by default.
- Gateway auth is required.
- Telegram is allowlisted by default.
- Telegram uses long polling for private Spaces.

## Verification

Local:

1. `npm run build`
2. `npm run typecheck`
3. `npm test`
4. `npm run check:secrets`
5. Verify `npm pack --dry-run` includes the runnable bundle, launchers, README,
   license, generated Space sources, and excludes test/dev-only files.
6. Verify the npm package exposes both `hclaw` and `huggingclaw` binaries.
7. Verify `hclaw.sh` works on a machine with Node already installed.
8. Verify `hclaw.sh` works on a clean machine without Node by installing the
   pinned cached runtime.
9. Verify `hclaw.ps1` works on Windows with and without Node.
10. Bucket parity probe against a real test bucket:
   upload, list, download, missing object, delete.

Live:

1. Wipe old `osolmaz/onurclawtest` Space and `osolmaz/onurclawtest-data`
   bucket when explicitly authorized.
2. Run `npx huggingclaw bootstrap` using the saved Telegram token file and
   allowed user.
3. Confirm the Space repo was generated from `huggingclaw`, not from a template
   Space.
4. Confirm Space builds.
5. Confirm logs show `fresh start` or `restored snapshot`.
6. Confirm logs show `snapshot ... uploaded`.
7. Restart the Space and confirm restore from bucket.
8. Run `hclaw doctor osolmaz/onurclawtest`.
9. Induce one stale `/data` variable, then confirm `doctor --fix` removes it.

## Out of Scope

- A maintained Hugging Face template Space as source of truth.
- Mounted buckets for live state.
- Hosted launcher Spaces that collect user credentials.
- A native compiled binary distribution. The npm package plus Node-supplying
  launchers are the distribution target.

## Telegram Caveat

The generated Space configures Telegram long polling for private Spaces.
Telegram and Discord deployments currently require upgraded paid Space
hardware. Free `cpu-basic` Spaces are fine for non-bot testing, but they are
not expected to keep bot-platform connections working.

Before HuggingClaw requests upgraded hardware, it must warn the user that this
will bill their Hugging Face account and ask for explicit consent. If Hugging
Face changes free Space egress behavior in the future, this requirement can be
relaxed without changing the rest of the deployment model.

Keep the Space private. `TELEGRAM_PROXY` and `TELEGRAM_API_ROOT` are operator
escape hatches for deployments that intentionally route Telegram traffic
through their own proxy.

## Hugging Face Space Settings Contract

The Hugging Face CLI changes existing Space hardware with:

```bash
hf spaces settings <owner/space> --hardware cpu-upgrade --sleep-time -1
```

Under the hood, that calls:

```http
POST /api/spaces/{owner}/{space}/hardware
Content-Type: application/json
```

```json
{
  "flavor": "cpu-upgrade",
  "sleepTimeSeconds": -1
}
```

If only sleep time changes, Hugging Face uses a separate endpoint:

```http
POST /api/spaces/{owner}/{space}/sleeptime
Content-Type: application/json
```

```json
{
  "seconds": -1
}
```

Space creation uses the repo-create API and different field names:

```http
POST /api/repos/create
Content-Type: application/json
```

```json
{
  "name": "research-agent",
  "organization": null,
  "type": "space",
  "sdk": "docker",
  "private": true,
  "hardware": "cpu-upgrade",
  "sleepTimeSeconds": -1
}
```

HuggingClaw should expose these settings without renaming them:

```bash
hclaw bootstrap --hardware cpu-upgrade --sleep-time -1 --yes
hclaw settings your-hf-username/research-agent --hardware cpu-upgrade --sleep-time -1 --yes
```

Without `--yes`, interactive commands should print a cost warning and prompt
for confirmation before making either API call.
