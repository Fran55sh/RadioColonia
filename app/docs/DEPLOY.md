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

### Docker Compose (`docker-compose.coolify.yml`)

En la **raíz del repo**: [`docker-compose.coolify.yml`](../../docker-compose.coolify.yml).

- **`postgres`**: `postgres:16-alpine`, volumen **`postgres_data`**. La app usa el hostname estable **`postgres`** en la red del compose (`postgres:5432`). No necesitás un recurso PostgreSQL externo de Coolify para este stack.
- **`DATABASE_URL`** para `web` y `migrate` se construye con `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (por defecto `postgres` / `pass` / `db` si no definís nada). En producción definí **`POSTGRES_PASSWORD` fuerte** en el stack.
- **`web`**: `depends_on` **`postgres`** (`service_healthy`); **no** depende de `migrate`. Puerto **3000**, volumen **`radiocolonia_uploads`**.
- **`migrate`**: perfil **`migrate`**, mismo `DATABASE_URL` interno; espera Postgres healthy.

**Migraciones (paso aparte)**

```bash
docker compose -f docker-compose.coolify.yml --env-file /ruta/al/.env --profile migrate run --rm migrate
```

(O `drizzle-kit push` desde tu PC usando la misma URL `postgresql://…@postgres:5432/…` solo si tenés red hasta ese Postgres; en el servidor suele ser el comando anterior.)

**En Coolify**

1. Recurso **Docker Compose** → **`docker-compose.coolify.yml`** en la raíz.
2. Variables: al menos `POSTGRES_PASSWORD`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`; opcional `POSTGRES_USER`, `POSTGRES_DB`. **No** hace falta `DATABASE_URL` si usás solo el Postgres del compose (la URL la arma el archivo).
3. Contraseñas con caracteres reservados en URLs (`@`, `#`, …) pueden romper la cadena: evitalos o codificá.
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

Podés seguir usando solo la app **Dockerfile** + target final `runner`. En ese caso las migraciones **no** corren solas antes del deploy: ejecutalas con un job aparte (segunda app con target `migrator`), desde tu máquina con `DATABASE_URL` de producción, o migrá al stack Compose anterior.

### Variables de entorno (referencia)

- **Compose Coolify embebido**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (opcionales salvo contraseña fuerte en prod); `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`; `MP_*`; `ADMIN_*` para seed.
- **Postgres externo / dev local**: `DATABASE_URL` (p. ej. `127.0.0.1:5433` en este repo con Docker de desarrollo).

**Build argument**: `NEXT_PUBLIC_APP_URL` debe coincidir con la URL pública en el cliente (Coolify suele inyectar build args desde las variables del stack).

### Mercado Pago

Webhook → `https://tu-dominio.com/api/webhooks/mercadopago`.

### Next.js build y consultas a la base

Las páginas que usan `@/db` están declaradas como **`dynamic = "force-dynamic"`** donde hace falta, para no ejecutar queries contra Postgres durante `next build`. El contenedor **`runner`** no debe correr `drizzle-kit` ni migraciones en SSR.

### Error 500 en la home

La página principal consulta la base (**categorías y productos**). Si falla la DB, verás **500**.

1. Abrí **`https://tu-dominio.com/api/health`**. Si falla la DB, revisá que **`postgres`** del compose esté `healthy` y que `POSTGRES_*` coincidan con la URL interna (host **`postgres`**).
2. Con **Compose Coolify** embebido, aplicá esquema con **`--profile migrate run --rm migrate`** cuando haga falta; hasta tener tablas, la home puede dar **500**.
3. Revisá los logs del contenedor en Coolify para el stack trace real.
4. Si ves **`ECONNREFUSED 127.0.0.1:5433`**, es la URL de desarrollo local; en el compose Coolify el host debe ser **`postgres`** (servicio del mismo archivo), no `127.0.0.1`.

---

## Checklist rápido

- [ ] **Coolify Compose**: `docker-compose.coolify.yml`; **`web`** sin `depends_on` a `migrate`; migraciones con perfil `migrate` o job aparte.
- [ ] **Postgres embebido** en `docker-compose.coolify.yml` o DB externa coherente con `DATABASE_URL`.
- [ ] `AUTH_URL` y `NEXT_PUBLIC_APP_URL` = URL HTTPS real.
- [ ] Esquema aplicado cuando toque (`--profile migrate run --rm migrate`, job `migrator`, o `drizzle-kit` desde tu PC).
- [ ] `db:seed` solo si querés datos iniciales / admin.
- [ ] Volumen persistente para `/app/public/uploads` en **`web`**.
