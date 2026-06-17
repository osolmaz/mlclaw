# Docker Context Binding Implementation Plan

Status: planned follow-up after PR #5

## Problem

Local gateway mode currently uses whichever Docker engine the user's shell is
pointed at when the command runs.

On macOS this can silently switch between separate Docker worlds:

```text
desktop-linux  Docker Desktop
colima         Colima VM
orbstack       OrbStack
```

A container running in one context is invisible from the others. A deployment
can be started under Colima, then later inspected or stopped from Docker
Desktop and appear missing. More importantly, a gateway handoff can lose local
state if the old context cannot upload a final snapshot before the new context
restores from the bucket.

The fix is not to force Docker Desktop. The fix is to bind each local
deployment to one explicit Docker context and use that context consistently for
all local gateway operations.

## Decision

Store the Docker context as the canonical local gateway binding in the local
deployment manifest.

Store endpoint and engine details only for diagnostics.

Example manifest shape:

```json
{
  "version": 1,
  "agent": "research",
  "gatewayLocation": "local",
  "localGateway": {
    "engine": "docker",
    "dockerContext": "desktop-linux",
    "dockerEndpoint": "unix:///Users/onur/.docker/run/docker.sock"
  }
}
```

All later local gateway commands must use:

```bash
docker --context <manifest.localGateway.dockerContext> ...
```

Do not rely on the shell's current Docker context after a deployment has been
created.

## User-Facing Behavior

Bootstrap should detect and pin the current Docker context by default:

```bash
hclaw bootstrap --gateway local
```

Users can choose a context explicitly:

```bash
hclaw bootstrap --gateway local --docker-context desktop-linux
```

Status should show the pinned local engine clearly:

```text
Agent: research
Gateway: local
Docker: desktop-linux
Endpoint: unix:///Users/onur/.docker/run/docker.sock
Bucket: osolmaz/research-data
Container: running
```

If the user's current shell context differs from the pinned context, commands
should warn but still use the pinned context:

```text
Using Docker context desktop-linux from the deployment manifest.
Current shell context is colima.
```

If the pinned context no longer exists, commands should fail with a concrete
repair path:

```text
Docker context desktop-linux is not available.
Run `hclaw gateway rebind research --docker-context <context>` to move this
local gateway to another Docker engine.
```

## Rebind Command

Changing Docker contexts is a local runtime migration, not a string update.

Add:

```bash
hclaw gateway rebind <agent> --docker-context <context>
```

The rebind command must:

1. Load the current deployment manifest.
2. Use the old pinned Docker context to stop the current local gateway.
3. Wait for a final bucket snapshot when the old gateway is running.
4. Validate that the target Docker context exists and can run containers.
5. Update `manifest.localGateway.dockerContext`.
6. Refresh diagnostic endpoint metadata.
7. Remove or recreate the local live volume in the target context.
8. Start the gateway in the target context.
9. Verify restore from the bucket.
10. Verify the target context writes the local runtime lease.

If the old context is unavailable, rebind should require `--takeover` because
there is no process available to write a final snapshot.

## CLI Contract

Add `--docker-context <name>` to local gateway entry points:

```bash
hclaw bootstrap --gateway local --docker-context desktop-linux
hclaw gateway start <agent> --docker-context desktop-linux
hclaw gateway rebind <agent> --docker-context desktop-linux
```

Rules:

- `bootstrap --docker-context` sets the initial pinned context.
- `gateway start --docker-context` can set the context only when no context is
  already pinned.
- If a context is already pinned and `gateway start --docker-context` differs,
  fail and tell the user to run `gateway rebind`.
- `gateway stop`, `restart`, `status`, `logs`, and `migrate --to local` must
  use the pinned context.
- `gateway migrate --to space` must stop the local gateway through the pinned
  context before starting the Space.
- `gateway migrate --to local` must start the local gateway through the pinned
  context.

## Docker Adapter Changes

The Docker adapter should accept an optional context on every operation:

```ts
docker(["--context", context, "ps"])
```

Context handling should be centralized so commands do not hand-roll Docker
argument ordering.

The adapter should expose:

- `currentContext()`;
- `contextExists(name)`;
- `contextEndpoint(name)`;
- `listContexts()`;
- context-aware `start`, `stop`, `inspect`, `logs`, `volume rm`, and `run`.

## Migration Safety

The bucket remains the durable state source.

Docker context rebind must never copy Docker volumes directly between engines.
It should use the existing snapshot/restore protocol:

```text
old context -> final bucket snapshot -> target context restore
```

This keeps Colima, Docker Desktop, OrbStack, and Linux Docker behavior the
same. It also avoids depending on local VM internals or volume storage paths.

## Testing Checklist

Unit tests:

- manifest read/write preserves `localGateway.dockerContext`;
- bootstrap pins the current Docker context by default;
- bootstrap respects explicit `--docker-context`;
- local gateway operations pass `--context <pinned>` to Docker;
- shell context mismatch produces a warning but uses the pinned context;
- missing pinned context fails with a rebind hint;
- `gateway start --docker-context` refuses to silently change an existing
  pinned context;
- `gateway rebind` orders stop, final snapshot wait, manifest update, volume
  reset, start, and restore verification.

Live test:

1. Bootstrap a local test gateway with `--docker-context colima`.
2. Confirm it is visible in Colima and not Docker Desktop.
3. Send a Telegram message and wait for a snapshot.
4. Run `hclaw gateway rebind <agent> --docker-context desktop-linux`.
5. Confirm Colima container is stopped.
6. Confirm Docker Desktop container is healthy.
7. Confirm the restored state includes the message sent before rebind.
8. Confirm only the Docker Desktop container is polling Telegram.
9. Confirm later snapshots upload from the Docker Desktop runtime.

## Non-Goals

- Do not force Docker Desktop.
- Do not support two local Docker contexts polling one Telegram bot at once.
- Do not copy Docker volumes between contexts.
- Do not make Docker context binding part of durable bucket state.
- Do not use Docker context selection for Space gateway mode.
