# Codex Device Login Plan

Date: 2026-07-09

Status: planned, not implemented

## Goal

ML Claw should let a Space admin connect an OpenAI/ChatGPT account using
Codex device login, then run OpenClaw inside the Space with the resulting Codex
account credentials. The user should not paste an OpenAI API key for this flow.

This is separate from the existing OpenAI API-key credential page. API keys can
remain as an advanced fallback, but the primary account flow should use Codex's
own device-login machinery.

## Codex Source Findings

Codex already implements the login flow ML Claw needs:

- `codex login --device-auth` is the CLI entrypoint for headless/remote hosts.
- Codex requests a device code from OpenAI, shows the verification URL and
  user code, polls for completion, exchanges the authorization code, and writes
  the resulting auth state under `CODEX_HOME/auth.json`.
- Codex app-server exposes the same flow as structured RPC:
  `account/login/start` with `{ "type": "chatgptDeviceCode" }`.
- The structured response includes `loginId`, `verificationUrl`, and
  `userCode`.
- Completion is reported through account-login notifications, and account
  state can be read through `account/read`.

Use the app-server/account RPC path as the integration boundary. Do not parse
`codex login --device-auth` stdout unless there is no viable app-server path.

Relevant upstream files:

- `codex-rs/cli/src/login.rs`
- `codex-rs/login/src/device_code_auth.rs`
- `codex-rs/app-server/src/request_processors/account_processor.rs`
- `codex-rs/app-server/README.md`
- `codex-rs/app-server-protocol/schema/typescript/v2/LoginAccountParams.ts`
- `codex-rs/app-server-protocol/schema/typescript/v2/LoginAccountResponse.ts`
- `codex-rs/login/src/auth/storage.rs`

## User Flow

1. The user opens their ML Claw Space.
2. Hugging Face OAuth authenticates the user to the Space.
3. An admin opens `/mlclaw/settings` or `/mlclaw/credentials`.
4. The admin clicks `Connect OpenAI account`.
5. ML Claw starts Codex device login.
6. The UI shows the OpenAI verification URL and one-time code.
7. The admin completes the login in a browser.
8. ML Claw receives completion from Codex, reads the connected account status,
   persists encrypted Codex auth state, and restarts or reloads OpenClaw as
   needed.
9. The UI shows connected account metadata such as email and plan type, never
   token material.

External OpenAI links must open as normal top-level browser navigation, not as
iframe navigation from inside the Hugging Face Space sandbox.

## Runtime Model

The ML Claw runtime image should include a usable Codex binary or app-server
entrypoint. On boot, the Space should create an isolated Codex home:

```text
CODEX_HOME=/tmp/mlclaw-codex
```

ML Claw should write a minimal Codex config:

```toml
cli_auth_credentials_store = "file"
forced_login_method = "chatgpt"
```

If a future deployment needs a specific OpenAI workspace, ML Claw may also
write Codex's forced workspace setting from an explicit Space variable. Do not
guess a workspace.

OpenClaw and any Codex-backed tools must be launched with this `CODEX_HOME`.
The live Codex home is runtime state, not part of the OpenClaw workspace
snapshot.

## Credential Persistence

Codex stores account credentials in `CODEX_HOME/auth.json`. Treat this file as
a password.

Do not store raw `auth.json` in:

- the Space repository;
- the OpenClaw workspace;
- regular state snapshots;
- logs;
- browser responses;
- unencrypted bucket objects.

ML Claw should persist Codex auth like this:

1. Bootstrap/update creates a Space secret:

   ```text
   MLCLAW_CODEX_AUTH_ENCRYPTION_KEY
   ```

2. On boot, if the private bucket contains an encrypted Codex auth bundle,
   decrypt it into:

   ```text
   $CODEX_HOME/auth.json
   ```

   with `0600` permissions.

3. After login completion, logout, or token refresh, ML Claw encrypts the
   current auth state and writes it to the private bucket, for example:

   ```text
   credentials/codex-auth.json.enc
   ```

4. The encrypted bundle should include versioned metadata and an integrity
   check. Use authenticated encryption, not ad-hoc obfuscation.

Use the private bucket for encrypted persistence because Codex may refresh
tokens over time. Space secrets are appropriate for the stable encryption key,
not for frequently changing Codex auth JSON.

## Space API

Add admin-only API routes:

```text
GET  /mlclaw/api/codex-auth/status
POST /mlclaw/api/codex-auth/device/start
GET  /mlclaw/api/codex-auth/device/:loginId/events
POST /mlclaw/api/codex-auth/device/:loginId/cancel
POST /mlclaw/api/codex-auth/logout
```

Behavior:

- `status` returns whether Codex auth is configured and, if available,
  redacted account metadata from `account/read`.
- `device/start` starts exactly one active Codex device login. Starting a new
  login cancels any previous active login.
- `events` streams completion, cancellation, timeout, and error status.
- `cancel` cancels the active Codex login through Codex's account API.
- `logout` deletes local Codex auth, deletes the encrypted bucket auth bundle,
  and asks OpenClaw to restart or reload.

All mutating routes must be restricted to ML Claw admins and protected against
cross-site request forgery.

## UI

The control UI should add an OpenAI account section:

- disconnected state;
- `Connect OpenAI account` action;
- device-code pending state with verification URL, user code, countdown, and
  cancel action;
- connected state with email/plan metadata when Codex exposes it;
- disconnect action.

The UI must make clear that this connects the Space's agent runtime to an
OpenAI/ChatGPT account. It is not a per-browser-user credential unless ML Claw
later adds per-user agent runtimes.

## Bootstrap And Update

New deployments:

- include Codex in the runtime image;
- set `CODEX_HOME`;
- create `MLCLAW_CODEX_AUTH_ENCRYPTION_KEY` as a Space secret;
- exclude Codex auth files from OpenClaw state snapshots;
- expose the control UI account section.

Existing deployments:

- `mlclaw update <owner/space>` should upload the new runtime files and set any
  missing variables/secrets;
- `mlclaw doctor <owner/space>` should report missing Codex support;
- `mlclaw doctor <owner/space> --fix` should create the encryption key secret
  and repair missing runtime variables without touching existing bucket state.

## Security Requirements

- Never log tokens, refresh tokens, access tokens, or raw `auth.json`.
- Never return token material to the browser.
- Store the encrypted auth bundle only in the deployment's private bucket.
- Store the encryption key only as a Hugging Face Space secret.
- Use constant-time comparison for auth/session signatures where applicable.
- Keep Codex auth outside the OpenClaw workspace and state-sync inputs.
- Make logout destructive for Codex auth persistence: local file plus encrypted
  bucket object must both be removed.
- Treat account metadata as non-secret but still avoid over-sharing it in logs.

## Failure Handling

The UI should show clear states for:

- Codex binary/app-server unavailable;
- device login unsupported by the OpenAI account/workspace;
- device login expired;
- user cancelled;
- encrypted auth bundle corrupt or undecryptable;
- bucket write failed after successful login;
- Codex account exists locally but `account/read` fails.

If encrypted persistence fails after login, ML Claw should warn that the login
works only until the Space restarts.

## Test Plan

Unit tests:

- device-login API auth and admin checks;
- one-active-login behavior;
- status redaction;
- logout deletion behavior;
- encrypted auth bundle round trip;
- corrupt encrypted bundle handling;
- state-sync exclusions for `CODEX_HOME` and `auth.json`.

Mock integration tests:

- fake Codex app-server happy path;
- fake Codex app-server cancellation;
- fake Codex app-server timeout;
- fake `account/read` connected and disconnected responses;
- bucket write failure after login completion.

Live validation:

1. Update `osolmaz/mlclaw-test`.
2. Open the private Space.
3. Sign in with Hugging Face OAuth.
4. Start OpenAI account connection.
5. Complete Codex device login.
6. Confirm connected account status appears.
7. Send an OpenClaw message that requires Codex/OpenAI auth.
8. Restart the Space.
9. Confirm encrypted auth restores and the account remains connected.
10. Disconnect and confirm the account does not restore after another restart.

## Non-Goals

- Do not implement a custom OpenAI OAuth client.
- Do not store raw Codex auth in Hugging Face bucket objects.
- Do not make this a public unauthenticated login path.
- Do not make API keys the primary UX for OpenAI account login.
