import { redirect } from 'next/navigation'
import { getCurrentUserAndRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { EmailComposer } from './EmailComposer'

export const dynamic = 'force-dynamic'

export default async function AdminEmailPage() {
  const { user, role } = await getCurrentUserAndRole()
  if (!user) redirect('/login?redirectTo=/admin/email')
  if (role !== 'super_admin') redirect('/admin')

  const admin = createAdminClient()
  const [{ data: profiles }, { data: shops }] = await Promise.all([
    admin.from('profiles').select('id, email').eq('is_deactivated', false).not('email', 'is', null),
    admin.from('shops').select('owner_id'),
  ])

  const owners = new Set((shops ?? []).map(s => s.owner_id))
  const allCount = new Set((profiles ?? []).map(p => p.email)).size
  const sellersCount = new Set((profiles ?? []).filter(p => owners.has(p.id)).map(p => p.email)).size

  const buyersCount = new Set((profiles ?? []).filter(p => !owners.has(p.id)).map(p => p.email)).size

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">✉️ Масов имейл</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Изпрати съобщение до регистрираните потребители. Първо прати тест на себе си.
        </p>
      </div>
      <EmailComposer allCount={allCount} sellersCount={sellersCount} buyersCount={buyersCount} />
    </div>
  )
}
