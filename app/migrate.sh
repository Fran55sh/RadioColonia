#!/bin/sh
set -eu

echo "▶ migrate context: cwd=$(pwd)"
echo "▶ Postgres: host=${DB_HOST:-?} port=${DB_PORT:-5432} db=${DB_NAME:-?} user=${DB_USER:-?}"

echo "▶ [1/3] Running Drizzle schema push..."
npx drizzle-kit push --verbose --force

echo "▶ [2/3] Creating staging table..."
npx tsx src/db/migrate-staging.ts

echo "▶ [3/3] Seeding database..."
npx tsx src/db/seed.ts

echo "✅ Migration + seed completed."
