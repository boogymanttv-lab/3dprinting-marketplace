import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { ROLE_LABELS } from '@/types'
import { LayoutDashboard, Users, Package, Store } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await getCurrentUserAndRole()

  if (!user) redirect('/login?redirectTo=/admin')
  if (!hasMinRole(role, 'moderator')) redirect('/')

  const nav = [
    { href: '/admin', icon: <LayoutDashboard size={16} />, label: 'Табло', show: true },
    { href: '/admin/listings', icon: <Package size={16} />, label: 'Обяви', show: true },
    { href: '/admin/shops', icon: <Store size={16} />, label: 'Магазини', show: hasMinRole(role, 'operator') },
    { href: '/admin/users', icon: <Users size={16} />, label: 'Потребители', show: hasMinRole(role, 'operator') },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">🛡️ Админ панел</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Влязъл си като <strong style={{ color: 'var(--accent)' }}>{ROLE_LABELS[role]}</strong>
          </p>
        </div>
        <Link href="/" className="text-sm font-semibold" style={{ color: 'var(--muted)', textDecoration: 'none' }}>
          ← Обратно към сайта
        </Link>
      </div>

      <div className="flex gap-1 p-1 rounded-xl mb-6 flex-wrap" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        {nav.filter(n => n.show).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
            style={{ color: 'var(--text)', textDecoration: 'none' }}
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  )
}
