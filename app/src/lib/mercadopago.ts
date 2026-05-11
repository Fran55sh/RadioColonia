import { MercadoPagoConfig, Preference, Payment } from "mercadopago"

const accessToken = process.env.MP_ACCESS_TOKEN ?? ""

export const mpClient = new MercadoPagoConfig({
  accessToken,
  options: { timeout: 5000 },
})

export const mpPreference = new Preference(mpClient)
export const mpPayment    = new Payment(mpClient)

export type MpItem = {
  id:          string
  title:       string
  quantity:    number
  unit_price:  number
  currency_id: string
  picture_url?: string
}
