# ML Claw Cutover and Space Template Plan

Status: proposed

## Goal

Cut over from ML Claw to **ML Claw** and make the public Hugging Face Space act
as both:

- the canonical source/template Space, where users learn what ML Claw does and
  how to duplicate it;
- the duplicated user Space, where the actual ML Claw control plane runs.

The user-facing product should become:

```text
ML Claw: OpenClaw for practical ML work on Hugging Face.
```

The implementation should keep one source of truth in this repository. Do not
maintain a separate marketing Space and app Space.

## Naming Contract

Use these names consistently:

| Context | Name |
| --- | --- |
| Human-facing product name | ML Claw |
| GitHub repository | `mlclaw` |
| npm package | `mlclaw` |
| CLI binary | `mlclaw` |
| Local runtime image | `ghcr.io/osolmaz/mlclaw-runtime:<version>` |
| Default Space runtime | bundled runtime artifact committed by `mlclaw update` |
| Config directory | `~/.config/mlclaw` |
| Docker container prefix | `mlclaw-<agent>` |
| Docker volume prefix | `mlclaw-<agent>-live` |
| Space template repo | `osolmaz/mlclaw` |
| Main command docs | `npx mlclaw bootstrap` |

Avoid introducing a second public product name. Hugging Face-specific internals
can still be named directly, for example `hf-bucket-client`,
`hf-state-sync`, and `hf-router`.

## Cutover Policy

This is a hard cutover, not a compatibility migration.

The cutover is:

1. Rename the repository from `mlclaw` to `mlclaw`.
2. Publish a new npm package named `mlclaw`.
3. Make generated Spaces self-contained by default, using bundled ML Claw
   runtime files copied from the npm package or source checkout.
4. Keep `ghcr.io/osolmaz/mlclaw-runtime:<version>` as the local-gateway image
   and as an explicit advanced Space override.
5. Update documentation, examples, launchers, skills, and runtime defaults to
   use only `mlclaw`.
6. Deprecate the old `mlclaw` npm package metadata with a pointer to
   `mlclaw`.

Do not implement a legacy bridge.

Specifically, do not add:

- `mlclaw` aliases;
- `mlclaw` package wrappers;
- `migrate-from-mlclaw` commands;
- automatic reads from `~/.config/mlclaw`;
- `MLCLAW_*` environment variable aliases;
- old container or volume name adoption;
- automatic remote bucket renames.

Users who need the old implementation can keep using the old `mlclaw`
release. New users and new docs use `mlclaw` only.

Existing buckets can still be used through the normal explicit adoption path:

```bash
mlclaw state adopt <agent> --bucket <owner/bucket>
```

That is not a ML Claw migration path. It is the standard ML Claw way to
point a deployment at a durable OpenClaw state bucket.

## Default User Experience

Prioritize the browser gateway in the duplicated Hugging Face Space.

The default path should be:

1. User opens the canonical public Space at `osolmaz/mlclaw`.
2. Source Space explains ML Claw and asks the user to duplicate it.
3. User duplicates the Space into their own namespace.
4. The duplicated Space runs the actual ML Claw browser gateway as a private
   Space by default.
5. User signs in to that Space with their Hugging Face account.
6. User talks to the OpenClaw agent in the browser.

Telegram and Discord are optional connectors, not the primary onboarding path.
Local gateway mode is still useful for development, power users, and users who
do not want any hosted runtime, but it should not be the default public product
experience.

Default deployment target:

```text
private Hugging Face Docker Space
HF OAuth-protected browser app
private Storage Bucket for durable OpenClaw state
HF Router / configured provider for inference
```

The generated Space is private by default, so Hugging Face authentication gates
the Space before the in-app OAuth flow gates the OpenClaw gateway. Access to
the agent itself is still enforced in-app after Hugging Face sign-in. The state
bucket remains private. Public Spaces are an explicit opt-in for demos and
template-style deployments.

Browser-only gateway mode should not require Telegram or Discord egress.
Upgraded paid Space hardware is required when the user wants always-on behavior
or messaging connectors that need persistent outbound connections. A free Space
can be valid for the browser gateway if sleep/wake behavior is acceptable.

## Public Space Behavior

The canonical public Space should be:

```text
osolmaz/mlclaw
```

That Space should not behave like a broken app waiting for secrets. It should
show a human-readable template page:

- what ML Claw is;
- what gets created when duplicated;
- what secrets the duplicate needs;
- when paid Space hardware is required;
- how the browser gateway works;
- how optional Telegram/Discord connectors differ from the default browser
  gateway;
- how local gateway mode differs from the default Space gateway;
- what the Storage Bucket stores;
- how to duplicate the Space;
- links to the CLI path for users who prefer local setup.

The source Space is effectively the product page and deploy template.

## Duplicated Space Behavior

When a user duplicates the Space into their namespace, the same code should run
as the real ML Claw app.

The duplicated Space should default to a browser-based OpenClaw gateway. Before
showing the gateway, it should require Hugging Face sign-in and establish an
app session, following the same pattern used in `xtap-pool`.

The duplicated app should show:

- "Sign in with Hugging Face" when the user is unauthenticated;
- the browser chat/gateway surface after sign-in;
- setup status;
- configured agent name;
- signed-in Hugging Face username;
- bucket connection status;
- gateway running/stopped status;
- current model/provider;
- optional Telegram/Discord connectivity status when configured;
- last successful state snapshot time;
- latest startup/runtime errors;
- paid hardware warning when always-on or messaging connector mode requires it;
- links to logs and repair commands.

The duplicated Space should never show the source-template onboarding page
unless explicitly forced for development.

## Source Space Detection

Use Hugging Face's built-in Space identity environment variables, not copied
public variables.

Required canonical values:

```text
MLCLAW_CANONICAL_SPACE_ID=osolmaz/mlclaw
MLCLAW_CANONICAL_CREATOR_USER_ID=<osolmaz HF user id>
```

Runtime detection:

```ts
type SpaceMode = "template" | "app";

function getSpaceMode(env: NodeJS.ProcessEnv): SpaceMode {
  if (env.MLCLAW_FORCE_TEMPLATE === "1") return "template";
  if (env.MLCLAW_FORCE_APP === "1") return "app";

  const isCanonicalSource =
    env.SPACE_ID === env.MLCLAW_CANONICAL_SPACE_ID &&
    env.SPACE_CREATOR_USER_ID === env.MLCLAW_CANONICAL_CREATOR_USER_ID;

  return isCanonicalSource ? "template" : "app";
}
```

Use both `SPACE_ID` and `SPACE_CREATOR_USER_ID`.

Do not use a copied variable such as `MLCLAW_TEMPLATE=true` as the mode switch.
Public Space variables are copied when a user duplicates a Space, so the clone
would inherit the wrong mode.

Development escape hatches:

```text
MLCLAW_FORCE_TEMPLATE=1
MLCLAW_FORCE_APP=1
```

These should be documented as development-only switches.

## Space App Structure

Add an explicit Space UI boundary:

```text
src/space/
  mode.ts
  oauth.ts
  session.ts
  template-page.tsx
  app-page.tsx
  gateway-page.tsx
  status.ts
```

`mode.ts` decides whether the Space renders the template page or app page.

`template-page.tsx` should be static and not require secrets.

`app-page.tsx` should call the existing diagnostics/status code and should be
safe when secrets are missing. Missing secrets should render actionable status,
not crash the Space.

`oauth.ts` and `session.ts` should implement Hugging Face OAuth and signed
HTTP-only session cookies, matching the `xtap-pool` approach:

- Space README metadata enables OAuth with `hf_oauth: true`;
- OAuth scopes are `openid profile`;
- unauthenticated users see a Hugging Face sign-in entry point;
- `/oauth/login` creates state and redirects to Hugging Face;
- `/oauth/callback` validates state, resolves the HF username, and sets a
  signed session cookie;
- app routes require a valid session;
- API routes use the signed session identity for attribution and access
  control.

Default authorization should allow the duplicated Space owner/admin. Additional
users can be configured through a comma-separated `MLCLAW_ALLOWED_USERS`
variable or later through an in-app admin screen.

## CLI Changes

Rename commands and docs to `mlclaw`.

Primary public path is duplicate-and-use in the Space. The CLI remains the
automation and local-operations path:

```bash
npx mlclaw bootstrap
```

Shell launchers:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.sh)
```

Windows launcher:

```powershell
irm https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.ps1 | iex
```

Command groups:

```bash
mlclaw bootstrap
mlclaw gateway status <agent>
mlclaw gateway migrate <agent> --to local
mlclaw gateway migrate <agent> --to space
mlclaw state adopt <agent> --bucket <owner/bucket>
mlclaw doctor <owner/space>
mlclaw settings <owner/space> --hardware cpu-upgrade --sleep-time -1
```

`mlclaw bootstrap` should default to the Space browser gateway path. Local
gateway and Telegram/Discord setup must be explicit choices.

Skillflag integration should expose the bundled agent skill under the new name:

```bash
mlclaw --skill list
mlclaw --skill show mlclaw
mlclaw --skill export mlclaw
```

The old skill name `mlclaw` should not be used for new releases.

## Runtime and State Changes

New runtime defaults:

- Space runtime: bundled artifact files committed into each generated Space;
- local runtime image: `ghcr.io/osolmaz/mlclaw-runtime:<version>`;
- state bucket env var: `OPENCLAW_HF_STATE_BUCKET`;
- ML Claw-specific env vars: `MLCLAW_*`;
- config directory: `~/.config/mlclaw`;
- local container name: `mlclaw-<agent>`;
- local Docker volume name: `mlclaw-<agent>-live`.

Keep `OPENCLAW_HF_STATE_BUCKET` because it describes the OpenClaw runtime
contract, not the product wrapper.

Do not add old-name aliases. If a user wants to reuse an existing bucket, they
must adopt it explicitly with `mlclaw state adopt`.

## Auth and Safety Positioning

ML Claw should make safe Hugging Face auth part of the default story.

Docs should recommend:

- propose-only or restricted HF tokens where possible;
- no broad write/delete token for untrusted scraping workflows;
- private Space browser gateway as the default UX;
- in-app HF OAuth before a user can access the agent gateway;
- private Storage Buckets for durable state;
- explicit cost confirmation before upgrading Space hardware;
- local gateway mode as an optional escape hatch for users who do not want any
  hosted runtime.

Future integration points:

- `hf-auth-helper` or equivalent token preset flow;
- brokered approval for destructive HF/GitHub actions;
- time-limited token support if available upstream.

## Documentation Changes

Update:

- `README.md`;
- `space/README.md`;
- `docs/COSTS.md`;
- `docs/MESSAGING_EGRESS.md`;
- dated implementation plans that mention active command names;
- bundled skill documentation;
- package metadata;
- release workflow names and image references.

The README should not include the full implementation plan. It should present:

- what ML Claw is;
- install commands;
- duplicate-to-use Space flow;
- browser gateway with Hugging Face sign-in;
- local vs Space gateway choice as an advanced option;
- cost warning;
- safe auth guidance;
- troubleshooting links.

## Release Plan

1. Rename repository branding and package metadata.
2. Rename CLI binary to `mlclaw`.
3. Rename bundled skill from `mlclaw` to `mlclaw`.
4. Remove old-name launchers, examples, config defaults, and skill names.
5. Add Space mode detection and template/app UI split.
6. Add HF OAuth session flow for the browser gateway.
7. Make the duplicated Space browser gateway the default user path.
8. Package `dist/hf-state-sync.js` and `dist/mlclaw-space-runtime.js` so npm
   installs can generate self-contained Spaces.
9. Publish `ghcr.io/osolmaz/mlclaw-runtime:<version>` for local gateway mode.
10. Publish `mlclaw` to npm.
11. Deprecate `mlclaw` on npm with a pointer to `mlclaw`; do not publish a
   wrapper release.
12. Rename or recreate the canonical Space as `osolmaz/mlclaw`.
13. Run an end-to-end duplicate test:
    - source Space shows template page;
    - duplicate Space shows app page;
    - duplicate Space requires Hugging Face sign-in;
    - signed-in owner can use the browser gateway;
    - missing secrets render setup status;
    - configured secrets start the gateway;
    - bucket restore works;
    - local gateway remains available as an explicit secondary path.

## Test Plan

Local tests:

```bash
npm run build
npm run typecheck
npm test
npm run check:secrets
npm run pack:check
node dist/mlclaw.mjs --skill list
node dist/mlclaw.mjs --skill show mlclaw
node dist/mlclaw.mjs --skill export mlclaw
```

Cutover tests:

- verify `npx mlclaw` exposes the CLI;
- verify no `mlclaw` binary is published by `mlclaw`;
- verify package files do not contain old `mlclaw` command examples;
- verify new deployments write only to `~/.config/mlclaw`;
- verify `MLCLAW_*` variables are used for ML Claw-specific configuration;
- verify explicit bucket adoption works with `mlclaw state adopt`.

Space mode tests:

- unit-test `getSpaceMode()` for canonical source, duplicate, forced template,
  and forced app cases;
- unit-test OAuth state validation, callback handling, session cookie signing,
  and unauthenticated redirects;
- run the Space app locally with `MLCLAW_FORCE_TEMPLATE=1`;
- run the Space app locally with `MLCLAW_FORCE_APP=1`;
- deploy/update `osolmaz/mlclaw` and verify it shows the template page;
- duplicate into a test namespace and verify it shows the app page;
- verify unauthenticated browser gateway requests redirect to HF sign-in;
- verify signed-in owner access is allowed;
- verify non-allowed signed-in users are rejected when an allowlist is set.

Live tests:

- duplicate the source Space into a test namespace;
- sign in with Hugging Face and verify the browser gateway loads;
- send a browser message and verify the agent replies;
- restart/rebuild the Space and verify state restores from the bucket;
- bootstrap a local gateway only as an explicit secondary-path test;
- optionally configure Telegram/Discord and verify connector status/replies;
- verify a duplicated Space can adopt the same bucket only with explicit
  `--bucket` confirmation.

## Open Questions

- What is the canonical `SPACE_CREATOR_USER_ID` for `osolmaz`, and should it be
  hard-coded in source or set as a public Space variable in the source Space?
- Should the source Space include an embedded setup checklist, or only link to
  CLI docs and Hugging Face duplicate instructions?
- Should owner access be derived only from `SPACE_AUTHOR_NAME`, or should the
  duplicated Space require an explicit `MLCLAW_ALLOWED_USERS` value before the
  browser gateway is enabled?
