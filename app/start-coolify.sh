#!/usr/bin/env bash
# Entrypoint Coolify: espera BD externa, migra y arranca Next.js en el mismo contenedor.
set -euo pipefail

cd /app

bash migrate.sh
exec node server.js
