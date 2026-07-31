import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminShopsPage() {
  const { user, role } = await getCurrentUserAndRole()
  if (!user || !hasMinRole(role, 'operator')) redirect('/admin')

  const admin = createAdminClient()
  const { data: shops } = await admin
    .from('shops')
    .select('id, name, slug, city, is_active, plan_id, total_sales, created_at, owner:profiles(email, full_name)')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">Магазини</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{shops?.length ?? 0} общо</p>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Магазин', 'Собственик', 'План', 'Град', 'Статус', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(shops ?? []).map(shop => {
                const owner = Array.isArray(shop.owner) ? shop.owner[0] : shop.owner
                return (
                  <tr key={shop.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-4 py-3 font-semibold">{shop.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{owner?.email ?? '—'}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{shop.plan_id}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{shop.city ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-full"
                        style={{
                          background: shop.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: shop.is_active ? '#22c55e' : '#f87171',
                        }}>
                        {shop.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/stores/${shop.slug}`} target="_blank"
                        className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                        Виж →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
