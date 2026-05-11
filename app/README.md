# Radio Colonia eCommerce MVP

Tienda de electrónica full-stack construida con **Next.js 15**, **PostgreSQL** y **Mercado Pago**. Paleta naranja/plata/negro, fuente Outfit, animaciones personalizadas.

### Importante: carpeta de trabajo

El proyecto Node y `docker-compose.yml` están en **`app/`**, no en la raíz `Radio Colonia/`. Si ves `package.json` ENOENT o Docker *no configuration file*, es porque no entraste a esa carpeta.

```bash
cd app
# Git Bash en Windows, ejemplo:
# cd "/g/Backup/desarollo/Radio Colonia/app"
```

Después de eso, usá los comandos de esta guía (Docker, `npm`, `cp`, etc.).

### Producción (Docker / Coolify)

Hay **`Dockerfile`**, **`docker-compose.prod.yml`** (web en host **3001** → contenedor **3000**) y la guía **[docs/DEPLOY.md](docs/DEPLOY.md)** con variables y migraciones.

---

## Stack técnico

| Capa          | Tecnología                                      |
|---------------|-------------------------------------------------|
| Framework     | Next.js 15 (App Router, Server Actions)         |
| Lenguaje      | TypeScript estricto                             |
| Base de datos | PostgreSQL 16 (Docker)                          |
| ORM           | Drizzle ORM + drizzle-kit                       |
| Auth          | Auth.js v5 (Credentials + roles user/admin)     |
| Pagos         | Mercado Pago SDK (Checkout Pro)                 |
| UI            | Tailwind CSS v4 + shadcn/ui                     |
| Upload        | sharp → WebP 800px en /public/uploads/products  |
| Validación    | Zod v4                                          |

---

## Estructura del proyecto

```
app/
├── docker-compose.yml       # Postgres 16
├── drizzle.config.ts        # Config Drizzle ORM
├── .env.example             # Variables de entorno
└── src/
    ├── app/
    │   ├── (shop)/          # Tienda: /, /productos, /carrito, /checkout, /cuenta
    │   ├── (auth)/          # /login, /registro
    │   ├── (admin)/admin/   # Panel admin
    │   └── api/             # webhooks/mercadopago, upload, auth, products
    ├── components/          # Header, Hero, ProductCard, CartDrawer, etc.
    ├── contexts/            # CartContext (client-side)
    ├── db/                  # schema.ts, index.ts, seed.ts, migrations/
    ├── lib/                 # auth.ts, mercadopago.ts, validators.ts
    └── server/actions/      # cart, orders, products, categories, auth
```

---

## Instalación y configuración

### 1. Requisitos previos
- Node.js ≥ 20
- Docker Desktop
- Cuenta de Mercado Pago (para pagos)

### 2. Clonar y configurar variables de entorno

```bash
cd app
cp .env.example .env.local
```

Editá `.env.local` con tus valores:

```env
DATABASE_URL="postgresql://radiocolonia:radiocolonia_secret@127.0.0.1:5433/radiocolonia_db"
AUTH_SECRET="genera-una-clave-secreta-larga"    # openssl rand -base64 32
AUTH_URL="http://localhost:3000"
MP_ACCESS_TOKEN="TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
MP_WEBHOOK_SECRET="tu-webhook-secret-de-mp"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ADMIN_EMAIL="admin@radiocolonia.local"
ADMIN_PASSWORD="Admin1234!"
```

### 3. Levantar la base de datos

```bash
docker compose up -d --wait
```

(`--wait` espera a que Postgres pase el healthcheck antes de seguir; útil antes de `db:push`.)

Si venías de una versión previa con otro usuario/clave de Postgres, actualizá `DATABASE_URL` en `.env.local` al valor de arriba **o** borrá el volumen y recreá: `docker compose down -v`, luego repetí los pasos desde el paso 3 (se pierden los datos locales de esa base).

### 4. Instalar dependencias

```bash
npm install
```

### 5. Sincronizar schema y cargar datos iniciales

```bash
npm run db:push     # Crea las tablas en Postgres
npm run db:seed     # Carga categorías, productos y admin
```

### 6. Iniciar en desarrollo

```bash
npm run dev
# http://localhost:3000
```

### Problemas frecuentes

**Puerto 5432 ya en uso**  
Si ya tenés PostgreSQL u otro contenedor en el puerto 5432, este proyecto publica Postgres en **5433** (`5433:5432` en Docker). Usá en `.env.local`:

`DATABASE_URL="postgresql://radiocolonia:radiocolonia_secret@127.0.0.1:5433/radiocolonia_db"`

**`drizzle-kit push`: "Either connection url or host are required"**  
Las variables solo en `.env.local` no las leía Drizzle. Ya está resuelto: se cargan `.env` y `.env.local` al ejecutar `db:push` / `db:seed`. Volvé a correr `npm run db:push` desde `app/`.

**`db:push` se queda mucho tiempo en "Pulling schema from database..."**  
Casí siempre es **Postgres caído** o **`DATABASE_URL` incorrecta** (usuario/clave vieja antes del rename, puerto ≠ 5433, o Docker apagado). Verificá con `docker compose ps` que el servicio esté `healthy`; en `.env.local` la URL debe coincidir con `docker-compose.yml` (usuario `radiocolonia`, puerto host **5433**).

**`password authentication failed for user radiocolonia"`**  
Suele pasar si el contenedor no levantó y la app sigue apuntando a un Postgres distinto (otro usuario/clave). Asegurate de que `docker compose up -d` funcione y que `DATABASE_URL` use el **mismo puerto** que el mapeo del compose (5433 por defecto).

**`ECONNREFUSED` al correr `db:seed` / la app**  
- Asegurate de que `DATABASE_URL` use **puerto 5433** y, en Windows, preferí **`127.0.0.1`** en lugar de `localhost` (evita que Node intente solo IPv6).  
- Esperá unos segundos tras `docker compose up` o usá `docker compose up -d --wait`.

**`Can't resolve 'tailwindcss' in '...\Radio Colonia'`**  
Next/Turbopack estaba usando la carpeta **padre** como raíz. Está fijado con `turbopack.root` en `next.config.mjs`. Volvé a ejecutar `npm run dev` **desde** `app/`.

---

## Credenciales de prueba

### Admin
- Email: `admin@radiocolonia.local`
- Password: `Admin1234!`
- Panel: `http://localhost:3000/admin`

### Mercado Pago (modo TEST)

Usá las credenciales TEST de tu cuenta de Mercado Pago:
1. Entrá a [developers.mercadopago.com](https://developers.mercadopago.com)
2. Creá/usá una aplicación de prueba
3. Copiá el `Access Token TEST` en `MP_ACCESS_TOKEN`

Tarjetas de prueba: [Ver tarjetas de prueba MP](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards)

### Webhook local con ngrok

Para recibir webhooks de Mercado Pago en desarrollo:

```bash
# Instalar ngrok: https://ngrok.com
ngrok http 3000
# Copiá la URL pública, ej: https://abc123.ngrok.io

# En .env.local:
NEXT_PUBLIC_APP_URL="https://abc123.ngrok.io"

# En MP Dashboard → tu app → Webhooks:
# URL: https://abc123.ngrok.io/api/webhooks/mercadopago
# Eventos: Pagos (payment)
# Copiá el "secret" del webhook en MP_WEBHOOK_SECRET
```

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build producción
npm run start        # Servidor producción
npm run typecheck    # Verificar tipos TypeScript
npm run db:push      # Sincronizar schema (sin migración)
npm run db:migrate   # Generar y aplicar migraciones
npm run db:studio    # Drizzle Studio (UI para la DB)
npm run db:seed      # Cargar datos iniciales
npm run lint         # ESLint
```

---

## Funcionalidades del MVP

### Tienda
- 🏠 **Home**: Hero animado, categorías, productos destacados, flash sale countdown, newsletter
- 🛍️ **Catálogo**: Listado con filtros por categoría, búsqueda y orden; paginado
- 📦 **Detalle de producto**: Imagen, rating, stock, cantidad, agregar al carrito
- 🛒 **Carrito**: Drawer lateral + página de carrito con totales
- 💳 **Checkout**: Formulario de envío → Mercado Pago Checkout Pro

### Usuario
- 🔐 **Auth**: Registro y login con email/password
- 👤 **Mi cuenta**: Perfil y historial de pedidos con estado de pago
- 📋 **Detalle de orden**: Items, dirección y estado Mercado Pago

### Admin Panel (`/admin`)
- 📊 **Dashboard**: Métricas (productos activos, pedidos pagados, ingresos, usuarios)
- ➕ **Productos**: CRUD completo con upload de imagen (sharp → WebP 800px)
- 🏷️ **Categorías**: CRUD inline
- 📋 **Órdenes**: Listado con estados y filtros
