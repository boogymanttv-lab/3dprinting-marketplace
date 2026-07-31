import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'https://3dprintingbg.com'))

  // Verify ownership
  const { data: shop } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!shop) return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL ?? 'https://3dprintingbg.com'))

  // Hard delete — FK is SET NULL so orders are preserved without the listing reference
  const admin = createAdminClient()
  const { error } = await admin.from('listings').delete().eq('id', id).eq('shop_id', shop.id)

  if (error) {
    console.error('[listings/delete]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3dprintingbg.com'
  const referer = _req.headers.get('referer') || `${base}/dashboard/listings`
  return NextResponse.redirect(new URL(referer, base), { status: 303 })
}
