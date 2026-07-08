---
title: ML Claw
emoji: 🦞
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
hf_oauth: true
hf_oauth_expiration_minutes: 43200
pinned: false
secrets:
  - HF_TOKEN
  - MLCLAW_SESSION_SECRET
  - OPENAI_API_KEY
---

# ML Claw

<p align="center">
  <img src="assets/mlclaw.svg" alt="ML Claw" width="160">
</p>

ML Claw runs OpenClaw in a Hugging Face Space with a browser gateway protected
by Hugging Face OAuth. Duplicate this Space or use `mlclaw bootstrap` to create
your own deployment.

The public Space process is an ML Claw proxy. It authenticates the signed-in
Hugging Face user, then forwards browser traffic to OpenClaw on loopback using
OpenClaw trusted-proxy auth. The browser never receives an OpenClaw gateway
token.

Durable state lives in a private Hugging Face Storage Bucket configured by
`OPENCLAW_HF_STATE_BUCKET`. The bucket is not mounted as a live filesystem;
`hf-state-sync` restores verified snapshots on boot and uploads new snapshots
during runtime and shutdown.

Manage an existing deployment from your machine with:

```bash
mlclaw doctor <owner/space> --fix
mlclaw update <owner/space>
```
