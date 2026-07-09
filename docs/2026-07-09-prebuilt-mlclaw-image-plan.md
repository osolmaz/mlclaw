# Prebuilt ML Claw Image Plan

Date: 2026-07-09

## Status

Implemented in the ML Claw cutover branch.

## Decision

ML Claw should publish and use one prebuilt Docker image:

```text
ghcr.io/osolmaz/mlclaw:<mlclaw-version>-openclaw-<openclaw-version>
```

For version `0.1.0`, the default image is:

```text
ghcr.io/osolmaz/mlclaw:0.1.0-openclaw-2026.6.11
```

The OpenClaw base image is pinned to the stable release:

```text
ghcr.io/openclaw/openclaw:2026.6.11
```

Do not use the `2026.7` beta line for the default runtime yet.

## Why

Hugging Face Spaces should not rebuild the whole ML Claw runtime from source
for every user deployment.

A prebuilt image gives us:

- one tested runtime artifact for local gateway and Space gateway modes;
- faster Space rebuilds;
- easier rollback by changing one image tag;
- a clearer release contract than generated runtime files copied into every
  Space;
- no separate `mlclaw-runtime` package name to maintain.

## Source Of Truth

Runtime image naming lives in `package.json`:

```json
{
  "config": {
    "openclawVersion": "2026.6.11",
    "runtimeImageRepository": "ghcr.io/osolmaz/mlclaw"
  }
}
```

The TypeScript CLI reads this metadata and derives:

```text
ghcr.io/osolmaz/mlclaw:<package-version>-openclaw-<openclaw-version>
```

The publish workflow reads the same metadata before building and tagging the
Docker image.

## Generated Space Contract

By default, `mlclaw bootstrap`, `mlclaw update`, and
`mlclaw gateway migrate --to space` generate a Space Dockerfile with one line:

```dockerfile
FROM ghcr.io/osolmaz/mlclaw:0.1.0-openclaw-2026.6.11
```

The Space variable `MLCLAW_RUNTIME_IMAGE` must match that image tag.

`mlclaw doctor` should warn when a Space still points at:

- the legacy `ghcr.io/osolmaz/mlclaw-runtime:*` package;
- a bundled runtime reference such as `bundled:<template-revision>`.

The fix is `mlclaw update <owner/space>`, because the Dockerfile and variable
must be updated together.

## Bundled Runtime Fallback

Bundled Space generation remains available, but it is not the default path:

```bash
mlclaw update <owner/space> --bundled-runtime
```

Use this only for development or emergency fallback when GHCR is unavailable.
The bundled path uploads the runtime JavaScript, scripts, and default config
into the Space repository and builds from `ghcr.io/openclaw/openclaw:2026.6.11`.

`--bundled-runtime` must not be combined with `--runtime-image` or
`MLCLAW_RUNTIME_IMAGE`.

## Publish Workflow

The GitHub Actions publish workflow must:

1. install dependencies;
2. build all TypeScript and UI artifacts;
3. run typecheck, tests, secret checks, and package checks;
4. publish npm when requested;
5. build and push the Docker image to GHCR;
6. update the canonical Hugging Face template Space when requested.

The image tags are:

```text
ghcr.io/osolmaz/mlclaw:<package-version>-openclaw-<openclaw-version>
ghcr.io/osolmaz/mlclaw:openclaw-<openclaw-version>
ghcr.io/osolmaz/mlclaw:sha-<git-sha>
ghcr.io/osolmaz/mlclaw:latest
```

The GHCR image package must be public. Hugging Face Spaces pull the image
without GitHub credentials.

## Validation

Local validation:

```bash
npm run build
npm run typecheck
npm test
npm run pack:check
npm run check:secrets
```

Space generation validation:

```bash
node dist/mlclaw.mjs update osolmaz/mlclaw-test --force
```

The generated Space Dockerfile should contain:

```dockerfile
FROM ghcr.io/osolmaz/mlclaw:0.1.0-openclaw-2026.6.11
```

Runtime validation:

```bash
docker build -t mlclaw:test .
docker run --rm --entrypoint sh mlclaw:test -lc 'openclaw --version && test "$MLCLAW_RUNTIME_IMAGE" = "ghcr.io/osolmaz/mlclaw:0.1.0-openclaw-2026.6.11"'
```

Live validation after publish:

```bash
docker buildx imagetools inspect ghcr.io/osolmaz/mlclaw:0.1.0-openclaw-2026.6.11
node dist/mlclaw.mjs doctor osolmaz/mlclaw
node dist/mlclaw.mjs doctor osolmaz/mlclaw-test
```
