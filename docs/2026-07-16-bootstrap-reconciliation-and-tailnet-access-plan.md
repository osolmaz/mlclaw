# Bootstrap Reconciliation and Tailnet Access Implementation Plan

Status: implemented (2026-07-16)

## Objective

Turn `mlclaw bootstrap` into the single safe command for creating,
reconfiguring, resuming, and recovering an ML Claw deployment.

At the same time, replace the current boolean Tailscale Serve integration with
three explicit tailnet access modes:

- `off`: listen only on loopback;
- `direct`: listen on loopback and the host's exact Tailscale address;
- `serve`: keep the gateway on loopback and publish it through Tailscale
  Serve.

This is a cutover. Do not retain parallel legacy command paths, boolean
Tailscale semantics, duplicate state formats, or a second implementation for
reconfiguration. Existing state may be imported once, then all reads and
writes must use the new model.

## Problems to Solve

The current bootstrap path behaves primarily as an initial provisioning
command. A failed bootstrap can roll back the local manifest and leave the next
run without enough context to explain or resume the interrupted operation.
Reconfiguration is spread across bootstrap, gateway, state, and settings
commands rather than being driven by one desired-state reconciliation path.

Deployment discovery currently depends on the caller knowing an agent name.
That is unnecessary when there is exactly one trusted local deployment, and it
prevents recovery when local state has been lost but the durable bucket still
exists.

The current `--tailscale` flag means Tailscale Serve. Serve is useful for HTTPS,
but enabling it may require a one-time tailnet administrator approval. That
approval is currently treated as a deployment failure. A connected Tailscale
node can instead expose an exact host port directly to tailnet peers without
Serve, while retaining ML Claw application authentication.

## Product Contract

### One rerunnable command

The normal command is:

```bash
mlclaw bootstrap
```

It behaves as follows:

| Detected state                        | Interactive behavior                  | Non-interactive behavior               |
| ------------------------------------- | ------------------------------------- | -------------------------------------- |
| No deployment                         | Ask for a new agent name              | Require `--name`                       |
| One deployment                        | Select it automatically               | Select it automatically                |
| Multiple deployments                  | Show a selector                       | Require `--name` or `--deployment-id`  |
| One interrupted operation             | Offer resume, reconfigure, or cleanup | Resume only with an explicit flag      |
| Remote deployment with no local cache | Offer recovery after validation       | Require explicit recovery confirmation |

`--name` remains available for creating another deployment, disambiguating
multiple deployments, and automation. It is not required for the common
single-deployment rerun.

Add `mlclaw configure` as a discoverability alias backed by the same bootstrap
reconciler. It must not have separate behavior or state handling.

### Reconfiguration semantics

- Interactive reruns prefill every answer from current desired state.
- Unspecified non-interactive flags preserve current values.
- Explicit flags replace the corresponding desired values.
- The confirmation screen shows a semantic diff, not a full repeated plan.
- No-op reruns verify observed state and report that the deployment already
  matches its desired configuration.
- Existing state buckets and snapshots are preserved unless the user explicitly
  requests destructive cleanup.
- A failed change restores the previous working runtime where possible and
  remains resumable where rollback would discard useful progress.

Example:

```text
Existing deployment found: mlclaw

Gateway location: local
Container runtime: Podman default connection
Tailnet access: off -> direct
Gateway port: 7860

Apply these changes?
```

### Tailnet access flow

When Tailscale is installed, online, and has an exact node address, interactive
local bootstrap asks:

```text
Make this gateway available on your tailnet?

No, this machine only
Yes
```

When the answer is yes, ask:

```text
How should tailnet access work?

Direct private link - no additional setup
HTTPS with Tailscale Serve - may require administrator approval
```

Do not conflate these states:

- Tailscale binary installed;
- node authenticated and online;
- MagicDNS available;
- Tailscale Serve enabled for the tailnet;
- the requested Serve mapping active on this node.

Automation must choose explicitly:

```bash
mlclaw bootstrap --tailscale=off
mlclaw bootstrap --tailscale=direct
mlclaw bootstrap --tailscale=serve
```

Replace `--tailscale`, `--no-tailscale`, and their boolean interpretation with
the required mode value. `--tailscale-port` remains valid for `direct` and
`serve`, and is invalid with `off`.

## Canonical State Model

### Authority boundaries

The bucket is the canonical durable deployment record. The local configuration
is a cache plus host-specific binding state.

Store portable desired configuration in the bucket:

- stable deployment identity;
- agent and resource identifiers;
- state prefix;
- gateway location preference;
- model and runtime image selection;
- tailnet access mode preference;
- portable Space configuration;
- desired-state generation.

Keep these values local only:

- credentials, tokens, session secrets, and encryption keys;
- Docker contexts and endpoints;
- Podman connections and endpoints;
- current Tailscale IP and DNS name;
- concrete host port bindings;
- local process IDs and lock ownership;
- machine-specific capability results.

A recovered deployment may preserve `tailscaleMode: direct`, but it must
rediscover and confirm the new host's concrete Tailscale binding before
starting. Never copy a previous machine's Tailscale IP or container endpoint.

### Bucket objects

Use a reserved control prefix separate from snapshot state:

```text
.mlclaw/deployment.json
.mlclaw/desired-state.json
.mlclaw/operations/<operation-id>.json
.mlclaw/tombstone.json
```

`deployment.json` contains immutable identity:

```json
{
  "schemaVersion": 1,
  "deploymentId": "019f6b91-7a61-7ae0-b402-cc2b19fa2345",
  "agent": "mlclaw",
  "owner": "example-user",
  "bucket": "example-user/mlclaw-data",
  "statePrefix": "openclaw-state",
  "credentialKeySha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "createdAt": "2026-07-16T00:00:00.000Z"
}
```

`desired-state.json` contains mutable portable configuration:

```json
{
  "schemaVersion": 1,
  "deploymentId": "019f6b91-7a61-7ae0-b402-cc2b19fa2345",
  "generation": 4,
  "updatedAt": "2026-07-16T00:10:00.000Z",
  "gateway": {
    "location": "local",
    "port": 7860,
    "tailscaleMode": "direct"
  },
  "model": "huggingface/zai-org/GLM-5.2:fireworks-ai",
  "runtimeImage": "ghcr.io/huggingface/mlclaw:0.3.8-openclaw-2026.7.1",
  "space": {
    "repo": "example-user/mlclaw",
    "visibility": "private"
  }
}
```

All documents must use strict schemas, reject unknown fields, contain no
secrets, and have explicit size limits. Add schema fixtures and round-trip tests.

### Local cache

Replace the current manifest as the source of truth with a local cache that
records:

- deployment ID and last observed remote generation;
- canonical bucket ID;
- host-specific container runtime binding;
- concrete network bindings discovered for this machine;
- last successful reconciliation time;
- active or last operation ID.

Write local files atomically with `0600` permissions. Keep secret env files
separate and never copy their values into bucket control documents or operation
logs.

### One-time import

On the first cutover run, import a current version 1 local manifest into the new
bucket records after validation and confirmation. Rewrite the local file into
the new cache format immediately. Do not maintain dual reads or dual writes
after import.

When a known existing bucket has no deployment marker, offer a one-time marker
backfill only when all of these are true:

- the authenticated owner matches the bucket namespace;
- the local manifest explicitly pins that bucket;
- the state manifest validates;
- no conflicting deployment marker exists;
- the user confirms the import interactively or passes an explicit automation
  flag.

## Discovery and Recovery

Use this precedence order:

1. Local deployment caches.
2. Local incomplete operation journals.
3. Remote bucket deployment records owned by the authenticated HF identity.

Do not infer deployments from bucket names such as `*-data`, Space names,
Telegram bot names, or arbitrary snapshot-looking files.

Remote discovery must:

- authenticate first and resolve the exact user identity;
- list buckets visible in that user's namespace;
- probe only `.mlclaw/deployment.json` with bounded concurrency;
- apply per-request and whole-scan timeouts;
- enforce object size and strict schema limits before parsing;
- verify `owner`, `bucket`, and authenticated identity agree;
- ignore malformed or foreign markers while reporting a bounded diagnostic;
- cache successful discovery locally;
- require confirmation before recovering a deployment not previously trusted on
  the current machine.

If there are many buckets, scan with a small fixed concurrency, initially four.
Do not make a full remote scan part of every normal command when a valid local
cache exists.

Recovery reconstructs portable configuration and asks for new host-local
runtime choices. It never claims to recover local-only secrets. Missing secrets
must be regenerated or requested through the normal credential flow.

## Reconciliation Engine

Extract reconciliation from `src/mlclaw/cli.ts`. The CLI layer should parse
arguments, collect interactive answers, render plans, and invoke one engine.

Suggested ownership boundaries:

```text
src/mlclaw/deployment-schema.ts
src/mlclaw/deployment-store.ts
src/mlclaw/deployment-discovery.ts
src/mlclaw/deployment-lock.ts
src/mlclaw/operation-journal.ts
src/mlclaw/reconciler.ts
src/mlclaw/network-access.ts
src/mlclaw/tailscale.ts
```

The engine receives:

- current canonical desired state, if any;
- current local cache and secrets;
- observed Hub, container, Space, and Tailscale state;
- requested overrides;
- interaction and automation policy.

It returns a typed plan composed of bounded, named actions with:

- preconditions;
- apply behavior;
- verification behavior;
- rollback behavior;
- whether interruption is resumable;
- whether the action is destructive;
- redacted user-facing detail.

### Reconciliation sequence

1. Acquire the per-deployment local lock.
2. Discover and select the deployment.
3. Load and validate canonical and local state.
4. Observe external state without mutation.
5. Merge explicit overrides into existing desired state.
6. Collect missing interactive choices.
7. Validate the full target state and host capabilities.
8. Render and confirm the semantic plan.
9. Acquire the remote control lease when a bucket exists.
10. Persist a local operation journal and remote redacted operation record.
11. Write the target desired generation according to the storage concurrency
    contract.
12. Apply actions in dependency order.
13. Verify the gateway, state lease, access URLs, and persisted configuration.
14. Mark the operation complete and update the local cache.
15. Release the remote lease and local lock.

Do not stop a working gateway until replacement prerequisites have passed.
When a container restart is required, retain enough previous configuration to
recreate the old container and bindings if the new startup fails.

### Storage concurrency contract

HF Bucket object writes do not expose the compare-and-swap contract required for
strict lease acquisition. Each deployment therefore has a generated private
model repository named `mlclaw-control-<deployment-id>`. Its
`control-lease.json` is updated through Hub commits with `parentCommit`, making
acquisition, renewal, and release atomic against the repository head.

The control contract is:

- acquire with conditional create or update;
- include deployment ID, operation ID, holder ID, fencing token, generation,
  acquired time, and expiry;
- renew before half the lease duration;
- require the current repository revision and fencing token before every
  canonical or external mutation;
- fail closed when lease ownership cannot be verified.

Desired state is committed to the bucket only after the corresponding apply
succeeds. Failed applies therefore remain retryable. Remote recovery records a
SHA-256 fingerprint of the credential-encryption key, requires the existing key
to be restored through `MLCLAW_CREDENTIAL_KEY`, and rejects a mismatched key;
it never rotates the key silently.

Local locking should use atomic exclusive file creation, record process and host
identity, and have explicit stale-lock recovery. A PID alone is insufficient.

## Resumable Operations

Operation states are:

```text
planned
applying
waiting_for_approval
verifying
rolling_back
completed
failed
cleaned
```

The journal stores action IDs and redacted results, never command output that
may contain credentials or authenticated gateway fragments.

On interruption, the next `bootstrap` run must inspect both local and remote
records and offer:

- resume the same target generation;
- reconfigure by superseding it with a new generation;
- clean up artifacts created only by the interrupted operation.

Cleanup must be ownership-aware and exact. It may remove only resources whose
deployment ID and operation ID match the journal. Never delete a bucket, Space,
container, volume, or Tailscale handler based only on a name.

An approval wait is not a failure. Keep the loopback gateway working, persist
`waiting_for_approval`, print the approval URL clearly, and let the user approve
then continue the same operation.

## Tailscale Direct Mode

Direct mode uses the tailnet as the private network and does not invoke
`tailscale serve`.

Discovery must obtain and validate:

- `BackendState === "Running"`;
- the local node is online;
- one exact Tailscale IPv4 address;
- the normalized MagicDNS name when available;
- the current tailnet identity for diagnostics.

Refactor container publishing from one host binding into a list:

```ts
type PublishedPort = {
  hostAddress: string;
  hostPort: number;
  containerPort: number;
};
```

For direct mode, publish exactly:

```text
127.0.0.1:<port> -> container:<port>
<tailscale-ipv4>:<port> -> container:<port>
```

Rules:

- Never publish to `0.0.0.0` or `::`.
- Keep the loopback URL available on the host.
- Add only exact loopback and tailnet origins to `MLCLAW_ACCESS_ORIGINS`.
- Keep ML Claw session authentication in front of OpenClaw.
- Print the exact authenticated tailnet URL only after reachability checks pass.
- Prefer a verified MagicDNS URL for display and retain the raw IP URL as a
  diagnostic fallback.
- Explain that direct mode is HTTP at the browser layer even though Tailscale
  encrypts traffic between peers.
- Treat Tailscale ACLs or grants as an additional network boundary, not a
  replacement for ML Claw authentication.
- Rediscover the address on every start. Recreate bindings transactionally when
  the address changes.
- Reject direct mode for remote Docker or Podman endpoints because the CLI
  host's Tailscale interface is not the container host's interface.

Probe direct binding support on Linux Docker, rootless Podman, macOS Docker
Desktop, Colima, OrbStack, and Windows Docker Desktop/Podman. If an engine cannot
bind the exact Tailscale address, fail with a concrete Serve or SSH-forwarding
alternative. Do not silently widen the listener.

## Tailscale Serve Mode

Serve mode keeps only the loopback container binding and owns one exact Serve
HTTPS mapping.

Retain the current safety rules:

- do not enable Funnel;
- do not reset the Serve configuration;
- refuse an occupied or drifted port;
- remove only an exact ML Claw-owned mapping;
- preserve unrelated handlers;
- verify the mapping after creation and removal.

Improve approval handling:

1. Start and verify the loopback gateway.
2. Attempt the exact Serve mapping.
3. If Tailscale returns an administrator approval URL, extract and validate the
   HTTPS URL.
4. Persist `waiting_for_approval` without rolling back the gateway.
5. Display a dedicated approval panel that distinguishes tailnet Serve approval
   from node login.
6. Offer to wait and retry, switch to direct mode, or continue loopback-only.
7. Mark the operation complete only after the mapping reads back as owned.

Never print a tailnet gateway URL before the corresponding listener or Serve
mapping is verified reachable.

## Gateway and Migration Integration

All commands that change gateway state must call the reconciler rather than
reimplement network transitions.

- `gateway start` reconciles the persisted desired state.
- `gateway restart` requests a forced runtime refresh through the same plan.
- `gateway migrate --to local` resolves host-local runtime and tailnet
  capabilities before pausing the Space.
- `gateway migrate --to space` removes only an owned Serve mapping and stops
  direct listeners with the local container.
- `gateway rebind` validates that direct or Serve access remains local before
  touching the old runtime.
- `state adopt` changes the canonical bucket only through a fenced operation.
- `settings` updates canonical desired state before reconciling Space settings.

Concrete host bindings remain local even when the portable desired mode is
preserved across migration. Automation must fail clearly when the destination
host cannot satisfy that mode; interactive flows may choose another mode.

## Failure and Rollback Rules

- Preflight all credentials, ports, runtime endpoints, and network capabilities
  before stopping a healthy gateway.
- Never delete durable bucket state as generic rollback.
- Preserve a newly created bucket with an incomplete operation record when that
  enables safe resume; offer exact cleanup separately.
- Restore previous local secrets and container bindings when a reconfiguration
  fails after mutation.
- Keep the previous desired generation in the operation record until the new
  generation is verified.
- Aggregate the primary and rollback errors without exposing secrets.
- If rollback cannot be verified, mark the deployment degraded and stop instead
  of pretending the previous state was restored.
- A failed tailnet listener must not leave an unintended LAN or wildcard
  listener.

## Testing Strategy

### Schema and storage tests

- Strictly validate every bucket and local document.
- Reject unknown fields, duplicate keys, oversized objects, invalid IDs, foreign
  owners, and mismatched bucket IDs.
- Prove bucket documents and journals never contain known secret fixtures.
- Test atomic local writes and permissions.
- Test desired-state generation conflicts and lease expiry/fencing behavior.
- Test one-time manifest import and marker backfill.

### Discovery tests

- Zero local and zero remote deployments starts creation.
- One local deployment is selected without `--name`.
- Multiple local deployments require selection.
- One interrupted journal is detected before remote scanning.
- One marked remote bucket is recoverable.
- Multiple marked buckets require selection.
- Name-shaped unmarked buckets are ignored.
- Foreign, malformed, slow, and oversized markers are bounded and ignored.
- Remote recovery requests missing local secrets instead of inventing them.

### Reconciliation tests

- A no-op rerun performs observation but no external mutation.
- Unspecified flags preserve current desired values.
- Explicit overrides produce the expected semantic diff.
- A failed replacement restores the previous running gateway.
- Interruption at every action boundary resumes idempotently.
- Cleanup removes only operation-owned artifacts.
- Concurrent local operations are rejected.
- Conflicting remote generations and leases fail closed.
- Status distinguishes desired, observed, pending, and degraded state.

### Direct mode tests

- Generate loopback and exact Tailscale bindings.
- Reject wildcard addresses and remote container endpoints.
- Add only exact allowed origins.
- Preserve the local URL while direct access is enabled.
- Reconcile an IP change without losing the previous working gateway on failure.
- Remove the tailnet listener when switching to `off` or `serve`.
- Verify Docker and Podman command arguments for multiple exact bindings.
- Verify HTTP and WebSocket access through the Tailscale address.

### Serve mode tests

- Preserve unrelated handlers and reject conflicts.
- Parse and retain a valid approval URL without treating it as node login.
- Persist `waiting_for_approval` while loopback remains healthy.
- Resume after approval and verify the exact mapping.
- Switch from an approval wait to direct or off without stale Serve state.
- Remove only an exact owned mapping on stop or migration.

### End-to-end acceptance

Use Bob's unprivileged account and rootless Podman for the final local test:

1. Start with no ML Claw local deployment state.
2. Run `mlclaw bootstrap` without `--name` and create one deployment.
3. Select direct tailnet access.
4. Verify the container binds loopback and the exact Tailscale IP, never a
   wildcard.
5. Verify local HTTP, tailnet HTTP, WebSocket, and authenticated browser session
   flows.
6. Rerun `mlclaw bootstrap` without `--name`; verify automatic selection.
7. Change direct to off, then direct to Serve.
8. Exercise the Serve approval wait and resume path without losing the local
   gateway.
9. Interrupt a reconfiguration and resume it.
10. Remove the local cache and recover from the bucket marker.
11. Verify the bucket records contain no credentials or authenticated URL
    fragments.
12. Verify Bob remains without `sudo` or Docker-group access.

Run the complete repository gates, packed-install test, and Slophammer checks.
Run Codex review against the base branch and address P0/P1 findings before
merge. Mutation testing remains non-blocking.

## Implementation Sequence

Implement in coherent commits on one branch, but release as one cutover:

1. Add strict canonical schemas, storage adapters, local cache migration, and
   tests.
2. Add discovery, selection, local locking, remote lease capability detection,
   and recovery tests.
3. Extract the typed reconciler and operation journal from the CLI monolith.
4. Move existing bootstrap, gateway, state, and settings mutations behind the
   reconciler without maintaining alternate paths.
5. Refactor container port publishing to exact binding lists.
6. Implement direct mode and cross-platform capability failures.
7. Convert Serve mode to the new mode contract and resumable approval state.
8. Replace the interactive bootstrap flow and non-interactive flags.
9. Add one-time import, interrupted-operation cleanup, and remote recovery.
10. Update README, the bundled skill, generated bundles, package smoke tests,
    and release notes.
11. Run the full local, Bob-account, tailnet, CI, review, and installation gates.

Do not publish an intermediate package where bucket state is canonical but some
commands still mutate only the old local manifest.

## Documentation Changes

Update the live README and bundled ML Claw skill to document:

- rerunnable bootstrap and automatic deployment selection;
- remote bucket recovery;
- the difference between direct and Serve tailnet access;
- HTTP-over-tailnet versus HTTPS Serve security properties;
- approval wait and resume behavior;
- automation examples and disambiguation rules;
- recovery limitations for local-only secrets;
- exact cleanup behavior for interrupted operations.

Mark superseded implementation plans as implemented or superseded where their
old source-of-truth or Tailscale contracts conflict with this cutover. Keep
historical plans dated rather than rewriting them as live documentation.

## Definition of Done

The cutover is complete when:

- a user with one deployment can rerun `mlclaw bootstrap` without naming it;
- first setup, reconfiguration, interruption, and remote recovery use one
  reconciler;
- the bucket contains validated canonical identity and portable desired state;
- local runtime bindings and all credentials remain local;
- direct mode produces a verified private tailnet link without Tailscale Serve;
- Serve approval pauses and resumes instead of rolling back deployment;
- no command creates wildcard listeners or overwrites unrelated Serve config;
- generation conflicts and active operation leases fail closed;
- failed changes either restore the verified previous gateway or report a
  durable degraded state;
- current manifests are imported once with no ongoing dual-format behavior;
- all unit, integration, packed-install, Bob-account, tailnet, CI, Slophammer,
  and required review gates pass;
- the merged package is reinstalled and the documented rerun flow succeeds from
  Bob's account without elevated privileges.
