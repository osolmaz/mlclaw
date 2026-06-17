# Gateway Location Implementation Plan

Status: implemented in PR #5; final review and CI validation in progress

## Decision

Use **gateway location** as the user-facing concept.

Hugging Claw always uses Hugging Face for durable state:

```text
private Storage Bucket
bucket-backed snapshot/restore
same OpenClaw state format
same model configuration
```

Gateway location decides only where the live OpenClaw gateway process runs:

| Gateway location | Meaning | Cost profile |
| --- | --- | --- |
| `local` | Gateway runs on the user's machine | No paid Space required for Telegram/Discord |
| `space` | Gateway runs inside a private Hugging Face Space | Fully hosted, requires paid Space hardware for Telegram/Discord |

The long-term architecture is one runtime, two targets:

```text
same runtime image
same entrypoint behavior
same hf-state-sync restore/snapshot protocol
same bucket state format
local Docker target or Hugging Face Space target
```

Do not maintain separate local and Space gateway implementations.

## Naming Contract

Use this naming consistently:

| Context | Name |
| --- | --- |
| Prose | gateway location |
| CLI option | `--gateway local` or `--gateway space` |
| Config field | `gatewayLocation` |
| Command group | `hclaw gateway ...` |

Avoid these names:

- `deployment mode`: too broad; state remains on Hugging Face in both modes.
- `runtime mode`: ambiguous with model runtimes.
- `bot mode`: too Telegram-specific.
- `connector mode`: sounds like only messaging changes.

## State Bucket Contract

Treat the Hugging Face Storage Bucket as the durable agent identity/state
pointer. Treat the agent name as the runtime/resource name.

Default bootstrap derives both names from the same base:

```text
agentName = slugify(--name ?? Telegram bot username without trailing _bot/-bot/bot)
space = <owner>/<agentName>
bucket = <owner>/<agentName>-data
```

That default is only a convenience for a new deployment. After a deployment
exists, the local manifest pins the bucket. Bootstrap must reuse
`manifest.bucket` unless the user explicitly supplies a new `--bucket`.

Explicit bucket adoption:

```bash
hclaw bootstrap --name onurclaw --bucket osolmaz/onurclawtest-data
hclaw state adopt onurclaw --bucket osolmaz/onurclawtest-data
```

Use `--bucket`, not `--from-bucket`. The command points the deployment at the
durable state bucket. It is not a copy/import operation.

Rules:

- If the bucket does not exist, create it private.
- If the bucket exists and contains Hugging Claw/OpenClaw snapshots, treat it as
  adoption.
- Verify the bucket manifest and newest snapshot before starting a gateway.
- If a deployment manifest already exists and its bucket differs from
  `--bucket`, prompt for confirmation; automation requires `--yes`.
- If the target bucket has a live foreign runtime lease, refuse unless
  `--takeover` is supplied.
- Update the local manifest, local env file, and Space variables so all runtime
  targets use the same `OPENCLAW_HF_STATE_BUCKET`.
- Reset the local Docker live volume after a bucket change so startup restores
  from the adopted bucket instead of stale local disk.
- Do not silently discover or adopt older buckets from Telegram tokens, bot
  names, or account scans. Adoption must be explicit.

## User-Facing Commands

Bootstrap:

```bash
hclaw bootstrap --gateway local
hclaw bootstrap --gateway space
hclaw bootstrap --gateway local --bucket <owner/bucket>
hclaw bootstrap --gateway space --bucket <owner/bucket>
```

Operational commands:

```bash
hclaw state adopt <agent> --bucket <owner/bucket>
hclaw gateway start <agent>
hclaw gateway stop <agent>
hclaw gateway restart <agent>
hclaw gateway status <agent>
hclaw gateway logs <agent>
hclaw gateway migrate <agent> --to local
hclaw gateway migrate <agent> --to space
```

Settings:

```bash
hclaw settings <owner/space> --hardware cpu-upgrade --sleep-time -1
```

Do not use settings as a shortcut for gateway location changes. Gateway moves
must go through `hclaw gateway migrate` so the old runtime uploads a final
snapshot and stops before the new runtime starts.

The initial interactive prompt should be:

```text
Where should the gateway run?

Local machine
  No paid Space required for Telegram/Discord.
  Your machine must stay online.

Hugging Face Space
  Fully hosted and always-on.
  Requires paid Space hardware for Telegram/Discord.
```

Default to `local`.

## Runtime Image

Publish a reusable Hugging Claw runtime image:

```text
ghcr.io/osolmaz/huggingclaw-runtime:<version>
```

The image contains:

- OpenClaw runtime from `ghcr.io/openclaw/openclaw`;
- `hf-state-sync`;
- `openclaw.default.json`;
- Telegram configuration scripts;
- the shared entrypoint.

The npm package embeds the matching runtime image tag.

Local mode runs the runtime image with Docker. Space mode generates a Docker
Space that uses the same runtime image tag.

This avoids asking users to build from source locally or inside their Space.

## Local Gateway Target

Local mode creates:

```text
private HF Storage Bucket, created or explicitly adopted
local deployment manifest
local secret env file
Docker container running the shared runtime image
```

Local mode does not create or upgrade a paid Space by default.

Follow-up: local Docker operations must pin the Docker context used by each
deployment so Docker Desktop, Colima, OrbStack, and Linux Docker are not
silently mixed. See
[`2026-06-17-docker-context-binding-plan.md`](2026-06-17-docker-context-binding-plan.md).

Docker command shape:

```bash
docker run -d \
  --name huggingclaw-<agent> \
  --restart unless-stopped \
  --env-file ~/.config/huggingclaw/secrets/<agent>.env \
  -e OPENCLAW_LIVE_DIR=/tmp/huggingclaw-local/openclaw-live \
  -v huggingclaw-<agent>-live:/tmp/huggingclaw-local \
  ghcr.io/osolmaz/huggingclaw-runtime:<version>
```

The volume is mounted at the parent directory, not directly at
`OPENCLAW_LIVE_DIR`. Docker creates the mount point before the entrypoint runs;
keeping the live dir as a child path lets bucket restore distinguish a fresh
volume from already-restored live state.

Local requirements:

- Docker installed and running.
- HF token available locally.
- Telegram bot token available locally.
- Machine stays online for Telegram polling.

Local env file:

```text
HF_TOKEN=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_ALLOWED_USERS=...
OPENCLAW_GATEWAY_TOKEN=...
OPENCLAW_HF_STATE_BUCKET=<owner>/<bucket>
OPENCLAW_MODEL=<model>
OPENCLAW_AGENT_NAME=<agent>
```

Store the env file with `0600` permissions.

## Space Gateway Target

Space mode creates or updates:

```text
private HF Storage Bucket, created or explicitly adopted
private HF Docker Space
Space variables
Space secrets
paid Space hardware when Telegram/Discord is enabled
```

Generated Space files should be minimal:

```dockerfile
FROM ghcr.io/osolmaz/huggingclaw-runtime:<version>
```

Space mode must warn before paid hardware:

```text
This will upgrade the Space to paid Hugging Face hardware.
The default cpu-upgrade tier is currently $0.03/hour, about $21.90/month
if left running 24/7. Continue?
```

Automation requires `--yes`.

## Deployment Manifest

Maintain a local manifest per agent:

```text
~/.config/huggingclaw/deployments/<agent>.json
```

Example:

```json
{
  "version": 1,
  "agent": "research",
  "owner": "osolmaz",
  "bucket": "osolmaz/research-data",
  "space": "osolmaz/research",
  "gatewayLocation": "local",
  "model": "huggingface/google/gemma-4-26B-A4B-it",
  "runtimeImage": "ghcr.io/osolmaz/huggingclaw-runtime:0.2.0",
  "createdAt": "2026-06-16T00:00:00.000Z",
  "updatedAt": "2026-06-16T00:00:00.000Z"
}
```

This manifest is local convenience state. The bucket remains durable state.
Existing manifests must pin the bucket across future bootstrap/update runs.
Renaming the runtime agent or Space must not silently move identity/state to a
new bucket.

## State Adoption Protocol

Bucket adoption is a controlled state pointer change:

```text
stop current gateway
wait for final snapshot when a current gateway is running
validate target bucket
update manifest and runtime configuration
discard stale local live volume
start gateway
restore latest verified snapshot from adopted bucket
verify identity/state files
```

Detailed behavior:

1. Load the current deployment manifest for `<agent>`.
2. If a gateway is running, stop it through the normal gateway stop path and
   wait for its final snapshot.
3. Validate that `--bucket` is reachable and private to the user.
4. If the bucket is non-empty, require a recognizable Hugging Claw snapshot
   manifest or OpenClaw state layout.
5. If the bucket has a current runtime lease from another runtime, require
   `--takeover`.
6. Write `manifest.bucket = <owner/bucket>`.
7. Rewrite the local env file with `OPENCLAW_HF_STATE_BUCKET=<owner/bucket>`.
8. If the deployment has a Space, set the Space variable
   `OPENCLAW_HF_STATE_BUCKET=<owner/bucket>`.
9. Remove or recreate the local Docker live volume before restart.
10. Start the selected gateway location and verify the restore log references
    the adopted bucket.
11. For live verification, read `IDENTITY.md`, `SOUL.md`, and `USER.md` from
    the restored state and confirm they match the adopted bucket.

## Bucket Runtime Lease

Add a lightweight runtime lease/status object in the bucket:

```text
runtime/status.json
```

Example:

```json
{
  "schemaVersion": 1,
  "agent": "research",
  "runtimeId": "local-macbook-abc123",
  "gatewayLocation": "local",
  "runtimeImage": "ghcr.io/osolmaz/huggingclaw-runtime:0.2.0",
  "startedAt": "2026-06-16T00:00:00.000Z",
  "lastHeartbeatAt": "2026-06-16T00:05:00.000Z",
  "lastSnapshotId": "snapshots/2026-06-16T00-05-00.000Z.tar.zst"
}
```

Behavior:

- Gateway writes heartbeat periodically.
- `hclaw gateway status` reads the lease and local/Space runtime status.
- Starting a gateway refuses if another live lease exists.
- `--takeover` can replace a stale or intentionally abandoned lease.

This is not a perfect distributed lock; it is an operator safety mechanism to
avoid double Telegram polling.

## Migration Protocol

Migration is a controlled cutover:

```text
stop old gateway
wait for final snapshot
disable or pause old target
start new gateway
restore latest verified snapshot
write new runtime lease
```

### Local To Space

1. Confirm paid hardware if Space mode needs Telegram/Discord.
2. Disable Docker auto-restart for the local container.
3. Write a handoff request for the local runtime and wait for its final
   snapshot ack.
4. Stop the local Docker container if it is still running.
5. Create/update private Space with the shared runtime image.
6. Set Space secrets and variables.
7. Set `gatewayLocation` in manifest to `space`.
8. Start/restart Space.
9. Verify Space logs show restore and snapshot.
10. Update runtime lease to `space`.

### Space To Local

1. Set `HUGGINGCLAW_GATEWAY_DISABLED=1` on the Space, or prepare to pause/stop
   the Space.
2. Restart or stop the currently running Space. The current supervisor receives
   shutdown, waits for the child gateway to exit, and uploads a final snapshot.
   If the Space restarts, the replacement boot sees
   `HUGGINGCLAW_GATEWAY_DISABLED=1` and exits without polling Telegram.
3. If the Space has no live runtime lease, skip waiting for a handoff ack; no
   process is available to write it, so the latest bucket snapshot is the only
   recoverable state.
4. Reset the stale local Docker volume before starting the local gateway.
5. Start local Docker container with the shared runtime image.
6. Verify restore from bucket.
7. Set `gatewayLocation` in manifest to `local`.
8. Update runtime lease to `local`.

The old target must not keep polling Telegram after migration.

## Entrypoint Changes

Add a gateway-disable guard:

```bash
if [ "${HUGGINGCLAW_GATEWAY_DISABLED:-0}" = "1" ]; then
  echo "[huggingclaw] gateway disabled"
  exit 0
fi
```

Keep the current path discipline:

```text
OPENCLAW_LIVE_DIR=/tmp/openclaw-live
OPENCLAW_STATE_DIR=/tmp/openclaw-live/.openclaw
OPENCLAW_WORKSPACE_DIR=/tmp/openclaw-live/workspace
OPENCLAW_CONFIG_PATH=/tmp/openclaw-live/.openclaw/openclaw.json
```

Do not mount the bucket as a live filesystem.

## CLI Implementation Checklist

Implement the feature as one coherent cutover:

1. Add `gatewayLocation` types and parsing.
2. Add local deployment manifest read/write.
3. Add local secret env writer with `0600` permissions.
4. Add explicit state bucket handling:
   - `bootstrap --bucket <owner/bucket>`;
   - existing manifest bucket pinning;
   - target bucket validation;
   - non-empty bucket adoption confirmation;
   - `hclaw state adopt <agent> --bucket <owner/bucket>`;
   - local Docker live volume reset after bucket changes.
5. Add Docker adapter:
   - detect Docker;
   - pull runtime image;
   - start/stop/restart container;
   - read logs;
   - inspect status.
6. Add runtime image tag configuration.
7. Change `bootstrap` to accept `--gateway local|space`.
8. Make interactive bootstrap default to `local`.
9. Keep Space paid-hardware confirmation only for `--gateway space`.
10. Generate minimal Space files from the shared runtime image.
11. Add `hclaw gateway` command group.
12. Add migration commands with stop/snapshot/start checks.
13. Add runtime lease read/write/heartbeat support.
14. Update `doctor` to understand both local and Space gateway locations.
15. Update `README.md`, `docs/COSTS.md`, and
    `docs/MESSAGING_EGRESS.md`.

## Testing Checklist

Unit tests:

- gateway location parsing;
- agent name and default bucket derivation from Telegram bot username;
- explicit `--bucket` override;
- existing manifest bucket pinning across repeated bootstrap;
- bootstrap defaults;
- local manifest read/write;
- secret env file formatting and permissions;
- Docker command generation;
- Space file generation uses shared runtime image;
- paid hardware prompts only happen for Space gateway mode;
- state adoption validation and prompt behavior;
- migration ordering.

Integration tests with fakes:

- local bootstrap creates bucket and local manifest, but no Space;
- Space bootstrap creates bucket and Space and confirms paid hardware;
- bootstrap with `--bucket` points the deployment at the adopted bucket;
- `hclaw state adopt` stops the current gateway, updates manifest/env/Space
  variables, resets local volume, and restarts from the adopted bucket;
- non-empty bucket mismatch requires confirmation;
- live foreign lease requires `--takeover`;
- local-to-Space migration stops local before starting Space;
- Space-to-local migration disables Space before starting local;
- stale lease requires `--takeover`.

Live test:

- bootstrap local gateway against a test bucket and Telegram bot;
- send Telegram message and get response;
- stop/start local gateway and verify bucket restore;
- migrate to Space with paid hardware and verify response;
- migrate back to local and verify response;
- adopt a previously used identity bucket into a new runtime name and verify the
  restored `IDENTITY.md`, `SOUL.md`, and `USER.md` content;
- confirm only one gateway is polling at a time.

Live migration round trip:

1. Start with `hclaw bootstrap --gateway local` using a real test bot and test
   bucket.
2. Send a Telegram message that creates recognizable state, for example:
   `remember migration-check local-before-space`.
3. Confirm the local gateway replies.
4. Force or wait for a snapshot upload.
5. Run `hclaw gateway migrate <agent> --to space`.
6. Confirm the local Docker container is stopped.
7. Confirm the Space starts, restores the latest verified snapshot, and writes
   a `space` runtime lease.
8. Ask the bot about `migration-check local-before-space`; it must remember the
   value.
9. Send another Telegram message that creates new Space-side state, for
   example: `remember migration-check space-before-local`.
10. Force or wait for a snapshot upload.
11. Run `hclaw gateway migrate <agent> --to local`.
12. Confirm the Space gateway is disabled, paused, or otherwise not polling.
13. Confirm the local Docker container starts, restores the latest verified
    snapshot, and writes a `local` runtime lease.
14. Ask the bot about both remembered values:
    `migration-check local-before-space` and
    `migration-check space-before-local`.

The migration round trip is passing only if:

```text
same bot
same bucket
same agent memory before and after both migrations
no lost state written on either side
exactly one gateway polling Telegram at any time
```

Do not mark the feature production-ready until a live local -> Space -> local
round trip has passed.

## Documentation Changes

README should lead with:

```text
Gateway location decides where the live OpenClaw gateway runs.

local: runs on your machine; cheaper, no paid Space required for Telegram.
space: runs in Hugging Face Spaces; fully hosted, requires paid Space hardware.
```

Cost docs should show:

- local gateway: no fixed paid Space cost;
- Space gateway: `cpu-upgrade` fixed cost;
- both still pay model inference usage;
- both still use HF bucket storage.

Messaging docs should stay explicit that free Spaces block Telegram/Discord
egress today.

## Non-Goals

- No shared Telegram proxy as the default.
- No mounted bucket live filesystem.
- No implicit bucket discovery or adoption from Telegram credentials.
- No bucket copy/import as part of `state adopt`; adoption changes the durable
  bucket pointer.
- No separate local OpenClaw installer path.
- No local native OpenClaw dependency installation as the default.
- No guarantee that two gateways can safely run against one bot at the same
  time.
