import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!shop) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  // Get current state
  const { data: listing } = await supabase
    .from('listings')
    .select('is_active')
    .eq('id', id)
    .eq('shop_id', shop.id)
    .maybeSingle()

  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const base0 = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

  // Активиране на скрита обява — не позволяваме да надвишава лимита на плана
  if (!listing.is_active) {
    const { data: s } = await admin.from('shops').select('plan:plans(max_listings)').eq('id', shop.id).maybeSingle()
    const plan = (Array.isArray(s?.plan) ? s?.plan[0] : s?.plan) as { max_listings: number | null } | null
    const max = plan?.max_listings ?? null
    if (max !== null) {
      const { count } = await admin
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .eq('is_active', true)
        .eq('is_request_order', false)
      if ((count ?? 0) >= max) {
        return NextResponse.redirect(new URL('/dashboard/listings?limit=1', base0), { status: 303 })
      }
    }
  }

  await admin
    .from('listings')
    .update({ is_active: !listing.is_active })
    .eq('id', id)
    .eq('shop_id', shop.id)

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'
  const referer = req.headers.get('referer') || `${base}/dashboard/listings`
  return NextResponse.redirect(new URL(referer, base), { status: 303 })
}
