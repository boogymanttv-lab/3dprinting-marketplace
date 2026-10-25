import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPlanChanged } from '@/lib/email'

// Прилага лимита на обявите на текущия план на магазина:
// - най-новите `max_listings` активни обяви остават активни,
// - останалите се СКРИВАТ (is_active=false) — не се трият, собственикът
//   може да избере коя да е активна от "Мои обяви".
// След това праща имейл на собственика (винаги — и при ръчна смяна на план).
// `admin` трябва да е service-role клиент.
export async function applyPlanLimitAndNotify(admin: SupabaseClient, shopId: string): Promise<number> {
  const { data: shop } = await admin
    .from('shops')
    .select('name, plan:plans(name, max_listings), owner:profiles(email, full_name)')
    .eq('id', shopId)
    .maybeSingle()
  if (!shop) return 0

  const plan = (Array.isArray(shop.plan) ? shop.plan[0] : shop.plan) as { name: string; max_listings: number | null } | null
  const owner = (Array.isArray(shop.owner) ? shop.owner[0] : shop.owner) as { email?: string; full_name?: string } | null

  let hiddenCount = 0
  const max = plan?.max_listings ?? null

  if (max !== null) {
    const { data: active } = await admin
      .from('listings')
      .select('id')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .eq('is_request_order', false)
      .order('created_at', { ascending: false })

    const toHide = (active ?? []).slice(max).map(l => l.id)
    if (toHide.length > 0) {
      await admin.from('listings').update({ is_active: false }).in('id', toHide)
      hiddenCount = toHide.length
    }
  }

  if (owner?.email) {
    try {
      await sendPlanChanged(owner.email, {
        ownerName: owner.full_name ?? 'Продавач',
        shopName: shop.name,
        planName: plan?.name ?? 'Free',
        maxListings: max,
        hiddenCount,
      })
    } catch {
      // Email failure shouldn't break the plan change
    }
  }

  return hiddenCount
}
