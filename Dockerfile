# Stage 1: build the state-sync bundle so the runtime image needs no dev deps.
FROM node:24-bookworm-slim AS sync-build
WORKDIR /build
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
RUN npm ci --no-audit --no-fund && npm run build

FROM ghcr.io/openclaw/openclaw:latest

USER root
# zstd: snapshot archives. Bucket transport is the bundled TypeScript client.
RUN apt-get update \
  && apt-get install -y --no-install-recommends zstd \
  && rm -rf /var/lib/apt/lists/*

COPY --from=sync-build /build/dist/hf-state-sync.js /app/hf-state-sync.js
COPY --chown=node:node openclaw.default.json /app/openclaw.default.json
COPY --chown=node:node entrypoint.sh /app/entrypoint.sh
COPY --chown=node:node scripts/ /app/scripts/
RUN chmod +x /app/entrypoint.sh

USER node

# Live state on local disk; the bucket is reached only through the TS client.
ENV OPENCLAW_GATEWAY_PORT=7860
ENV OPENCLAW_LIVE_DIR=/tmp/openclaw-live
ENV OPENCLAW_STATE_DIR=/tmp/openclaw-live/.openclaw
ENV OPENCLAW_WORKSPACE_DIR=/tmp/openclaw-live/workspace
ENV OPENCLAW_CONFIG_PATH=/tmp/openclaw-live/.openclaw/openclaw.json
ENV OPENCLAW_DISABLE_BONJOUR=1

EXPOSE 7860

ENTRYPOINT ["/app/entrypoint.sh"]
