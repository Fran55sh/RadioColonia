# Sistema Radio Colonia — Documentación de arquitectura

> Análisis exhaustivo del workspace para referencia futura.  
> **Última actualización:** 31 agosto 2026  
> **Workspace:** `Radio coloni aHub/` (no es un repositorio git único; son dos repos independientes)

---

## 1. Visión general

El workspace contiene **dos aplicaciones** que comparten **una sola base PostgreSQL**:

| Carpeta | Repositorio Git | Rol |
|---------|-----------------|-----|
| `Radio Colonia/` | `Fran55sh/RadioColonia` | Ecommerce + admin + **autoridad de esquema DB** |
| `radio-colonia-pos/` | `Fran55sh/radio-colonia-pos` | Punto de venta (caja) + API comercial |

**Negocio:** tienda de electrónica en Argentina (Responsables Inscriptos). ~1500–2000 ventas/mes. IVA 21%. Facturación electrónica vía ARCA/AFIP en el POS.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (radiocolonia_db)                        │
│  ┌──────────────────────┐    ┌──────────────────────────────────────┐  │
│  │ Tablas ecommerce     │    │ Tablas POS (prefijo pos_*)           │  │
│  │ products, variants,  │◄──►│ pos_ventas, pos_clientes,            │  │
│  │ orders, suppliers…   │    │ pos_comprobantes_fiscales…           │  │
│  └──────────▲───────────┘    └──────────────────▲───────────────────┘  │
└─────────────┼────────────────────────────────────┼──────────────────────┘
              │                                    │
    ┌─────────┴─────────┐              ┌─────────┴─────────┐
    │  Radio Colonia    │              │ radio-colonia-pos │
    │  Next.js 16       │              │ Fastify + React   │
    │  :3000 (web)      │              │ :3001 API / :5173 │
    └───────────────────┘              └───────────────────┘
         Tienda web                         Caja / POS
         Panel admin                        Facturación ARCA
```

### Principios de diseño

1. **Una sola fuente de verdad para catálogo y stock:** `products` + `product_variants` (ecommerce).
2. **Una sola autoridad de migraciones:** migrador del ecommerce (`Radio Colonia/app/migrate.sh`).
3. **El POS no hace DDL:** solo verifica esquema al arrancar; falla rápido si faltan tablas.
4. **Stock omnicanal:** web y POS descuentan el mismo campo `product_variants.stock`.
5. **Ventas separadas por canal:** web → `orders`; POS → `pos_ventas` (no unificadas aún).
6. **Facturación fiscal solo en POS:** módulo aislado `modules/fiscal/`, emisión post-venta.

---

## 2. Estructura del workspace

```
Radio coloni aHub/
├── sistema.md                 ← este documento
├── Radio Colonia/               ← repo ecommerce
│   ├── Dockerfile               ← build Coolify (contexto raíz)
│   ├── docker-compose.coolify.yml
│   ├── UXUI/                    ← prototipo Vite/Lovable (NO desplegado)
│   ├── plantilla/               ← CSV plantilla importación
│   └── app/                     ← ★ aplicación principal
│       ├── src/
│       ├── docker-compose.yml
│       ├── docker-compose.prod.yml
│       ├── Dockerfile
│       ├── migrate.sh
│       └── docs/
│           ├── DEPLOY.md
│           └── DB_UNIFICATION.md
└── radio-colonia-pos/           ← repo POS
    ├── Backend/
    ├── Frontend/
    ├── docker-compose.yml       ← dev local (postgres + api + ui)
    ├── docker-compose.yaml      ← Coolify/producción
    ├── docker-compose.prod.yml
    └── docs/
        └── DEPLOY.md
```

---

## 3. Radio Colonia (Ecommerce)

### 3.1 Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | **Next.js 16.2.4** (App Router, Server Actions, `output: "standalone"`) |
| Lenguaje | TypeScript estricto |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Lucide, fuente Outfit |
| Base de datos | PostgreSQL 16 |
| ORM | Drizzle ORM + drizzle-kit |
| Auth | Auth.js v5 (`next-auth` beta) — Credentials, JWT, roles `user` / `admin` |
| Pagos | Mercado Pago SDK — **deshabilitado por defecto** (`ENABLE_MERCADOPAGO=false`) |
| Validación | Zod v4 |
| Imágenes | sharp → WebP 800px en `/public/uploads/products` |
| Importación | fast-csv (bulk import admin) |

**Nota:** la carpeta `UXUI/` es un prototipo anterior (Vite + React). No es la tienda en producción.

### 3.2 Estructura de código (`Radio Colonia/app/src/`)

```
src/
├── app/
│   ├── (shop)/          # Tienda: /, /productos, /carrito, /checkout, /cuenta
│   ├── (auth)/          # /login, /registro
│   ├── (admin)/admin/   # Panel administración
│   └── api/             # REST: health, products, upload, webhooks MP
├── components/          # UI + shadcn
├── contexts/            # CartContext
├── db/                  # schema Drizzle, migraciones SQL, seed, verify
├── lib/                 # auth, mercadopago, inventory, validators
└── server/actions/      # Server Actions (CRUD, pedidos, import)
```

### 3.3 Panel de administración

Base: `/admin` — requiere `role === "admin"`.

| Ruta | Función |
|------|---------|
| `/admin` | Dashboard (pedidos pendientes, productos activos, ingresos) |
| `/admin/productos` | Listado y CRUD de productos |
| `/admin/productos/nuevo` | Alta de producto |
| `/admin/productos/[id]` | Edición (variantes vendibles SKU) |
| `/admin/productos/importar` | Importación masiva CSV |
| `/admin/productos/vincular` | Vincular variantes con proveedores |
| `/admin/imagenes` | Auditoría de imágenes (huérfanas, rotas) |
| `/admin/categorias` | Categorías y subcategorías |
| `/admin/atributos` | Atributos globales de variantes |
| `/admin/proveedores` | CRUD proveedores (`suppliers`) |
| `/admin/ordenes` | Gestión de pedidos web |
| `/admin/ordenes/[id]` | Detalle y transiciones de estado |

**Checkout por defecto:** retiro en local (pickup). Sin Mercado Pago activo, el admin confirma pedidos manualmente.

### 3.4 API REST (`src/app/api/`)

| Endpoint | Método | Auth | Descripción |
|----------|--------|------|-------------|
| `/api/health` | GET | Público | Health + conectividad DB |
| `/api/auth/[...nextauth]` | * | Público | Handlers Auth.js |
| `/api/products/[slug]` | GET | Público | Producto + variantes JSON |
| `/api/upload` | POST | Admin | Subida imagen → WebP |
| `/api/admin/bulk-import` | POST | Admin | Import CSV productos |
| `/api/webhooks/mercadopago` | POST | Firma MP | Webhook pagos |

La mayoría de la lógica de negocio vive en **Server Actions** (`src/server/actions/`): productos, variantes, categorías, proveedores, pedidos, importación, media.

### 3.5 Esquema Drizzle (solo ecommerce)

Definido en `src/db/schema.ts`. **Las tablas `pos_*` NO están en Drizzle** — solo en SQL.

**Auth:** `users`, `accounts`, `sessions`, `verification_tokens`

**Catálogo:** `categories`, `global_attributes`, `products` (`qty_discount_scope`), `product_images`, `product_variants`, `product_variant_price_tiers`, `product_price_tiers`

**Proveedores:** `suppliers` (UUID), `product_supplier_offers`

**Carrito:** `carts`, `cart_items`

**Pedidos:** `addresses`, `orders`, `order_items`, `order_status_history`

**Enums:** `user_role`, `order_status`, `fulfillment_type`, `contact_channel`

### 3.6 Migraciones SQL (`src/db/migrations/`)

| Archivo | Contenido |
|---------|-----------|
| `0001_bulk_import.sql` | `product_variants`, staging `stg_products_import` |
| `0002_subcategories_and_attributes.sql` | Subcategorías, `global_attributes`, índices GIN |
| `0003_orders_fulfillment.sql` | Pickup/shipping, historial de estados, snapshots |
| `0004_suppliers.sql` | `suppliers`, `product_supplier_offers` |
| `0005_pos_operational_tables.sql` | **Todas las tablas `pos_*` operativas** |
| `0006_stock_non_negative.sql` | `CHECK (stock >= 0)` en products y variants |
| `0007_default_product_variants.sql` | Backfill variante default para productos legacy |
| `0008_pos_fiscal_invoicing.sql` | Campos fiscales en `pos_clientes`, `pos_comprobantes_fiscales` |
| `0009_variant_price_tiers.sql` | Tramos de precio por cantidad (`product_variant_price_tiers`) + columnas staging CSV |
| `0010_product_qty_discount_scope.sql` | Alcance del descuento: `products.qty_discount_scope` (`per_variant` \| `shared`) + `product_price_tiers` |
| `0011_normalize_variant_sku_lower.sql` | Normaliza `product_variants.sku` a minúsculas (índice UNIQUE sin `LOWER()` en POS); fusiona duplicados por mayúsculas |
| `0012_remove_demo_seed_products.sql` | Elimina productos demo del seed (Pro Max Phone, UltraBook, etc.) |
| `0013_variant_sort_order.sql` | `product_variants.sort_order` — conserva orden de filas CSV / tabla admin |

### 3.7 Pipeline de migración (`migrate.sh`)

Ejecutado por el contenedor **migrator** en deploy. 6 pasos idempotentes:

1. Aplicar SQL idempotente (`apply-sql-migrations.ts`)
2. `drizzle-kit push --force` (sincroniza schema TS)
3. Re-aplicar SQL (garantiza `pos_*` que Drizzle no conoce)
4. **`verify-schema.ts`** — falla si falta tabla/columna
5. Tabla staging CSV (`migrate-staging.ts`)
6. Seed (`seed.ts`)

### 3.8 Variables de entorno (ecommerce)

Archivo: `Radio Colonia/app/.env.example`

| Variable | Uso |
|----------|-----|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión PostgreSQL (no usa `DATABASE_URL`) |
| `AUTH_SECRET` | Firma sesiones Auth.js |
| `AUTH_URL` | URL base Auth.js |
| `ENABLE_MERCADOPAGO` | Toggle pagos online (default `false`) |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Mercado Pago |
| `NEXT_PUBLIC_APP_URL` | URL pública (checkout, callbacks) |
| `NEXT_PUBLIC_PICKUP_ADDRESS` | Dirección retiro en tienda |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Usuario admin del seed |

### 3.9 Deploy ecommerce

**Local dev:** `docker compose up -d` en `app/` → Postgres en puerto host **5433**.

**Producción local:** `docker-compose.prod.yml` → postgres + web + migrate.

**Coolify:**
1. Recurso **Database** PostgreSQL 16 (persistente)
2. Recurso **Migrator** — Dockerfile target `migrator`, deploy manual tras cambios de schema
3. Recurso **Web** — `docker-compose.coolify.yml`, target `runner`, puerto interno 3000
4. Volumen `radiocolonia_uploads` para imágenes de productos

**Orden de deploy:** Postgres → Migrator → Web → POS

---

## 4. radio-colonia-pos (Punto de venta)

### 4.1 Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Backend | **Fastify 5** + TypeScript ESM, `pg` pool |
| Frontend | **React 19** + **TanStack Start** (SSR con Vite 7 + Nitro) |
| UI | Tailwind CSS 4, Radix/shadcn (~40 componentes), Lucide |
| Estado servidor | TanStack Query |
| Routing | TanStack Router (una sola ruta `/`) |
| Validación | Zod |
| Fiscal | `@ramiidv/arca-facturacion` v2 (ARCA/AFIP WSFE) |
| Runtime Docker | Node.js 22 |

### 4.2 Estructura Backend (`Backend/src/`)

```
src/
├── index.ts              # Entry → startServer()
├── app.ts                # Fastify: CORS, auth, rutas, /health
├── docker-entrypoint.mjs # verify schema → seed opcional → start
├── config/
│   ├── env.ts            # Zod: PORT, DB_*, CORS, API_TOKEN
│   ├── db.ts             # Pool, withTransaction()
│   └── arca.ts           # ARCA_ENABLED, CUIT, certs, production flag
├── middleware/
│   ├── auth.ts           # Bearer opcional en escrituras
│   └── errors.ts         # AppError + handler global
├── db/
│   ├── verify-schema.ts  # Fail-fast: 12 tablas requeridas
│   ├── migrate.ts        # Wrapper → solo verify
│   └── seed.ts           # No-op en prod (sin catálogo dummy)
├── lib/
│   ├── catalog.ts        # ★ Lectura catálogo ecommerce + stock + tramos qty
│   ├── qty-discount-scope.ts  # Resolución shared vs per_variant (+ fallback)
│   ├── quantity-pricing.ts    # resolveUnitPrice / normalizeTiers
│   ├── iva.ts            # Split precio con IVA
│   ├── constants.ts      # IVA 21%, stock mínimo 5
│   └── slugify.ts
└── modules/
    ├── auth/             # Login PIN + JWT HMAC
    ├── pos/              # Ventas y catálogo caja
    ├── fiscal/           # ARCA / comprobantes
    ├── clientes/         # pos_clientes
    ├── compras/          # Órdenes de compra, proveedores
    ├── contabilidad/     # Libro IVA ventas/compras
    └── analytics/        # Reportes (sin UI aún)
```

### 4.3 API completa (`/api/v1`)

**Auth:** toda `/api/v1/*` exige `Authorization: Bearer <JWT>` (o `API_TOKEN`). Públicos: `GET /health`, `GET /api/v1/auth/config`, `POST /api/v1/auth/login`.

#### Auth — `/api/v1/auth`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/config` | `{ auth_required }` (público) |
| POST | `/login` | Body `{ pin }` → `{ token, expires_at }` |
| GET | `/session` | Validar JWT actual |

#### POS — `/api/v1/pos`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/productos` | Catálogo activo desde ecommerce |
| POST | `/ventas` | Registrar venta (transacción + fiscal opcional) |
| POST | `/ventas/offline-batch` | Sincronizar cola offline |

#### Fiscal — `/api/v1/fiscal`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/ventas/:ventaId` | Estado comprobante de una venta |
| POST | `/ventas/:ventaId/reintentar` | Reintentar emisión CAE |
| GET | `/config` | `{ arca_enabled, ambiente }` |

#### Clientes — `/api/v1/clientes`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Búsqueda `?search=&limit=` |
| GET | `/:id` | Detalle |
| POST | `/` | Alta con datos fiscales |
| PATCH | `/:id` | Actualización |
| GET | `/:id/historial` | Historial de compras |

#### Compras — `/api/v1/compras`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/proveedores` | Lista `suppliers` |
| POST | `/proveedores` | Alta proveedor |
| POST | `/proveedores-productos` | Vincular variante ↔ proveedor |
| POST | `/ordenes` | Crear orden de compra |
| GET | `/ordenes/:id` | Detalle OC |
| GET | `/ordenes` | Listado OC |
| GET | `/importaciones` | Listado borradores/importaciones |
| POST | `/importaciones` | Subir PDF |
| POST | `/importaciones/texto` | Pegar texto OCR |
| POST | `/importaciones/manual` | Borrador factura manual vacío |
| PATCH | `/importaciones/:id` | Guardar revisión |
| POST | `/importaciones/:id/ejecutar` | OC recibida + stock↑ + factura |

#### Contabilidad — `/api/v1/contabilidad`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/iva/ventas?desde=&hasta=` | Registro IVA ventas |
| GET | `/iva/compras?desde=&hasta=` | Registro IVA compras |
| POST | `/iva/compras/facturas` | Alta factura de compra |

#### Analytics — `/api/v1/analytics`

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/facturacion-dia?fecha=` | Facturación del día |
| GET | `/ranking-productos?limit=&dias=` | Top productos |
| GET | `/stock-critico` | Productos bajo mínimo |
| GET | `/rentabilidad?dias=` | Margen por período |

**Health:** `GET /health` — DB conectada, `schema_ready`, nombre de base.

### 4.4 Frontend (`Frontend/src/`)

**Rutas:**
- `/login` — PIN compartido del local
- `/` — UI completa de caja (requiere sesión)

**Componentes POS:**
- `PosClock.tsx` — reloj/fecha (fuera del render principal de caja)
- `CustomerSelector.tsx` — búsqueda/selección cliente, preview Factura A/B (debounce + `enabled` por viewport)
- `CustomerFormDialog.tsx` — alta cliente (CUIT/DNI/CF, condición IVA)
- `FiscalResultDialog.tsx` — CAE, número, QR, errores

**Optimizaciones UI (caja):**
- Auth cache en `beforeLoad` vía `getAuthRequired()` (evita round-trip en cada navegación)
- Health check sin fallback a catálogo completo
- Post-venta: patch de stock en React Query (`setQueryData`) en lugar de invalidar todo el catálogo
- Una sola instancia de `CustomerSelector` según viewport / paso móvil

**Sesión:** JWT en `sessionStorage` (`pos-session`). Botón **Salir** en header. En 401 → logout + redirect a `/login`.

**Atajos de teclado:**
- F2 — foco escaneo
- F8 — Efectivo
- F9 — Débito/Crédito
- F10 — Mercado Pago QR

**Proxy API:** en dev y prod, `/api/**` y `/health` se proxean al backend (`VITE_PROXY_TARGET`, default `http://127.0.0.1:3001`). En Coolify la API no se expone al host; solo vía frontend.

### 4.5 Modo offline

| Aspecto | Implementación |
|---------|----------------|
| Detección | Poll `/health` cada 15s; 2 fallos → modo offline |
| Cola | `localStorage` key `radio-colonia-pos-offline-queue` |
| Precio | Cada línea lleva `precio_unitario` (snapshot de caja); el backend lo usa al sincronizar |
| Stock | Advertencia si qty > stock cacheado; no bloquea el encolado |
| Al cobrar offline | `enqueueSale()` con `client_sale_id` único |
| Al reconectar | `POST /pos/ventas/offline-batch` automático (con Bearer JWT) |
| Dedup | `client_sale_id` UNIQUE en `pos_ventas` |
| Fiscal offline | No emite al encolar; emite al sincronizar batch |
| Login offline | Requiere haber iniciado sesión antes (JWT en sessionStorage) |

### 4.6 Variables de entorno (POS)

**Solo en `radio-colonia-pos/Backend/.env`** (no en ecommerce ni migrador):

| Variable | Descripción |
|----------|-------------|
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | Mismas que ecommerce |
| `DATABASE_URL` | Alternativa (si contradice `DB_*`, `DB_*` tiene prioridad) |
| `PORT`, `HOST` | API (default 3001, 0.0.0.0) |
| `CORS_ORIGIN` | Origen(es) frontend, separados por coma |
| `POS_ACCESS_PIN` | PIN compartido (**obligatorio en producción**) |
| `POS_JWT_SECRET` | Secreto JWT (**obligatorio en producción**, mín. 16 chars) |
| `POS_SESSION_HOURS` | Duración sesión (default 12) |
| `API_TOKEN` | Bearer opcional para scripts/integraciones |
| `NODE_ENV` | development / production |
| `POS_SEED_DEMO` | `true` permite seed en prod (sin catálogo dummy) |
| `ARCA_*` | Facturación (ver sección 7) |

**Frontend (build):**
- `VITE_API_URL` — default `/api/v1`
- `VITE_PROXY_TARGET` — URL backend para proxy Nitro

### 4.7 Deploy POS

**Local dev:** `docker compose up --build` → Postgres :5433, API :3001, UI :5173

**Coolify:** `docker-compose.yaml` — sin Postgres propio; red `coolify` externa.

| Servicio | Puerto interno | Dominio |
|----------|----------------|---------|
| `frontend` | 3000 | Pantalla de caja (principal) |
| `backend` | 3001 | API (proxy vía frontend) |

**Arranque backend:** verify schema → (seed si dev) → `dist/index.js`. Si faltan tablas, **exit 1** y el deploy falla.

---

## 5. Base de datos compartida

### 5.1 Contrato de unificación

Documento canónico: `Radio Colonia/app/docs/DB_UNIFICATION.md`

| Responsabilidad | Dueño |
|-----------------|-------|
| DDL / migraciones | Ecommerce migrator |
| Catálogo R/W (admin) | Ecommerce |
| Catálogo R + stock W (ventas) | POS |
| Tablas `pos_*` | Creadas por ecommerce, escritas por POS |
| Pedidos web | Ecommerce (`orders`) |
| Ventas POS | POS (`pos_ventas`) |

### 5.2 Mapping catálogo (POS ↔ ecommerce)

| Campo API POS | Origen en DB |
|---------------|--------------|
| `codigo_interno` | `product_variants.sku` (normalizado a minúsculas en Node; **almacenado en minúsculas** en DB para usar el índice UNIQUE sin `LOWER()`) |
| `nombre` | `products.name` + valores de `product_variants.attributes` |
| `precio_venta` | `COALESCE(product_variants.sale_price, products.price)` (precio base qty=1) |
| `price_tiers` | Según `products.qty_discount_scope`: **`shared`** → `product_price_tiers`; **`per_variant`** → `product_variant_price_tiers`. El POS carga ambas tablas y resuelve en Node (`resolveEffectiveTiers`) con fallback si los tramos quedaron en la tabla opuesta |
| `stock` | `product_variants.stock` |
| `alicuota_iva` | Constante **21%** (ecommerce no modela IVA por ítem aún) |
| `costo` (interno) | `product_supplier_offers.cost_price` preferido, o `product_variants.cost_price` |

**Precio por cantidad (all-units):** en venta web y POS se aplica el tramo con mayor `min_qty <= cantidad` (mínimo `min_qty >= 2`); todas las unidades de la línea usan ese precio unitario. En POS el backend recalcula al cobrar (`lockAndDecrementForSale` + `resolveUnitPrice`); el carrito muestra precio tachado cuando aplica tramo.

**Filtro:** solo `products.is_active = TRUE`.

**Stock (POS):** un `UPDATE … WHERE stock >= cantidad RETURNING` por línea (`lockAndDecrementForSale`); lookup SKU directo (`pv.sku = $1`, sin `LOWER()` — SKUs en minúsculas en DB).

### 5.3 Tablas POS (`pos_*`)

#### Operativas (`0005`)

| Tabla | Propósito |
|-------|-----------|
| `pos_clientes` | Clientes de caja |
| `pos_ventas` | Cabecera venta (total, medio_pago, cliente_id, client_sale_id) |
| `pos_lineas_venta` | Líneas con snapshots SKU/nombre/costo/proveedor |
| `pos_iva_registro` | Libro IVA (ventas y compras) |
| `pos_ordenes_compra` | Órdenes de compra a proveedores |
| `pos_ordenes_compra_lineas` | Líneas OC |
| `pos_facturas_compra` | Facturas de compra registradas |

#### Fiscales (`0008`)

| Tabla / columna | Propósito |
|-----------------|-----------|
| `pos_clientes.documento_tipo_afip` | CUIT, DNI, CF |
| `pos_clientes.condicion_iva_receptor_id` | Código AFIP (1=RI, 5=CF) |
| `pos_clientes.razon_social`, `domicilio_fiscal` | Datos fiscales |
| `pos_clientes.padron_*` | Consulta padrón (reservado) |
| `pos_comprobantes_fiscales` | CAE, estado, QR, errores (1:1 con venta) |

**Estados comprobante:** `pendiente` | `emitido` | `error` | `anulado`

### 5.4 Verificación de esquema

| App | Archivo | Tablas verificadas |
|-----|---------|-------------------|
| Ecommerce migrator | `app/src/db/verify-schema.ts` | 23 tablas (ecommerce + pos_* + price tiers) |
| POS al arrancar | `Backend/src/db/verify-schema.ts` | 13 tablas (catálogo + price tiers + pos_*) |

---

## 6. Flujos de negocio

### 6.1 Venta en caja (online)

```
1. Cajero escanea SKU → busca en catálogo (GET /pos/productos)
2. Opcional: selecciona cliente (Factura A si CUIT + RI, sino Factura B)
3. Elige medio de pago (efectivo, tarjeta, MP QR)
4. POST /pos/ventas
   a. Transacción DB (por cada línea):
      - UPDATE stock condicional + RETURNING datos variant (lockAndDecrementForSale)
      - Precio autoritativo: resolveUnitPrice(precio base, price_tiers, cantidad)
      - INSERT pos_ventas + pos_lineas_venta + pos_iva_registro
   b. Fuera de transacción (si ARCA_ENABLED):
      - Resolver tipo comprobante
      - Llamar WSFE homologación/producción
      - INSERT/UPDATE pos_comprobantes_fiscales
5. Frontend muestra FiscalResultDialog (CAE o error)
```

### 6.2 Venta offline

```
1. Sin conexión → venta encolada en localStorage
2. Al reconectar → POST /pos/ventas/offline-batch
3. Por cada venta sincronizada → emisión fiscal (si ARCA activo)
```

### 6.3 Pedido web (ecommerce)

```
1. Cliente arma carrito → checkout pickup (default)
2. Crea pedido en orders (estado pending)
3. Admin confirma → pending → confirmed
4. Al confirmar: decrementa product_variants.stock (inventory.ts)
5. Flujo estados: preparing → ready_for_pickup → delivered
```

**No hay factura fiscal automática en pedidos web** (solo POS emite comprobantes ARCA).

### 6.4 Resolución de comprobante fiscal

| Cliente | Resultado |
|---------|-----------|
| Sin cliente | Factura B — Consumidor final (doc 0) |
| CUIT + condición IVA 1 (RI) | **Factura A** |
| CUIT + otra condición | Factura B |
| Sin CUIT | Factura B — CF |

---

## 7. Módulo fiscal ARCA

### 7.1 Arquitectura

```
modules/fiscal/
├── arca-client.ts    # Singleton cliente @ramiidv/arca-facturacion
├── resolver.ts       # Factura A/B según cliente
├── mappers.ts        # Líneas POS → ítems ARCA (agrupados por alícuota)
├── repository.ts     # pos_comprobantes_fiscales CRUD
├── service.ts        # emitirComprobanteVenta, maybeEmitirDespuesDeVenta
├── routes.ts         # Endpoints fiscal
└── types.ts
```

### 7.2 Entornos ARCA

| `ARCA_PRODUCTION` | Endpoints | Uso |
|-------------------|-----------|-----|
| `false` | `wsaahomo.afip.gov.ar`, `wswhomo.afip.gov.ar` | Homologación / pruebas |
| `true` | `wsaa.afip.gov.ar`, `servicios1.afip.gov.ar` | Producción real |

### 7.3 Requisitos para probar facturación

1. Migración `0008` aplicada (migrador ecommerce)
2. `ARCA_ENABLED=true` en **Backend POS** `.env`
3. Certificados homologación en `Backend/certs/` (WSFE habilitado en AFIP)
4. CUIT emisor + punto de venta dados de alta en homologación

### 7.4 Fuera de v1 (ver roadmap §9.5)

No implementado; priorizado en hitos del roadmap:

- Producción ARCA E2E → **Hito 4** (después de cola fiscal en Hito 2)
- PDF / impresión térmica → **Hito 2**
- Notas de crédito / débito → **Hito 2**
- CAEA (contingencia) → **Hito 4**
- Alta de clientes offline → backlog
- IVA por producto desde catálogo (sigue 21% fijo) → **Hito 4**
- Consulta padrón AFIP automática al crear cliente → **Hito 4**
- Cola/vista de comprobantes fallidos → **Hito 2**

---

## 8. Integración entre repos

```
┌─────────────────────────────────────────────────────────────┐
│                    DESARROLLO LOCAL                          │
├─────────────────────────────────────────────────────────────┤
│ 1. cd "Radio Colonia/app"                                   │
│    docker compose up -d                                       │
│    npm run docker:prod:migrate  (o migrate.sh)               │
│                                                               │
│ 2. cd radio-colonia-pos/Backend                              │
│    cp .env.example .env  (DB apunta a :5433)                 │
│    npm run db:verify && npm run dev                          │
│                                                               │
│ 3. cd radio-colonia-pos/Frontend                             │
│    npm run dev  → http://localhost:5173                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    PRODUCCIÓN (Coolify)                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Database PostgreSQL (recurso compartido)                  │
│ 2. Ecommerce migrator (manual tras cambios schema)         │
│ 3. Ecommerce web (docker-compose.coolify.yml)                │
│ 4. POS stack (docker-compose.yaml) — mismas DB_*             │
└─────────────────────────────────────────────────────────────┘
```

### Repositorios Git

| Repo | Remote | Rama principal |
|------|--------|----------------|
| Ecommerce | `github.com/Fran55sh/RadioColonia` | `main` |
| POS | `github.com/Fran55sh/radio-colonia-pos` | `main` |

El workspace local **no es un monorepo git**; son dos repos hermanos en la misma carpeta padre.

---

## 9. Estado actual, brechas y roadmap

### 9.1 Diagnóstico

Hoy el POS es una **caja omnicanal fuerte**, no un sistema de gestión de comercio.

| Capa | Realidad |
|------|----------|
| UI | Casi solo caja (`/login` + `/`): venta, cliente rápido, fiscal, offline, mobile por pasos |
| Backend | Esqueleto de compras / clientes / analytics / contabilidad; gran parte **sin pantallas** |
| Inventario | Baja stock al vender; **no sube** al recibir mercadería (OC / factura compra no tocan `product_variants.stock`) |
| Catálogo | Autoridad en ecommerce admin; el POS lee y vende |

**Agujero de negocio principal:** sin recepción de mercadería el POS no puede ser gestión de inventario/proveedores de un comercio.

**Modelo objetivo:**

```
┌─────────────────────────────────────────────┐
│  POS = Caja + Backoffice del local          │
│  Caja · Inventario · Compras/Prov           │
│  Clientes · Reportes · Fiscal/IVA           │
└──────────────────┬──────────────────────────┘
                   │ misma PostgreSQL
┌──────────────────▼──────────────────────────┐
│  Ecommerce = vitrina web + admin catálogo   │
│  (pedidos online; stock compartido)         │
└─────────────────────────────────────────────┘
```

Regla: **una sola verdad de stock** (`product_variants.stock`); el POS deja de ser solo lector y pasa a gestionar proveedores, clientes e inventario del local.

### 9.2 Implementado

- [x] Ecommerce completo (tienda, admin, pedidos pickup)
- [x] POS caja con catálogo unificado y stock compartido
- [x] Login POS con PIN compartido + JWT (API cerrada)
- [x] Precio congelado en ventas offline
- [x] Advertencia de stock al encolar offline
- [x] Clientes fiscales + selector en caja (alta + búsqueda; sin editar/historial UI)
- [x] Facturación ARCA homologación (Factura A/B)
- [x] Modo offline con sincronización
- [x] APIs compras, contabilidad, analytics (backend; sin UI)
- [x] Migraciones POS en autoridad ecommerce
- [x] Descuento por cantidad (tramos shared / per_variant) en web + POS
- [x] Multi-atributo de variantes end-to-end (admin, ficha, CSV)
- [x] Optimización catálogo POS (listado sin subqueries de offers; venta en un round-trip)
- [x] Normalización SKU minúsculas (migración 0011)
- [x] Fix tramos qty en POS: carga dual de tablas + `resolveEffectiveTiers`
- [x] UI mobile caja por pasos (precios → cobro)

### 9.3 Parcial / sin UI

- [x] Frontend compras: importación PDF + listado OC/importaciones (`/compras`, `/compras/importar`)
- [ ] Frontend para contabilidad, analytics (APIs existen, sin pantallas)
- [x] Compras: recepción con stock↑ vía ejecutar importación PDF (OC `recibida`)
- [ ] Clientes: API tiene GET/PATCH/historial; UI solo list+create
- [ ] Fiscal: API reintento CAE; UI solo diálogo post-venta
- [ ] Mercado Pago en ecommerce (código presente, deshabilitado)
- [ ] “Mercado Pago QR” en caja = etiqueta de medio de pago (sin integración)
- [ ] Envíos (fulfillment shipping modelado, flujo limitado)
- [ ] Cajeros individuales / auditoría por operador
- [ ] Ajuste inventario manual (±) y stock crítico UI (resto Hito 0)

### 9.4 Deuda técnica conocida

- IVA fijo 21% en POS (no lee alícuota por producto del catálogo)
- `UXUI/` y `plantilla/` en repo ecommerce sin uso en producción
- Nombres de DB distintos entre entornos (`radiocolonia_db` local vs `postgres` en Coolify) — válido si `DB_*` coinciden en ambos stacks
- Cola/vista operativa de comprobantes fiscales fallidos (pendiente antes de ARCA producción)
- Ventas POS (`pos_ventas`) y pedidos web (`orders`) no unificados en reportes
- Offline puede encolar sobre stock y fallar al sync (`INSUFFICIENT_STOCK`)

### 9.5 Roadmap — POS como gestión de comercio

Prioridad: cerrar el ciclo **compra → stock → venta → reportes** antes de features “nice to have”.

#### Hito 0 — Cerrar el agujero de inventario (P0)

**Meta:** toda entrada y salida de stock queda auditada; las OC dejan de ser decorativas.

| Ítem | Repo | Estado |
|------|------|--------|
| Importación factura PDF → borrador → revisión → ejecutar | POS Backend + FE | **Hecho (MVP)** — `/compras/importar`, tabla `pos_compras_importaciones`, migración `0014` |
| Factura manual + vínculo código proveedor→SKU + IVA/dto | POS Backend + FE | **Hecho** — `/compras/facturas/nueva`, migración `0015`, creación diferida de proveedor |
| Recepción OC con `stock↑` + costos + `product_supplier_offers` | POS Backend | **Hecho** vía ejecutar importación (estado `recibida`) |
| Listado OC / importaciones | POS FE | **Hecho** — `/compras` |
| Anti-duplicado fiscal (prov+tipo+PV+nro) | DB + Backend | **Hecho** |
| Ajuste de inventario (±) manual | POS Backend + FE | Pendiente |
| Stock crítico en UI | POS FE | Pendiente |

**Criterio de done (parcial):** cargar PDF de factura con texto, vincular productos y confirmar → stock visible en caja. Ajustes manuales y stock crítico quedan para completar H0.

**Limitaciones parser MVP:** solo texto seleccionable (`pdf-parse`); sin OCR/IA; layouts no AFIP pueden requerir corrección manual de líneas.

#### Hito 1 — Backoffice del local (P0)

**Meta:** el encargado opera proveedores, clientes e inventario sin abrir otra app.

| Ítem | Repo | Notas |
|------|------|-------|
| Shell / navegación POS | POS FE | Rutas: `/` caja, `/inventario`, `/compras`, `/clientes`, `/reportes` (mobile-friendly) |
| Módulo Proveedores UI | POS FE | ABM; CUIT en columna propia (hoy en `notes`); mapa SKU↔proveedor |
| Módulo Clientes UI | POS FE | Editar, historial (`PATCH`, `GET /:id/historial`) |
| ABM producto mínimo en POS | POS Backend + FE **o** deep-link admin | Al menos precio, stock, activo/inactivo para operación diaria |
| Factura compra ↔ recepción | POS Backend | Vincular `pos_facturas_compra` a OC / líneas; no solo cabecera IVA |

**Criterio de done:** un día de local se puede hacer sin entrar al admin ecommerce salvo catálogo rico (imágenes, SEO).

#### Hito 2 — Operación de caja madura (P1)

**Meta:** control de turno, fiscal operable y ticket imprimible.

| Ítem | Repo | Notas |
|------|------|-------|
| Cajeros + roles | POS Backend + FE | Reemplazar PIN único a medio plazo; cajero / encargado / admin |
| Apertura / cierre / arqueo | POS Backend + FE | Efectivo esperado vs contado; ventas del turno |
| Cola fiscal fallidos | POS FE | Wirear `GET/POST /fiscal/ventas/:id` + reintentar |
| Impresión ticket | POS FE (+ opcional Backend PDF) | Térmica o PDF simple |
| Devoluciones / NC | POS Backend + FE | Contra venta → stock↑; fiscal NC si ARCA prod |

**Criterio de done:** se puede cerrar el día con arqueo y reintentar un CAE fallido sin tocar API a mano.

#### Hito 3 — Reportes y contabilidad usable (P1)

**Meta:** pantallas sobre APIs que ya existen.

| Ítem | Repo | Notas |
|------|------|-------|
| Dashboard del día | POS FE | `facturacion-dia`, ranking, stock crítico, rentabilidad |
| Libro IVA ventas/compras UI | POS FE | Filtro fechas + export CSV |
| Renombrar o integrar MP QR | POS | Hasta integrar: label “Transferencia/QR”; o integrar MP de verdad |

**Criterio de done:** encargado ve ventas del día y exporta IVA sin Postman.

#### Hito 4 — Madurez fiscal y comercial (P2)

| Ítem | Notas |
|------|-------|
| IVA por producto / alícuota | Dejar el 21% hardcode; leer del catálogo |
| ARCA producción E2E | Tras cola fiscal (Hito 2) + certs prod |
| Listas de precio / cliente mayorista | Más allá de tramos qty |
| Cuenta corriente proveedor | Pagos vs facturas |
| Cuenta corriente cliente | Saldo / pagos parciales |
| Unificar reportes POS + `orders` web | Un panel omnicanal |
| Padrón AFIP al alta cliente | Opcional |
| CAEA / contingencia | Solo si operación lo exige |

#### Hito 5 — Ecommerce (paralelo, menor prioridad POS)

| Ítem | Notas |
|------|-------|
| Mercado Pago checkout web | Código presente, `ENABLE_MERCADOPAGO` |
| Envíos / shipping | Modelo parcial |
| Factura fiscal en pedidos web | Hoy solo POS emite ARCA |

### 9.6 Qué simplificar o no vender como “listo”

| Ítem | Acción |
|------|--------|
| APIs compras sin recepción | Marcar experimental hasta Hito 0, o no documentarlas como feature completa |
| Botón “Mercado Pago QR” | Renombrar o integrar (evitar falsa expectativa) |
| Analytics / contabilidad sin UI | No incluir en pitch hasta Hito 3 |
| Seed demo de catálogo en POS prod | Mantener apagado |
| ERP contable completo | Fuera de alcance; solo libro IVA + export |
| PIN único | OK v1 un mostrador; planificar cajeros en Hito 2 |

### 9.7 Orden de ejecución sugerido

```
H0 recepción + ajustes stock
 → H1 backoffice (prov / clientes / inventario UI)
   → H2 turnos + fiscal ops + ticket + NC
     → H3 reportes / IVA UI
       → H4 alícuotas, ARCA prod, CC, omnicanal reportes
```

Ecommerce (H5) puede avanzar en paralelo sin bloquear H0–H3.

**Estimación orientativa (1 dev full-time):** H0 ~1–2 sem · H1 ~2–3 sem · H2 ~2–3 sem · H3 ~1 sem · H4 continuo.

---


## 10. Referencia rápida de archivos clave

| Archivo | Descripción |
|---------|-------------|
| `Radio Colonia/app/docs/DB_UNIFICATION.md` | Contrato DB compartida |
| `Radio Colonia/app/docs/DEPLOY.md` | Deploy ecommerce Coolify |
| `Radio Colonia/app/migrate.sh` | Pipeline migración (autoridad) |
| `Radio Colonia/app/src/db/schema.ts` | Schema Drizzle ecommerce |
| `Radio Colonia/app/src/lib/qtyDiscountScope.ts` | Alcance shared vs per_variant (ecommerce) |
| `Radio Colonia/app/src/lib/quantityPricing.ts` | Resolución de precio por tramos de cantidad |
| `Radio Colonia/app/src/lib/inventory.ts` | Stock ecommerce (FOR UPDATE) |
| `radio-colonia-pos/Backend/src/lib/catalog.ts` | Catálogo POS + tramos qty desde ecommerce |
| `radio-colonia-pos/Backend/src/lib/qty-discount-scope.ts` | Resolución tramos POS (shared / per_variant + fallback) |
| `radio-colonia-pos/Backend/src/lib/quantity-pricing.ts` | Misma lógica de tramos en POS |
| `radio-colonia-pos/Backend/src/modules/auth/` | Login PIN + JWT |
| `radio-colonia-pos/Backend/src/modules/pos/service.ts` | Flujo venta + fiscal |
| `radio-colonia-pos/Backend/src/modules/fiscal/service.ts` | Emisión ARCA |
| `radio-colonia-pos/Backend/src/config/arca.ts` | Config fiscal |
| `radio-colonia-pos/docs/DEPLOY.md` | Deploy POS Coolify |
| `radio-colonia-pos/Frontend/src/routes/login.tsx` | Pantalla login PIN |
| `radio-colonia-pos/Frontend/src/lib/auth-session.ts` | JWT en sessionStorage |
| `radio-colonia-pos/Frontend/src/lib/quantity-pricing.ts` | Tramos qty en carrito (frontend) |
| `radio-colonia-pos/Frontend/src/routes/index.tsx` | UI caja completa |
| `radio-colonia-pos/Frontend/src/lib/offline-queue.ts` | Cola offline |

---

## 11. Glosario

| Término | Significado |
|---------|-------------|
| **ARCA** | Agencia de Recaudación y Control Aduanero (ex-AFIP) — facturación electrónica |
| **CAE** | Código de Autorización Electrónico |
| **WSFE** | Web Service Facturación Electrónica |
| **Homologación** | Entorno de prueba AFIP (`ARCA_PRODUCTION=false`) |
| **SKU** | `product_variants.sku` = código de barras / `codigo_interno` en POS |
| **Tramo / qty discount** | Precio unitario fijo desde N unidades (`min_qty >= 2`). Tablas: `product_variant_price_tiers` (por SKU) o `product_price_tiers` (compartido). Alcance: `products.qty_discount_scope` |
| **RI** | Responsable Inscripto (condición IVA código 1) |
| **CF** | Consumidor Final (condición IVA código 5) |
| **Migrator** | Contenedor Docker que ejecuta `migrate.sh` (solo ecommerce) |
| **Omnicanal** | Mismo stock para web y POS en `product_variants.stock` |

---

*Documento generado a partir del análisis del código en el workspace `Radio coloni aHub`. Para cambios de arquitectura, actualizar este archivo junto con los commits relevantes.*
