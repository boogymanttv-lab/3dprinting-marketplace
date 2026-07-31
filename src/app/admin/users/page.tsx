import { redirect } from 'next/navigation'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { UsersTable, type AdminUserRow } from '@/components/admin/UsersTable'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const { user, role } = await getCurrentUserAndRole()
  if (!user || !hasMinRole(role, 'operator')) redirect('/admin')

  const admin = createAdminClient()

  const [{ data: usersPage }, { data: profiles }, { data: shops }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('profiles').select('id, full_name, role, is_deactivated, created_at'),
    admin.from('shops').select('owner_id'),
  ])

  const shopOwnerIds = new Set((shops ?? []).map(s => s.owner_id))
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const rows: AdminUserRow[] = (usersPage?.users ?? [])
    .map(u => {
      const profile = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email ?? '—',
        full_name: profile?.full_name ?? null,
        role: (profile?.role as AdminUserRow['role']) ?? 'user',
        is_deactivated: profile?.is_deactivated ?? false,
        email_confirmed: !!u.email_confirmed_at,
        created_at: profile?.created_at ?? u.created_at,
        has_shop: shopOwnerIds.has(u.id),
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">Потребители</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{rows.length} регистрирани акаунта</p>
      </div>
      <UsersTable users={rows} viewerRole={role} viewerId={user.id} />
    </div>
  )
}
