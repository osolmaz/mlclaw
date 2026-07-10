# Brokerkit Operator Inbox Plan

Date: 2026-07-11

Status: implemented and locally validated

## Goal

Embed the common Brokerkit operator API into ML Claw as a trusted backend and
show one web inbox for HF Broker, GH Broker, Sudo Broker, and future compatible
brokers.

## Ownership

Brokerkit and each broker own canonical grants, revisions, lifecycle events,
decisions, safe projections, policy, and execution semantics.

ML Claw owns only authenticated browser access, CSRF protection, fixed-path
server-side proxying, broker selection, notification UX, and display of the
already bounded operator projections.

## Implementation

- replace the HF-only operator client with a broker-agnostic client;
- load broker endpoints and token-file references from the versioned operator
  broker configuration;
- fail startup on malformed configured entries or unreadable credentials;
- expose an admin-only list of configured brokers;
- require an explicit broker ID for list, detail, event, and decision routes;
- proxy one durable SSE stream per broker so native `Last-Event-ID` reconnect
  semantics remain intact, and cancel the upstream stream when the browser
  disconnects;
- keep all operator tokens in the backend and out of browser payloads, logs,
  OpenClaw environment, generated snapshots, and status responses;
- merge broker pages in the React inbox while preserving broker identity;
- support approve, deny, cancel, and revoke with optimistic revisions;
- use the same inbox in the control UI and gateway overlay;
- keep the bundled HF Broker entry as one generated registry record;
- persist broker grant and event state in a protected directory inside the
  durable snapshot unit; ordinary OpenClaw-owned staging excludes that
  directory and the trusted root supervisor overlays it before upload;
- restore durable state before starting HF Broker, then reassert broker-only
  ownership before OpenClaw starts;
- fail health checks when an HF model is configured without a healthy typed
  inference broker;
- validate bounded Brokerkit response bodies at the backend network boundary;
- add Slophammer TypeScript gates locally and in CI.

## Acceptance

- one page can show pending and historical grants from all configured brokers;
- equal grant IDs from different brokers cannot collide;
- each decision reaches only its selected broker and exact fixed action;
- owner/admin authentication and CSRF are required before any decision;
- non-admin users and unauthenticated callers cannot list or stream approvals;
- reconnect forwards the selected broker's durable event cursor;
- one unavailable broker does not hide healthy brokers and is shown as an
  explicit source error;
- no browser response, status payload, child environment, log, or package
  artifact contains an operator token;
- malformed registry entries fail closed before serving requests;
- typecheck, tests, build, secret scan, package check, Slophammer, and browser
  viewport checks pass.
