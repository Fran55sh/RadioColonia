import { NextResponse } from "next/server"
import { createReadStream, existsSync, statSync } from "fs"
import path from "path"
import { Readable } from "stream"
import { pipeline } from "stream/promises"

/**
 * Next.js solo indexa `public/` al arrancar; los archivos subidos después no forman
 * parte del Set interno y devuelven 404. Este handler sirve dinámicamente todo bajo
 * `public/uploads/` (p. ej. `/uploads/products/<uuid>.webp`).
 */
export const dynamic = "force-dynamic"

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads")

function contentTypeForExtension(ext: string): string {
  const e = ext.toLowerCase()
  const map: Record<string, string> = {
    ".webp": "image/webp",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".svg":  "image/svg+xml",
    ".avif": "image/avif",
  }
  return map[e] ?? "application/octet-stream"
}

function resolveSafeUnderUploadRoot(segments: string[]): string | null {
  if (!segments.length) return null
  for (const s of segments) {
    if (s.includes("\0") || s === "..") return null
  }
  const resolved = path.resolve(UPLOAD_ROOT, ...segments)
  const rootResolved = path.resolve(UPLOAD_ROOT)
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + path.sep)) {
    return null
  }
  return resolved
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path: segments } = await context.params
  if (!segments?.length) {
    return new NextResponse(null, { status: 404 })
  }

  const fsPath = resolveSafeUnderUploadRoot(segments)
  if (!fsPath) {
    return new NextResponse(null, { status: 400 })
  }

  if (!existsSync(fsPath)) {
    return new NextResponse(null, { status: 404 })
  }

  try {
    const st = statSync(fsPath)
    if (!st.isFile()) {
      return new NextResponse(null, { status: 404 })
    }
  } catch {
    return new NextResponse(null, { status: 404 })
  }

  const ext = path.extname(fsPath)
  const stream = createReadStream(fsPath)
  const webStream = Readable.toWeb(stream) as ReadableStream

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentTypeForExtension(ext),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
