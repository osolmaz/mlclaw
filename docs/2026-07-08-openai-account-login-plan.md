# OpenAI Account Login Plan

Status: implementation target

## Goal

Allow a Space user to configure OpenAI credentials securely from the ML Claw
browser app, so OpenClaw can use OpenAI-compatible models without requiring the
user to paste credentials into a public repo, browser URL, or local shell
history.

## MVP Credential Model

Implement secure API-key entry first.

The browser app exposes an authenticated setup route where the signed-in HF
user can submit an OpenAI API key. The key is sent over HTTPS to the ML Claw
Space server and written into the local OpenClaw live config/env surface needed
by the gateway.

The key is:

- accepted only from an authenticated HF session;
- accepted only from the Space owner/admin allowlist;
- never logged;
- never returned to the browser;
- stored on the Space filesystem with `0600` permissions where possible;
- included in the bucket snapshot only if OpenClaw itself requires it for
  durable operation.

If durable provider credentials should not enter bucket snapshots, the next
iteration should move this to Hugging Face Space Secrets through the Hub API.
That requires the user's HF token or a delegated Hub action and should be
handled by a broker/approval flow.

## Long-Term Account OAuth

True "Sign in with OpenAI account" should be treated as a future OAuth/provider
integration, not faked with an API key.

Requirements for that future flow:

- OpenAI OAuth client registration owned by ML Claw or user;
- PKCE/code flow;
- encrypted refresh token storage;
- revocation UI;
- provider-specific token refresh;
- no exposure of refresh/access tokens to OpenClaw tools unless strictly
  required.

Until that exists, call the implemented flow "OpenAI API key login" in UI copy.
Do not claim OAuth account login.

## Runtime Integration

When a valid key is stored, update OpenClaw configuration/provider env so that:

```text
OPENAI_API_KEY=<stored key>
```

is available to the gateway process or its restarted replacement.

The app should report only:

```json
{ "configured": true, "updatedAt": "..." }
```

Never report the key or a prefix/suffix.

## Test Plan

- unit-test authentication and admin checks;
- unit-test secret redaction in responses/loggable errors;
- unit-test file permissions for stored credentials;
- unit-test status reports do not include key material;
- live-test entering a throwaway key in a test Space if available;
- verify OpenClaw sees `OPENAI_API_KEY` after gateway restart.
