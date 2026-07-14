# Local Model Routing Hack Plan

Date: 2026-07-13

Status: idea for a focused hack

## Goal

Build an ML Claw mode where a small model runs on the user's mobile device and
handles a narrow set of assistant tasks. ML Claw makes a new routing decision
for every incoming message. When a request is outside the local model's safe or
useful range, ML Claw automatically sends it to a stronger cloud model such as
GPT from OpenAI or another configured hosted model.

The first target is a mobile, Siri-like virtual assistant using a model with
fewer than 10 billion parameters, specifically Gemma 4 E2B or Gemma 4 E4B as
the initial candidates. Its local actions include:

- calling a contact;
- creating a reminder;
- creating or reading a calendar event;
- creating a note;
- finding or opening an app;
- setting an alarm or timer;
- answering simple device or personal-assistant questions.

Both directions count as **local model routing** for this project:

- **local-first:** the local model handles requests by default and escalates
  difficult requests to the cloud;
- **cloud-first:** the user mainly works with a cloud model, but individual
  private, fast, simple, or device-specific messages are routed to the local
  model.

The hack should start with local-first because it best tests whether a small
model can provide a useful assistant while reducing latency, cloud cost, and
data sharing.

## Demo

The primary demo should be one continuous conversation:

1. "Remind me to call Merve at 4" runs locally and creates a reminder.
2. "Open Spotify" runs locally and opens the app.
3. "Summarize the main arguments in this paper and compare them with recent
   work" is recognized as too broad and moves to the cloud.
4. The UI clearly shows `On device` or `Cloud` for each response.
5. The cloud receives only the user request and the minimum context required.

A second demo should reverse the policy: start cloud-first, then route a
private device action such as looking up a contact or creating a calendar event
back to the local model.

## Product Boundary

This is not initially a general router that tries to predict which model will
produce the best prose. It is a message-level capability router for a small,
known action space. The small local model should solve only the subset of tasks
it can handle reliably and hand everything else to the stronger cloud model.

The first version should support:

- one local model;
- one cloud model;
- text input;
- a fixed device-action schema;
- local-first and cloud-first policies;
- automatic escalation;
- an optional per-message override;
- a visible explanation of where the request ran.

Do not include voice, arbitrary OpenClaw tools, multiple local models, model
ensembles, or learned cost optimization in the first hack. Voice can be added
after routing and actions work reliably.

## Architecture

```text
incoming message
      |
      v
trusted routing policy
      |
      +---- local model ----> constrained device actions
      |          |
      |          +---- explicit escalate action ----+
      |                                             |
      +---- cloud model <----------------------------+
                 |
                 +---- response or approved action plan
```

The trusted router runs before either model. A model may request escalation,
but it does not choose its own permissions or directly select arbitrary
endpoints.

The routing decision should combine three signals:

1. **Deterministic policy:** privacy rules, connectivity, user override, and
   whether the requested capability exists locally.
2. **Small routing classifier:** predicts `local`, `cloud`, or `ask` from the
   message and available capabilities.
3. **Execution feedback:** the local model can return a typed `escalate`
   result, and repeated parse or tool failures can trigger a cloud fallback.

Do not rely only on the local model saying that it is confident. Small models
are often confident when they are wrong.

## Local Action Contract

The local model may produce only a small structured result:

```ts
type LocalAssistantResult =
  | { type: "reply"; text: string }
  | { type: "action"; action: DeviceAction }
  | { type: "clarify"; question: string }
  | { type: "escalate"; reason: EscalationReason };
```

`DeviceAction` should be a closed, versioned union. Each action must have
strict fields, validation, and a platform adapter. There must be no generic
shell, URL, HTTP, or arbitrary tool action.

Actions should be split by risk:

- **read-only:** find an app, read the next calendar event;
- **reversible:** create a note, reminder, alarm, or calendar draft;
- **external effect:** place a call or send a message.

External effects require user confirmation. The platform action layer, not the
model, enforces that rule.

## Routing Rules

Route locally when all of these are true:

- the request maps to a supported local capability;
- required data is available on the device;
- the action schema can express the result;
- policy allows the data to remain local;
- the local model returns valid structured output.

Route to the cloud when any of these are true:

- the request needs broad research, long reasoning, coding, or unsupported
  knowledge;
- the local capability set cannot complete it;
- the request needs context that is too large for the local model;
- the local model explicitly escalates;
- structured output fails after one retry;
- the local tool fails and the cloud can still help;
- the user explicitly asks for the cloud model.

Ask the user instead of routing when cloud use would expose protected data or
when an action is ambiguous and has an external effect.

## Context and Privacy

Cloud fallback must not upload the whole local conversation automatically.

For each escalation, construct a small handoff containing:

- the current user request;
- a short local summary when needed;
- explicitly selected attachments;
- the reason for escalation;
- no contacts, calendar contents, notifications, location, or app data unless
  required and approved.

The UI should preview sensitive context before it leaves the device. A user
setting may allow automatic cloud routing for non-sensitive requests.

Routing logs should record the target, reason, latency, action type, and result.
They should not store message text or personal data by default.

## ML Claw Integration

Keep the routing core separate from the existing Space gateway and Hugging
Face Router model catalog. "Hugging Face Router" selects a hosted inference
provider; "local model routing" decides whether a request runs locally or in
the cloud.

Add an optional routing profile to ML Claw configuration:

```json
{
  "localRouting": {
    "enabled": true,
    "policy": "local-first",
    "localModel": "google/gemma-4-E4B-it",
    "cloudModel": "huggingface/google/gemma-4-26B-A4B-it:deepinfra",
    "capabilities": ["contacts", "reminders", "calendar", "notes", "apps", "alarms"],
    "cloudFallback": "automatic-nonsensitive"
  }
}
```

The implementation should have three boundaries:

- a TypeScript routing core with schemas, policy, traces, and tests;
- a local-model adapter, initially backed by one mobile inference runtime;
- native device-action adapters that enforce platform permissions and user
  confirmation.

The TypeScript core belongs in this repository. Platform-specific mobile code
should remain behind adapters so the router can also be tested on desktop with
a fake local model and fake device actions.

Cloud fallback should use ML Claw's existing trusted inference path. It may
target the Hugging Face Router, OpenAI GPT, or another configured cloud model.
The local model and untrusted OpenClaw process must not receive cloud provider
tokens.

## Hack Implementation

1. Define the routing profile, action union, escalation reasons, and trace
   schema with strict runtime validation.
2. Build a deterministic policy engine and a replaceable three-way classifier:
   `local`, `cloud`, or `ask`.
3. Add a fake local model and fake device adapter for fast end-to-end tests.
4. Create a routing evaluation set containing supported commands, ambiguous
   commands, cloud-only requests, sensitive requests, and adversarial prompts.
5. Connect one real sub-10B Gemma model through a mobile inference adapter.
6. Implement reminders, calendar drafts, notes, app lookup, alarms, and calls
   behind native permission and confirmation checks.
7. Connect cloud escalation to the existing ML Claw inference broker.
8. Add a small conversation UI that labels every turn `On device`, `Cloud`, or
   `Approval needed` and allows a one-turn routing override.
9. Run the complete evaluation on at least one real mobile device and publish
   latency, memory, battery, task-success, and cloud-routing results.

## Evaluation

Create a versioned test set with at least these groups:

- direct supported commands;
- paraphrased supported commands;
- missing or ambiguous action fields;
- requests outside the local action space;
- long or knowledge-heavy questions;
- sensitive personal-data requests;
- prompt-injection attempts;
- offline requests;
- local model parse failures;
- device tool failures.

Measure:

- local task success;
- routing accuracy;
- dangerous wrong-local decisions;
- unnecessary cloud routes;
- successful recovery after local failure;
- sensitive-data leakage to cloud;
- time to first response and total latency;
- peak memory and battery use;
- cloud tokens and cost saved.

The hack is successful only if dangerous actions never bypass confirmation and
protected local data is never sent to the cloud without policy approval.

## Open Questions

- Which mobile platform and inference runtime should be the first reference
  implementation?
- Is Gemma 4 E2B or E4B reliable enough for the structured action set?
- Should the routing classifier be the same local model, a smaller dedicated
  classifier, or deterministic rules for the first demo?
- Should the cloud model return only text, or may it propose device actions for
  local confirmation and execution?
- Which conversation summary, if any, is safe and useful to include in a cloud
  handoff?
- How should users inspect and correct routing decisions so they can improve a
  personal routing profile over time?

## Recommended First Cut

Use local-first routing with Gemma E4B, four actions, and one cloud model:

- create a reminder;
- create a calendar draft;
- create a note;
- find or open an app.

Use deterministic capability and privacy rules before a local three-way
classifier. Let the local model produce a typed action, clarification, reply,
or escalation. Route broad questions to the existing ML Claw cloud inference
path, label the route in the UI, and collect evaluation traces without storing
message text.

This is small enough to hack on, but it exercises the full idea: useful local
work, automatic cloud fallback, privacy boundaries, and measurable routing
quality.
