import type { SupabaseClient } from '@supabase/supabase-js'

export interface ActivePromo {
  linkId: string
  planId: string
  planName: string
  days: number
}

// Връща неизползваното (още непревърнато в магазин) промо на потребителя.
export async function getActivePromo(admin: SupabaseClient, userId: string): Promise<ActivePromo | null> {
  const { data: claim } = await admin
    .from('promo_claims')
    .select('promo_link_id, redeemed_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (!claim || claim.redeemed_at) return null

  const { data: link } = await admin
    .from('promo_links')
    .select('id, plan_id, days, plan:plans(name)')
    .eq('id', claim.promo_link_id)
    .maybeSingle()
  if (!link) return null

  const plan = (Array.isArray(link.plan) ? link.plan[0] : link.plan) as { name: string } | null
  return { linkId: link.id, planId: link.plan_id, planName: plan?.name ?? link.plan_id, days: link.days }
}
