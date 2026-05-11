# Deploy (Docker / Coolify)

La app corre **dentro del contenedor en el puerto 3000**. En el host podés mapear **3001**, **8080**, etc. — **no hace falta usar el 8000** si otra app ya lo ocupa.

## Build local de la imagen

Desde la carpeta `app/`:

```bash
docker build -t radiocolonia-web:latest \
  --build-arg NEXT_PUBLIC_APP_URL=https://tu-dominio.com \
  .
```

## Compose de prueba (web + Postgres)

Puerto público **3001** → contenedor **3000** (ejemplo en [docker-compose.prod.yml](docker-compose.prod.yml)):

```bash
cd app
cp .env.example .env.production.local
# Editá AUTH_SECRET, NEXT_PUBLIC_APP_URL, AUTH_URL, MP_*, etc.

export AUTH_SECRET="$(openssl rand -base64 32)"
docker compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build
```

Migrar esquema (una vez o tras cambios en `schema.ts`). La imagen `web` no incluye `drizzle-kit`; usá el servicio **`migrate`** (stage `migrator` del Dockerfile):

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

Seed (opcional; requiere `ADMIN_EMAIL` / `ADMIN_PASSWORD` en el entorno):

```bash
docker compose -f docker-compose.prod.yml run --rm migrate npx tsx src/db/seed.ts
```

> El `docker-compose.prod.yml` define variables por defecto `radiocolonia` / `radiocolonia_db` alineadas con un `.env.example` reciente. Ajustá `POSTGRES_*` si usás otros nombres.

Subidas de imágenes (admin) se guardan en el volumen **`radiocolonia_uploads`** montado en `/app/public/uploads`.

---

## Coolify

1. **Dockerfile / contexto**: en la raíz del repo hay un **`Dockerfile`** que incluye `app/`. En Coolify podés dejar la base en la raíz y **Dockerfile** = `Dockerfile`. Si preferís **Base Directory** = `app`, usá el `Dockerfile` dentro de `app/` y contexto solo en esa carpeta.
2. **Puerto del contenedor**: **3000** (Coolify puede publicar 443/80 en el proxy; no confundir con el puerto interno).
3. **Variables de entorno** (mínimo):
   - `DATABASE_URL` — Postgres que provisiones en Coolify (host interno de red, no `127.0.0.1` del contenedor web).
   - `AUTH_SECRET` — cadena larga aleatoria.
   - `AUTH_URL` — `https://tu-dominio.com` (URL pública exacta).
   - `NEXT_PUBLIC_APP_URL` — igual que la pública.
   - `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` — producción cuando toque.
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — solo si corrés `db:seed`.
4. **Build argument** (opcional): `NEXT_PUBLIC_APP_URL=https://tu-dominio.com` para que quede fijada en el bundle del cliente.
5. **Post-deploy / comando único** (recomendado tras el primer deploy o cambios de schema):
   ```bash
   npx drizzle-kit push
   ```
   Ejecutalo en el mismo servicio con las mismas variables, o desde tu PC apuntando al `DATABASE_URL` de producción.
6. **Mercado Pago**: webhook → `https://tu-dominio.com/api/webhooks/mercadopago`.

---

## Checklist rápido

- [ ] Postgres accesible desde el contenedor `web` con el `DATABASE_URL` correcto.
- [ ] `AUTH_URL` y `NEXT_PUBLIC_APP_URL` = URL HTTPS real.
- [ ] `drizzle-kit push` (o migraciones) aplicados.
- [ ] `db:seed` solo si querés datos iniciales / admin.
- [ ] Volumen persistente para `/app/public/uploads` si usás carga de imágenes en admin.
