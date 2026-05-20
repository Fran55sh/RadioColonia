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

### Docker Compose (`docker-compose.coolify.yml`)

En la **raíz del repo**: [`docker-compose.coolify.yml`](../../docker-compose.coolify.yml).

- **`postgres`**: `postgres:16-alpine`, volumen **`postgres_data`**. Imagen Postgres usa las mismas credenciales que **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`** que le pasás al stack.
- **`web`** y **`migrate`** reciben **`DB_HOST`**, **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`**, **`DB_PORT`** (por defecto en el archivo: `DB_HOST=postgres`, puerto 5432). La aplicación **arma la URL en código** ([`src/db/database-url.ts`](../src/db/database-url.ts)); **no** usá `DATABASE_URL` en runtime.
- **`web`**: `depends_on` **`postgres`** (`service_healthy`); **no** depende de `migrate`.
- **`migrate`**: perfil **`migrate`**, mismas variables `DB_*`; espera Postgres healthy.

**Migraciones (paso aparte)**

```bash
docker compose -f docker-compose.coolify.yml --env-file /ruta/al/.env --profile migrate run --rm migrate
```

**En Coolify**

1. Recurso **Docker Compose** → **`docker-compose.coolify.yml`** en la raíz.
2. Variables: **`DB_PASSWORD` fuerte** (y opcionalmente `DB_USER`, `DB_NAME`, **`DB_HOST`** si el hostname real no es el nombre del servicio; el compose por defecto inyecta `DB_HOST=postgres`). También `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`, etc.
3. `DB_USER` / `DB_PASSWORD` / `DB_NAME` deben coincidir entre la app y el contenedor Postgres del mismo stack. Caracteres raros en la contraseña están bien: la URL se construye con `encodeURIComponent` en la app.
4. Dominio solo en **`web`**.

**Importante**

- **No** uses `depends_on migrate` en `web`.
- **No** uses Post-deployment de `web` para `drizzle-kit`.
- El stage **`migrator`** usa **`--force`**: revisá `schema.ts` con datos reales.

### Alternativa: dos aplicaciones Dockerfile

1. **Migraciones**: recurso A — mismo Git, **Dockerfile** en la raíz, **Build Target** = `migrator`, sin dominio público. El proceso termina al hacer `push` (el panel puede marcar el contenedor como detenido; es esperable).
2. **Web**: recurso B — mismo Dockerfile, target por defecto **`runner`** (o sin target).

Coolify **no** despliega ambos en orden automático al hacer push a `main`. Opciones: desplegar **primero** el recurso migraciones y **después** la web (manual), o automatizar con **CI** (GitHub Actions u otro) que llame a la API/webhooks de Coolify en el orden correcto.

### Una sola aplicación Dockerfile (sin Compose)

Podés seguir usando solo la app **Dockerfile** + target final `runner`. Definí **`DB_HOST`**, **`DB_USER`**, **`DB_PASSWORD`**, **`DB_NAME`**, **`DB_PORT`** en el entorno del contenedor; ejecutá migraciones con un job aparte (target `migrator`) o `drizzle-kit push` desde tu máquina con las mismas variables en `.env`.

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
2. Con **Compose Coolify** embebido, aplicá esquema con **`--profile migrate run --rm migrate`** cuando haga falta; hasta tener tablas, la home puede dar **500**.
3. Revisá los logs del contenedor en Coolify para el stack trace real.
4. En **dev local**, `DB_HOST=127.0.0.1` y `DB_PORT=5433` con el `docker-compose.yml` de la carpeta `app/`.

---

## Checklist rápido

- [ ] **Coolify Compose**: `docker-compose.coolify.yml`; **`web`** sin `depends_on` a `migrate`; migraciones con perfil `migrate` o job aparte.
- [ ] Variables **`DB_*`** definidas y coherentes con el Postgres del stack.
- [ ] `AUTH_URL` y `NEXT_PUBLIC_APP_URL` = URL HTTPS real.
- [ ] Esquema aplicado cuando toque (`--profile migrate run --rm migrate`, job `migrator`, o `drizzle-kit` desde tu PC).
- [ ] `db:seed` solo si querés datos iniciales / admin.
- [ ] Volumen persistente para `/app/public/uploads` en **`web`**.
- [ ] Revisar **`/admin/imagenes`** si cambiaste el volumen o sospechás imágenes huérfanas o enlaces rotos.
- [ ] `ENABLE_MERCADOPAGO=false` y `NEXT_PUBLIC_PICKUP_ADDRESS` definidos para checkout por retiro.
- [ ] Migración **`0003_orders_fulfillment.sql`** aplicada si actualizaste el esquema de órdenes.
