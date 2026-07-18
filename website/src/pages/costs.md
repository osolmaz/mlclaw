---
layout: ../layouts/DocLayout.astro
title: Costs
description: What an ML Claw deployment costs on Hugging Face, from the free browser gateway to paid hardware for messaging.
---

An ML Claw deployment has one fixed cost meter, the Space hardware, and one variable meter, model inference. The numbers below were checked against the Hugging Face pricing pages on 2026-06-16, so verify them before planning a budget around a specific bill.

## Gateway hardware

The default browser gateway runs on free `cpu-basic` hardware, and a local gateway on your own machine has no fixed Hugging Face cost at all. Upgraded Spaces are billed by the minute while running. Builds and sleeping time are free.

Telegram and Discord are the exception. Free Spaces block outbound TLS to some messaging APIs, so a fully hosted messaging deployment needs paid hardware. The recommended tier is `cpu-upgrade` at $0.03 per hour, roughly $22 for an always-on month. A local gateway avoids the requirement entirely, because messaging traffic then originates from your own network.

GPU Space tiers exist for self-hosting a model next to the agent, and the tradeoff is steep. Moving inference into the Space turns a $22 per month gateway into an always-on model server that costs between $292 (Nvidia T4 small) and $1,825 (Nvidia A100 large) per month, which is why the default design keeps model calls on the router.

## Inference

Model calls go to the Hugging Face Inference Providers router. Requests draw down your Inference Providers credits first and then fall to provider pay-as-you-go pricing per token, so the bill tracks how much you actually talk to your agent. Model choice moves this number a lot, and the [README](https://github.com/huggingface/mlclaw#readme) lists low-cost options such as Gemma 4 and GPT-OSS 20B alongside the larger long-context default.

## Storage

State snapshots are small. Bucket storage bills per TB-month beyond the included capacity, so for a normal deployment it rounds to zero. A dedicated Inference Endpoint would bill per replica minute, but the default design never creates one.
