---
title: ML Claw
emoji: 🦞
colorFrom: yellow
colorTo: red
sdk: docker
app_port: 7860
hf_oauth: true
hf_oauth_expiration_minutes: 43200
hf_oauth_scopes:
  - openid
  - profile
  - read-mcp
  - read-repos
  - contribute-repos
  - write-repos
  - manage-repos
  - inference-api
  - jobs
pinned: false
secrets:
  - MLCLAW_ROUTER_TOKEN
  - MLCLAW_SESSION_SECRET
  - MLCLAW_CREDENTIAL_KEY
  - OPENAI_API_KEY
---

# ML Claw

<p align="center">
  <img src="assets/mlclaw.svg" alt="ML Claw" width="160">
</p>

ML Claw runs OpenClaw in a Hugging Face Space with a browser gateway protected
by Hugging Face OAuth.

Do not set up ML Claw by only clicking Duplicate. Run the local bootstrapper
instead. It creates the private Space, private Storage Bucket, OAuth settings,
secrets, model configuration, and local manifest for you.

With Node.js:

```bash
npx mlclaw bootstrap --name mlclaw
```

On macOS or Linux without Node.js:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.sh) --name mlclaw
```

On Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/osolmaz/mlclaw/main/mlclaw.ps1 | iex
```

After the command finishes, open the Space it created and sign in with your
Hugging Face account.

After sign-in, use `/mlclaw` for settings, status, credentials, and sign out.
The OpenClaw gateway also shows a small ML Claw control link.

Duplicating this Space manually is only useful for development or for people
who already know how to configure the required secrets and variables.

The public Space process is an ML Claw proxy. It authenticates the signed-in
Hugging Face user, then forwards browser traffic to OpenClaw on loopback using
OpenClaw trusted-proxy auth. The browser never receives an OpenClaw gateway
token.

Durable state lives in a private Hugging Face Storage Bucket configured by
`OPENCLAW_HF_STATE_BUCKET` and mounted at `/data/mlclaw-state`. The mount is
only the snapshot store; live SQLite and workspace state stay on local
container disk. `hf-state-sync` restores verified snapshots on boot and uploads
new snapshots during runtime and shutdown.

Manage an existing deployment from your machine with:

```bash
mlclaw doctor <owner/space> --fix
mlclaw update <owner/space>
```
