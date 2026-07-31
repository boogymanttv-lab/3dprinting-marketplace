import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

// Линк към Stripe Express dashboard-а на продавача (виж баланс, тегления и т.н.)
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  try {
    const { data: shop } = await admin
      .from('shops')
      .select('stripe_connect_account_id')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!shop?.stripe_connect_account_id) {
      return NextResponse.json({ error: 'Няма свързан Stripe акаунт.' }, { status: 404 })
    }

    const link = await stripe.accounts.createLoginLink(shop.stripe_connect_account_id)
    return NextResponse.json({ url: link.url })
  } catch (err) {
    console.error('[stripe/connect/dashboard] failed', err)
    const message = err instanceof Error ? err.message : 'Грешка при връзка със Stripe.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
