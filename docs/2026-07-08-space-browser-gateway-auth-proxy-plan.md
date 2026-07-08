# Space Browser Gateway Auth Proxy Plan

Status: implemented

## Goal

Make the default ML Claw deployment a public Hugging Face Docker Space where
the user signs in with their Hugging Face account and then enters the OpenClaw
browser gateway directly.

Telegram and Discord are optional connectors. The default path is browser chat
inside the duplicated Space.

## Architecture

Run two processes inside the runtime container:

```text
browser -> ML Claw Space server :7860 -> OpenClaw gateway :7861
```

The ML Claw Space server is the only public listener. It owns:

- source-template vs duplicated-app mode detection;
- Hugging Face OAuth login;
- signed, HTTP-only session cookies;
- static template/sign-in/setup pages;
- HTTP and WebSocket reverse proxying to OpenClaw.

OpenClaw binds only to loopback on an internal port and uses
`gateway.auth.mode=trusted-proxy`.

The browser never receives `OPENCLAW_GATEWAY_TOKEN`.

## OpenClaw Auth Contract

Configure OpenClaw like this:

```json
{
  "gateway": {
    "bind": "loopback",
    "customBindHost": "127.0.0.1",
    "auth": {
      "mode": "trusted-proxy",
      "trustedProxy": {
        "userHeader": "x-forwarded-user",
        "requiredHeaders": ["x-forwarded-proto", "x-forwarded-host"],
        "allowLoopback": true
      }
    },
    "trustedProxies": ["127.0.0.1", "::1"],
    "controlUi": {
      "allowedOrigins": ["https://<space-host>"]
    }
  }
}
```

The ML Claw proxy injects these headers only after HF OAuth session validation:

```text
x-forwarded-user: <hf username>
x-forwarded-proto: https
x-forwarded-host: <space host>
x-openclaw-scopes: operator.admin,operator.read,operator.write,operator.approvals,operator.pairing
```

The full scope set is injected only for ML Claw admin users. The duplicated
Space owner is the default admin, and `MLCLAW_ADMINS` can override that list.
Other allowed signed-in users receive
`operator.read,operator.write,operator.approvals`.

## HF OAuth Contract

Use the same OAuth shape as `xtap-pool`:

- Space README metadata sets `hf_oauth: true`;
- scopes are `openid profile`;
- `/oauth/login?next=<path>` creates a signed state cookie and redirects to HF;
- `/oauth/callback` validates state, exchanges the code, reads
  `/oauth/userinfo`, and stores the HF username in a signed session cookie;
- unauthenticated app/gateway requests redirect to `/login`;
- API requests return `401`.

Required Space secrets:

```text
MLCLAW_SESSION_SECRET
HF_TOKEN
```

Hugging Face injects `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` when the Space
README metadata enables OAuth.

Required/public Space variables:

```text
MLCLAW_CANONICAL_SPACE_ID=osolmaz/mlclaw
MLCLAW_CANONICAL_CREATOR_USER_ID=<known creator id when available>
MLCLAW_ALLOWED_USERS=<optional comma-separated usernames>
SPACE_HOST=<provided by HF or set by CLI when needed>
```

If `SPACE_CREATOR_USER_ID` is unavailable or the canonical creator id is not
known yet, source detection falls back to exact `SPACE_ID`.

## Source Space Mode

The canonical source Space renders an informational template page. It does not
start or expose the OpenClaw gateway.

The page explains:

- what ML Claw does;
- how to duplicate the Space;
- which secrets/configuration the duplicate needs;
- that the duplicated Space becomes the actual browser gateway;
- optional Telegram/Discord connectors;
- optional CLI path.

## Duplicated Space Mode

The duplicated Space renders:

- `/` renders the sign-in page for unauthenticated users;
- `/` proxied to OpenClaw Control UI after HF sign-in;
- `/mlclaw/status` for diagnostics;
- `/mlclaw/openai` for authenticated OpenAI API-key setup;
- `/mlclaw/logout`;
- `/oauth/login`;
- `/oauth/callback`;
- proxied HTTP/WebSocket traffic to the internal OpenClaw gateway.

If setup is incomplete, the app renders a setup status page instead of
crashing. Missing secrets are reported by name, never by value.

## Security Rules

- Do not expose OpenClaw shared gateway tokens to the browser.
- Do not accept trusted-proxy headers from the browser; strip them before
  forwarding and re-add known-safe values server-side.
- Do not proxy before session validation.
- Use signed, HTTP-only, secure, SameSite=Lax cookies.
- Do not store OAuth access tokens. Exchange them only to resolve identity.
- Do not log secrets, OAuth codes, session values, or provider tokens.
- Treat the private Storage Bucket as the durable state source.

## Test Plan

- unit-test source/app mode detection;
- unit-test OAuth URL creation, state validation, callback handling, and
  session cookie signing;
- unit-test proxy header stripping/injection;
- unit-test unauthenticated redirects and authenticated proxy decisions;
- run a local mock OpenClaw upstream and verify HTTP + WebSocket proxying;
- deploy a test Space, sign in with HF, load the browser gateway, and send a
  message.
