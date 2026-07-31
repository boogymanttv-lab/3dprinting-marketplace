import { redirect } from 'next/navigation'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ShopsTable, type AdminShopRow } from '@/components/admin/ShopsTable'

export const dynamic = 'force-dynamic'

export default async function AdminShopsPage() {
  const { user, role } = await getCurrentUserAndRole()
  if (!user || !hasMinRole(role, 'operator')) redirect('/admin')

  const admin = createAdminClient()

  const [{ data: shops }, { data: plans }] = await Promise.all([
    admin
      .from('shops')
      .select('id, name, slug, city, is_active, plan_id, billing_interval, stripe_subscription_id, total_sales, created_at, owner:profiles(email, full_name)')
      .order('created_at', { ascending: false }),
    admin.from('plans').select('id, name').order('sort_order'),
  ])

  const rows: AdminShopRow[] = (shops ?? []).map(shop => {
    const owner = Array.isArray(shop.owner) ? shop.owner[0] : shop.owner
    return {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      city: shop.city,
      is_active: shop.is_active,
      plan_id: shop.plan_id,
      billing_interval: shop.billing_interval,
      stripe_subscription_id: shop.stripe_subscription_id,
      total_sales: shop.total_sales,
      created_at: shop.created_at,
      owner_email: owner?.email ?? null,
    }
  })

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">Магазини</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{rows.length} общо</p>
      </div>

      <ShopsTable shops={rows} plans={plans ?? []} isSuperAdmin={role === 'super_admin'} />
    </div>
  )
}
