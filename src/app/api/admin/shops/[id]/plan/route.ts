import { NextResponse } from 'next/server'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyPlanLimitAndNotify } from '@/lib/plan-limits'

// Главният админ ръчно назначава план на магазин — без Stripe плащане
// (напр. подарен/комплиментарен план), с период "от — до". Не пипа
// stripe_subscription_id/stripe_customer_id. При изтичане на "до" планът
// се връща на Free автоматично (виж /api/cron/expire-plans).
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

  let startsAt: string | null = null
  let expiresAt: string | null = null

  if (planId !== 'free') {
    const from = body?.starts_at ? new Date(body.starts_at) : new Date()
    const to = body?.expires_at ? new Date(body.expires_at) : null
    if (isNaN(from.getTime()) || (to && isNaN(to.getTime()))) {
      return NextResponse.json({ error: 'Невалидна дата.' }, { status: 400 })
    }
    if (!to) return NextResponse.json({ error: 'Избери крайна дата ("До").' }, { status: 400 })
    // Крайната дата включва целия ден
    to.setHours(23, 59, 59, 999)
    if (to <= from) return NextResponse.json({ error: 'Крайната дата трябва да е след началната.' }, { status: 400 })
    startsAt = from.toISOString()
    expiresAt = to.toISOString()
  }

  const { error } = await admin.from('shops').update({
    plan_id: planId,
    billing_interval: null,
    plan_starts_at: startsAt,
    plan_expires_at: expiresAt,
  }).eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const hidden = await applyPlanLimitAndNotify(admin, id)
  return NextResponse.json({ success: true, hidden })
}
