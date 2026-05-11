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
  { slug: "phones",       name: "Phones",       iconName: "Smartphone",   sortOrder: 1 },
  { slug: "laptops",      name: "Laptops",       iconName: "Laptop",       sortOrder: 2 },
  { slug: "smartwatches", name: "Smartwatches",  iconName: "Watch",        sortOrder: 3 },
  { slug: "audio",        name: "Audio",         iconName: "Headphones",   sortOrder: 4 },
  { slug: "gaming",       name: "Gaming",        iconName: "Gamepad2",     sortOrder: 5 },
  { slug: "cameras",      name: "Cameras",       iconName: "Camera",       sortOrder: 6 },
]

const productsData = [
  {
    slug:          "pro-max-smartphone-256gb",
    name:          "Pro Max Smartphone 256GB",
    description:   "The latest flagship smartphone with 256GB storage, triple camera system, and all-day battery life.",
    price:         "999.99",
    originalPrice: "1199.99",
    image:         "/products/product-phone.png",
    badge:         "Bestseller",
    stock:         50,
    rating:        "4.8",
    reviews:       2341,
    categorySlug:  "phones",
  },
  {
    slug:          "ultrabook-pro-14-m3",
    name:          'UltraBook Pro 14" M3 Chip',
    description:   "Ultra-thin laptop with the M3 chip for incredible performance and up to 18 hours of battery life.",
    price:         "1499.99",
    originalPrice: null,
    image:         "/products/product-laptop.png",
    badge:         "New",
    stock:         30,
    rating:        "4.9",
    reviews:       1823,
    categorySlug:  "laptops",
  },
  {
    slug:          "smart-watch-series-x",
    name:          "Smart Watch Series X",
    description:   "Advanced smartwatch with health monitoring, GPS, and 18-hour battery life.",
    price:         "399.99",
    originalPrice: "449.99",
    image:         "/products/product-watch.png",
    badge:         null,
    stock:         75,
    rating:        "4.7",
    reviews:       987,
    categorySlug:  "smartwatches",
  },
  {
    slug:          "pro-wireless-earbuds-anc",
    name:          "Pro Wireless Earbuds ANC",
    description:   "Industry-leading active noise cancellation with premium sound quality and 30-hour total battery.",
    price:         "179.99",
    originalPrice: "249.99",
    image:         "/products/product-earbuds.png",
    badge:         "Sale",
    stock:         120,
    rating:        "4.6",
    reviews:       3456,
    categorySlug:  "audio",
  },
  {
    slug:          "elite-gaming-controller-pro",
    name:          "Elite Gaming Controller Pro",
    description:   "Professional gaming controller with customizable buttons, hair-trigger locks, and up to 40 hours battery.",
    price:         "129.99",
    originalPrice: null,
    image:         "/products/product-controller.png",
    badge:         null,
    stock:         60,
    rating:        "4.5",
    reviews:       2109,
    categorySlug:  "gaming",
  },
  {
    slug:          "studio-headphones-xm5",
    name:          "Studio Headphones XM5",
    description:   "Premium over-ear headphones with 30-hour battery, multipoint connection, and exceptional noise cancellation.",
    price:         "279.99",
    originalPrice: "399.99",
    image:         "/products/hero-headphones.png",
    badge:         "-30%",
    stock:         80,
    rating:        "4.9",
    reviews:       4521,
    categorySlug:  "audio",
  },
]

async function seed() {
  console.log("🌱 Seeding database...")

  // Categories
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

  // Products
  for (const prod of productsData) {
    const { categorySlug, ...prodData } = prod
    const existing = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, prod.slug))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(schema.products).values({
        ...prodData,
        categoryId: categoryMap[categorySlug],
      })
      console.log(`  ✓ Product: ${prod.name}`)
    } else {
      console.log(`  ~ Product already exists: ${prod.name}`)
    }
  }

  // Admin user
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
