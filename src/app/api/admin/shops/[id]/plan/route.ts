import { NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Главният админ ръчно назначава план на магазин — без Stripe плащане
// (напр. подарен/комплиментарен план). Не пипа stripe_subscription_id/
// stripe_customer_id — ако магазинът вече има реален абонамент, той не
// се пипа тук; просто billing_interval/plan_expires_at се изчистват,
// защото плана вече не е обвързан с реално периодично плащане.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, role } = await getCurrentUserAndRole()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const planId = body?.plan_id as string | undefined
  if (!planId) return NextResponse.json({ error: 'Missing plan_id' }, { status: 400 })

  const admin = createAdminClient()

  const { data: plan } = await admin.from('plans').select('id').eq('id', planId).maybeSingle()
  if (!plan) return NextResponse.json({ error: 'Няма такъв план.' }, { status: 400 })

  const { error } = await admin.from('shops').update({
    plan_id: planId,
    billing_interval: null,
    plan_expires_at: null,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
