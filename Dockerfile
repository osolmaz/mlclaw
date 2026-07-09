ARG OPENCLAW_VERSION=2026.7.1-beta.2
ARG OPENCLAW_BASE_IMAGE=ghcr.io/openclaw/openclaw:${OPENCLAW_VERSION}
ARG MLCLAW_RUNTIME_IMAGE=ghcr.io/osolmaz/mlclaw:0.2.3-openclaw-2026.7.1-beta.2

# Stage 1: build the state-sync bundle so the runtime image needs no dev deps.
FROM node:24-bookworm-slim AS sync-build
WORKDIR /build
COPY package.json package-lock.json tsconfig.json vite.control-ui.config.ts ./
COPY src ./src
RUN npm ci --no-audit --no-fund && npm run build

FROM ${OPENCLAW_BASE_IMAGE}

LABEL org.opencontainers.image.source="https://github.com/osolmaz/mlclaw"
LABEL org.opencontainers.image.description="ML Claw runtime for OpenClaw on Hugging Face"

USER root
# zstd: snapshot archives. gosu: drop privileges after preparing mounted volumes.
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu python3 python3-pip python3-venv zstd \
  && rm -rf /var/lib/apt/lists/*
RUN python3 -m pip install --break-system-packages --no-cache-dir \
  "huggingface_hub==1.19.0" \
  "datasets==5.0.0" \
  "safetensors==0.8.0" \
  "fastapi==0.137.1" \
  "pydantic==2.13.4" \
  "rich==15.0.0" \
  "starlette==1.3.1" \
  "typer==0.25.1" \
  "uvicorn==0.49.0" \
  "uv==0.11.28" \
  "hf-discover==1.3.7"

COPY --from=sync-build /build/dist/hf-state-sync.js /app/hf-state-sync.js
COPY --from=sync-build /build/dist/hf-tooling-seed.js /app/hf-tooling-seed.js
COPY --from=sync-build /build/dist/mlclaw-space-runtime.js /app/mlclaw-space-runtime.js
COPY --chown=node:node openclaw.default.json /app/openclaw.default.json
COPY --chown=node:node entrypoint.sh /app/entrypoint.sh
COPY --chown=node:node assets/ /app/assets/
COPY --chown=node:node scripts/ /app/scripts/
RUN chmod +x /app/entrypoint.sh

USER root

# Live state stays on local disk; Space bucket volumes are mounted separately for snapshots.
ENV PORT=7860
ENV MLCLAW_OPENCLAW_PORT=7861
ENV OPENCLAW_GATEWAY_PORT=7861
ENV OPENCLAW_LIVE_DIR=/home/node/.local/share/mlclaw/live
ENV OPENCLAW_STATE_DIR=/home/node/.local/share/mlclaw/live/.openclaw
ENV OPENCLAW_WORKSPACE_DIR=/home/node/.local/share/mlclaw/live/workspace
ENV OPENCLAW_CONFIG_PATH=/home/node/.local/share/mlclaw/live/.openclaw/openclaw.json
ENV OPENCLAW_DISABLE_BONJOUR=1
ARG MLCLAW_RUNTIME_IMAGE
ENV MLCLAW_RUNTIME_IMAGE=$MLCLAW_RUNTIME_IMAGE

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 CMD node -e "const port=process.env.PORT||'7860'; fetch('http://127.0.0.1:'+port+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["/app/entrypoint.sh"]
