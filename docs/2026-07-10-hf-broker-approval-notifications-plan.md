# HF Broker Approval Notifications Plan

Date: 2026-07-10

Status: ML Claw integration implemented and under validation. The verified
Brokerkit operator surface is integrated through the generic operator broker
registry. Live rollout remains blocked on HF Broker's typed `/v1/models` and
`/v1/chat/completions` inference routes. ML Claw deliberately reports unhealthy
until those routes exist rather than falling back to a directly exposed Hugging
Face token.

## Goal

ML Claw should let OpenClaw use Hugging Face inference, reads, and reversible
writes without exposing the user's real Hugging Face token to the agent.
Operations that require human approval should appear as a lightweight
notification experience inside the ML Claw UI: a toast, unread badge, and
collapsible request drawer with inline approve and reject actions.

Telegram is not part of this design.

## Product Decision

Use `hf-broker` as the credential firewall inside the ML Claw runtime image.
Keep the broker, ML Claw control plane, and OpenClaw in the same Space, but run
them as separate Unix users with enforced file, process, environment, and
socket boundaries.

The resulting trust model is:

```text
browser owner
    |
    | Hugging Face OAuth session
    v
ML Claw control plane (trusted Unix user)
    |
    | dedicated operator HTTP listener and credential
    v
hf-broker (broker Unix user) ---- real HF token ----> Hugging Face
    ^
    | agent client secret over localhost
    |
OpenClaw (untrusted agent Unix user)
```

OpenClaw may know and exfiltrate its broker client secret. That secret allows
only the broker's agent surface. It can never approve a request, read the real
token, alter broker policy, or call arbitrary Hub administration APIs.

## User Experience

### Normal Operation

The user should not have to manage the broker during ordinary use.

- Router inference passes through the broker automatically.
- Read-only Hub operations pass through automatically.
- Git pushes allowed by the append-only policy pass through automatically.
- Refused operations return a clear broker error to the agent.
- Grantable operations create a pending approval request instead of requiring
  Telegram or a terminal command.

### Notification Trigger

The ML Claw control surface should expose one compact notification button with
a familiar bell icon and unread-count badge. It should be available from the
ML Claw control UI and from the small ML Claw overlay injected into the
OpenClaw browser gateway.

When a new request arrives:

1. Show a short toast naming the action and target.
2. Increment the unread badge.
3. Keep the request pending even if the toast disappears.
4. Clicking the toast or bell opens the approval drawer.

The toast must never approve an operation by itself.

### Approval Drawer

The drawer should overlay the right side of the current page and collapse back
to the bell without navigating away. On narrow screens it may occupy the full
viewport width.

The drawer has two views:

- `Pending`: newest requests first;
- `History`: approved, denied, expired, revoked, consumed, and failed
  requests.

Each compact request row shows:

- operation label;
- resource and exact ref, object, or prefix;
- agent-provided reason;
- requested time and expiry;
- risk level;
- current status.

Expanding a row shows:

- the canonical execution plan or exact window grant;
- before and after values when applicable;
- maximum uses and duration;
- plan hash;
- broker policy that allowed the request to be proposed;
- audit events already recorded for the request.

Pending rows provide inline `Approve` and `Deny` actions. Approval requires a
brief confirmation that repeats the exact target and effect. Denial may
optionally include a short reason that is returned to the agent.

The drawer updates in place after a decision. It must not remove failed or
ambiguous executions from history.

### Agent Feedback

When the agent requests approval, the broker returns a stable request ID and
pending status. OpenClaw should tell the user that approval is waiting in the
ML Claw notification drawer.

After the decision, the agent can poll the request or receive the terminal
result through the broker client API. Retries with the same client request ID
must return the existing request rather than create duplicate notifications.

## Runtime Isolation

The notification UI is only trustworthy if the agent cannot modify the ML
Claw control plane or use its operator credentials. The runtime image must
therefore use three identities:

```text
hf-broker       owns the real HF token and broker state
mlclaw-control  serves OAuth, settings, notifications, and operator actions
node            runs OpenClaw and agent tools
```

Required boundaries:

- ML Claw and broker binaries and UI assets are root-owned and not writable by
  `node`.
- The real HF token is written during startup to a broker-only `0600` file.
- The token value is removed from the parent environment before OpenClaw
  starts.
- The broker process receives only a token-file path, not the token value in
  its environment.
- OpenClaw receives an explicit environment allowlist. It must not inherit the
  ML Claw control-plane environment.
- The agent broker secret is readable by `node`; the operator credential is
  not.
- The operator listener is bound to a dedicated loopback endpoint and requires
  a separate operator credential held only by the control plane.
- OpenClaw can reach only the authenticated agent-facing localhost listener.
- `hf-broker doctor` must verify the live boundary before the Space reports
  healthy.

Do not rely on variable names, hidden UI, or process convention as isolation.
The Unix permissions and child environment must enforce it.

## Credential Lifecycle

### Bootstrap

The local ML Claw CLI continues to use the user's normal `hf auth login` token
for provisioning. It creates the Space, bucket, volume mount, variables, and
secrets from the user's machine.

For the Space runtime, bootstrap stores the real token as one write-only Space
secret:

```text
MLCLAW_BROKER_HF_TOKEN
```

At container startup, before OpenClaw exists:

1. The root initializer writes the secret to a broker-owned runtime file.
2. The initializer clears the secret from the environment inherited by all
   later ML Claw and OpenClaw processes.
3. It starts `hf-broker` under the broker user with the token-file path.
4. It starts the trusted ML Claw control plane under its own user.
5. It starts OpenClaw under `node` with only its broker client secret and
   broker URL.

The token file lives on ephemeral runtime storage and is never included in the
bucket snapshot, Space repository, logs, diagnostics, or browser responses.

### Removed Credentials

After cutover, app Spaces must not contain or pass these secrets to OpenClaw:

```text
HF_TOKEN
HUGGINGFACE_HUB_TOKEN
MLCLAW_ROUTER_TOKEN
HF_ROUTER_TOKEN
```

ML Claw must also stop persisting the broad HF token in its local deployment
secret file. Provisioning commands can read the current `hf` CLI credential
when needed.

## Broker Surfaces

### Agent Surface

The agent-facing listener uses the existing per-client shared-secret model and
adds narrowly classified Hugging Face operations.

Required inference routes:

```text
GET  /v1/models
POST /v1/chat/completions
```

Inference is not approval-gated. The broker validates method, path, body size,
content type, and model field, then streams the Router response. It replaces
the downstream authorization header with the real token and strips upstream
headers that could expose credential or infrastructure details.

Required Hub behavior:

- read-only operations are allowed through explicitly classified routes;
- existing Git smart-HTTP append-only enforcement remains authoritative;
- generic arbitrary Hub API forwarding remains forbidden;
- administrative and destructive operations are denied unless represented by
  a typed grant action already enabled in `scope.json`.

The broker secret may permit unrestricted inference and reads because the
security objective is protecting write authority. The residual risks of quota
consumption and private-data exfiltration must remain documented.

### Operator Surface

The operator surface is available only through the broker's separately
authenticated operator listener. It must not be reachable through the
agent-facing listener.

Required operations:

```text
GET  /api/grants?status=pending
GET  /api/grants?status=history
GET  /api/grants/{id}
GET  /api/grants/events
POST /api/grants/{id}/approve
POST /api/grants/{id}/deny
POST /api/grants/{id}/cancel
POST /api/grants/{id}/revoke
```

`/operator/events` is an SSE stream carrying request creation and lifecycle
updates. Events contain request IDs and safe display metadata, never tokens,
request bodies, pack contents, or private response data.

Approval operates on the broker's stored canonical plan. The browser cannot
supply a replacement operation, target, ref, duration, or plan body.

## ML Claw Control API

The trusted ML Claw control plane exposes owner-only browser routes:

```text
GET  /mlclaw/api/approvals/brokers
GET  /mlclaw/api/approvals?broker={broker}
GET  /mlclaw/api/approvals/events?broker={broker}
GET  /mlclaw/api/approvals/{broker}/{id}
POST /mlclaw/api/approvals/{broker}/{id}/approve
POST /mlclaw/api/approvals/{broker}/{id}/deny
POST /mlclaw/api/approvals/{broker}/{id}/cancel
POST /mlclaw/api/approvals/{broker}/{id}/revoke
```

Requirements:

- Hugging Face OAuth identifies the Space owner or configured ML Claw admin.
- Mutating routes require the signed ML Claw session and CSRF token.
- The control plane forwards fixed operator commands to the selected dedicated
  operator listener.
- It never accepts arbitrary broker paths or methods from the browser.
- It never returns operator credentials, broker secrets, or upstream tokens.
- SSE reconnect uses event IDs so the drawer can recover missed updates.
- Request history is paginated and bounded.

The OpenClaw process must not be able to call these routes successfully from
localhost without an authenticated owner browser session.

## UI Implementation

Build the notification interface in the existing React control UI. Reuse the
same component bundle for the small gateway overlay rather than maintaining a
second implementation.

Main components:

```text
ApprovalNotificationButton
ApprovalToastStack
ApprovalDrawer
ApprovalRequestRow
ApprovalRequestDetails
ApprovalDecisionDialog
ApprovalHistoryFilter
```

Interaction requirements:

- stable square icon-button dimensions;
- unread badge does not resize the button;
- keyboard-accessible open, close, expand, approve, and reject actions;
- focus is contained while the drawer or confirmation dialog is open;
- Escape closes the current overlay without changing request state;
- live updates do not collapse a row the user is reviewing;
- terminal states remain readable after reconnect or page reload;
- no nested cards and no explanatory landing-page copy;
- toast and drawer positions must not cover the existing ML Claw launcher or
  primary OpenClaw controls on desktop or mobile.

## hf-broker Changes

Update `hf-broker` in sympathy with its existing invariants:

- retain fail-closed request classification;
- add typed inference routes, not a generic reverse proxy;
- add read-only Hub classifications required by HF tooling;
- separate agent and operator listeners;
- expose grant listing, detail, decision, revoke, and SSE operations only on
  the dedicated operator listener;
- replace Telegram notifier coupling with a notification event interface;
- retain Telegram as an optional standalone broker integration only if the
  repository still wants it, but ML Claw must not configure or depend on it;
- preserve atomic grant storage, idempotency, expiry, reservations, plan
  hashes, and audit logging;
- update `docs/SPECIFICATION.md` so web approval is allowed only through an
  operator-only transport that the agent cannot reach.

## ML Claw Changes

- build the `hf-broker` Go binary into the runtime image;
- create the broker and control-plane Unix users and groups;
- replace the current shell-only startup with a small supervised process tree
  that handles secret material before dropping privileges;
- stop passing Router or Hub tokens to the OpenClaw child;
- point OpenClaw's Hugging Face provider base URL at the local broker;
- configure HF CLI and supported Hub tooling to use brokered routes where
  available;
- add the approvals control API, SSE bridge, React drawer, toasts, and badge;
- surface broker and isolation state on the existing status page;
- include pending-request count in the gateway overlay;
- make `mlclaw doctor` run broker health and isolation checks;
- make `mlclaw update` perform the credential cutover for existing Spaces.

## Existing Deployment Cutover

`mlclaw update <owner/space>` must migrate an existing deployment without
deleting or replacing its bucket.

Cutover order:

1. Verify the current local HF login and target ownership.
2. Add `MLCLAW_BROKER_HF_TOKEN` as a Space secret.
3. Upload the broker-capable runtime image and configuration.
4. Restart and wait for broker, isolation doctor, control plane, OpenClaw, and
   state restore to report healthy.
5. Verify one brokered Router request.
6. Delete stale `HF_TOKEN`, `HUGGINGFACE_HUB_TOKEN`,
   `MLCLAW_ROUTER_TOKEN`, and `HF_ROUTER_TOKEN` Space secrets.
7. Remove broad tokens from the local ML Claw deployment secret file.
8. Restart once more and verify inference, state persistence, and approval UI.

If the broker-capable runtime does not become healthy, the update must stop
before deleting old secrets and report a recoverable failure. Once the
cutover succeeds, there is no compatibility mode that passes a real HF token
to OpenClaw.

## Doctor Requirements

`mlclaw doctor` should fail when any of these are true:

- real HF token secret is missing from the broker configuration;
- a broad or Router token is still exposed to the OpenClaw child;
- token file owner or mode is unsafe;
- agent and broker share a UID;
- agent is root or root-equivalent;
- agent can read or modify the broker token file;
- agent can read broker or control-plane process environments;
- agent can authenticate to the operator listener;
- agent can modify broker, control-plane, or UI files;
- broker agent or operator surface is unhealthy;
- Router inference through the broker fails;
- SSE notification delivery is unhealthy;
- bucket snapshot health is degraded.

The Space health endpoint should remain unready until the mandatory isolation
checks pass.

## Failure Handling

- If inference upstream fails, preserve the provider error classification but
  never reveal upstream authorization data.
- If the broker is unavailable, OpenClaw fails closed rather than calling the
  Router directly.
- If the operator SSE connection drops, the UI reconnects and refreshes
  pending state from the broker.
- If approval races with expiry or another decision, the broker returns the
  authoritative terminal state.
- If execution may have partially succeeded, mark it ambiguous and require
  operator review; never retry automatically.
- If the control plane is unavailable, pending requests remain durable in the
  broker and appear after recovery.
- If state restore fails, do not start a fresh agent that could overwrite the
  durable bucket state.

## Test Plan

### hf-broker Unit And Integration Tests

- inference route method, path, body-size, and content-type validation;
- streaming and non-streaming Router responses;
- upstream authorization replacement and response-header stripping;
- no secret values in errors, audit logs, or test diagnostics;
- read-only Hub route classification;
- generic Hub API paths remain refused;
- agent listener cannot access operator routes;
- operator listener list, detail, approve, deny, revoke, and SSE behavior;
- canonical plan cannot be replaced by approval input;
- idempotent request IDs and duplicate notification prevention;
- expiry, use-budget, reservation, and ambiguous-execution behavior;
- race tests under `go test -race ./...`.

### ML Claw Tests

- startup writes and scrubs the real token before OpenClaw starts;
- OpenClaw child environment contains no real HF credential;
- Linux user, group, file, process, and socket permissions;
- broker secret reaches OpenClaw while operator authority does not;
- OAuth admin and CSRF enforcement on every approval mutation;
- SSE reconnect and missed-event recovery;
- unread badge, toast lifecycle, drawer expansion, history, and decisions;
- mobile and desktop visual tests with no overlap;
- existing deployment cutover preserves bucket and session state;
- doctor detects every unsafe isolation condition;
- doctor is clean for the production image.

### Live Validation

Use `osolmaz/mlclaw-test` and its disposable test bucket.

1. Recreate or update the Space with the broker-capable image.
2. Verify normal Router inference succeeds through the broker.
3. From an OpenClaw shell, confirm the real token is absent from `env`, files,
   process environments, diagnostics, and `/proc` paths available to `node`.
4. Confirm the agent cannot authenticate to the operator listener.
5. Perform a permitted read and append-only Git push.
6. Attempt a force-push and confirm it creates a pending request.
7. Confirm the toast and unread badge appear without a page reload.
8. Deny the request and confirm the agent receives the denial.
9. Create a second request, inspect its exact plan, and approve it.
10. Confirm only the approved target and use budget become available.
11. Restart the Space and verify request history and OpenClaw state survive.
12. Run `mlclaw doctor` and require a clean result.

## Acceptance Criteria

- OpenClaw never receives or can recover the real HF token.
- Router inference works without a separate inference token.
- Existing allowed read and reversible-write workflows remain usable.
- Approval requests appear as live toasts and in a collapsible notification
  drawer.
- The signed-in owner can approve, deny, review history, and revoke active
  grants without leaving ML Claw.
- The agent can request approval but cannot approve its own request.
- No Telegram token, bot, webhook, polling loop, or Telegram UI is required.
- Existing Space deployments migrate without losing bucket, workspace,
  identity, or session data.
- All ML Claw and hf-broker tests, type checks, secret scans, isolation checks,
  image builds, and live validation pass.

## Non-Goals

- Do not expose a generic authenticated Hugging Face reverse proxy.
- Do not make every inference request approval-gated.
- Do not let browser input define arbitrary broker methods or paths.
- Do not let the agent read or modify broker scope configuration.
- Do not rely on Telegram or another messaging service for approval.
- Do not create a second broker Space when same-container Unix isolation
  passes `hf-broker doctor`.
