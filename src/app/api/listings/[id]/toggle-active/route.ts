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
    .single()

  if (!shop) return NextResponse.json({ error: 'No shop' }, { status: 403 })

  // Get current state
  const { data: listing } = await supabase
    .from('listings')
    .select('is_active')
    .eq('id', id)
    .eq('shop_id', shop.id)
    .single()

  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  await admin
    .from('listings')
    .update({ is_active: !listing.is_active })
    .eq('id', id)
    .eq('shop_id', shop.id)

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3dprintingbg.com'
  const referer = req.headers.get('referer') || `${base}/dashboard/listings`
  return NextResponse.redirect(new URL(referer, base), { status: 303 })
}
