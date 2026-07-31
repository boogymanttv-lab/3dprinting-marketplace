import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
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
        const shopId = session.metadata?.shop_id
        const planId = session.metadata?.plan_id
        const interval = session.metadata?.interval

        if (shopId && planId) {
          const subscriptionId =
            typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null

          let periodEnd: string | null = null
          if (subscriptionId) {
            const sub = await stripe.subscriptions.retrieve(subscriptionId)
            const currentPeriodEnd = (sub as unknown as { current_period_end: number }).current_period_end
            if (currentPeriodEnd) periodEnd = new Date(currentPeriodEnd * 1000).toISOString()
          }

          await admin.from('shops').update({
            plan_id: planId,
            stripe_subscription_id: subscriptionId,
            billing_interval: interval ?? null,
            plan_expires_at: periodEnd,
          }).eq('id', shopId)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const shopId = sub.metadata?.shop_id
        const currentPeriodEnd = (sub as unknown as { current_period_end: number }).current_period_end
        if (shopId && currentPeriodEnd) {
          await admin.from('shops').update({
            plan_expires_at: new Date(currentPeriodEnd * 1000).toISOString(),
          }).eq('id', shopId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const shopId = sub.metadata?.shop_id
        if (shopId) {
          await admin.from('shops').update({
            plan_id: 'free',
            stripe_subscription_id: null,
            billing_interval: null,
            plan_expires_at: null,
          }).eq('id', shopId)
        }
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
