#!/usr/bin/env bash
# Migración Coolify/Docker Compose: WORKDIR=/app en la imagen migrator.
set -euo pipefail

cd /app

DRIZZLE="./node_modules/drizzle-kit/bin.cjs"
TSX_CLI="./node_modules/tsx/dist/cli.mjs"

echo "▶ migrate cwd=$(pwd)"
echo "▶ Postgres: host=${DB_HOST:-?} port=${DB_PORT:-5432} db=${DB_NAME:-?} user=${DB_USER:-?}"

if [[ ! -f "$DRIZZLE" ]]; then
  echo "❌ Falta Drizzle CLI: $DRIZZLE"
  exit 1
fi
if [[ ! -f "$TSX_CLI" ]]; then
  echo "❌ Falta TSX CLI: $TSX_CLI"
  exit 1
fi

run_ts() { node "$TSX_CLI" "$@"; }

echo "▶ [1/3] Drizzle schema push..."
node "$DRIZZLE" push --verbose --force

echo "▶ [2/3] Tabla staging (CSV)..."
run_ts src/db/migrate-staging.ts

echo "▶ [3/3] Seed..."
run_ts src/db/seed.ts

echo "✅ Migración + seed completados."
