import { getDatabaseUrl } from "./database-url"
import { loadEnvFiles } from "./load-env"
import { drizzle } from "drizzle-orm/node-postgres"
import { hash } from "bcryptjs"
import * as schema from "./schema"
import { eq } from "drizzle-orm"
import { Pool } from "pg"

loadEnvFiles()

let pool: Pool
try {
  pool = new Pool({ connectionString: getDatabaseUrl() })
} catch (e) {
  console.error("❌", e instanceof Error ? e.message : e)
  process.exit(1)
}
const db = drizzle(pool, { schema })

const categoriesData = [
  { slug: "phones",       name: "Phones",       iconName: "Smartphone",   sortOrder: 1, parentId: null as string | null },
  { slug: "laptops",      name: "Laptops",       iconName: "Laptop",       sortOrder: 2, parentId: null },
  { slug: "smartwatches", name: "Smartwatches",  iconName: "Watch",        sortOrder: 3, parentId: null },
  { slug: "audio",        name: "Audio",         iconName: "Headphones",   sortOrder: 4, parentId: null },
  { slug: "gaming",       name: "Gaming",        iconName: "Gamepad2",     sortOrder: 5, parentId: null },
  { slug: "cameras",      name: "Cameras",       iconName: "Camera",       sortOrder: 6, parentId: null },
]

const subcategoriesData = [
  { slug: "gaming-consolas",  name: "Consolas",  iconName: "Gamepad2", sortOrder: 1, parentSlug: "gaming" },
  { slug: "gaming-accesorios", name: "Accesorios", iconName: "Gamepad2", sortOrder: 2, parentSlug: "gaming" },
]

const globalAttributesData = [
  { slug: "color",     name: "Color",     sortOrder: 1 },
  { slug: "talle",     name: "Talle",     sortOrder: 2 },
  { slug: "voltaje",   name: "Voltaje",   sortOrder: 3 },
  { slug: "capacidad", name: "Capacidad", sortOrder: 4 },
]

async function seed() {
  console.log("🌱 Seeding database (infra only, sin productos demo)...")

  for (const attr of globalAttributesData) {
    const existing = await db
      .select()
      .from(schema.globalAttributes)
      .where(eq(schema.globalAttributes.slug, attr.slug))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(schema.globalAttributes).values(attr)
      console.log(`  ✓ Attribute: ${attr.name}`)
    } else {
      console.log(`  ~ Attribute already exists: ${attr.name}`)
    }
  }

  const categoryMap: Record<string, string> = {}
  for (const cat of categoriesData) {
    const existing = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.slug, cat.slug))
      .limit(1)

    if (existing.length === 0) {
      const [inserted] = await db.insert(schema.categories).values(cat).returning()
      categoryMap[cat.slug] = inserted.id
      console.log(`  ✓ Category: ${cat.name}`)
    } else {
      categoryMap[cat.slug] = existing[0].id
      console.log(`  ~ Category already exists: ${cat.name}`)
    }
  }

  for (const sub of subcategoriesData) {
    const parentId = categoryMap[sub.parentSlug]
    if (!parentId) continue
    const existing = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.slug, sub.slug))
      .limit(1)

    const row = {
      slug:      sub.slug,
      name:      sub.name,
      iconName:  sub.iconName,
      sortOrder: sub.sortOrder,
      parentId,
    }

    if (existing.length === 0) {
      const [inserted] = await db.insert(schema.categories).values(row).returning()
      categoryMap[sub.slug] = inserted.id
      console.log(`  ✓ Subcategory: ${sub.name}`)
    } else {
      categoryMap[sub.slug] = existing[0].id
      console.log(`  ~ Subcategory already exists: ${sub.name}`)
    }
  }

  const existingSupplier = await db
    .select()
    .from(schema.suppliers)
    .where(eq(schema.suppliers.slug, "sin-asignar"))
    .limit(1)

  if (existingSupplier.length === 0) {
    await db.insert(schema.suppliers).values({
      name:  "Proveedor sin asignar",
      slug:  "sin-asignar",
      notes: "Proveedor por defecto del sistema",
    })
    console.log("  ✓ Supplier: Proveedor sin asignar")
  } else {
    console.log("  ~ Supplier already exists: Proveedor sin asignar")
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@radiocolonia.local"
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin1234!"

  const existingAdmin = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, adminEmail))
    .limit(1)

  if (existingAdmin.length === 0) {
    const passwordHash = await hash(adminPassword, 12)
    await db.insert(schema.users).values({
      email:        adminEmail,
      name:         "Admin Radio Colonia",
      passwordHash,
      role:         "admin",
    })
    console.log(`  ✓ Admin user: ${adminEmail}`)
  } else {
    console.log(`  ~ Admin user already exists: ${adminEmail}`)
  }

  console.log("✅ Seed completed!")
  await pool.end()
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err)
  pool.end()
  process.exit(1)
})
