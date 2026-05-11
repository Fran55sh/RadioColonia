import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

// ── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "admin"])

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "shipped",
  "delivered",
  "cancelled",
])

// ── Auth.js tables ────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         text("name"),
  email:        text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image:        text("image"),
  passwordHash: text("password_hash"),
  role:         userRoleEnum("role").default("user").notNull(),
  createdAt:    timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
})

export const accounts = pgTable(
  "accounts",
  {
    userId:            uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type:              text("type").$type<AdapterAccountType>().notNull(),
    provider:          text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token:     text("refresh_token"),
    access_token:      text("access_token"),
    expires_at:        integer("expires_at"),
    token_type:        text("token_type"),
    scope:             text("scope"),
    id_token:          text("id_token"),
    session_state:     text("session_state"),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  })
)

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId:       uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires:      timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token:      text("token").notNull(),
    expires:    timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  })
)

// ── Categories ────────────────────────────────────────────────────────────────

export const categories = pgTable(
  "categories",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    slug:      text("slug").notNull(),
    name:      text("name").notNull(),
    iconName:  text("icon_name").notNull().default("tag"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("categories_slug_idx").on(table.slug),
  })
)

// ── Products ──────────────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id:            uuid("id").primaryKey().defaultRandom(),
    slug:          text("slug").notNull(),
    name:          text("name").notNull(),
    description:   text("description").notNull().default(""),
    price:         numeric("price", { precision: 10, scale: 2 }).notNull(),
    originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
    image:         text("image").notNull().default("/products/placeholder.png"),
    badge:         text("badge"),
    stock:         integer("stock").notNull().default(0),
    rating:        numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
    reviews:       integer("reviews").notNull().default(0),
    categoryId:    uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    isActive:      boolean("is_active").notNull().default(true),
    createdAt:     timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt:     timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx:       uniqueIndex("products_slug_idx").on(table.slug),
    categoryIdx:   index("products_category_idx").on(table.categoryId),
    isActiveIdx:   index("products_is_active_idx").on(table.isActive),
  })
)

export const productImages = pgTable("product_images", {
  id:        uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url:       text("url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
})

// ── Cart ──────────────────────────────────────────────────────────────────────

export const carts = pgTable(
  "carts",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    userId:    uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    anonToken: text("anon_token"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    anonTokenIdx: uniqueIndex("carts_anon_token_idx").on(table.anonToken),
    userIdx:      index("carts_user_idx").on(table.userId),
  })
)

export const cartItems = pgTable(
  "cart_items",
  {
    id:        uuid("id").primaryKey().defaultRandom(),
    cartId:    uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    quantity:  integer("quantity").notNull().default(1),
  },
  (table) => ({
    uniqueCartProduct: uniqueIndex("cart_items_cart_product_idx").on(table.cartId, table.productId),
  })
)

// ── Addresses ─────────────────────────────────────────────────────────────────

export const addresses = pgTable("addresses", {
  id:       uuid("id").primaryKey().defaultRandom(),
  userId:   uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone:    text("phone").notNull(),
  street:   text("street").notNull(),
  city:     text("city").notNull(),
  province: text("province").notNull(),
  zip:      text("zip").notNull(),
  country:  text("country").notNull().default("Argentina"),
})

// ── Orders ────────────────────────────────────────────────────────────────────

export const orders = pgTable(
  "orders",
  {
    id:              uuid("id").primaryKey().defaultRandom(),
    userId:          uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status:          orderStatusEnum("status").notNull().default("pending"),
    subtotal:        numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    shipping:        numeric("shipping", { precision: 10, scale: 2 }).notNull().default("0"),
    total:           numeric("total", { precision: 10, scale: 2 }).notNull(),
    mpPreferenceId:  text("mp_preference_id"),
    mpPaymentId:     text("mp_payment_id"),
    addressId:       uuid("address_id").references(() => addresses.id, { onDelete: "set null" }),
    // Snapshot of shipping address for non-registered users or address changes
    shippingFullName: text("shipping_full_name"),
    shippingPhone:    text("shipping_phone"),
    shippingStreet:   text("shipping_street"),
    shippingCity:     text("shipping_city"),
    shippingProvince: text("shipping_province"),
    shippingZip:      text("shipping_zip"),
    shippingCountry:  text("shipping_country"),
    createdAt:       timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt:       timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx:   index("orders_user_idx").on(table.userId),
    statusIdx: index("orders_status_idx").on(table.status),
  })
)

export const orderItems = pgTable("order_items", {
  id:            uuid("id").primaryKey().defaultRandom(),
  orderId:       uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId:     uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  nameSnapshot:  text("name_snapshot").notNull(),
  priceSnapshot: numeric("price_snapshot", { precision: 10, scale: 2 }).notNull(),
  quantity:      integer("quantity").notNull(),
})

// ── Types ─────────────────────────────────────────────────────────────────────

export type User            = typeof users.$inferSelect
export type NewUser         = typeof users.$inferInsert
export type Category        = typeof categories.$inferSelect
export type NewCategory     = typeof categories.$inferInsert
export type Product         = typeof products.$inferSelect
export type NewProduct      = typeof products.$inferInsert
export type Cart            = typeof carts.$inferSelect
export type CartItem        = typeof cartItems.$inferSelect
export type Order           = typeof orders.$inferSelect
export type NewOrder        = typeof orders.$inferInsert
export type OrderItem       = typeof orderItems.$inferSelect
