import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

const MAX_META = 480 // Stripe metadata value limit is 500 chars — leave margin

function trim(v: string | null | undefined) {
  return (v ?? '').slice(0, MAX_META)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const planId = body.planId as string | undefined
  const interval = body.interval as string | undefined
  const shopId = body.shopId as string | undefined // present when upgrading an existing shop
  const shopDraft = body.shopDraft as Record<string, string> | undefined // present when creating a new shop

  if (!planId || (interval !== 'monthly' && interval !== 'yearly')) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!shopId && !shopDraft) {
    return NextResponse.json({ error: 'Missing shopId or shopDraft' }, { status: 400 })
  }

  const admin = createAdminClient()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

  try {
    const { data: plan } = await admin.from('plans').select('*').eq('id', planId).maybeSingle()
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const priceId = interval === 'yearly' ? plan.stripe_price_id_yearly : plan.stripe_price_id_monthly
    if (!priceId) {
      return NextResponse.json({ error: 'Този план все още няма зададена Stripe цена.' }, { status: 400 })
    }

    // ── Upgrade flow: shop already exists ──────────────────────────
    if (shopId) {
      const { data: shop } = await admin
        .from('shops')
        .select('id, owner_id, stripe_customer_id')
        .eq('id', shopId)
        .maybeSingle()

      if (!shop || shop.owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      let customerId = shop.stripe_customer_id as string | null
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { shop_id: shopId, user_id: user.id },
        })
        customerId = customer.id
        await admin.from('shops').update({ stripe_customer_id: customerId }).eq('id', shopId)
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${base}/dashboard/settings?upgraded=1`,
        cancel_url: `${base}/dashboard/settings?upgrade_cancelled=1`,
        metadata: { shop_id: shopId, plan_id: planId, interval },
        subscription_data: { metadata: { shop_id: shopId, plan_id: planId, interval } },
      })

      return NextResponse.json({ url: session.url })
    }

    // ── Create flow: no shop yet — create it only after payment ────
    if (!shopDraft?.name || !shopDraft?.slug) {
      return NextResponse.json({ error: 'Missing shop name/slug' }, { status: 400 })
    }

    // Reject duplicates early (shops.owner_id is unique)
    const { data: existing } = await admin.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Вече имаш магазин.' }, { status: 409 })
    }

    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/open-shop/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/open-shop?plan=${planId}&interval=${interval}&cancelled=1`,
      metadata: {
        mode: 'create_shop',
        owner_id: user.id,
        plan_id: planId,
        interval,
        name: trim(shopDraft.name),
        slug: trim(shopDraft.slug),
        description: trim(shopDraft.description),
        city: trim(shopDraft.city),
        phone: trim(shopDraft.phone),
        company_name: trim(shopDraft.company_name),
        eik: trim(shopDraft.eik),
        vat_number: trim(shopDraft.vat_number),
        company_address: trim(shopDraft.company_address),
      },
      subscription_data: {
        metadata: { owner_id: user.id, plan_id: planId, interval },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/checkout] failed', err)
    const message = err instanceof Error ? err.message : 'Неизвестна грешка при връзка със Stripe.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
