---
title: Hugging Claw
emoji: 🦞
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
suggested_hardware: cpu-basic
secrets:
  - OPENCLAW_GATEWAY_TOKEN
  - HF_TOKEN
  - TELEGRAM_BOT_TOKEN
  - TELEGRAM_ALLOWED_USERS
  - TELEGRAM_PROXY
  - TELEGRAM_API_ROOT
---

# Hugging Claw

<p align="center">
  <img src="assets/huggingclaw.svg" alt="Hugging Claw" width="160">
</p>

This private Space runs your personal OpenClaw agent. Durable state is stored
in a private Hugging Face Storage Bucket configured by `OPENCLAW_HF_STATE_BUCKET`.

OpenClaw runs on local Space disk. The bucket is never mounted as a live
filesystem; `hf-state-sync` restores verified snapshots on boot and uploads new
snapshots during runtime and shutdown.

Manage this deployment from your machine with `hclaw doctor` and
`hclaw update`.
