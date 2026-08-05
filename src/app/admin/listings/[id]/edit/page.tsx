import { redirect, notFound } from 'next/navigation'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminListingEditForm } from '@/components/admin/AdminListingEditForm'

export const dynamic = 'force-dynamic'

export default async function AdminEditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, role } = await getCurrentUserAndRole()
  if (!user) redirect('/login')
  if (!hasMinRole(role, 'operator')) redirect('/admin')

  const admin = createAdminClient()

  const [{ data: listing }, { data: categories }] = await Promise.all([
    admin.from('listings').select('*, shop:shops(name)').eq('id', id).maybeSingle(),
    admin.from('categories').select('id, name, parent_id').order('sort_order'),
  ])

  if (!listing) notFound()

  const shop = Array.isArray(listing.shop) ? listing.shop[0] : listing.shop

  return (
    <AdminListingEditForm
      listing={{
        id: listing.id,
        title: listing.title,
        description: listing.description ?? '',
        price: listing.price,
        quantity: listing.quantity,
        condition: listing.condition,
        material: listing.material ?? '',
        category_id: listing.category_id ?? '',
        city: listing.city ?? '',
        is_active: listing.is_active,
        images: listing.images ?? [],
        moderation_note: listing.moderation_note,
        shop_name: shop?.name ?? '—',
      }}
      categories={categories ?? []}
    />
  )
}
