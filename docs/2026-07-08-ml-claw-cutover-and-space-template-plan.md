# ML Claw Cutover and Space Template Plan

Status: proposed

## Goal

Cut over from Hugging Claw to **ML Claw** and make the public Hugging Face Space act
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
| Runtime image | `ghcr.io/osolmaz/mlclaw-runtime:<version>` |
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

1. Rename the repository from `huggingclaw` to `mlclaw`.
2. Publish a new npm package named `mlclaw`.
3. Publish a new runtime image named `ghcr.io/osolmaz/mlclaw-runtime`.
4. Update documentation, examples, launchers, skills, and runtime defaults to
   use only `mlclaw`.
5. Deprecate the old `huggingclaw` npm package metadata with a pointer to
   `mlclaw`.

Do not implement a legacy bridge.

Specifically, do not add:

- `hclaw` aliases;
- `huggingclaw` package wrappers;
- `migrate-from-huggingclaw` commands;
- automatic reads from `~/.config/huggingclaw`;
- `HUGGINGCLAW_*` environment variable aliases;
- old container or volume name adoption;
- automatic remote bucket renames.

Users who need the old implementation can keep using the old `huggingclaw`
release. New users and new docs use `mlclaw` only.

Existing buckets can still be used through the normal explicit adoption path:

```bash
mlclaw state adopt <agent> --bucket <owner/bucket>
```

That is not a Hugging Claw migration path. It is the standard ML Claw way to
point a deployment at a durable OpenClaw state bucket.

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
- how local gateway mode differs from Space gateway mode;
- what the Storage Bucket stores;
- how to duplicate the Space;
- links to the CLI path for users who prefer local setup.

The source Space is effectively the product page and deploy template.

## Duplicated Space Behavior

When a user duplicates the Space into their namespace, the same code should run
as the real ML Claw app.

The duplicated app should show:

- setup status;
- configured agent name;
- bucket connection status;
- gateway running/stopped status;
- current model/provider;
- Telegram/Discord connectivity status when configured;
- last successful state snapshot time;
- latest startup/runtime errors;
- paid hardware warning when messaging gateway mode requires it;
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
  template-page.tsx
  app-page.tsx
  status.ts
```

`mode.ts` decides whether the Space renders the template page or app page.

`template-page.tsx` should be static and not require secrets.

`app-page.tsx` should call the existing diagnostics/status code and should be
safe when secrets are missing. Missing secrets should render actionable status,
not crash the Space.

## CLI Changes

Rename commands and docs to `mlclaw`.

Primary install path:

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

Skillflag integration should expose the bundled agent skill under the new name:

```bash
mlclaw --skill list
mlclaw --skill show mlclaw
mlclaw --skill export mlclaw
```

The old skill name `huggingclaw` should not be used for new releases.

## Runtime and State Changes

New runtime defaults:

- runtime image: `ghcr.io/osolmaz/mlclaw-runtime:<version>`;
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
- local gateway mode as the default for users who do not want paid Space
  hardware;
- paid Space mode only after an explicit cost confirmation.

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
- local vs Space gateway choice;
- cost warning;
- safe auth guidance;
- troubleshooting links.

## Release Plan

1. Rename repository branding and package metadata.
2. Rename CLI binary to `mlclaw`.
3. Rename bundled skill from `huggingclaw` to `mlclaw`.
4. Remove old-name launchers, examples, config defaults, and skill names.
5. Add Space mode detection and template/app UI split.
6. Publish `ghcr.io/osolmaz/mlclaw-runtime:<version>`.
7. Publish `mlclaw` to npm.
8. Deprecate `huggingclaw` on npm with a pointer to `mlclaw`; do not publish a
   wrapper release.
9. Rename or recreate the canonical Space as `osolmaz/mlclaw`.
10. Run an end-to-end duplicate test:
    - source Space shows template page;
    - duplicate Space shows app page;
    - missing secrets render setup status;
    - configured secrets start the gateway;
    - bucket restore works;
    - local gateway migration still works.

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
- verify no `hclaw` binary is published by `mlclaw`;
- verify package files do not contain old `huggingclaw` command examples;
- verify new deployments write only to `~/.config/mlclaw`;
- verify `MLCLAW_*` variables are used for ML Claw-specific configuration;
- verify explicit bucket adoption works with `mlclaw state adopt`.

Space mode tests:

- unit-test `getSpaceMode()` for canonical source, duplicate, forced template,
  and forced app cases;
- run the Space app locally with `MLCLAW_FORCE_TEMPLATE=1`;
- run the Space app locally with `MLCLAW_FORCE_APP=1`;
- deploy/update `osolmaz/mlclaw` and verify it shows the template page;
- duplicate into a test namespace and verify it shows the app page.

Live tests:

- bootstrap a new test agent with `mlclaw bootstrap --gateway local`;
- send a Telegram message and verify the gateway replies;
- migrate to Space gateway with paid hardware confirmation;
- send a Telegram message and verify the Space gateway replies;
- migrate back to local gateway and verify history/state survives;
- verify a duplicated Space can adopt the same bucket only with explicit
  `--bucket` confirmation.

## Open Questions

- What is the canonical `SPACE_CREATOR_USER_ID` for `osolmaz`, and should it be
  hard-coded in source or set as a public Space variable in the source Space?
- Should the source Space include an embedded setup checklist, or only link to
  CLI docs and Hugging Face duplicate instructions?
