# Operator Broker Configuration

ML Claw reads one JSON file that names the Brokerkit operator APIs available to
its trusted backend. The file contains paths to operator token files, never the
tokens themselves.

## Minimal File

```json
{
  "version": 1,
  "brokers": [
    {
      "id": "hf-broker",
      "label": "Hugging Face",
      "url": "http://127.0.0.1:7864",
      "token_file": "/run/mlclaw-hf-broker/operator-secret"
    }
  ]
}
```

Set `MLCLAW_OPERATOR_BROKERS_FILE` to the absolute path of this file. An absent
variable configures an empty inbox. A configured file that cannot be read or
validated stops runtime startup.

The bundled Space entrypoint generates an HF Broker-only file when the variable
is unset. Set the variable before startup to use a mounted multi-broker file;
that explicit path is preserved and replaces the generated default. Include
the HF Broker entry yourself when using a custom file.

## Fields

| Field                  | Required | Type    | Meaning                                    |
| ---------------------- | -------- | ------- | ------------------------------------------ |
| `version`              | Yes      | integer | Format version. Must be `1`.               |
| `brokers`              | Yes      | array   | Zero to 16 operator API entries.           |
| `brokers[].id`         | Yes      | string  | Stable URL-safe broker ID.                 |
| `brokers[].label`      | Yes      | string  | Short operator-facing broker name.         |
| `brokers[].url`        | Yes      | string  | Brokerkit operator API origin.             |
| `brokers[].token_file` | Yes      | string  | Absolute file containing its bearer token. |

### Broker IDs

An ID is 1 to 40 lowercase ASCII letters, digits, or hyphens. It must start
with a letter and cannot end with a hyphen. IDs must be unique.

### Labels

A label is 1 to 80 UTF-8 characters on one line. Control characters are
rejected. Labels are display text only and do not grant authority.

### URLs

The URL must be one `http` or `https` origin with no username, password, query,
fragment, or non-root path. ML Claw appends only fixed Brokerkit operator API
paths. Duplicate URLs are rejected.

### Token Files

`token_file` must be absolute. The referenced file is read once during startup.
Its trimmed value must be 24 to 4096 visible ASCII characters with no
whitespace. Each broker has its own token file.

The runtime config file and token files must be readable only by the trusted ML
Claw backend. They must not be readable by the OpenClaw agent account. Token
values are never returned by status, inbox, event, or error APIs.

## Full Example

```json
{
  "version": 1,
  "brokers": [
    {
      "id": "hf-broker",
      "label": "Hugging Face",
      "url": "http://127.0.0.1:7864",
      "token_file": "/run/mlclaw-hf-broker/operator-secret"
    },
    {
      "id": "gh-broker",
      "label": "GitHub",
      "url": "http://127.0.0.1:8081",
      "token_file": "/run/gh-broker/operator-secret"
    },
    {
      "id": "sudo-broker",
      "label": "Unix access",
      "url": "http://127.0.0.1:8083",
      "token_file": "/run/sudo-broker/operator-secret"
    }
  ]
}
```

## Runtime Behavior

ML Claw validates the complete file and every referenced token before opening
its HTTP listener. It does not reload either file during requests. A restart is
required after changing broker entries or rotating tokens.

The backend discovers and validates each broker's BrokerKit Operator V1 API,
then exposes only fixed list, detail, approve, deny, cancel, and revoke
operations to the packaged OpenClaw plugin UI. Browser actions address
short-lived opaque handles; canonical broker and request IDs are display and
audit fields and are never accepted for routing. The browser receives a
short-lived token bound to the authenticated ML Claw admin; that token cannot
call a broker directly.

The OpenClaw plugin registers the Gateway tab, but ML Claw intercepts the fixed
UI path and serves the immutable packaged assets from its trusted HTTP boundary.
An authenticated administrator can inspect and decide requests directly in the
Gateway popover. The iframe has an opaque CSP-sandboxed origin and a short-lived
delegated decision session. It renews that session using its current bearer
token and never sends ML Claw cookies to the delegated API. The OpenClaw process
cannot read broker credentials or delegated decision tokens. Because OpenClaw
controls the surrounding page, deployments that require protection from a
compromised Gateway frontend should leave
`MLCLAW_BROKERKIT_POPOVER_DECISIONS` unset. Set it to `true` only when the
deployment explicitly accepts that tradeoff; the default popover is read-only.

ML Claw refreshes current request state and revision immediately before every
decision. It sends actor attribution and a deterministic idempotency key to the
selected broker. An unavailable broker is reported as a redacted source error
without hiding healthy brokers.

Unknown top-level or broker fields are rejected. Relative token paths, duplicate
IDs, duplicate URLs, inline tokens, and unsupported versions are invalid.

## Scope

This format configures operator inbox connectivity only. The OpenClaw plugin is
installed and registered by the ML Claw runtime in `delegated-web` mode; it does
not receive broker credentials or register approval commands. Delegated
sessions are issued only to authenticated administrators in the sandboxed
popover or standalone packaged UI. This file does not configure agent
credentials, policy, channels, broker storage, or privileged execution.
