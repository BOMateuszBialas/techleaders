# Production image for the CommerceOS app (packages/app), built from the repository root:
#   docker build -t commerceos:local .
# Targets: `runtime` (default, what you deploy) and `migrate` (one-off database migrations).
# No secrets are baked in: configuration comes from environment variables at run time.

ARG NODE_IMAGE=node:22.17.0-alpine3.22

# ---- deps: every npm workspace install (dev dependencies included, the build needs them) ----
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# npm ci needs every workspace manifest to resolve the workspace graph. Copying only the
# manifests keeps this layer cached until a dependency changes.
COPY package.json package-lock.json ./
COPY packages/app/package.json packages/app/
COPY packages/ai/package.json packages/ai/
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/database/package.json packages/database/
RUN npm ci

# ---- build: compile the Next.js app into .next/standalone ----
FROM deps AS build
COPY . .
RUN npm run build -w @commerceos/app

# ---- migrate: one-off schema migrations (not the deployed runtime) ----
# Run with: docker run --rm --env DATABASE_URL=... commerceos:local-migrate
# Built with: docker build --target migrate -t commerceos:local-migrate .
FROM build AS migrate
USER node
CMD ["npm", "run", "db:migrate"]

# ---- runtime: only the standalone server, static assets and public files ----
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# standalone/ mirrors the monorepo root (outputFileTracingRoot): the app lives in packages/app.
COPY --from=build --chown=node:node /app/packages/app/.next/standalone ./
COPY --from=build --chown=node:node /app/packages/app/.next/static ./packages/app/.next/static
COPY --from=build --chown=node:node /app/packages/app/public ./packages/app/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "packages/app/server.js"]
