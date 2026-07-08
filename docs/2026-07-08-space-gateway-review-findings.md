# 2026-07-08 Space Gateway Review Findings

This records the review findings for `feat/mlclaw-space-browser-gateway` and
the fixes that should land before the browser gateway is treated as deployable.

## Findings

1. Malformed cookies can crash WebSocket upgrade handling.
   `decodeURIComponent` throws on invalid cookie values. The HTTP path catches
   the exception, but the WebSocket upgrade path did not.

2. The duplicated Space owner is not always the default admin.
   If `MLCLAW_ALLOWED_USERS` is set without `MLCLAW_ADMINS`, the first allowed
   user becomes admin instead of the Space owner.

3. Unauthenticated API-like requests return `200` with HTML.
   Gateway API callers should get a real `401` instead of a successful HTML
   login response.

4. Internal error strings are returned to clients.
   Upstream connection errors and catch-all server errors should be generic in
   the browser response and detailed only in server logs.

5. Wrapper routes need to be explicit.
   ML Claw reserves wrapper routes such as `/health`, `/oauth/*`,
   `/mlclaw/*`, `/logout`, and `/assets/mlclaw.svg`; these are not proxied to
   OpenClaw.

6. Logout is stateless.
   Logout clears the browser cookie. A copied signed cookie remains valid until
   its expiry because the gateway does not keep a server-side session store.

7. Login should preserve the originally requested path.
   A user who opens a deep Control UI path before login should return there
   after Hugging Face OAuth.

8. WebSocket proxy socket lifecycle should close both sides.
   Client-side socket errors or closes should tear down the upstream socket too.

9. Space-to-local migration can pause a running Space without a final snapshot
   when the runtime lease is missing or stale.
   A running Space may still receive `SIGTERM` and upload its final snapshot
   after the local gateway has already restored from the bucket, which can lose
   recent state.

10. Template mode can classify non-canonical Spaces from the canonical creator
    as source templates.
    Creator ID is a useful extra guard, but the canonical Space ID must still
    match before template mode is selected.

11. The generated Space runtime bundle must be tracked.
    The bundled Space path copies `dist/mlclaw-space-runtime.js`; clean
    checkouts need that file committed just like the other runtime bundles.

## Fix Plan

- Make cookie parsing skip malformed percent-encoded values.
- Wrap upgrade handling and reject bad upgrades instead of letting exceptions
  reach the process.
- Resolve admins as explicit admins first, then Space owner, then first allowed
  user; union admins into the allowed set.
- Return `401` for unauthenticated API/non-navigation requests and preserve
  `next` on login links.
- Use generic `500` and `502` client responses while logging details server-side.
- Support both `/logout` and `/mlclaw/logout`.
- Tighten WebSocket proxy cleanup.
- Require a handoff wait whenever the Space runtime may still be running,
  even if the runtime lease is missing or stale. Only already non-running Space
  states may skip the final-snapshot wait.
- Require exact canonical Space ID before template mode, with creator ID as an
  additional check when configured.
- Unignore and commit `dist/mlclaw-space-runtime.js`.
- Add regression tests for the crash, admin resolution, API `401`, preserved
  `next`, generic upstream errors, Space migration without a current lease, and
  template mode classification.
