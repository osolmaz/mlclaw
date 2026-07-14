# Broker Agent-Tool Compatibility Cutover Plan

Date: 2026-07-14

Status: ready to implement after the companion BrokerKit contract is reviewed

## Objective

Adopt BrokerKit's transcript-safe MCP contract in MLClaw, pin the exact
implementing BrokerKit revision, and prove that an OpenClaw agent can submit,
recover, approve, and complete broker operations without reusing redacted
identifiers or losing operations behind MCP timeouts.

This is one coordinated pre-release cutover. MLClaw does not patch OpenClaw,
carry old BrokerKit MCP fields, translate legacy tool calls, or support mixed
old/new runtime pairs. The test deployment starts with fresh BrokerKit state.

The companion provider and shared-contract work belongs to
`osolmaz/brokerkit:docs/2026-07-14-agent-tool-compatibility-cutover-plan.md`.

## Confirmed Failure

The live `osolmaz/mlclaw-test` transcript and persisted HF Broker database prove
the following sequence:

1. A new MCP call submitted full values such as
   `test-broker-001-20260714`.
2. OpenClaw retained a redacted tool-call argument such as `test-b…0714` in
   model-visible history.
3. A later agent turn derived a new request from the redacted history and sent
   `test-b…14-a` as the actual value.
4. A later retry sent the literal value `***`.
5. HF Broker correctly persisted `***` and rejected different operations that
   reused it with `idempotency key was reused with a different operation`.

The broker was not stuck. Its idempotency records were durable and correct for
the bytes it received. Restarting the MCP process or broker could not repair
the client-visible contract.

The same session also submitted `wait_seconds: 900`, while OpenClaw's MCP
request deadline ended earlier. The broker operation remained pending, but the
agent received a timeout without the operation ID and had no reliable list or
request-ID lookup with which to recover it.

## Ownership

BrokerKit owns:

- the transcript-safe MCP request and response schemas;
- server-generated request identity;
- immediate operation submission;
- bounded operation get, wait, list, and request-ID recovery tools;
- safe aliases for provider fields that collide with host redaction;
- mapping aliases back to provider-native fields;
- structured idempotency conflict responses; and
- schema conformance across HF, GitHub, and future brokers.

MLClaw owns:

- pinning one immutable compatible BrokerKit revision;
- installing the matching HF Broker binary and OpenClaw plugin in the image;
- writing a bounded OpenClaw MCP server configuration;
- seeding concise agent guidance for the submit/status workflow;
- ensuring diagnostics do not suggest service restarts for durable conflicts;
- rebuilding tracked bundles and the runtime image;
- deploying only the test Space during verification; and
- exercising the actual OpenClaw transcript, approval popover, and HF Broker
  operation path end to end.

OpenClaw core is not modified. MLClaw relies only on its published MCP server
configuration and tool execution behavior.

## Required BrokerKit Contract

MLClaw consumes the following version 1 behavior from its pinned BrokerKit
revision. The BrokerKit plan is authoritative for implementation details.

### Submission tools

Every agent-facing provider operation:

- accepts an optional non-secret `request_id` instead of
  `idempotency_key`;
- creates a cryptographically random request ID when it is omitted;
- treats a supplied request ID as a stable exact-replay identifier;
- returns the operation immediately after durable admission;
- does not expose a submission-level `wait_seconds` field;
- returns both `id` and `request_id` in the immediate result; and
- uses transcript-safe names for every non-secret input and output field.

Immediate, get, and wait results use the closed
`brokerkit.io/mcp-operation/v1` projection. Bounded list results use
`brokerkit.io/mcp-operation-page/v1`. MLClaw must reject a pinned BrokerKit
build that labels the renamed MCP projection as an unchanged Agent V1
document.

The internal Agent V1 idempotency implementation may retain its precise
provider-neutral semantics. MLClaw depends only on the MCP projection.

### Recovery tools

Each installed broker exposes provider-prefixed typed tools equivalent to:

```json
{
  "operation_get": {
    "operation_id": "op_..."
  },
  "operation_wait": {
    "operation_id": "op_...",
    "timeout_seconds": 25
  },
  "operation_list": {
    "request_id": "optional exact filter",
    "state": "optional state filter",
    "limit": 20,
    "cursor": "optional opaque cursor"
  }
}
```

`operation_wait` returns the current nonterminal operation after at most 25
seconds. It never owns a 15-minute MCP request. `operation_list` is bounded,
client-scoped, newest-first, cursor-paginated, and sufficient to recover an
operation after an ambiguous client timeout.

### Transcript-safe provider fields

At minimum, the pinned revision must project safe MCP names for the confirmed
false positives:

- HF Space variable and secret names currently represented by `key`;
- GitHub cache and document identifiers represented by `key`;
- GitHub public SSH, signing, and deploy-key material;
- GitHub commit signatures;
- GitHub stream request handles represented by `request_key`; and
- GitHub's `hide_secret` boolean.

Actual credentials, passwords, bearer values, and secret values remain sealed,
slot-backed, or otherwise absent from model-visible results. MLClaw must not
disable OpenClaw redaction to make identifiers work.

## MLClaw Source Changes

### Broker MCP configuration

Update `src/mlclaw-space-runtime/openclaw-config.ts` so the managed
`huggingface-broker` entry owns explicit bounded transport settings in addition
to its command, arguments, and protected environment:

- set `connectionTimeoutMs` to a documented bounded startup value;
- set `requestTimeoutMs` above BrokerKit's maximum 25-second wait but well
  below an approval lifetime;
- preserve an explicit user disablement;
- do not preserve user overrides of the managed command, protected
  environment, or timeout contract; and
- continue preserving only supported user tool filtering and unrelated safe
  metadata.

Use one exported constant for each timeout so source, tests, generated runtime
bundle, and documentation cannot drift. A recommended request timeout is
45 seconds, leaving room for transport overhead around a 25-second broker
wait.

Do not raise the MCP timeout to 15 minutes. Approval lifetime and one transport
request deadline are different concepts.

### Agent guidance

Update the managed Hugging Face tooling note and examples generated for the
OpenClaw workspace. The note must say, in plain language:

- omit `request_id` for a new operation unless an exact retry identity is
  intentionally required;
- record the returned operation `id`;
- use the provider's operation wait/get tools to observe completion;
- use bounded list or request-ID lookup after an ambiguous timeout;
- never reuse a request ID for a different target or argument set; and
- do not restart the broker to resolve an idempotency conflict.

The guidance must not tell the agent to construct, inspect, or read broker
credential files. OpenClaw continues to receive only the generated agent
credential path through the managed MCP environment.

### Diagnostics

Update MLClaw-owned status or doctor wording where it currently encourages a
broker restart for client request conflicts. Distinguish these classes:

- MCP transport unavailable;
- MCP transport deadline exceeded;
- durable operation still pending;
- exact idempotent replay;
- request-ID conflict; and
- operator source unavailable.

Diagnostics may include a safe operation ID or request ID returned by
BrokerKit. They must not include agent credentials, operator credentials,
sealed payload references, raw secret values, or unbounded broker responses.

### Immutable runtime pin

After BrokerKit is green:

- update `package.json` `config.brokerkitVersion` to the exact implementing
  commit;
- update the matching `ARG BROKERKIT_VERSION` default in `Dockerfile`;
- keep the pre-publication plugin package format at version 1;
- rebuild `dist/mlclaw-space-runtime.js`, `dist/mlclaw.mjs`, and all tracked
  generated assets from source;
- verify the image contains the HF Broker binary and OpenClaw plugin from the
  same BrokerKit commit; and
- make runtime-image tests fail when either pin drifts.

Do not build from a branch, moving tag, uncommitted checkout, or locally
modified BrokerKit tree.

## Automated Verification

### Managed configuration tests

Extend `test/mlclaw.space-runtime.test.ts` and focused OpenClaw configuration
tests to prove:

- the HF Broker MCP entry contains the canonical command, protected
  environment, connection timeout, and request timeout;
- the request timeout exceeds the bounded BrokerKit wait;
- a user cannot replace the managed binary, agent-secret path, broker URL, or
  timeout contract through stale config;
- explicit disablement remains respected; and
- unrelated custom MCP servers and allowed tool filters remain intact.

### Runtime image and bundle tests

Extend `test/mlclaw.runtime-image.test.ts`,
`test/mlclaw.generate-space.test.ts`, and bundle checks to prove:

- the BrokerKit commit pin is identical in package metadata and Docker build
  input;
- the built `hf-broker` advertises `request_id` and no agent-facing
  `idempotency_key`;
- submission tools have no `wait_seconds` field;
- operation get, wait, and list/recovery tools are advertised;
- the packaged OpenClaw plugin and HF Broker come from the same commit; and
- tracked distributions match source.

### OpenClaw transcript regression test

Add an integration fixture using the pinned OpenClaw package and real HF Broker
MCP process. The fixture must:

1. submit two distinct operations with generated request IDs;
2. persist and replay the OpenClaw transcript;
3. prove both returned request IDs remain intact and distinct;
4. retry one operation with its exact request ID and receive the original
   operation;
5. reuse that request ID with a different target and receive a structured
   conflict referencing the existing operation;
6. omit the request ID again and create a distinct operation;
7. exercise every confirmed transcript-safe alias through serialization and
   replay; and
8. prove actual sealed values and credentials remain absent from transcript,
   logs, errors, and test snapshots.

The test must inspect the model-visible message shape, not only the raw MCP
response. It must fail if a safe identifier becomes `***`, an ellipsis mask,
or a different JSON type after replay.

### Timeout and recovery test

Add an integration test in which:

- submission returns a pending operation immediately;
- approval remains pending longer than one MCP request timeout;
- repeated 25-second waits return the same operation without transport error;
- one injected ambiguous transport failure occurs after durable admission;
- bounded operation listing or request-ID lookup recovers the operation;
- approval through the delegated BrokerKit UI completes it; and
- the next get/wait returns the terminal result without a duplicate operation.

## Live Test-Space Verification

Deploy only to `osolmaz/mlclaw-test` after both repositories are green.

1. Recreate the test deployment's BrokerKit state from scratch; do not write a
   pre-release state converter.
2. Confirm `mlclaw doctor osolmaz/mlclaw-test` reports the runtime, mounted
   bucket, OpenClaw Gateway, BrokerKit plugin, and HF Broker listeners healthy.
3. Start a fresh OpenClaw chat so it receives the updated tool catalog and
   managed guidance.
4. Create a uniquely named private dataset repository request without a
   caller-supplied request ID.
5. Confirm the tool immediately returns a pending operation ID and request ID.
6. Confirm the notification badge and popover render that request without page
   or iframe refresh.
7. Approve it in the popover and use operation wait/get until it succeeds.
8. Retry the exact request ID and prove no second repository or approval is
   created.
9. Try the same request ID with a different disposable target and confirm an
   actionable conflict identifies the existing operation.
10. Leave a second request pending across multiple bounded wait calls and prove
    no MCP timeout loses its identity.
11. Exercise an HF Space variable name and secret name that previously used
    `key`, then inspect the model-visible transcript and confirm the names are
    intact while the secret value is absent.
12. Restart the Space once, restore from the bucket snapshot, and prove pending
    and terminal operations remain recoverable without retry collisions.

Delete or deny disposable pending requests and remove disposable Hub resources
after verification.

## Required Checks

Run the repository checks required by `AGENTS.md`:

```sh
npm run format
npm run lint
npm run typecheck
npm test
npm run coverage
npm run build
npm run check:secrets
npm run pack:check
npm run dry
npm run slophammer
```

Do not run mutation testing for this cutover.

## Cutover

Complete the work in this order without publishing an intermediate pairing:

1. merge the BrokerKit MCP contract, projections, recovery tools, and
   conformance tests;
2. pin that exact BrokerKit commit in MLClaw;
3. update managed OpenClaw configuration and agent guidance;
4. rebuild and verify all tracked distributions and the runtime image;
5. recreate only the test deployment's BrokerKit state;
6. deploy only `osolmaz/mlclaw-test`;
7. run the live end-to-end matrix; and
8. publish no package release until every acceptance criterion passes.

There is no compatibility mode. A runtime that mixes the old required
`idempotency_key`/long-wait tools with the new MLClaw guidance is invalid.

## Acceptance Criteria

- OpenClaw never needs to invent or retain an `idempotency_key` for a new
  broker operation.
- Model-visible history preserves every non-secret request, operation, and
  provider identifier required for retries or chaining.
- Actual credentials and secret values remain sealed and absent from model
  history.
- Submission returns a durable operation ID before any approval wait.
- No MCP tool call waits longer than the bounded OpenClaw transport contract.
- An ambiguous timeout can be recovered through operation listing or exact
  request-ID lookup.
- Exact replay returns the original operation; conflicting reuse returns an
  actionable structured conflict.
- Restarting OpenClaw, the MCP process, or the broker is not required to repair
  client request identity.
- The approval badge and popover render and decide a newly submitted request
  without refresh.
- Runtime image, BrokerKit binary, plugin, package metadata, and tracked bundles
  use one immutable BrokerKit commit.
- All MLClaw quality gates pass, and `mlclaw doctor` is clean on the test Space.
