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
- **Aplicación**: [`docker-compose.coolify.yml`](../../docker-compose.coolify.yml) en la raíz del repo — **un solo servicio `web`** (target Docker `runner-coolify`).
- **Cada deploy**: `wait-db.js` → `migrate.sh` → `node server.js` dentro del mismo contenedor (`start-coolify.sh`).
- Conexión vía **`DB_HOST`**, **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`**, **`DB_PORT`**. La app arma la URL en [`src/db/database-url.ts`](../src/db/database-url.ts); no uses `DATABASE_URL` en runtime.

### 1. Crear PostgreSQL en Coolify

1. **Project** → **Environment** → **+ New Resource** → **Database** → **PostgreSQL**.
2. Versión **16**, nombre p. ej. `radiocolonia-db`.
3. Usuario / contraseña / base de datos → mismos valores que usarás en `DB_USER`, `DB_PASSWORD`, `DB_NAME`.
4. **No** habilitar Public Port salvo que necesites acceso externo.
5. Deploy → estado **Running**.
6. Copiar **Internal URL** (ej. `radiocolonia-db:5432`) → `DB_HOST=radiocolonia-db`, `DB_PORT=5432`.

### 2. Configurar el recurso Docker Compose

1. Recurso **Docker Compose** → archivo **`docker-compose.coolify.yml`** en la raíz.
2. Activar **Connect to Predefined Network** (conecta `web` a la red `coolify` donde vive Postgres).
3. El compose declara `networks.coolify.external: true` — verificar por SSH que la red existe: `docker network ls | grep coolify`.
4. Dominio solo en **`web`**: `https://tu-dominio.com:3000` (Coolify enruta 443 → 3000 interno).

### 3. Variables de entorno (recurso Compose)

| Variable | Notas |
|----------|-------|
| `DB_HOST` | Hostname interno del recurso PostgreSQL (**no** `127.0.0.1` ni `postgres`) |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Idénticos al recurso PostgreSQL |
| `DB_PORT` | `5432` |
| `AUTH_SECRET` | Build + Runtime |
| `AUTH_URL` / `NEXT_PUBLIC_APP_URL` | URL HTTPS pública |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed idempotente en cada deploy |

Borrar cualquier `DB_HOST=127.0.0.1` heredado de dev local.

### 4. Deploy y verificación

1. Postgres **Running** antes del redeploy de la app.
2. Logs de `web` deben mostrar: espera Postgres → pasos `[1/5]`…`[5/5]` → arranque Next.js.
3. `GET https://tu-dominio.com/api/health` → `{ "ok": true, "db": "up" }`.

### 5. Limpieza del Postgres embebido anterior

Si venías del compose con `postgres` incluido, tras verificar la app:

```bash
docker volume ls | grep postgres_db_data
docker volume rm <nombre>
```

### Alternativa: migraciones como job aparte (dev local / prod local)

[`docker-compose.prod.yml`](docker-compose.prod.yml) sigue usando Postgres embebido + servicio **`migrate`** (target `migrator`):

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

También podés usar un recurso Coolify Dockerfile con **Build Target** = `migrator` si preferís separar migraciones de la web (despliegue manual en orden).

### Alternativa: dos aplicaciones Dockerfile en Coolify

1. **Migraciones**: recurso A — **Build Target** = `migrator`, sin dominio.
2. **Web**: recurso B — target **`runner`** (sin migración en entrypoint) o **`runner-coolify`** (con migración integrada).

Coolify no despliega ambos en orden automático; automatizá con CI o deploy manual.

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
2. Con **Compose Coolify**, las migraciones corren en el arranque de `web` (`runner-coolify`); revisá logs si la home da **500** antes de que termine `migrate.sh`.
3. Revisá los logs del contenedor en Coolify para el stack trace real.
4. En **dev local**, `DB_HOST=127.0.0.1` y `DB_PORT=5433` con el `docker-compose.yml` de la carpeta `app/`.

---

## Checklist rápido

- [ ] **Coolify Compose**: `docker-compose.coolify.yml` con solo **`web`** (`runner-coolify`); Postgres como recurso Database aparte.
- [ ] **Connect to Predefined Network** activo; `DB_HOST` = hostname interno del Postgres (no `127.0.0.1`).
- [ ] Variables **`DB_*`** coherentes entre recurso PostgreSQL y Compose.
- [ ] `AUTH_URL` y `NEXT_PUBLIC_APP_URL` = URL HTTPS real.
- [ ] Logs de deploy muestran `migrate.sh` completado antes de servir tráfico.
- [ ] `db:seed` solo si querés datos iniciales / admin.
- [ ] Volumen persistente para `/app/public/uploads` en **`web`**.
- [ ] Revisar **`/admin/imagenes`** si cambiaste el volumen o sospechás imágenes huérfanas o enlaces rotos.
- [ ] `ENABLE_MERCADOPAGO=false` y `NEXT_PUBLIC_PICKUP_ADDRESS` definidos para checkout por retiro.
- [ ] Migración **`0003_orders_fulfillment.sql`** aplicada si actualizaste el esquema de órdenes.
