import { redirect } from 'next/navigation'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminListingsTable, type AdminListingRow } from '@/components/admin/AdminListingsTable'

export const dynamic = 'force-dynamic'

export default async function AdminListingsPage() {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) redirect('/login?redirectTo=/admin/listings')
  if (!hasMinRole(role, 'moderator')) redirect('/admin')

  const admin = createAdminClient()
  const { data: listings } = await admin
    .from('listings')
    .select('id, title, price, currency, is_active, moderation_status, moderation_note, created_at, shop:shops(name, slug), category:categories(name)')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows: AdminListingRow[] = (listings ?? []).map(l => {
    const shop = Array.isArray(l.shop) ? l.shop[0] : l.shop
    const category = Array.isArray(l.category) ? l.category[0] : l.category
    return {
      id: l.id,
      title: l.title,
      price: l.price,
      currency: l.currency,
      is_active: l.is_active,
      moderation_status: l.moderation_status,
      moderation_note: l.moderation_note,
      shop_name: shop?.name ?? '—',
      shop_slug: shop?.slug ?? '',
      category_name: category?.name ?? null,
      created_at: l.created_at,
    }
  })

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">Обяви</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{rows.length} последни обяви в платформата</p>
      </div>
      <AdminListingsTable listings={rows} viewerRole={role} />
    </div>
  )
}
