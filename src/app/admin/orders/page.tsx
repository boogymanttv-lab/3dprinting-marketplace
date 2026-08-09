import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPrice, formatDate } from '@/lib/utils'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, PAYMENT_METHOD_LABELS, type OrderStatus, type PaymentMethod } from '@/types'

export const dynamic = 'force-dynamic'

const TABS: { key: string; label: string }[] = [
  { key: 'all',        label: 'Всички' },
  { key: 'new',        label: 'Нови' },
  { key: 'accepted',   label: 'Приети' },
  { key: 'processing', label: 'Обработват се' },
  { key: 'shipped',    label: 'Изпратени' },
  { key: 'completed',  label: 'Завършени' },
  { key: 'cancelled',  label: 'Анулирани' },
]

interface Props { searchParams: Promise<{ status?: string }> }

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status: filterStatus } = await searchParams
  const { user, role } = await getCurrentUserAndRole()
  if (!user) redirect('/login?redirectTo=/admin/orders')
  if (!hasMinRole(role, 'operator')) redirect('/admin')

  const admin = createAdminClient()

  let query = admin
    .from('orders')
    .select('*, shop:shops(id, name, slug), buyer:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus)
  }

  const { data: orders } = await query
  const { data: allOrders } = await admin.from('orders').select('status')

  const counts: Record<string, number> = { all: allOrders?.length ?? 0 }
  allOrders?.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1 })

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-bold">🛒 Поръчки</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Всички поръчки в платформата</p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {TABS.map(tab => {
          const count = counts[tab.key] ?? 0
          const active = (filterStatus ?? 'all') === tab.key
          return (
            <Link key={tab.key}
              href={tab.key === 'all' ? '/admin/orders' : `/admin/orders?status=${tab.key}`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: active ? 'var(--accent)' : 'var(--card)',
                color: active ? '#fff' : 'var(--muted)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                textDecoration: 'none',
              }}>
              {tab.label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg3)' }}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {orders && orders.length > 0 ? (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Обява', 'Купувач', 'Магазин', 'Сума', 'Плащане', 'Статус', 'Дата'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => {
                  const statusStyle = ORDER_STATUS_COLORS[o.status as OrderStatus]
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-4 py-3 max-w-[220px]">
                        <div className="font-semibold truncate">{o.listing_title}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>× {o.quantity}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{o.buyer?.full_name ?? '—'}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{o.buyer?.email}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {o.shop ? (
                          <Link href={`/stores/${o.shop.slug}`} target="_blank" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                            {o.shop.name}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                        {formatPrice(o.total_amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                        {PAYMENT_METHOD_LABELS[o.payment_method as PaymentMethod]}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: statusStyle.bg, color: statusStyle.text }}>
                          {ORDER_STATUS_LABELS[o.status as OrderStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                        {formatDate(o.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border p-16 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-5xl mb-4">📭</p>
          <p className="font-bold text-lg mb-1">Няма поръчки</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {filterStatus && filterStatus !== 'all' ? 'Няма поръчки с този статус' : 'Все още няма поръчки в платформата'}
          </p>
        </div>
      )}
    </div>
  )
}
