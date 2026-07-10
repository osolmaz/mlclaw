# Automatic Hugging Face MCP Integrations

Date: 2026-07-10

Status: implemented

## Goal

Every ML Claw Space automatically configures and enables the hosted Hugging
Face MCP server and `evalstate/research-agent-two`. The user signs into ML Claw
with Hugging Face once. No CLI command, token copy, or second MCP login is
required.

## Runtime Design

- Request the OAuth scopes needed by both integrations during the existing
  Hugging Face sign-in.
- Store access and refresh token metadata in an AES-256-GCM encrypted file on
  the private mounted state volume.
- Encrypt with a dedicated `MLCLAW_CREDENTIAL_KEY`, generated and maintained as
  a Space secret independently from the browser session secret.
- Keep the trusted ML Claw wrapper as root and run OpenClaw as the unprivileged
  `node` user. Wrapper-only secrets and encrypted credential files are not
  readable by OpenClaw.
- Run a loopback-only MCP integration server in the wrapper. OpenClaw receives
  only local MCP URLs and an internal capability token, never the Hugging Face
  OAuth credential.
- Forward Hugging Face MCP traffic to
  `https://huggingface.co/mcp?bouquet=hf`, injecting the OAuth token in the
  trusted wrapper.
- Forward Research Agent traffic to its hosted MCP endpoint. While the service
  exposes its current Prefab MCP App flow, translate its queued start/poll UI
  sequence into one ordinary `research` tool result for OpenClaw.
- Preserve user-defined MCP servers, explicit disablement, and tool filters
  when reconciling the two managed server entries.

## Product Behavior

- Fresh, updated, and repaired deployments contain both managed MCP servers.
- An admin entering the browser gateway is sent through Hugging Face OAuth when
  durable integration authorization is missing.
- The control UI reports authorization state and offers reconnect and explicit
  disconnect actions.
- Logging out clears only the browser session. Disconnecting removes the
  durable encrypted integration credential.
- Non-admin users cannot replace or disconnect the deployment-wide integration
  identity.

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
