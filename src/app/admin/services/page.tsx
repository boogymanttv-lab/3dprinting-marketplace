import { redirect } from 'next/navigation'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ServicesAdmin, type AdminServiceRow, type AdminOrderRow } from './ServicesAdmin'

export const dynamic = 'force-dynamic'

export default async function AdminServicesPage() {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) redirect('/login?redirectTo=/admin/services')
  if (role !== 'super_admin') redirect('/admin')

  const admin = createAdminClient()
  const [{ data: services }, { data: orders }] = await Promise.all([
    admin.from('services').select('code, kind, name, days, price_credits, is_active').order('sort_order'),
    admin
      .from('service_orders')
      .select('id, name, kind, status, price_credits, details, listing_id, created_at, ends_at, shop:shops(name, slug), user:profiles(email)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const rows: AdminOrderRow[] = (orders ?? []).map(o => {
    const shop = Array.isArray(o.shop) ? o.shop[0] : o.shop
    const u = Array.isArray(o.user) ? o.user[0] : o.user
    return {
      id: o.id, name: o.name, kind: o.kind, status: o.status, price_credits: o.price_credits,
      details: o.details, listing_id: o.listing_id, created_at: o.created_at, ends_at: o.ends_at,
      shop_name: shop?.name ?? '—', shop_slug: shop?.slug ?? null, email: u?.email ?? '—',
    }
  })

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">💎 Кредити и услуги</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>100 кредита = 1 €. Рекламите се изпълняват ръчно от тук.</p>
      </div>
      <ServicesAdmin services={(services ?? []) as AdminServiceRow[]} orders={rows} />
    </div>
  )
}
