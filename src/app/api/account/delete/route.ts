import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

// Permanent account deletion — cancels billing, removes stored payment
// methods, then deletes the auth user (cascades profile -> shop -> listings
// -> orders/reviews/favorites/messages per FK rules).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  try {
    const { data: shop } = await admin
      .from('shops')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (shop?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(shop.stripe_subscription_id)
      } catch (err) {
        console.error('[account/delete] failed to cancel subscription', err)
      }
    }

    if (shop?.stripe_customer_id) {
      try {
        await stripe.customers.del(shop.stripe_customer_id)
      } catch (err) {
        console.error('[account/delete] failed to delete Stripe customer', err)
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) {
      console.error('[account/delete] failed to delete user', error)
      return NextResponse.json({ error: 'Грешка при изтриване на акаунта.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[account/delete] unexpected error', err)
    return NextResponse.json({ error: 'Грешка при изтриване на акаунта.' }, { status: 500 })
  }
}
