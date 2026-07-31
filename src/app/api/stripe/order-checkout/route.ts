import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

const MAX_META = 480

function trim(v: string | null | undefined) {
  return (v ?? '').slice(0, MAX_META)
}

// Плащане с карта за поръчка купувач → продавач, чрез Stripe Connect.
// Поръчката се записва в базата едва след успешно плащане (в webhook-а),
// по същия начин както при създаването на платен магазин.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const listingId = body.listingId as string | undefined
  const quantity = Math.max(1, parseInt(body.quantity, 10) || 1)
  const deliveryType = body.deliveryType as 'office' | 'address' | 'in_person' | undefined
  const courier = body.courier as string | undefined
  const address = body.address as string | undefined
  const needsInvoice = !!body.needsInvoice

  if (!listingId || !deliveryType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (deliveryType !== 'in_person' && !address?.trim()) {
    return NextResponse.json({ error: 'Missing address' }, { status: 400 })
  }

  const admin = createAdminClient()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

  try {
    const { data: listing } = await admin
      .from('listings')
      .select('id, title, price, currency, images, quantity, is_active, shop_id')
      .eq('id', listingId)
      .maybeSingle()

    if (!listing || !listing.is_active) {
      return NextResponse.json({ error: 'Обявата не е налична.' }, { status: 404 })
    }
    if (quantity > listing.quantity) {
      return NextResponse.json({ error: 'Няма достатъчно наличност.' }, { status: 400 })
    }

    const { data: shop } = await admin
      .from('shops')
      .select('id, is_active, stripe_connect_account_id, stripe_connect_charges_enabled')
      .eq('id', listing.shop_id)
      .maybeSingle()

    if (!shop || !shop.is_active) {
      return NextResponse.json({ error: 'Магазинът не е активен.' }, { status: 404 })
    }
    if (!shop.stripe_connect_account_id || !shop.stripe_connect_charges_enabled) {
      return NextResponse.json({ error: 'Продавачът все още не е активирал плащания с карта.' }, { status: 400 })
    }

    const currency = (listing.currency || 'BGN').toLowerCase()
    const unitAmount = Math.round(listing.price * 100)
    const totalAmountCents = unitAmount * quantity
    const applicationFeeAmount = Math.round(totalAmountCents * 0.10)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user.email ?? undefined,
      line_items: [{
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: {
            name: listing.title,
            images: listing.images?.[0] ? [listing.images[0]] : undefined,
          },
        },
        quantity,
      }],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: shop.stripe_connect_account_id },
      },
      success_url: `${base}/dashboard/orders?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/listings/${listingId}?order_cancelled=1`,
      metadata: {
        mode: 'order_payment',
        listing_id: listing.id,
        shop_id: shop.id,
        buyer_id: user.id,
        quantity: String(quantity),
        listing_title: trim(listing.title),
        listing_price: String(listing.price),
        listing_image: trim(listing.images?.[0] ?? ''),
        delivery_type: deliveryType,
        courier: trim(courier),
        address: trim(address),
        needs_invoice: needsInvoice ? 'true' : 'false',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[stripe/order-checkout] failed', err)
    const message = err instanceof Error ? err.message : 'Неизвестна грешка при връзка със Stripe.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
