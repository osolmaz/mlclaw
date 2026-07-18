---
layout: ../layouts/DocLayout.astro
title: Getting started
description: Install the ML Claw CLI, deploy an OpenClaw agent to Hugging Face, and learn the everyday commands.
---

ML Claw is a command-line tool that deploys an [OpenClaw](https://github.com/openclaw/openclaw) agent to Hugging Face. This page walks through the first deployment, from installing the CLI to signing in to your agent in the browser.

## Requirements

You need a Hugging Face account and a token that the CLI can find through `HF_TOKEN`, `HF_TOKEN_PATH`, `$HF_HOME/token`, or `hf auth login`. If an interactive bootstrap finds no token, it offers to install the official Hugging Face CLI, opens the browser sign-in flow, and resumes afterwards. You never paste the token into someone else's app, because the bootstrapper runs on your machine.

Hosting a Docker Space currently requires a Hugging Face PRO subscription. Without one, interactive bootstrap checks for a usable local Docker or rootless Podman engine and offers to run the same gateway on your machine instead.

## Install and bootstrap

With Node.js available there is nothing to install:

```bash
npx mlclaw@latest bootstrap --name mlclaw
```

Without Node.js, a launcher script fetches a pinned Node runtime into your user cache and runs the same npm package:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/huggingface/mlclaw/main/mlclaw.sh)
```

On Windows, PowerShell does the same:

```powershell
irm https://raw.githubusercontent.com/huggingface/mlclaw/main/mlclaw.ps1 | iex
```

Bootstrap creates a private Storage Bucket for the agent's state, a private Docker Space for the browser gateway, and a local deployment manifest under `~/.config/mlclaw`. The Space starts from the prebuilt `ghcr.io/osolmaz/mlclaw` image and gets write-only secrets for session signing and credential encryption. Your Hugging Face token goes into the `MLCLAW_BROKER_HF_TOKEN` secret, which only the isolated broker process reads; the agent itself never sees it. [How it works](/how-it-works/) covers that boundary in detail.

When the Space is up, open it and sign in with your Hugging Face account. You land in the OpenClaw browser gateway, which includes a small ML Claw control link for settings, status, credentials, and sign out.

## Model selection

The agent talks to models through the Hugging Face Inference Providers router. Pick a router model at bootstrap time with `--model`:

```bash
npx mlclaw@latest bootstrap \
  --name mlclaw \
  --model huggingface/zai-org/GLM-5.2:fireworks-ai
```

The [README](https://github.com/huggingface/mlclaw#readme) keeps a list of recommended router-compatible models with tool and structured-output support, from low-cost Gemma 4 and GPT-OSS options to the long-context GLM default. You can also switch models later from the browser under `/mlclaw/settings` without redeploying.

## Local gateway

The same gateway can run on your machine instead of in a Space:

```bash
npx mlclaw@latest bootstrap --gateway local --name mlclaw
```

Local mode uses Docker or rootless Podman together with the same private Storage Bucket, so the agent's memory is identical in both locations. The control plane listens only on loopback at `http://127.0.0.1:7860`. On a remote host, use the SSH forwarding command the CLI prints, or expose the gateway to your private tailnet with `--tailscale=direct` or `--tailscale=serve`.

Deployments move between the two locations without losing state:

```bash
mlclaw gateway migrate mlclaw --to local
mlclaw gateway migrate mlclaw --to space
```

A local gateway also avoids the paid-hardware requirement for Telegram and Discord, since messaging traffic then originates from your own network. The [costs page](/costs/) has the numbers.

## Everyday commands

`mlclaw bootstrap` doubles as the reconfiguration command. Rerun it without arguments and it selects your known deployment, shows only what would change, and leaves a healthy gateway untouched when nothing changed. Beyond that, a handful of commands cover normal operation:

```bash
mlclaw gateway status mlclaw              # deployment status and access link
mlclaw gateway logs mlclaw                # gateway logs
mlclaw update your-username/mlclaw        # move an existing Space to the current release
mlclaw doctor your-username/mlclaw --fix  # check a deployment and apply safe repairs
mlclaw credentials status mlclaw          # verify the broker credential without printing it
```

`doctor --fix` may update Space variables and missing session-secret plumbing. It never reads secret values and never modifies bucket contents.
