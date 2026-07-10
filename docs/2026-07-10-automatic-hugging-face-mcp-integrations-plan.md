# Automatic Hugging Face MCP Integrations

Date: 2026-07-10

Status: implemented

## Goal

Every ML Claw Space automatically configures and enables the hosted Hugging
Face MCP server and `evalstate/research-agent-two`. Users sign into ML Claw
with identity-only Hugging Face OAuth. An administrator then authorizes both
integrations with the same Hugging Face account. No CLI command, token copy, or
per-MCP login is required.

## Runtime Design

- Keep ordinary Hugging Face sign-in limited to identity scopes. Request the
  additional scopes needed by both integrations only from an authenticated
  ML Claw admin in a separate authorization step.
- Store access and refresh token metadata in an AES-256-GCM encrypted file on
  the private mounted state volume.
- Encrypt with a dedicated `MLCLAW_CREDENTIAL_KEY`, generated and maintained as
  a Space secret independently from the browser session secret.
- Keep the trusted ML Claw wrapper as root and run OpenClaw as the unprivileged
  `node` user. Wrapper-only secrets and encrypted credential files are not
  readable by OpenClaw.
- Run restore and snapshot traversal in secret-free processes under the
  OpenClaw UID. Stream staged snapshot bytes to the trusted supervisor for
  bucket upload, so filesystem races cannot make root follow agent-controlled
  paths into wrapper-only credentials.
- Run a loopback-only MCP integration server in the wrapper. OpenClaw receives
  only local MCP URLs and an internal capability token, never the Hugging Face
  OAuth credential.
- Forward Hugging Face MCP traffic to
  `https://huggingface.co/mcp?bouquet=hf`, injecting the OAuth token in the
  trusted wrapper.
- Forward Research Agent traffic to its hosted MCP endpoint. While the service
  exposes its current Prefab MCP App flow, translate its queued start/poll UI
  sequence into one ordinary `research` tool result for OpenClaw.
- In local gateway mode, use the local deployment's Hugging Face token inside
  the trusted wrapper when Space OAuth credentials are unavailable. This keeps
  both integrations working after Space-to-local migration without copying a
  Space OAuth client secret or changing the credential stored in the bucket.
- Treat the local Hub token as wrapper-only. Require a separate Router
  inference token for `huggingface/` models and pass only that restricted token
  to the OpenClaw child.
- Preserve user-defined MCP servers, explicit disablement, and tool filters
  when reconciling the two managed server entries.

## Product Behavior

- Fresh, updated, and repaired deployments contain both managed MCP servers.
- Legacy updates provision or require a dedicated Router inference token before
  restarting, so removing broad Hub tokens cannot interrupt inference.
- An admin entering the browser gateway is sent through the integration OAuth
  flow when at least one managed integration is enabled and durable
  authorization is missing.
- The control UI reports authorization state and offers reconnect and explicit
  disconnect actions.
- Logging out clears only the browser session. Disconnecting removes the
  durable encrypted integration credential.
- Non-admin users cannot replace or disconnect the deployment-wide integration
  identity.
- Gateway migration works in both directions: local mode uses its local Hub
  credential, while returning to Space resumes the bucket-backed OAuth
  credential.

## Ownership

- ML Claw owns OAuth persistence, process isolation, managed MCP configuration,
  forwarding, and the Research App compatibility adapter.
- OpenClaw owns MCP discovery and tool execution.
- The broker projects are not involved in MCP transport. Approval policy for
  high-impact Hub operations remains a separate capability-control concern.

## Verification

- Cover OAuth parsing, expiry, refresh, encryption, corruption, redaction, and
  generated Space OAuth metadata.
- Verify the OpenClaw child cannot see wrapper-only environment secrets.
- Verify managed MCP reconciliation preserves custom servers and user fields.
- Exercise Hugging Face MCP forwarding and Research Agent queue/start/poll
  conversion against deterministic local upstreams.
- Run build, typecheck, unit, package, and secret checks.
- Deploy the candidate runtime to `osolmaz/mlclaw-test`, sign in, call a
  read-only Hugging Face tool and one bounded Research Agent task, restart the
  Space, and verify authorization and tools recover without modifying any
  non-test state.
