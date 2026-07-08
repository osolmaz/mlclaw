# ML Claw Implementation Plan

## Decision

`osolmaz/mlclaw` is the single source of truth for ML Claw.

ML Claw deploys a private OpenClaw agent backed by Hugging Face state. The
gateway can run either locally or in a private Hugging Face Space. There is no
maintained Hugging Face template Space required for normal operation.

Gateway location is now a first-class design decision. See
[Gateway Location Implementation Plan](2026-06-16-gateway-location-implementation-plan.md)
for the plan to support local and Space gateway targets with the same runtime
image and bucket state format.

The local CLI is `mlclaw`. It runs on the user's machine, uses the user's local
Hugging Face token, generates the Space repository contents, uploads those
files to the user's Space repo, sets variables/secrets, and restarts the Space.

The canonical distribution is the npm package:

```bash
npx mlclaw bootstrap
```

The npm package name is `mlclaw`. It exposes both CLI binary names:

```text
mlclaw
mlclaw
```

Users with Node installed can use npm directly:

```bash
npx mlclaw bootstrap
npm install -g mlclaw
mlclaw bootstrap
```

Users without Node use the platform launcher. The launcher supplies a pinned
Node runtime when needed, then runs the same npm-distributed CLI:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.sh) bootstrap
```

There is no supported Hugging Face bootstrap compatibility URL. The cutover is
to npm plus the GitHub-hosted launcher only.

## Maintained Resources

Maintained by us:

```text
1 GitHub source repo:
  https://github.com/osolmaz/mlclaw

1 npm package:
  mlclaw

No maintained Hugging Face bootstrap repo.
```

Optional/non-authoritative:

```text
HF demo or test Spaces may exist, but they are generated outputs only.
They are not the source of truth and are not required by mlclaw.
```

Created per user:

```text
1 private HF Storage Bucket
0 or 1 private HF Docker Space repo, depending on gateway location
```

## State Bucket Selection

The bucket is the durable identity/state pointer. The agent name controls
runtime resources such as the local container name and Space name.

Default bootstrap still derives a convenient bucket name from the agent name:

```text
agentName = slugify(--name ?? Telegram bot username without trailing _bot/-bot/bot)
bucket = <owner>/<agentName>-data
space = <owner>/<agentName>
```

That default is for new deployments only. Once a deployment manifest exists,
bootstrap must reuse the manifest's pinned bucket unless the user explicitly
changes it.

Explicit adoption commands:

```bash
mlclaw bootstrap --name research --bucket alice/research-archive-data
mlclaw state adopt research --bucket alice/research-archive-data
```

Adoption means the deployment points at that bucket. It is not a copy/import.
After adoption, local and Space runtimes must both use the same
`OPENCLAW_HF_STATE_BUCKET` value. See
[Gateway Location Implementation Plan](2026-06-16-gateway-location-implementation-plan.md)
for the full state bucket contract and migration checks.

## Repository Contents

```text
README.md
assets/
  mlclaw.svg             # shared GitHub and generated Space branding
docs/
  2026-06-11-openclaw-huggingface-implementation-plan.md
  2026-06-16-gateway-location-implementation-plan.md
mlclaw.sh                     # Unix launcher; installs/uses pinned Node if needed
mlclaw.ps1                    # Windows launcher; installs/uses pinned Node if needed
src/
  mlclaw/                      # CLI: bootstrap | update | doctor
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
  mlclaw.mjs                   # npm-shipped one-file CLI bundle
```

## Distribution Contract

The npm package is the single canonical runnable artifact.

```json
{
  "name": "mlclaw",
  "bin": {
    "mlclaw": "dist/mlclaw.mjs",
    "mlclaw": "dist/mlclaw.mjs"
  }
}
```

Publishing rules:

1. TypeScript source remains the maintained implementation.
2. `dist/mlclaw.mjs` is built before publish and included in the npm package.
3. Users are never asked to clone or build this repo.
4. CI verifies build, typecheck, tests, secret scan, and package contents before
   publish.
5. The package should support the current pinned runtime target used by the
   launchers.

Launcher rules:

1. `mlclaw.sh` and `mlclaw.ps1` are convenience launchers, not separate
   implementations.
2. If a compatible Node runtime is already installed, the launcher uses it.
3. If Node is missing or too old, the launcher downloads a pinned official Node
   runtime into the user's cache, for example `~/.cache/mlclaw/node/...`.
4. The launcher then runs the npm package `mlclaw` with the user's
   arguments.
5. The launcher must not require Python, `git`, a source checkout, or a local
   build step.
6. The launcher may require network access to npm and the official Node
   distribution host.

User-facing commands:

```bash
npx mlclaw bootstrap
mlclaw bootstrap
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.sh) bootstrap
```

Windows:

```powershell
irm https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.ps1 | iex
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

### `mlclaw bootstrap`

Default command.

1. Read HF auth from `HF_TOKEN` or the standard Hugging Face token cache.
2. Read the required Telegram token from `--telegram-token`,
   `--telegram-token-file`, `TELEGRAM_BOT_TOKEN`, or the interactive prompt.
3. Call Telegram `getMe` to validate the token and discover the bot username.
4. Derive the default agent name from the bot username by removing a trailing
   `_bot`, `-bot`, or `bot`.
5. Create or adopt the private state bucket:
   - default `<agent>-data`;
   - explicit `--bucket <owner/bucket>` when the user wants existing state.
6. Create a private Docker Space named `<agent>` when `--gateway space`.
7. Choose Space hardware.
   - Require upgraded hardware such as `cpu-upgrade` because Telegram is the
     main interaction surface for the deployment.
   - Before requesting paid hardware, print a clear cost warning and require
     explicit user confirmation.
   - In non-interactive mode, fail unless the user has supplied an explicit
     confirmation flag. If no hardware is supplied, default to `cpu-upgrade`.
8. Set Space sleep time from `--sleep-time` when provided. Default Telegram
   deployments to `--sleep-time -1`.
9. Generate the Space files from this GitHub source tree.
10. Upload/commit the generated files into the user's Space repo.
11. Set variables/secrets.
12. Restart the Space and print Space/bucket URLs.
13. If the gateway token was generated by `mlclaw`, print it once so the user
    can save it. If the user supplied a token, do not echo it back.

Example:

```bash
mlclaw bootstrap \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890
```

Existing-state example:

```bash
mlclaw bootstrap \
  --name research \
  --bucket alice/research-archive-data \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890
```

Automation example:

```bash
mlclaw bootstrap \
  --telegram-token-file ~/secrets/research_bot.env \
  --telegram-user-id 1234567890 \
  --hardware cpu-upgrade \
  --sleep-time -1 \
  --yes
```

### `mlclaw update <owner/space>`

1. Confirm the target looks like a ML Claw deployment, unless `--force`.
2. Regenerate Space files from the current source repo.
3. Force-push the generated files into the target Space repo.
4. Re-stamp `OPENCLAW_HF_TEMPLATE_REV`.
5. Restart the Space.
6. Run doctor checks.

The update command never writes to the state bucket.

### `mlclaw state adopt <agent>`

Switch an existing deployment to an explicit durable state bucket:

```bash
mlclaw state adopt research --bucket alice/research-archive-data
```

Behavior:

1. Stop the current gateway and wait for a final snapshot when possible.
2. Validate the target bucket and newest snapshot.
3. Refuse a live foreign runtime lease unless `--takeover` is supplied.
4. Update the local manifest bucket.
5. Update local env files and Space variables.
6. Reset the local Docker live volume so startup restores from the adopted
   bucket.
7. Restart the configured gateway location.
8. Verify restored identity/state files.

### `mlclaw doctor <owner/space>`

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

### `mlclaw settings <owner/space>`

Update operational Space settings after bootstrap. The command should mirror
Hugging Face CLI naming instead of inventing aliases:

```bash
mlclaw settings your-hf-username/research-agent --hardware cpu-upgrade --sleep-time -1
```

- `--hardware <flavor>` requests a Hugging Face Space hardware flavor.
- `--sleep-time <seconds>` configures upgraded hardware sleep behavior.
- `--sleep-time -1` keeps upgraded hardware always on.
- Telegram deployments require `cpu-upgrade` or larger paid hardware today.
  Free `cpu-basic` is not expected to keep Telegram connections working.
- Any command that requests paid hardware must warn that Hugging Face will bill
  the user's account and require explicit confirmation. Automation can pass
  `--yes`; interactive use should ask the user to confirm.

## Security Defaults

- The user runs `mlclaw` locally; no hosted launcher asks for HF credentials.
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
6. Verify the npm package exposes both `mlclaw` and `mlclaw` binaries.
7. Verify `mlclaw.sh` works on a machine with Node already installed.
8. Verify `mlclaw.sh` works on a clean machine without Node by installing the
   pinned cached runtime.
9. Verify `mlclaw.ps1` works on Windows with and without Node.
10. Bucket parity probe against a real test bucket:
   upload, list, download, missing object, delete.

Live:

1. Wipe old `alice/research-archive` Space and `alice/research-archive-data`
   bucket when explicitly authorized.
2. Run `npx mlclaw bootstrap` using the saved Telegram token file and
   allowed user.
3. Confirm the Space repo was generated from `mlclaw`, not from a template
   Space.
4. Confirm Space builds.
5. Confirm logs show `fresh start` or `restored snapshot`.
6. Confirm logs show `snapshot ... uploaded`.
7. Restart the Space and confirm restore from bucket.
8. Run `mlclaw doctor alice/research-archive`.
9. Induce one stale `/data` variable, then confirm `doctor --fix` removes it.

## Out of Scope

- A maintained Hugging Face template Space as source of truth.
- Mounted buckets for live state.
- Hosted launcher Spaces that collect user credentials.
- A native compiled binary distribution. The npm package plus Node-supplying
  launchers are the distribution target.

## Telegram Caveat

The generated Space configures Telegram long polling for private Spaces.
Telegram deployments currently require upgraded paid Space hardware. Free
`cpu-basic` Spaces are not expected to keep Telegram connections working.

Before ML Claw requests upgraded hardware, it must warn the user that this
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

ML Claw should expose these settings without renaming them:

```bash
mlclaw bootstrap --hardware cpu-upgrade --sleep-time -1 --yes
mlclaw settings your-hf-username/research-agent --hardware cpu-upgrade --sleep-time -1 --yes
```

Without `--yes`, interactive commands should print a cost warning and prompt
for confirmation before making either API call.
