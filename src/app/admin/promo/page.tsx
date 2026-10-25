import { redirect } from 'next/navigation'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PromoManager, type PromoRow } from './PromoManager'

export const dynamic = 'force-dynamic'

export default async function AdminPromoPage() {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) redirect('/login?redirectTo=/admin/promo')
  if (role !== 'super_admin') redirect('/admin')

  const admin = createAdminClient()
  const [{ data: links }, { data: plans }, { data: claims }] = await Promise.all([
    admin.from('promo_links').select('*').order('created_at', { ascending: false }),
    admin.from('plans').select('id, name').neq('id', 'free').order('sort_order'),
    admin.from('promo_claims').select('promo_link_id, redeemed_at'),
  ])

  const redeemed: Record<string, number> = {}
  for (const c of claims ?? []) {
    if (c.redeemed_at) redeemed[c.promo_link_id] = (redeemed[c.promo_link_id] ?? 0) + 1
  }
  const planNames = Object.fromEntries((plans ?? []).map(p => [p.id, p.name]))

  const rows: PromoRow[] = (links ?? []).map(l => ({
    id: l.id,
    code: l.code,
    plan_name: planNames[l.plan_id] ?? l.plan_id,
    days: l.days,
    max_uses: l.max_uses,
    uses: l.uses,
    redeemed: redeemed[l.id] ?? 0,
    valid_until: l.valid_until,
    is_active: l.is_active,
    note: l.note,
  }))

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">🎁 Промо линкове</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Линк за регистрация, който дава безплатен период на избран план — без абонамент и без карта.
        </p>
      </div>
      <PromoManager rows={rows} plans={plans ?? []} />
    </div>
  )
}
