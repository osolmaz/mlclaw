# Template Space Release Maintenance

Date: 2026-07-08

## Goal

ML Claw has two user entrypoints:

- the local CLI, published as the `mlclaw` npm package;
- the public Hugging Face template Space at `osolmaz/mlclaw`.

Both entrypoints must come from the same GitHub repository. The Hugging Face
Space is a distribution target, not a second source of truth.

## Source Of Truth

The canonical source is:

```text
https://github.com/osolmaz/mlclaw
```

The repo owns:

- CLI source under `src/mlclaw/`;
- Space runtime source under `src/mlclaw-space-runtime/`;
- state sync source under `src/hf-state-sync/`;
- generated Space files through `mlclaw update`;
- npm package metadata and release workflow;
- docs and tests.

The canonical template Space is:

```text
https://huggingface.co/spaces/osolmaz/mlclaw
```

The template Space should be public so users can duplicate it. It should show
the static duplicate instructions in source-template mode. It should not be
treated as a normal user deployment with a private bucket.

## Release Contract

On a GitHub release, the publish workflow must:

1. install dependencies;
2. build the TypeScript artifacts;
3. run typecheck, tests, secret checks, and package checks;
4. publish `mlclaw` to npm;
5. publish the `ghcr.io/osolmaz/mlclaw` runtime image to GHCR;
6. update the canonical Hugging Face template Space from the same built repo.

The workflow updates the template Space with:

```bash
node dist/mlclaw.mjs update "$MLCLAW_CANONICAL_SPACE_ID" --force
```

The repository must define a GitHub Actions secret named `HF_TOKEN`. The token
needs write access to the canonical Hugging Face Space.

Manual workflow dispatch can update a different template Space for testing by
setting the `template_space` input. The default remains `osolmaz/mlclaw`.

The default Space Dockerfile should be:

```dockerfile
FROM ghcr.io/osolmaz/mlclaw:<package-version>-openclaw-<openclaw-version>
```

The GHCR package must be public. Hugging Face Spaces pull the image without a
GitHub credential. The bundled Space runtime path is a development and
emergency fallback selected with `--bundled-runtime`; it is not the normal
release path.

## Doctor Behavior

`mlclaw doctor osolmaz/mlclaw` is template-aware.

For the canonical template Space, doctor checks template lineage and runtime
metadata only:

- `MLCLAW_TEMPLATE_REV`;
- `MLCLAW_RUNTIME_IMAGE`;
- `MLCLAW_CANONICAL_SPACE_ID`;
- Hugging Face runtime stage and hardware.

It must not require:

- `OPENCLAW_HF_STATE_BUCKET`;
- `HF_TOKEN`;
- `MLCLAW_SESSION_SECRET`;
- restore logs;
- snapshot upload logs.

Those checks apply to duplicated user deployments, not to the source template.

## Operational Commands

Update the canonical template Space from a local checkout:

```bash
npm run build
node dist/mlclaw.mjs update osolmaz/mlclaw --force
```

Check the canonical template Space:

```bash
node dist/mlclaw.mjs doctor osolmaz/mlclaw
```

Check a user deployment:

```bash
node dist/mlclaw.mjs doctor <owner/space>
```

Update a user deployment:

```bash
node dist/mlclaw.mjs update <owner/space>
```

## Invariant

Do not hand-edit generated files inside the Hugging Face template Space except
while debugging an incident. Any lasting change must land in the GitHub repo
and then be pushed to the Space with `mlclaw update`.
