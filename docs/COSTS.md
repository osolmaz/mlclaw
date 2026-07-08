# ML Claw Costs

Last checked: 2026-06-16

This document is for estimating the cost of a ML Claw deployment. Prices
change, so treat the numbers here as a current baseline and verify the linked
pricing pages before promising a user a specific monthly bill.

## Short Version

The recommended first deployment is:

```text
Gateway: local Docker container
Private Hugging Face Storage Bucket: small state snapshots
Model inference: Hugging Face Inference Providers router
```

Expected fixed cost:

```text
$0/month fixed Space cost
```

Variable cost:

```text
model input tokens + model output tokens, billed at the selected provider/model rate
```

For a fully hosted Telegram deployment in a Hugging Face Space, do not plan
around free `cpu-basic`. It may be useful for demos and build checks, but
Telegram/Discord connectivity currently needs paid Space hardware in practice.

If a local gateway mode is used instead, Telegram/Discord traffic originates
from the user's machine. That avoids the paid-Space egress requirement, but the
gateway is no longer fully hosted on Hugging Face.

## Cost Components

Every deployment can have up to four independent cost meters:

| Component | When it applies | How it is billed |
| --- | --- | --- |
| Space hardware | Always applies when the Space is running | Per minute of selected Space hardware |
| Model inference | Applies when using HF Router or another provider API | Per token or provider-specific request unit |
| Dedicated endpoint | Applies if the user creates a separate HF Inference Endpoint | Per minute/hour per endpoint replica |
| Storage | Applies when stored Hub/Bucket data exceeds included capacity | Per TB-month |

The default ML Claw design does not run the model inside the Space. The
Space runs the OpenClaw gateway and Telegram polling process; model calls go to
the Hugging Face router.

See [Messaging Egress Notes](MESSAGING_EGRESS.md) for why fully hosted
Telegram/Discord mode requires paid Space hardware today.

## Space Hardware

Hugging Face bills Spaces by the minute while the Space is `Starting` or
`Running`. Builds are not billed. Upgraded Spaces run indefinitely by default,
but can be configured to sleep; sleeping or paused time is not billed.

Use 730 hours for a rough average month.

| Space hardware | Hourly | Always-on monthly | Use for ML Claw |
| --- | ---: | ---: | --- |
| CPU Basic | Free | Free | Build checks, demos, non-bot experiments only |
| CPU Upgrade | $0.03 | $21.90 | Recommended default for Telegram |
| Nvidia T4 small | $0.40 | $292.00 | Only if self-hosting a small local model |
| Nvidia T4 medium | $0.60 | $438.00 | Only if self-hosting a local model |
| 1x Nvidia L4 | $0.80 | $584.00 | Local model serving, more headroom |
| Nvidia A10G small | $1.00 | $730.00 | Local model serving |
| Nvidia A10G large | $1.50 | $1,095.00 | Local model serving |
| 1x Nvidia L40S | $1.80 | $1,314.00 | Larger local model serving |
| Nvidia A100 large | $2.50 | $1,825.00 | Larger local model serving |

For a fully hosted Space gateway, `cpu-upgrade` is the right default. The GPU
Space tiers are included here to make the tradeoff clear: moving inference into
the Space turns a roughly $22/month Space gateway into a
hundreds-of-dollars/month always-on model server.

## Sleep-Time Choices

For Telegram, default to always-on:

```bash
mlclaw settings <owner>/<space> --hardware cpu-upgrade --sleep-time -1
```

Cost examples for `cpu-upgrade`:

| Runtime pattern | Monthly hours | Monthly cost |
| --- | ---: | ---: |
| Always on | 730 | $21.90 |
| 12 hours/day | 365 | $10.95 |
| 8 hours/day | 243 | $7.29 |
| 4 hours/day | 122 | $3.66 |

Sleeping is reasonable for non-bot demos. It is a bad default for Telegram
polling because the bot will stop receiving messages while the Space is asleep.

## Model Inference Through Hugging Face Router

This is the recommended model path.

The router uses Inference Providers. Hugging Face gives monthly included
credits, then charges pay-as-you-go at provider rates with no additional
Hugging Face markup:

| Account | Included monthly Inference Providers credits |
| --- | ---: |
| Free user | $0.10 |
| PRO user | $2.00 |
| Team or Enterprise org | $2.00 per seat |

Cost formula:

```text
(input_tokens / 1,000,000 * input_price_per_1m)
+ (output_tokens / 1,000,000 * output_price_per_1m)
```

Practical guidance:

Prices below are per 1M tokens from the Hugging Face Router catalog checked on
2026-06-17. They are provider-specific and can change.

| Choice | Fixed cost | Variable cost | Notes |
| --- | ---: | ---: | --- |
| `huggingface/google/gemma-4-26B-A4B-it` | None beyond Space | DeepInfra: $0.07 input / $0.34 output | Default quality target; supports tools |
| `huggingface/Qwen/Qwen3.6-35B-A3B` | None beyond Space | DeepInfra: $0.15 input / $0.95 output | Stronger Qwen option; supports tools and structured output |
| `huggingface/Qwen/Qwen3-8B` | None beyond Space | nscale: $0.07 input / $0.18 output | Cheaper small-model option when quality tradeoffs are acceptable |
| `:cheapest` provider suffix | None beyond Space | Lowest available provider price for that model | Use when cost matters more than latency |
| `:fastest` provider suffix | None beyond Space | May cost more | Use when latency matters more than cost |
| Explicit provider suffix, e.g. `:deepinfra` | None beyond Space | Provider-specific | Use for predictable provider behavior |

Use the Hugging Face inference model catalog and the router model list to check
the current price and availability of a specific model before documenting a
model-specific monthly estimate.

## Dedicated Hugging Face Inference Endpoints

A dedicated endpoint is separate from the ML Claw Space. Use it only when:

- the router does not serve the model you need;
- you need a dedicated, isolated endpoint;
- you want control over engine/runtime settings such as vLLM, TGI, SGLang, or
  llama.cpp;
- you accept fixed infrastructure cost and cold-start tradeoffs.

Endpoint pricing is per minute while replicas are initializing or running. The
smallest listed CPU endpoint is roughly $0.033/hour. GPU endpoints start much
higher.

Representative dedicated endpoint costs:

| Endpoint instance | Hourly | Always-on monthly | Plus recommended Space |
| --- | ---: | ---: | ---: |
| AWS CPU intel-spr x1 | $0.033 | $24.09 | $45.99 total |
| AWS CPU intel-spr x2 | $0.067 | $48.91 | $70.81 total |
| AWS Nvidia T4 x1 | $0.50 | $365.00 | $386.90 total |
| AWS Nvidia L4 x1 | $0.80 | $584.00 | $605.90 total |
| AWS Nvidia A10G x1 | $1.00 | $730.00 | $751.90 total |
| AWS Nvidia A100 x1 | $2.50 | $1,825.00 | $1,846.90 total |

Dedicated Inference Endpoints support scale-to-zero after idle periods, which
can reduce cost. The tradeoff is cold starts; during initialization, the server
can return `502 Bad Gateway`, so clients need retry/queue behavior.

For ML Claw, a dedicated endpoint is not the default. It is a production
escape hatch.

## Running The Model Inside The Space

This means using a GPU Space as both:

1. the OpenClaw gateway/Telegram runtime; and
2. the model server.

This removes router token billing, but it creates a large fixed bill.

| Local model hosting option | Fixed monthly Space cost | Token billing |
| --- | ---: | ---: |
| T4 small Space | $292.00 | None from HF Router |
| T4 medium Space | $438.00 | None from HF Router |
| L4 Space | $584.00 | None from HF Router |
| A10G small Space | $730.00 | None from HF Router |
| A100 large Space | $1,825.00 | None from HF Router |

This is only attractive if the user needs local inference for privacy, custom
weights, or very high usage where fixed GPU cost beats per-token pricing.

## Storage Bucket

ML Claw stores state snapshots in a private Hugging Face Storage Bucket.
For normal personal usage, this should be small compared with compute and model
inference.

Hugging Face lists storage as volume-based per-TB pricing, with egress/CDN
included at no extra cost. The base listed private storage price is $12/TB/month
before larger-volume discounts and account included capacity.

Approximate storage-only math at $12/TB/month:

| Stored snapshot data | Monthly cost before included capacity |
| --- | ---: |
| 1 GB | $0.012 |
| 10 GB | $0.12 |
| 100 GB | $1.17 |
| 1 TB | $12.00 |

In practice, the bucket cost should usually be near zero unless the agent writes
large files into its workspace or retains many large snapshots.

## Hugging Face PRO

PRO is not required for ML Claw.

It costs $9/month and currently includes:

- 20x included Inference Providers credits compared with a free account;
- 10x private storage capacity;
- higher ZeroGPU quota and priority;
- other Hub features unrelated to the core ML Claw deployment.

For a typical Telegram deployment, PRO does not replace paid Space hardware. It
can reduce small model-inference bills by increasing included credits, but the
`cpu-upgrade` Space cost is still separate.

## Example Monthly Scenarios

| Scenario | Space | Model path | Estimated fixed monthly | Variable monthly |
| --- | --- | --- | ---: | --- |
| Development demo | CPU Basic | Router | $0 | Router tokens |
| Local gateway, HF storage/sync only | No always-on Space for messaging | Router | $0 fixed Space cost | Router tokens and storage beyond included quota |
| Recommended Telegram bot | CPU Upgrade always-on | Router | $21.90 | Router tokens |
| Telegram bot with PRO | CPU Upgrade always-on + PRO | Router | $30.90 | Router tokens after $2 credits |
| Non-bot demo, 8 h/day | CPU Upgrade sleeping | Router | $7.29 | Router tokens |
| Router unavailable, dedicated T4 endpoint | CPU Upgrade + T4 endpoint | Dedicated endpoint | $386.90 | Usually none beyond endpoint |
| Fully self-hosted local model | T4 small Space | In-Space GPU | $292.00 | None from router |

## What ML Claw Should Default To

Default:

```text
gatewayLocation: local
model: huggingface/google/gemma-4-26B-A4B-it
provider policy: default/fastest unless the user explicitly chooses cheapest
```

Configurable model examples:

```text
OPENCLAW_MODEL=huggingface/google/gemma-4-26B-A4B-it
OPENCLAW_MODEL=huggingface/Qwen/Qwen3.6-35B-A3B
OPENCLAW_MODEL=huggingface/Qwen/Qwen3-8B
```

Space gateway override:

```text
gatewayLocation: space
hardware: cpu-upgrade
sleepTimeSeconds: -1
```

Prompt before applying paid hardware:

```text
This will upgrade the Space to paid Hugging Face hardware.
The default cpu-upgrade tier is currently $0.03/hour, about $21.90/month
if left running 24/7. Continue?
```

Offer these explicit choices:

| User priority | Recommended setting |
| --- | --- |
| Lowest fixed cost | `cpu-basic`, but warn Telegram may not work |
| Working Telegram bot | `cpu-upgrade`, `sleepTimeSeconds=-1` |
| Lowest model cost | Router model with `:cheapest` |
| Better model quality | Larger router-compatible model |
| Model not on router | Dedicated Inference Endpoint |
| Maximum privacy/control | GPU Space or dedicated endpoint with custom runtime |

## Sources

- Hugging Face pricing: https://huggingface.co/pricing
- Hugging Face Spaces hardware and billing docs: https://huggingface.co/docs/hub/spaces-gpus
- Hugging Face Inference Providers pricing and billing: https://huggingface.co/docs/inference-providers/en/pricing
- Hugging Face Inference Providers overview: https://huggingface.co/docs/inference-providers/en/index
- Hugging Face Inference Endpoints pricing: https://huggingface.co/docs/inference-endpoints/en/pricing
- Hugging Face Inference Endpoints autoscaling: https://huggingface.co/docs/inference-endpoints/en/autoscaling
