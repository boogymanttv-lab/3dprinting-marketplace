import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata ?? {}
        const planId = meta.plan_id
        const interval = meta.interval
        if (!planId) break

        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null

        let periodEnd: string | null = null
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          const currentPeriodEnd = (sub as unknown as { current_period_end: number }).current_period_end
          if (currentPeriodEnd) periodEnd = new Date(currentPeriodEnd * 1000).toISOString()
        }

        if (meta.mode === 'order_payment') {
          // Buyer paid with card for an order — create the order now, mirroring
          // the pay-before-create-shop pattern (nothing written to Supabase
          // before the payment actually succeeded).
          const paymentIntentId =
            typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null

          // Idempotency: webhook can be retried by Stripe.
          if (paymentIntentId) {
            const { data: alreadyExists } = await admin
              .from('orders')
              .select('id')
              .eq('stripe_payment_intent_id', paymentIntentId)
              .maybeSingle()
            if (alreadyExists) break
          }

          const quantity = parseInt(meta.quantity ?? '1', 10) || 1
          const listingPrice = parseFloat(meta.listing_price ?? '0') || 0
          const totalAmount = listingPrice * quantity
          const platformFee = Math.round(totalAmount * 0.10 * 100) / 100
          const sellerAmount = Math.round((totalAmount - platformFee) * 100) / 100

          await admin.from('orders').insert({
            listing_id: meta.listing_id,
            shop_id: meta.shop_id,
            buyer_id: meta.buyer_id,
            listing_title: meta.listing_title || '',
            listing_price: listingPrice,
            listing_image: meta.listing_image || null,
            quantity,
            total_amount: totalAmount,
            payment_method: 'card',
            stripe_payment_intent_id: paymentIntentId,
            platform_fee: platformFee,
            seller_amount: sellerAmount,
            shipping_address: meta.delivery_type === 'in_person'
              ? { delivery_type: 'in_person' }
              : { courier: meta.courier || null, delivery_type: meta.delivery_type || null, address: meta.address || '' },
            needs_invoice: meta.needs_invoice === 'true',
            status: 'new',
          })
          break
        }

        if (meta.mode === 'create_shop') {
          // New shop — create it now that payment succeeded.
          const ownerId = meta.owner_id
          if (!ownerId) break

          // Idempotency: webhook can be retried by Stripe.
          const { data: alreadyExists } = await admin
            .from('shops')
            .select('id')
            .eq('owner_id', ownerId)
            .maybeSingle()
          if (alreadyExists) break

          let slug = meta.slug || slugify(meta.name || 'shop') + '-' + Math.random().toString(36).slice(2, 6)
          // Guard against slug collisions
          const { data: slugTaken } = await admin.from('shops').select('id').eq('slug', slug).maybeSingle()
          if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 5)}`

          await admin.from('shops').insert({
            owner_id: ownerId,
            name: meta.name || 'Моят магазин',
            slug,
            description: meta.description || null,
            city: meta.city || null,
            phone: meta.phone || null,
            company_name: meta.company_name || null,
            eik: meta.eik || null,
            vat_number: meta.vat_number || null,
            company_address: meta.company_address || null,
            plan_id: planId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            billing_interval: interval ?? null,
            plan_expires_at: periodEnd,
          })
        } else if (meta.shop_id) {
          // Upgrade of an existing shop
          await admin.from('shops').update({
            plan_id: planId,
            stripe_subscription_id: subscriptionId,
            billing_interval: interval ?? null,
            plan_expires_at: periodEnd,
          }).eq('id', meta.shop_id)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const currentPeriodEnd = (sub as unknown as { current_period_end: number }).current_period_end
        if (currentPeriodEnd) {
          await admin.from('shops').update({
            plan_expires_at: new Date(currentPeriodEnd * 1000).toISOString(),
          }).eq('stripe_subscription_id', sub.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await admin.from('shops').update({
          plan_id: 'free',
          stripe_subscription_id: null,
          billing_interval: null,
          plan_expires_at: null,
        }).eq('stripe_subscription_id', sub.id)
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        await admin.from('shops').update({
          stripe_connect_onboarded: !!account.details_submitted,
          stripe_connect_charges_enabled: !!account.charges_enabled,
          stripe_connect_payouts_enabled: !!account.payouts_enabled,
        }).eq('stripe_connect_account_id', account.id)
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[stripe webhook] handler error', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
