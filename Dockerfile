FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

FROM dependencies AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM dependencies AS production-dependencies
RUN pnpm install --prod --frozen-lockfile

FROM node:24-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ARG APP_VERSION=0.3.0
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="AgentFlux" \
      org.opencontainers.image.description="Visual workflows and local AI agents" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.source="https://github.com/davemessew/AgentFlux" \
      org.opencontainers.image.licenses="Apache-2.0"
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4310 AGENTFLUX_DATA_DIR=/app/data
# Keep the complete pnpm virtual store and its relative symlinks together.
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server ./server
COPY --chown=node:node shared ./shared
COPY --chown=node:node examples ./examples
COPY --chown=node:node package.json LICENSE ./
RUN mkdir -p /app/data/inbox && chown -R node:node /app/data
USER node
EXPOSE 4310
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node --input-type=module -e "try { const r = await fetch('http://127.0.0.1:' + (process.env.PORT || 4310) + '/api/health', { signal: AbortSignal.timeout(4000) }); const body = await r.json(); process.exit(r.ok && body.status === 'ok' && body.name === 'AgentFlux' ? 0 : 1); } catch { process.exit(1); }"
CMD ["node", "server/index.mjs"]
