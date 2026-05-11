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

### Recomendado: Docker Compose (migraciones antes que la web)

En la **raíz del repo** está [`docker-compose.coolify.yml`](../../docker-compose.coolify.yml):

- Servicio **`migrate`**: construye el stage **`migrator`** del [`Dockerfile`](../../Dockerfile) y ejecuta `npx drizzle-kit push --verbose --force` (sin TTY en Coolify); termina con código 0 o falla el deploy.
- Servicio **`web`**: stage **`runner`** (Next en el puerto **3000**), volumen **`radiocolonia_uploads`** en `/app/public/uploads`.
- **`web` depende de `migrate`** con `condition: service_completed_successfully` (requiere **Docker Compose v2**).

**En Coolify**

1. Creá un recurso **Docker Compose** en tu proyecto y apuntalo al archivo **`docker-compose.coolify.yml`** en la raíz del repositorio (ruta relativa al clone: p. ej. `/docker-compose.coolify.yml` según la UI).
2. Definí las **variables de entorno del stack** (las mismas que usarías para la app suelta). El compose exige como mínimo `DATABASE_URL`, `AUTH_SECRET` y `AUTH_URL`; también configurá `NEXT_PUBLIC_APP_URL`, `MP_*`, etc.
3. **Postgres**: usá el `DATABASE_URL` interno del recurso PostgreSQL de Coolify (hostname de red Docker, puerto **5432**). Enlazá el servicio de base al proyecto si la UI lo pide, para que el hostname resuelva.
4. Dominio / proxy: Coolify suele enrutar al servicio **`web`** (puerto 3000). Ajustá el mapeo de puertos en la UI si no usás el `3000:3000` del archivo.

**Importante**

- **No** uses **Post-deployment** en la aplicación Next para `drizzle-kit push`: el contenedor `runner` no está pensado para migraciones y mezcla responsabilidades.
- Las migraciones ocurren solo en el contenedor **`migrate`** (mismo repo, mismo Dockerfile, target `migrator`). El stage usa **`--force`** para no quedar en prompts interactivos; puede auto-admitir cambios que Drizzle marque como destructivos — revisá `schema.ts` antes de desplegar en producción con datos reales.

### Alternativa: dos aplicaciones Dockerfile

1. **Migraciones**: recurso A — mismo Git, **Dockerfile** en la raíz, **Build Target** = `migrator`, sin dominio público. El proceso termina al hacer `push` (el panel puede marcar el contenedor como detenido; es esperable).
2. **Web**: recurso B — mismo Dockerfile, target por defecto **`runner`** (o sin target).

Coolify **no** despliega ambos en orden automático al hacer push a `main`. Opciones: desplegar **primero** el recurso migraciones y **después** la web (manual), o automatizar con **CI** (GitHub Actions u otro) que llame a la API/webhooks de Coolify en el orden correcto.

### Una sola aplicación Dockerfile (sin Compose)

Podés seguir usando solo la app **Dockerfile** + target final `runner`. En ese caso las migraciones **no** corren solas antes del deploy: ejecutalas con un job aparte (segunda app con target `migrator`), desde tu máquina con `DATABASE_URL` de producción, o migrá al stack Compose anterior.

### Variables de entorno (referencia)

- `DATABASE_URL` — Postgres (red interna Coolify, no `127.0.0.1:5433` de desarrollo).
- `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL` — Auth.js y URLs públicas HTTPS.
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` — Mercado Pago en producción.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — solo para `db:seed` local o one-off.

**Build argument**: `NEXT_PUBLIC_APP_URL` debe coincidir con la URL pública en el cliente (Coolify suele inyectar build args desde las variables del stack).

### Mercado Pago

Webhook → `https://tu-dominio.com/api/webhooks/mercadopago`.

### Next.js build y consultas a la base

Las páginas que usan `@/db` están declaradas como **`dynamic = "force-dynamic"`** donde hace falta, para no ejecutar queries contra Postgres durante `next build`. El contenedor **`runner`** no debe correr `drizzle-kit` ni migraciones en SSR.

### Error 500 en la home

La página principal consulta la base (**categorías y productos**). Si falla la DB, verás **500**.

1. Abrí **`https://tu-dominio.com/api/health`** (o `/api/health` con tu URL). Debe responder JSON `{"ok":true,"db":"up"}`. Si dice `DATABASE_URL is not set` o `database_unreachable`, revisá la variable y que el contenedor web alcance el host de Postgres (en Coolify, hostname interno del servicio Postgres, no `127.0.0.1` de tu PC).
2. Si usás **Docker Compose** (`docker-compose.coolify.yml`), el servicio **`migrate`** ya aplica el esquema antes de levantar `web`. Si desplegás solo la app Dockerfile, ejecutá `drizzle-kit push` con el target `migrator` o desde tu PC con el `DATABASE_URL` de producción.
3. Revisá los logs del contenedor en Coolify para el stack trace real.
4. Si ves **`ECONNREFUSED 127.0.0.1:5433`**, copiaste el `DATABASE_URL` de desarrollo. En Coolify tenés que reemplazarlo por la URL interna al servicio Postgres (**host** = nombre en la red Docker de Coolify, **puerto** = **5432**, no `5433`). El `5433` solo es el mapeo en tu PC cuando levantás `docker-compose.yml` de desarrollo.

---

## Checklist rápido

- [ ] **Coolify Compose**: recurso con `docker-compose.coolify.yml` o equivalente (migrate → web).
- [ ] Postgres accesible con `DATABASE_URL` correcta (host interno, puerto 5432).
- [ ] `AUTH_URL` y `NEXT_PUBLIC_APP_URL` = URL HTTPS real.
- [ ] Esquema aplicado vía servicio **`migrate`** (o job `migrator`), no en Post-deploy del Next.
- [ ] `db:seed` solo si querés datos iniciales / admin.
- [ ] Volumen persistente para `/app/public/uploads` en **`web`** (incluido en el compose Coolify).
