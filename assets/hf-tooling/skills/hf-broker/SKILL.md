---
name: hf-broker
description: Use ML Claw's HF Broker for protected Hugging Face repository and bucket reads, writes, temporary grants, recovery, and revocation. Use instead of asking for or exposing a Hugging Face access token.
metadata:
  { "openclaw": { "emoji": "🤗", "requires": { "bins": ["hf-broker"] } } }
---

# Hugging Face Broker

Use the preconfigured HF Broker for protected Hugging Face operations. Never
ask for, print, copy, or export the broker's Hugging Face token. Do not run
`hf auth login` to work around a broker decision.

## Choose a workflow

Use the advertised `hf_*` MCP tools for ordinary typed operations and grant
management. Use `hf-broker client` when a local file must enter or leave the
protected stream store. The runtime already provides the broker endpoint and a
limited agent credential.

Every mutation needs a stable request ID. Reuse it only for an exact retry of
the same operation. If a response is lost, recover the existing operation or
grant instead of submitting another mutation.

## Request reusable write access

Request a temporary grant only when repeated writes are needed. Keep the scope
as narrow as possible. A day is 1,440 minutes and a week is 10,080 minutes.

For one bucket key prefix:

```sh
hf-broker client grant request bucket.object.write OWNER/BUCKET \
  --key 'artifacts/**' \
  --minutes 10080 \
  --max-uses unlimited \
  --reason "Write the requested artifacts for one week" \
  --request-id STABLE-GRANT-REQUEST-ID
```

For one repository path prefix:

```sh
hf-broker client grant request repo.commit.create OWNER/REPO \
  --type dataset \
  --path 'data/**' \
  --minutes 1440 \
  --max-uses unlimited \
  --reason "Update the requested dataset path for one day" \
  --request-id STABLE-GRANT-REQUEST-ID
```

Normal append-only Git pushes can also use a scoped `git.push.append` grant.
Keep the repository type, ref, and path selectors exact. Force pushes, ref
deletion, repository deletion, visibility changes, and access management stay
short-lived or single-use.

A pending grant requires an operator decision. Keep waiting on the same grant
rather than creating another request:

```sh
hf-broker client grant wait --wait-timeout 15m GRANT-ID
hf-broker client grant get GRANT-ID
```

MCP grant calls use bounded waits. If `hf_grant_request` or `hf_grant_wait`
returns `pending`, call `hf_grant_wait` again with the same grant ID. Use
`hf_grant_cancel` for an unapproved request and `hf_grant_revoke` when reusable
access is no longer needed.

## Write and read bucket objects

Upload a local file through the broker's stream store. File bytes do not belong
in MCP JSON, chat messages, plans, approvals, or logs.

```sh
hf-broker client bucket object write \
  --target-json '{"kind":"bucket","namespace":"OWNER","name":"BUCKET"}' \
  --arguments-json '{"path":"artifacts/result.bin"}' \
  --source ./result.bin \
  --media-type application/octet-stream \
  --reason "Upload the requested result" \
  --request-id STABLE-WRITE-REQUEST-ID \
  --wait=true \
  --wait-timeout 15m
```

Set `"overwrite":true` only when replacing the currently observed object is
intentional. The broker checks the bound precondition again before commit.

Read into a new destination and let the client verify the returned stream:

```sh
hf-broker client bucket object read \
  --target-json '{"kind":"bucket","namespace":"OWNER","name":"BUCKET"}' \
  --arguments-json '{"path":"artifacts/result.bin"}' \
  --output ./downloaded-result.bin \
  --reason "Read the requested result" \
  --wait=true \
  --wait-timeout 15m
```

Use `hf_bucket_object_list` or the matching client command to inspect only the
approved bucket prefix. Do not use the ML Claw state bucket for agent work. Its
exact target is denied by deployment policy, and approval cannot override that
deny.

## Recover operations

A timeout may leave a durable operation pending. Continue with its operation ID
or recover it by request ID:

```sh
hf-broker client operation get OPERATION-ID
hf-broker client operation wait --wait-timeout 15m OPERATION-ID
hf-broker client operation cancel OPERATION-ID
```

If the operation ID was lost, call the `hf_operation_list` MCP tool with the
stable `request_id`, then continue with the returned operation ID.

Stop only after a terminal result, explicit cancellation, or an unrecoverable
broker error. Revocation and expiry prevent later matching writes from reaching
Hugging Face.
