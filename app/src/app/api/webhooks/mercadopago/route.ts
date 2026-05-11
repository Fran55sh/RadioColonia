import { NextResponse } from "next/server"
import { db } from "@/db"
import { orders } from "@/db/schema"
import { eq } from "drizzle-orm"
import { mpPayment } from "@/lib/mercadopago"
import { createHmac } from "crypto"

function verifySignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  ts: string
) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return true // skip in dev if not set

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`
  const [, hash]  = xSignature.split(",v1=")
  if (!hash) return false

  const expected = createHmac("sha256", secret).update(manifest).digest("hex")
  return expected === hash
}

export async function POST(req: Request) {
  try {
    const url         = new URL(req.url)
    const type        = url.searchParams.get("type")
    const dataId      = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? ""
    const xSignature  = req.headers.get("x-signature") ?? ""
    const xRequestId  = req.headers.get("x-request-id") ?? ""
    const ts          = xSignature.split(",")[0]?.split("=")[1] ?? ""

    // Only handle payment notifications
    if (type !== "payment") {
      return NextResponse.json({ ok: true })
    }

    if (!verifySignature(xSignature, xRequestId, dataId, ts)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // Fetch payment from MP
    const payment = await mpPayment.get({ id: dataId })

    const externalRef  = payment.external_reference
    const mpStatus     = payment.status // approved | rejected | pending | in_process
    const mpPaymentId  = String(payment.id)

    if (!externalRef) {
      return NextResponse.json({ ok: true })
    }

    const newStatus =
      mpStatus === "approved"    ? "paid"
      : mpStatus === "rejected"  ? "failed"
      : "pending"

    // Idempotent update
    await db
      .update(orders)
      .set({
        status:      newStatus,
        mpPaymentId,
        updatedAt:   new Date(),
      })
      .where(eq(orders.id, externalRef))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("MP webhook error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
