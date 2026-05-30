#!/usr/bin/env bash
# Migración Coolify/Docker Compose: WORKDIR=/app en la imagen migrator.
set -euo pipefail

cd /app

node wait-db.js

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
echo "▶ [1/6] Aplicando migraciones SQL idempotentes..."
run_ts src/db/apply-sql-migrations.ts

# [2/6] Sincronizar el schema TS con la BD para cualquier diferencia menor.
# Si la BD ya quedó alineada por el paso 1, push no detecta cambios y no pide
# prompts. En BD vacía, push crea el resto de tablas base sin conflictos.
echo "▶ [2/6] Drizzle schema push (sync)..."
node "$DRIZZLE" push --verbose --force || echo "⚠ Drizzle push reportó issues; se valida el schema en el paso 4."

# [3/6] Re-aplicar SQL idempotente tras push. En BD vacía el paso 1 se omite
# (no hay users); push crea tablas ecommerce pero no pos_* (no están en Drizzle).
# Este paso garantiza 0005_pos_operational_tables.sql siempre.
echo "▶ [3/6] Re-aplicando migraciones SQL idempotentes (pos_* y columnas)..."
run_ts src/db/apply-sql-migrations.ts

# [4/6] Validar que las tablas críticas existan. drizzle-kit a veces imprime
# errores pero sale con código 0; este paso falla rápido si quedó algo a medias.
echo "▶ [4/6] Verificando schema..."
run_ts src/db/verify-schema.ts

# [5/6] Tabla staging para imports CSV.
echo "▶ [5/6] Tabla staging (CSV)..."
run_ts src/db/migrate-staging.ts

# [6/6] Seed idempotente.
echo "▶ [6/6] Seed..."
run_ts src/db/seed.ts

echo "✅ Migración + seed completados."
