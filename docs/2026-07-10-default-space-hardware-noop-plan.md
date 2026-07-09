# Default Space Hardware No-Op Plan

Date: 2026-07-10

Status: implemented

## Goal

Default ML Claw Space bootstrap should not touch Hugging Face hardware settings.
Hugging Face already creates Docker Spaces on the default free CPU hardware.

This avoids requiring billing/admin hardware permissions for the normal
`npx mlclaw@latest bootstrap` path, especially when creating a Space inside an
organization namespace.

## Behavior

ML Claw should treat hardware as optional:

- default browser Space bootstrap does not send `hardware` during repo creation;
- default browser Space bootstrap does not call `/api/spaces/:repo/hardware`;
- the bootstrap plan displays `Hardware: default free CPU`;
- existing Space updates without `--hardware` display
  `Hardware: unchanged Space hardware`;
- explicit `--hardware` still requests that hardware;
- Telegram Space gateway mode still requires paid hardware because messaging
  egress requires upgraded Space hardware today;
- `mlclaw settings --hardware ...` remains the explicit hardware mutation path.

## Implementation Shape

Use a resolved hardware request object instead of assuming every deployment has
a concrete hardware flavor.

```ts
type SpaceHardwareRequest =
  | { kind: "default"; label: string }
  | { kind: "explicit"; hardware: string; label: string; sleepTime?: number };
```

Only the explicit variant is allowed to call billing-sensitive hardware APIs.

## Validation

- Add regression tests that default bootstrap creates a Space without a
  hardware field and never calls `requestSpaceHardware`.
- Keep tests for paid Telegram hardware.
- Keep tests for explicit settings hardware mutation.
- Keep tests for public/org-owned Spaces on the default path.
