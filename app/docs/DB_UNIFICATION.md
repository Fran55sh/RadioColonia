# Unificación de base de datos — Radio Colonia

## Fuente de verdad

La base PostgreSQL del **ecommerce** (`radiocolonia_db` en producción) es la única fuente de verdad para:

- Catálogo: `products`, `product_variants`, `product_images`
- Proveedores: `suppliers`, `product_supplier_offers`
- Pedidos web: `orders`, `order_items`, `order_status_history`
- Auth y carrito: `users`, `carts`, etc.

El **POS** comparte esa misma base y solo escribe en tablas operativas con prefijo `pos_*`.

## Mapping catálogo (POS API ↔ ecommerce)

| Campo API POS (`codigo_interno`) | Tabla/columna ecommerce |
|----------------------------------|-------------------------|
| `codigo_interno` | `product_variants.sku` (normalizado a minúsculas en caja) |
| `nombre` | `products.name` (+ atributos de variante si aplica) |
| `precio_venta` | `COALESCE(product_variants.sale_price, products.price)` |
| `stock` | `product_variants.stock` |
| `alicuota_iva` | Constante `21` (ecommerce no modela IVA por ítem aún) |
| `costo` (interno) | `product_supplier_offers.cost_price` del proveedor `is_preferred`, o `product_variants.cost_price` |

## Mapping proveedores

| POS (legacy) | Ecommerce |
|--------------|-----------|
| `proveedores.id` (SERIAL) | `suppliers.id` (UUID) |
| `proveedores.razon_social` | `suppliers.name` |
| `proveedores_productos` | `product_supplier_offers` (por `variant_id` + `supplier_id`) |
| `codigo_proveedor` | `product_supplier_offers.supplier_code` |

## Mapping ventas

| POS (legacy) | Unificado |
|--------------|-----------|
| `ventas` | `pos_ventas` |
| `lineas_venta` | `pos_lineas_venta` (con `variant_id`, snapshots de SKU/nombre/costo) |
| `iva_registro` | `pos_iva_registro` |
| `clientes` | `pos_clientes` |
| `ordenes_compra*` | `pos_ordenes_compra`, `pos_ordenes_compra_lineas` |
| `facturas_compra` | `pos_facturas_compra` |

Las ventas web siguen en `orders` / `order_items`. No se mezclan con `pos_ventas` en esta etapa.

## Stock omnicanal

- **Checkout web:** valida stock al crear pedido; descuenta al confirmar (`product_variants` o `products`).
- **POS:** descuenta `product_variants.stock` al completar la venta (transacción con `FOR UPDATE`).

Ambos canales comparten el mismo campo de stock por SKU.

## Variables de conexión

| App | Variables |
|-----|-----------|
| Ecommerce | `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` |
| POS | `DATABASE_URL` **o** las mismas `DB_*` (el backend arma la URL) |

En Docker unificado: `DB_NAME=radiocolonia_db` para ambos servicios.

## Migraciones

1. **Ecommerce (única autoridad):** `src/db/migrations/*.sql` (incl. `0005_pos_operational_tables.sql` para `pos_*`) + `drizzle-kit push` vía [`migrate.sh`](../migrate.sh). Debe correr en cada deploy del ecommerce.
2. **POS:** solo verificación al arrancar (`npm run db:verify`). **Sin DDL** ni seed de catálogo en producción.
