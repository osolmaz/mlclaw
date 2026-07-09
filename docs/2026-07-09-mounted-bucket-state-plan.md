# Mounted Bucket State Cutover

Date: 2026-07-09

## Problem

ML Claw Space deployments currently pass the user's local Hugging Face token into
the generated Space as `HF_TOKEN` and `HUGGINGFACE_HUB_TOKEN`. The runtime uses
that token to read and write Storage Bucket snapshots through the Hub API.

That gives the Space and every child process broad account credentials. It also
makes routine state sync depend on a credential that should stay on the user's
machine.

## Target Architecture

The local `mlclaw` CLI remains the privileged provisioner. It creates or updates
the private Storage Bucket, private Space, Space variables, Space secrets, and
Space volume mounts.

The Space runtime is unprivileged:

- no personal `HF_TOKEN` or `HUGGINGFACE_HUB_TOKEN` secret is stored in app
  Spaces;
- Hugging Face Router inference uses a separate `MLCLAW_ROUTER_TOKEN` secret
  when the selected model needs the HF Router;
- the private bucket is mounted read-write into the Space at
  `/data/mlclaw-state`;
- live OpenClaw state stays on normal local container disk at
  `/home/node/.local/share/mlclaw/live`;
- `hf-state-sync` restores from and snapshots to the mounted bucket directory;
- the mounted bucket contains only verified durable snapshots, manifests,
  leases, and handoff files.

OpenClaw must never run its SQLite database directly from the mounted bucket.
The bucket mount is a snapshot target, not the live database filesystem.

## Implementation

1. Add Hub API support for Space volumes:
   - `PUT /api/spaces/{repo_id}/volumes`;
   - preserve unrelated existing volumes when adding the ML Claw bucket mount;
   - expose runtime volume metadata through `getSpaceRuntime`.

2. Add filesystem-backed state sync storage:
   - select mounted-bucket sync when `MLCLAW_STATE_MOUNT_DIR` is set;
   - keep existing API-backed sync for local gateway mode;
   - write remote object keys under the configured state prefix inside the
     mount.

3. Change Space provisioning:
   - set `MLCLAW_STATE_MOUNT_DIR=/data/mlclaw-state`;
   - set `OPENCLAW_LIVE_DIR=/home/node/.local/share/mlclaw/live`;
   - attach the deployment bucket as a read-write Space volume;
   - do not write `HF_TOKEN` or `HUGGINGFACE_HUB_TOKEN` as Space secrets;
   - write only `MLCLAW_ROUTER_TOKEN` for Router model inference;
   - delete old token secrets from existing app Spaces during bootstrap,
     update, or `doctor --fix`.

4. Change Space diagnostics:
   - `doctor` reports a missing or wrong ML Claw bucket volume;
   - `doctor --fix` attaches the correct bucket volume and removes stale token
     secrets;
   - `doctor` no longer requires an HF token secret for app Spaces.

5. Keep privileged settings local:
   - persistent Space mutations remain CLI-owned;
   - the browser runtime can operate without a Hub owner token.

## Validation

- Unit test mounted storage snapshot/restore.
- Unit test bootstrap does not write HF token secrets and does set the bucket
  volume.
- Unit test default Space bootstrap requires a Router token and stores it as
  `MLCLAW_ROUTER_TOKEN`.
- Unit test doctor reports/fixes missing volume and stale token secrets.
- Run `npm run build`, `npm test`, `npm run typecheck`, and
  `npm run check:secrets`.
- Recreate only the requested test resources:
  - `osolmaz/mlclaw`
  - `osolmaz/mlclaw-data`
  - `osolmaz/mlclaw-test`
  - `osolmaz/mlclaw-test-data`
