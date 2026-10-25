import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyPlanLimitAndNotify } from '@/lib/plan-limits'

export const maxDuration = 60

// Вика се ежедневно от Vercel Cron (виж vercel.json). Връща на Free магазините
// с РЪЧНО зададен план (без Stripe абонамент), чиято крайна дата е изтекла,
// скрива обявите над лимита и праща имейл на собственика.
// Платените през Stripe планове се управляват от webhook-а.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: expired, error } = await admin
    .from('shops')
    .update({ plan_id: 'free', billing_interval: null, plan_starts_at: null, plan_expires_at: null })
    .neq('plan_id', 'free')
    .is('stripe_subscription_id', null)
    .not('plan_expires_at', 'is', null)
    .lt('plan_expires_at', new Date().toISOString())
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const s of expired ?? []) {
    await applyPlanLimitAndNotify(admin, s.id)
  }

  return NextResponse.json({ expired: expired?.length ?? 0 })
}
