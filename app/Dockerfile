# syntax=docker/dockerfile:1

# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args para NEXT_PUBLIC_* (opcional en Coolify)
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---- migrate (one-off: push schema + staging table + seed) ----
# --force: evita colgarse en confirmaciones sin TTY. El seed es idempotente (ON CONFLICT / checks previos).
FROM builder AS migrator
ENV NODE_ENV=production
ENV CI=true
COPY migrate.sh ./migrate.sh
# bookworm-slim no trae bash; migrate.sh usa bash ([[ ]] / pipefail).
RUN apt-get update && apt-get install -y --no-install-recommends bash && rm -rf /var/lib/apt/lists/*
RUN sed -i 's/\r$//' migrate.sh && chmod +x migrate.sh
HEALTHCHECK NONE
CMD ["bash", "migrate.sh"]

# ---- run ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Puerto interno del contenedor (Coolify mapea otro; no usamos 8000).
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
