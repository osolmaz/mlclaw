# Space Update and Doctor Plan

Status: implementation target

## Goal

Make ML Claw maintainable after a user has duplicated or bootstrapped a Space.
It must be possible to update, modify, and repair an existing ML Claw Space
without recreating the Storage Bucket or losing OpenClaw state.

This applies to existing ML Claw Spaces, not legacy Hugging Claw deployments.
The cutover remains hard.

## Update Contract

`mlclaw update <owner/space>` regenerates the current Space files and commits
them to the target Space.

Update must:

- preserve Space secrets;
- preserve `OPENCLAW_HF_STATE_BUCKET`;
- preserve `OPENCLAW_HF_STATE_PREFIX`;
- preserve model/agent variables unless explicitly overridden;
- update `OPENCLAW_HF_TEMPLATE_REV`;
- update `MLCLAW_RUNTIME_IMAGE`;
- update `MLCLAW_RUNTIME_ID`;
- update the generated Space README and Dockerfile;
- restart the Space after a successful commit.

Update must refuse unknown Spaces unless `--force` is supplied. A Space is
recognized as ML Claw if it has at least one of:

- `MLCLAW_TEMPLATE_REV`;
- `OPENCLAW_HF_TEMPLATE_REV`;
- `MLCLAW_RUNTIME_IMAGE`;
- `OPENCLAW_HF_STATE_BUCKET`.

## Doctor Contract

`mlclaw doctor <owner/space>` checks:

- Space runtime stage and hardware;
- required variables;
- required secrets by key presence only;
- bucket accessibility;
- source/app mode variables;
- runtime image variable;
- stale path variables that should not be set;
- whether run logs show restore/fresh-start and snapshot outcomes;
- whether browser gateway status endpoint is reachable when the Space URL is
  available.

`mlclaw doctor <owner/space> --fix` may safely:

- set missing non-secret variables when enough information is supplied;
- delete stale path variables;
- set `MLCLAW_GATEWAY_LOCATION=space`;
- set `MLCLAW_RUNTIME_IMAGE`;
- set `MLCLAW_RUNTIME_ID`;
- set `MLCLAW_CANONICAL_SPACE_ID`;
- restart the Space when it changed config.

Doctor must not:

- read secret values;
- overwrite secrets without an explicit user-supplied value;
- mutate bucket contents;
- rename buckets;
- switch gateway location without an explicit command.

## Existing Space Editing

All generated Space files should be treated as owned by ML Claw. Updating an
existing Space should delete generated files that are no longer used. User
state belongs in the bucket, not in the Space repo.

The generated Space repository should remain minimal:

```text
README.md
Dockerfile
.gitattributes
assets/mlclaw.svg
```

## Test Plan

- unit-test update recognition and refusal;
- unit-test generated Space contents;
- unit-test doctor findings for missing variables/secrets;
- unit-test `doctor --fix` safe repairs;
- run live `mlclaw update` against a test Space;
- run live `mlclaw doctor --fix`;
- confirm existing bucket state survives update/restart.
