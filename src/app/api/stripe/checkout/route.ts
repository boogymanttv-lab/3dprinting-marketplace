import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const shopId = body?.shopId as string | undefined
  const planId = body?.planId as string | undefined
  const interval = body?.interval as string | undefined

  if (!shopId || !planId || (interval !== 'monthly' && interval !== 'yearly')) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify shop ownership
  const { data: shop } = await admin
    .from('shops')
    .select('id, owner_id, stripe_customer_id')
    .eq('id', shopId)
    .maybeSingle()

  if (!shop || shop.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: plan } = await admin
    .from('plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle()

  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const priceId = interval === 'yearly' ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly
  if (!priceId) {
    return NextResponse.json({ error: 'Този план все още няма зададена Stripe цена.' }, { status: 400 })
  }

  // Reuse or create Stripe customer
  let customerId = shop.stripe_customer_id as string | null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { shop_id: shopId, user_id: user.id },
    })
    customerId = customer.id
    await admin.from('shops').update({ stripe_customer_id: customerId }).eq('id', shopId)
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/dashboard/settings?upgraded=1`,
    cancel_url: `${base}/dashboard/settings?upgrade_cancelled=1`,
    metadata: { shop_id: shopId, plan_id: planId, interval },
    subscription_data: {
      metadata: { shop_id: shopId, plan_id: planId, interval },
    },
  })

  return NextResponse.json({ url: session.url })
}
