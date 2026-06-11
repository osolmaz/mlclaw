# Hugging Claw

<p align="center">
  <img src="assets/huggingclaw.svg" alt="Hugging Claw" width="160">
</p>

Hugging Claw deploys a private [OpenClaw](https://openclaw.ai) agent to
Hugging Face from a local CLI. This GitHub repo is the single source of truth:
`hclaw` creates each user's private Space and bucket, then uploads generated
Space files directly to that user's Space repo.

There is no maintained Hugging Face template Space in the deployment path.

## Install

For development from this checkout:

```bash
npm install
npm run build
node dist/hclaw.mjs --help
```

The compatibility bootstrap entrypoint remains in `bootstrap.sh`. After the
new CLI path is fully verified, that script can delegate to `dist/hclaw.mjs`
without deleting the old Hugging Face bootstrap URL.

## Usage

```bash
node dist/hclaw.mjs bootstrap \
  --telegram-token-file ~/secrets/bob_bot.env \
  --telegram-user-id 1234567890
```

`hclaw bootstrap` creates:

- a private Hugging Face Storage Bucket
- a private Hugging Face Docker Space
- generated Space files from this repo
- required Space variables and secrets

`hclaw update <owner/space>` regenerates and force-pushes the Space files from
the current source. It never touches the state bucket.

`hclaw doctor <owner/space>` checks Space configuration, bucket access, and
runtime logs. `doctor --fix` only applies safe Space config repairs.

## Development

```bash
npm run build
npm run typecheck
npm test
```

Important directories:

- `src/hclaw/`: CLI implementation.
- `src/hf-bucket-client/`: typed Hugging Face Storage Bucket client.
- `src/hf-state-sync/`: runtime snapshot/restore supervisor.
- `src/vendor/hfjs-xet/`: vendored Xet upload path from `huggingface.js`.
- `space/`: files used only in generated Hugging Face Spaces.
- `docs/`: implementation plans and architecture notes.
