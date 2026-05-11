import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { auth } from "@/lib/auth"
import { randomUUID } from "crypto"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file     = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const bytes  = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Use sharp to process the image
    const sharp = (await import("sharp")).default

    const webpBuffer = await sharp(buffer)
      .resize(800, 800, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()

    const filename  = `${randomUUID()}.webp`
    const uploadDir = path.join(process.cwd(), "public", "uploads", "products")

    await mkdir(uploadDir, { recursive: true })
    await writeFile(path.join(uploadDir, filename), webpBuffer)

    const url = `/uploads/products/${filename}`
    return NextResponse.json({ url })
  } catch (err) {
    console.error("Upload error:", err)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
