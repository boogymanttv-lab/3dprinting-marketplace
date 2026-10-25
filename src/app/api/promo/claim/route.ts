import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActivePromo } from '@/lib/promo'

// Закача промо линк към току-що регистриран потребител.
// Важи само за нови акаунти без магазин (създадени през последните 2 часа).
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const code = String(body?.code ?? '').trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const admin = createAdminClient()

  // Вече има промо → нищо ново
  const existing = await getActivePromo(admin, user.id)
  if (existing) return NextResponse.json({ claimed: true, ...existing })
  const { data: anyClaim } = await admin.from('promo_claims').select('user_id').eq('user_id', user.id).maybeSingle()
  if (anyClaim) return NextResponse.json({ claimed: false, reason: 'already_used' })

  const isNew = Date.now() - new Date(user.created_at).getTime() < 2 * 60 * 60 * 1000
  const { data: shop } = await admin.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
  if (!isNew || shop) return NextResponse.json({ claimed: false, reason: 'not_new' })

  const { data: link } = await admin
    .from('promo_links')
    .select('id, plan_id, days, max_uses, uses, valid_until, is_active')
    .eq('code', code)
    .maybeSingle()

  if (!link || !link.is_active) return NextResponse.json({ claimed: false, reason: 'invalid' })
  if (link.valid_until && new Date(link.valid_until) < new Date()) return NextResponse.json({ claimed: false, reason: 'expired' })
  if (link.max_uses !== null && link.uses >= link.max_uses) return NextResponse.json({ claimed: false, reason: 'full' })

  // Оптимистично заключване на брояча (защита при едновременни регистрации)
  const { data: bumped } = await admin
    .from('promo_links')
    .update({ uses: link.uses + 1 })
    .eq('id', link.id)
    .eq('uses', link.uses)
    .select('id')
  if (!bumped || bumped.length === 0) return NextResponse.json({ claimed: false, reason: 'busy' })

  const { error } = await admin.from('promo_claims').insert({ user_id: user.id, promo_link_id: link.id })
  if (error) {
    await admin.from('promo_links').update({ uses: link.uses }).eq('id', link.id)
    return NextResponse.json({ claimed: false, reason: 'error' })
  }

  const active = await getActivePromo(admin, user.id)
  return NextResponse.json({ claimed: true, ...active })
}
