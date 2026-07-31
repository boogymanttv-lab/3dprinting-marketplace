import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

// Създава (или преизползва) Stripe Express акаунт за продавача и връща
// линк към onboarding формата на Stripe.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

  try {
    const { data: shop } = await admin
      .from('shops')
      .select('id, owner_id, stripe_connect_account_id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!shop) return NextResponse.json({ error: 'Нямаш магазин.' }, { status: 404 })

    let accountId = shop.stripe_connect_account_id as string | null

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'BG',
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { shop_id: shop.id, owner_id: user.id },
      })
      accountId = account.id
      await admin.from('shops').update({ stripe_connect_account_id: accountId }).eq('id', shop.id)
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/api/stripe/connect/onboard`,
      return_url: `${base}/dashboard/settings?connect_return=1`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url })
  } catch (err) {
    console.error('[stripe/connect/onboard] failed', err)
    const message = err instanceof Error ? err.message : 'Грешка при връзка със Stripe.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET — за refresh_url-а на Stripe (линкът е изтекъл), просто пренасочва
// обратно към нов onboarding линк.
export async function GET() {
  const res = await POST()
  const data = await res.json()
  if (data.url) {
    return NextResponse.redirect(data.url)
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'
  return NextResponse.redirect(`${base}/dashboard/settings?connect_error=1`)
}
