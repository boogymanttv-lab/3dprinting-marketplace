import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { Users, UserCheck, UserX, Package, Store, Flag, ShoppingBag } from 'lucide-react'

export default async function AdminDashboardPage() {
  const admin = createAdminClient()

  const [
    { data: usersPage },
    { count: listingsCount },
    { count: activeShopsCount },
    { count: totalShopsCount },
    { count: flaggedCount },
    { count: ordersCount },
  ] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('listings').select('*', { count: 'exact', head: true }),
    admin.from('shops').select('*', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('shops').select('*', { count: 'exact', head: true }),
    admin.from('listings').select('*', { count: 'exact', head: true }).eq('moderation_status', 'flagged'),
    admin.from('orders').select('*', { count: 'exact', head: true }),
  ])

  const users = usersPage?.users ?? []
  const totalUsers = users.length
  const verifiedUsers = users.filter(u => !!u.email_confirmed_at).length
  const unverifiedUsers = totalUsers - verifiedUsers

  const stats = [
    { label: 'Общо потребители', value: totalUsers, icon: <Users size={18} />, color: '#818cf8', href: '/admin/users' },
    { label: 'Потвърдени имейли', value: verifiedUsers, icon: <UserCheck size={18} />, color: '#22c55e', href: '/admin/users' },
    { label: 'Непотвърдени имейли', value: unverifiedUsers, icon: <UserX size={18} />, color: '#f87171', href: '/admin/users' },
    { label: 'Общо обяви', value: listingsCount ?? 0, icon: <Package size={18} />, color: '#f97316', href: '/admin/listings' },
    { label: 'Активни магазини', value: `${activeShopsCount ?? 0} / ${totalShopsCount ?? 0}`, icon: <Store size={18} />, color: '#60a5fa', href: '/admin/shops' },
    { label: 'Обяви за преглед', value: flaggedCount ?? 0, icon: <Flag size={18} />, color: '#eab308', href: '/admin/listings' },
    { label: 'Общо поръчки', value: ordersCount ?? 0, icon: <ShoppingBag size={18} />, color: '#a78bfa', href: '/admin/orders' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <Link
          key={s.label}
          href={s.href}
          className="rounded-2xl border p-5 transition-all hover:-translate-y-0.5 block"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none', color: 'inherit' }}
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${s.color}22`, color: s.color }}>
            {s.icon}
          </div>
          <p className="text-2xl font-black">{s.value}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{s.label}</p>
        </Link>
      ))}
    </div>
  )
}
