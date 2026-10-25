import { NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePlanInput, assignPlanToShops } from '@/lib/shop-plan'

export const maxDuration = 60

// Масово задаване на план + период на избрани магазини (само super_admin).
// Магазини с активен Stripe абонамент се ПРОПУСКАТ — те плащат и планът им
// се управлява от Stripe, не бива да се презаписва масово.
export async function POST(request: Request) {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const shopIds: string[] = Array.isArray(body?.shop_ids) ? body.shop_ids : []
  if (shopIds.length === 0) return NextResponse.json({ error: 'Не са избрани магазини.' }, { status: 400 })

  const admin = createAdminClient()
  const v = await validatePlanInput(admin, body)
  if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 })

  const { data: shops } = await admin
    .from('shops')
    .select('id, stripe_subscription_id')
    .in('id', shopIds)

  const eligible = (shops ?? []).filter(s => !s.stripe_subscription_id).map(s => s.id)
  const skipped = shopIds.length - eligible.length

  if (eligible.length === 0) {
    return NextResponse.json({ error: 'Всички избрани магазини имат активен Stripe абонамент.' }, { status: 400 })
  }

  const res = await assignPlanToShops(admin, eligible, v)
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 })

  return NextResponse.json({ updated: eligible.length, skipped, hidden: res.hidden })
}
