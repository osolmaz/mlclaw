# Hugging Claw

<p align="center">
  <img src="assets/huggingclaw.svg" alt="Hugging Claw" width="160">
</p>

Hugging Claw deploys a private [OpenClaw](https://openclaw.ai) agent to
Hugging Face from a local CLI. This GitHub repo is the single source of truth:
`hclaw` creates each user's private Space and bucket, then uploads generated
Space files directly to that user's Space repo.

There is no maintained Hugging Face template Space in the deployment path.

## One-Command Use

After `hf auth login`, run:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/huggingclaw/main/hclaw.sh) \
  bootstrap \
  --telegram-token-file ~/secrets/bob_bot.env \
  --telegram-user-id 1234567890
```

The compatibility Hugging Face bootstrap URL is also supported:

```bash
bash <(curl -fsSL https://huggingface.co/osolmaz/openclaw-bootstrap/resolve/main/bootstrap.sh) \
  bootstrap \
  --telegram-token-file ~/secrets/bob_bot.env \
  --telegram-user-id 1234567890
```

Both commands run locally. They read your Hugging Face token from `HF_TOKEN`,
`HF_TOKEN_PATH`, `$HF_HOME/token`, or the normal `hf auth login` cache.

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
npm run check:secrets
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

Important directories:

- `src/hclaw/`: CLI implementation.
- `src/hf-bucket-client/`: typed Hugging Face Storage Bucket client.
- `src/hf-state-sync/`: runtime snapshot/restore supervisor.
- `src/vendor/hfjs-xet/`: vendored Xet upload path from `huggingface.js`.
- `space/`: files used only in generated Hugging Face Spaces.
- `docs/`: implementation plans and architecture notes.
