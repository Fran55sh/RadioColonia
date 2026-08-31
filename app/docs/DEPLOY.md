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

Subidas de imágenes (admin) se guardan en el volumen **`radiocolonia_uploads`** montado en `/app/public/uploads`. Para auditar archivos vs. productos (asignadas, huérfanas, enlaces rotos) usá **`/admin/imagenes`** en el panel tras un redeploy o migración.

---

## Coolify

### Arquitectura

- **PostgreSQL**: recurso **Database** independiente en Coolify (no va en el compose).
- **Web**: [`docker-compose.coolify.yml`](../../docker-compose.coolify.yml) — solo servicio `web` (target `runner`). **No toca la BD en deploy.**
- **Migraciones**: recurso **Dockerfile** aparte, target **`migrator`**, deploy **manual** cuando haga falta.
- Conexión vía **`DB_HOST`**, **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`**, **`DB_PORT`**.

### 1. Crear PostgreSQL en Coolify

1. **Project** → **Environment** → **+ New Resource** → **Database** → **PostgreSQL**.
2. Versión **16**, nombre p. ej. `radiocolonia-db`.
3. Usuario / contraseña / base de datos → mismos valores que `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
4. **No** habilitar Public Port salvo acceso externo deliberado.
5. Deploy → **Running**.
6. Copiar **Internal URL** (ej. `radiocolonia-db:5432`) → `DB_HOST=radiocolonia-db`.

### 2. Recurso migraciones (manual, una vez o tras cambios de schema)

**Recomendado:** usar **`docker-compose.migrator.yml`** (no Dockerfile suelto).

1. **+ New Resource** → **Docker Compose**.
2. **Base Directory** = `/` (raíz del repo).
3. **Docker Compose Location** = `/docker-compose.migrator.yml`.
4. **Connect to Predefined Network** activado (red `coolify`).
5. Variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
6. **Sin dominio público.** Deploy → logs: `✅ Migración + seed completados.` → contenedor **Exited (0)**.

El compose usa `restart: "no"`: el migrator **no** es un servicio permanente. Si usás solo Dockerfile con restart automático, Coolify muestra **Running (unknown)** y reinicia en loop porque `migrate.sh` termina y sale.

**Alternativa (Dockerfile):** Build Target = `migrator`, desactivá health check HTTP en Coolify y no uses restart policy `unless-stopped`.

6. Repetir deploy del migrator solo cuando cambies `schema.ts` o migraciones SQL.

### 3. Recurso Docker Compose (web)

1. Archivo **`docker-compose.coolify.yml`** en la raíz.
2. **Connect to Predefined Network** activado.
3. Dominio en **`web`**: `https://www.radiocolonia.com.ar:3000` (Coolify enruta 443 → 3000 interno).
4. Variables: `DB_*`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `MP_*`.
5. **No** incluir `DB_HOST=127.0.0.1` ni `postgres`.

### 4. Orden del primer deploy

1. Postgres **Running**
2. Deploy **migrator** → logs: `✅ Migración + seed completados.` (incluye tablas `pos_*` para el POS).
3. Deploy **web** (Compose)
4. Deploy **POS** (stack `radio-colonia-pos`, mismas `DB_*`)
5. `GET https://www.radiocolonia.com.ar/api/health` → `{ "ok": true, "db": "up" }`

### 5. Deploys siguientes

- Redeploy **web** sin cambios de schema: no hace falta migrator.
- Tras cambios en `schema.ts` o `src/db/migrations/*.sql` (incl. `pos_*`): correr **migrator** antes de redeployar web o POS.
- El POS **no** crea tablas; si falta `pos_ventas`, el deploy del POS falla al arrancar → correr migrator del ecommerce.

### 6. Limpieza del Postgres embebido anterior

Si venías del compose viejo con servicio `postgres`:

```bash
docker volume ls | grep postgres_db_data
docker volume rm <nombre>
```

### Dev local (sin cambios)

[`docker-compose.prod.yml`](docker-compose.prod.yml) sigue con Postgres embebido + migrate manual:

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

### Variables de entorno (referencia)

- **Runtime**: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` (opcional, default `5432`); `AUTH_*`, `NEXT_PUBLIC_APP_URL`, `MP_*`, `ADMIN_*` para seed.
- **Deprecado**: no uses `DATABASE_URL` para esta app (salvo herramientas externas que solo acepten URL).

**Build argument**: `NEXT_PUBLIC_APP_URL` debe coincidir con la URL pública en el cliente (Coolify suele inyectar build args desde las variables del stack).

### Pedidos (retiro en local)

Por defecto **`ENABLE_MERCADOPAGO=false`**: el checkout crea órdenes en estado `pending` sin redirigir a MP. El admin confirma y avanza estados en **`/admin/ordenes`**.

Variables recomendadas:

- `NEXT_PUBLIC_PICKUP_ADDRESS` — dirección del local (checkout y mensajes de retiro).
- `ENABLE_MERCADOPAGO=true` — solo cuando actives pago online (requiere `MP_*` y webhook).

Tras cambios en `schema.ts` / migración `0003_orders_fulfillment.sql`, aplicá migrate o `db:push` una vez.

Seguimiento sin cuenta: **`/pedidos/seguimiento`** (número de pedido + email o teléfono).

### Mercado Pago (opcional / futuro)

Con `ENABLE_MERCADOPAGO=true`, webhook → `https://tu-dominio.com/api/webhooks/mercadopago`.

### Next.js build y consultas a la base

Las páginas que usan `@/db` están declaradas como **`dynamic = "force-dynamic"`** donde hace falta, para no ejecutar queries contra Postgres durante `next build`. El contenedor **`runner`** no debe correr `drizzle-kit` ni migraciones en SSR.

### Error 500 en la home

La página principal consulta la base (**categorías y productos**). Si falla la DB, verás **500**.

1. Abrí **`https://tu-dominio.com/api/health`**. Si `db_env_incomplete`, faltan `DB_*`. Si `database_unreachable`, Postgres no responde en `DB_HOST:DB_PORT` con las credenciales dadas.
2. Con **Compose Coolify**, las migraciones **no** corren en deploy de `web`; corré el recurso **`migrator`** si faltan tablas.
3. Revisá los logs del contenedor en Coolify para el stack trace real.
4. En **dev local**, `DB_HOST=127.0.0.1` y `DB_PORT=5433` con el `docker-compose.yml` de la carpeta `app/`.

---

## Checklist rápido

- [ ] **Coolify Compose**: solo **`web`** (`runner`); Postgres Database aparte; migrator manual.
- [ ] **Connect to Predefined Network** en web y migrator; `DB_HOST` = hostname interno.
- [ ] Primer deploy: **migrator** antes que **web**.
- [ ] `AUTH_URL` y `NEXT_PUBLIC_APP_URL` = URL HTTPS real.
- [ ] `db:seed` solo si querés datos iniciales / admin.
- [ ] Volumen persistente para `/app/public/uploads` en **`web`**.
- [ ] Revisar **`/admin/imagenes`** si cambiaste el volumen o sospechás imágenes huérfanas o enlaces rotos.
- [ ] `ENABLE_MERCADOPAGO=false` y `NEXT_PUBLIC_PICKUP_ADDRESS` definidos para checkout por retiro.
- [ ] Migración **`0003_orders_fulfillment.sql`** aplicada si actualizaste el esquema de órdenes.
