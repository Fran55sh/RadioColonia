<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### Project layout

- **`app/`** — Main Next.js 16 eCommerce application (npm, port 3000).
- **`UXUI/`** — Static UI/UX prototype (Vite + React, bun, port 8080). No backend; design reference only.

### Prerequisites (already installed by update script)

- Node.js 20 (via nvm, set as default)
- Docker (for PostgreSQL 16 container)
- Bun (for `UXUI/` only)

### Running the main app (`app/`)

1. Start Docker daemon: `sudo dockerd &>/tmp/dockerd.log &` (wait ~3s for startup)
2. Start Postgres: `cd /workspace/app && sudo docker compose up -d --wait`
3. Push schema (first run or after schema changes): `npm run db:push`
4. Seed DB (first run): `npm run db:seed`
5. Dev server: `npm run dev` → http://localhost:3000

### Key commands (from `app/`)

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` |
| DB schema push | `npm run db:push` |
| DB seed | `npm run db:seed` |
| DB studio | `npm run db:studio` |

### Environment variables

Copy `.env.example` → `.env.local`. All `DB_*` vars must match docker-compose.yml defaults (`DB_HOST=127.0.0.1`, `DB_PORT=5433`, user/pass/db = `radiocolonia`/`radiocolonia_secret`/`radiocolonia_db`). Generate a real `AUTH_SECRET` with `openssl rand -base64 32`.

### Test credentials

- Admin: `admin@radiocolonia.local` / `Admin1234!` (panel at `/admin`)
- Mercado Pago: optional, only needed for checkout flow.

### Gotchas

- PostgreSQL runs on **host port 5433** (not 5432) to avoid conflicts.
- Docker requires `sudo` unless you add your user to the `docker` group in the current shell session (the group add doesn't take effect without re-login, so use `sudo docker` commands).
- The app constructs its database URL from individual `DB_*` env vars (not `DATABASE_URL`).
- Lint has pre-existing warnings/errors in the codebase (shadcn/ui components); these are not regressions.
- `npm run build` works and can be used to validate production readiness.
