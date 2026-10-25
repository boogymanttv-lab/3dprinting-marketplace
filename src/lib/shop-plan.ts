import type { SupabaseClient } from '@supabase/supabase-js'
import { applyPlanLimitAndNotify } from '@/lib/plan-limits'

export interface PlanInput {
  plan_id?: string
  starts_at?: string | null
  expires_at?: string | null
}

// Валидира плана и периода. Връща готови стойности за запис или грешка.
export async function validatePlanInput(
  admin: SupabaseClient,
  input: PlanInput
): Promise<{ error: string } | { planId: string; startsAt: string | null; expiresAt: string | null }> {
  const planId = input.plan_id
  if (!planId) return { error: 'Missing plan_id' }

  const { data: plan } = await admin.from('plans').select('id').eq('id', planId).maybeSingle()
  if (!plan) return { error: 'Няма такъв план.' }

  if (planId === 'free') return { planId, startsAt: null, expiresAt: null }

  const from = input.starts_at ? new Date(input.starts_at) : new Date()
  const to = input.expires_at ? new Date(input.expires_at) : null
  if (isNaN(from.getTime()) || (to && isNaN(to.getTime()))) return { error: 'Невалидна дата.' }
  if (!to) return { error: 'Избери крайна дата ("До").' }
  to.setHours(23, 59, 59, 999) // крайната дата включва целия ден
  if (to <= from) return { error: 'Крайната дата трябва да е след началната.' }

  return { planId, startsAt: from.toISOString(), expiresAt: to.toISOString() }
}

// Задава плана на няколко магазина и прилага лимита на обявите + имейл на всеки.
export async function assignPlanToShops(
  admin: SupabaseClient,
  shopIds: string[],
  v: { planId: string; startsAt: string | null; expiresAt: string | null }
): Promise<{ error?: string; hidden: number }> {
  const { error } = await admin.from('shops').update({
    plan_id: v.planId,
    billing_interval: null,
    plan_starts_at: v.startsAt,
    plan_expires_at: v.expiresAt,
  }).in('id', shopIds)
  if (error) return { error: error.message, hidden: 0 }

  let hidden = 0
  for (const id of shopIds) hidden += await applyPlanLimitAndNotify(admin, id)
  return { hidden }
}
