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

# [1/5] Aplicar migraciones SQL idempotentes ANTES del push. Esto garantiza que
# las tablas y columnas declaradas en `src/db/migrations/*.sql` existan, evitando
# que `drizzle-kit push` necesite TTY para resolver tablas "nuevas".
echo "▶ [1/5] Aplicando migraciones SQL idempotentes..."
run_ts src/db/apply-sql-migrations.ts

# [2/5] Sincronizar el schema TS con la BD para cualquier diferencia menor.
# Si la BD ya quedó alineada por el paso 1, push no detecta cambios y no pide
# prompts. En BD vacía, push crea el resto de tablas base sin conflictos.
echo "▶ [2/5] Drizzle schema push (sync)..."
node "$DRIZZLE" push --verbose --force || echo "⚠ Drizzle push reportó issues; se valida el schema en el paso 3."

# [3/5] Validar que las tablas críticas existan. drizzle-kit a veces imprime
# errores pero sale con código 0; este paso falla rápido si quedó algo a medias.
echo "▶ [3/5] Verificando schema..."
run_ts src/db/verify-schema.ts

# [4/5] Tabla staging para imports CSV.
echo "▶ [4/5] Tabla staging (CSV)..."
run_ts src/db/migrate-staging.ts

# [5/5] Seed idempotente.
echo "▶ [5/5] Seed..."
run_ts src/db/seed.ts

echo "✅ Migración + seed completados."
