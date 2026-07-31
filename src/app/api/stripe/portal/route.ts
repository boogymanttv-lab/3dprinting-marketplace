import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: shop } = await admin
    .from('shops')
    .select('stripe_customer_id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!shop?.stripe_customer_id) {
    return NextResponse.json({ error: 'Няма активен абонамент за управление.' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

  const session = await stripe.billingPortal.sessions.create({
    customer: shop.stripe_customer_id,
    return_url: `${base}/dashboard/settings`,
  })

  return NextResponse.json({ url: session.url })
}
