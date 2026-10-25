import { NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { validatePlanInput, assignPlanToShops } from '@/lib/shop-plan'

// Главният админ ръчно назначава план на магазин — без Stripe плащане
// (напр. подарен/комплиментарен план), с период "от — до". При изтичане на
// "до" планът се връща на Free автоматично (виж /api/cron/expire-plans).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, role } = await getCurrentUserAndRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const admin = createAdminClient()

  const v = await validatePlanInput(admin, body ?? {})
  if ('error' in v) return NextResponse.json({ error: v.error }, { status: 400 })

  const res = await assignPlanToShops(admin, [id], v)
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 })
  return NextResponse.json({ success: true, hidden: res.hidden })
}
