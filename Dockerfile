# syntax=docker/dockerfile:1
# Contexto de build: raíz del repo (Radio Colonia/). Next.js vive en app/.
# Sirve para Coolify u otros que clonan el repo y buscan ./Dockerfile sin "Base Directory".

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
COPY app/package.json app/package-lock.json* ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY app/ .

ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Migración one-off en Coolify: schema + tabla staging CSV + seed (idempotente).
# Igual que app/Dockerfile — el build contextual de Compose usa esta raíz, no app/Dockerfile.
FROM builder AS migrator
ENV NODE_ENV=production
ENV CI=true
# bookworm-slim no trae bash; migrate.sh usa bash ([[ ]] / pipefail).
RUN apt-get update && apt-get install -y --no-install-recommends bash && rm -rf /var/lib/apt/lists/*
RUN sed -i 's/\r$//' migrate.sh && chmod +x migrate.sh
CMD ["bash", "migrate.sh"]

# Coolify: standalone + tooling de migración; entrypoint wait-db → migrate → server.
FROM node:20-bookworm-slim AS runner-coolify
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl bash && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CI=true
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
RUN mkdir -p public/uploads/products && chown -R nextjs:nodejs public/uploads

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/wait-db.js ./wait-db.js
COPY --from=builder --chown=nextjs:nodejs /app/migrate.sh ./migrate.sh
COPY --from=builder --chown=nextjs:nodejs /app/start-coolify.sh ./start-coolify.sh
COPY --from=builder --chown=nextjs:nodejs /app/src/db ./src/db
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

RUN sed -i 's/\r$//' migrate.sh start-coolify.sh && chmod +x migrate.sh start-coolify.sh

USER nextjs
EXPOSE 3000

CMD ["bash", "start-coolify.sh"]

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
RUN mkdir -p public/uploads/products && chown -R nextjs:nodejs public/uploads

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
