# Stage 1: build the state-sync bundle so the runtime image needs no dev deps.
FROM node:24-bookworm-slim AS sync-build
WORKDIR /build
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
RUN npm ci --no-audit --no-fund && npm run build

FROM ghcr.io/openclaw/openclaw:latest

LABEL org.opencontainers.image.source="https://github.com/osolmaz/mlclaw"
LABEL org.opencontainers.image.description="ML Claw runtime for OpenClaw on Hugging Face"

USER root
# zstd: snapshot archives. gosu: drop privileges after preparing mounted volumes.
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu zstd \
  && rm -rf /var/lib/apt/lists/*

COPY --from=sync-build /build/dist/hf-state-sync.js /app/hf-state-sync.js
COPY --from=sync-build /build/dist/mlclaw-space-runtime.js /app/mlclaw-space-runtime.js
COPY --chown=node:node openclaw.default.json /app/openclaw.default.json
COPY --chown=node:node entrypoint.sh /app/entrypoint.sh
COPY --chown=node:node assets/ /app/assets/
COPY --chown=node:node scripts/ /app/scripts/
RUN chmod +x /app/entrypoint.sh

USER root

# Live state on local disk; the bucket is reached only through the TS client.
ENV PORT=7860
ENV MLCLAW_OPENCLAW_PORT=7861
ENV OPENCLAW_GATEWAY_PORT=7861
ENV OPENCLAW_LIVE_DIR=/tmp/openclaw-live
ENV OPENCLAW_STATE_DIR=/tmp/openclaw-live/.openclaw
ENV OPENCLAW_WORKSPACE_DIR=/tmp/openclaw-live/workspace
ENV OPENCLAW_CONFIG_PATH=/tmp/openclaw-live/.openclaw/openclaw.json
ENV OPENCLAW_DISABLE_BONJOUR=1
ARG MLCLAW_RUNTIME_IMAGE=ghcr.io/osolmaz/mlclaw-runtime:latest
ENV MLCLAW_RUNTIME_IMAGE=$MLCLAW_RUNTIME_IMAGE

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 CMD node -e "const port=process.env.PORT||'7860'; fetch('http://127.0.0.1:'+port+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]
