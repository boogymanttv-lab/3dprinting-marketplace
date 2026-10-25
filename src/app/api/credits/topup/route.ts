import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import { TOPUP_PACKAGES } from '@/lib/credits'

// Зареждане на кредити чрез Stripe Checkout (еднократно плащане).
// Кредитите се добавят от webhook-а след успешно плащане.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const pkg = TOPUP_PACKAGES.find(p => p.id === body?.packageId)
  if (!pkg) return NextResponse.json({ error: 'Невалиден пакет.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: shop } = await admin.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
  if (!shop) return NextResponse.json({ error: 'Кредитите са за магазини.' }, { status: 403 })

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'
  const total = pkg.credits + pkg.bonus

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: pkg.eur * 100,
          product_data: {
            name: `${total.toLocaleString('bg-BG')} кредита — 3DPrintingBG`,
            description: pkg.bonus > 0 ? `${pkg.credits} + ${pkg.bonus} бонус кредита` : undefined,
          },
        },
        quantity: 1,
      }],
      success_url: `${base}/dashboard/credits?topup=success`,
      cancel_url: `${base}/dashboard/credits?topup=cancelled`,
      metadata: { mode: 'credits_topup', user_id: user.id, credits: String(total), package_id: pkg.id },
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[credits/topup] failed', err)
    return NextResponse.json({ error: 'Грешка при връзка със Stripe.' }, { status: 500 })
  }
}
