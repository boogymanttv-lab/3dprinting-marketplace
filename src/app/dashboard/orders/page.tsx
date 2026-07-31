import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPrice, formatRelativeTime, formatDate } from '@/lib/utils'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type OrderStatus } from '@/types'
import { ArrowLeft } from 'lucide-react'
import { OrderActions } from './OrderActions'

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

export default async function OrdersPage({ searchParams }: Props) {
  const { status: filterStatus } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/orders')

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!shop) redirect('/open-shop')

  let query = supabase
    .from('orders')
    .select('*, buyer:profiles(full_name, email)')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus)
  }

  const { data: orders } = await query
  const { data: allOrders } = await supabase
    .from('orders').select('status').eq('shop_id', shop.id)

  const counts: Record<string, number> = { all: allOrders?.length ?? 0 }
  allOrders?.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1 })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">🛒 Получени поръчки</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{shop.name}</p>
        </div>
      </div>

      {/* Status flow legend */}
      <div className="rounded-xl border p-3 mb-5 flex items-center gap-1.5 overflow-x-auto"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {(['new','accepted','processing','shipped','completed'] as OrderStatus[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: ORDER_STATUS_COLORS[s].bg, color: ORDER_STATUS_COLORS[s].text }}>
              {ORDER_STATUS_LABELS[s]}
            </span>
            {i < 4 && <span style={{ color: 'var(--border)' }}>→</span>}
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {TABS.map(tab => {
          const count = counts[tab.key] ?? 0
          const active = (filterStatus ?? 'all') === tab.key
          return (
            <Link key={tab.key}
              href={tab.key === 'all' ? '/dashboard/orders' : `/dashboard/orders?status=${tab.key}`}
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

      {/* Orders */}
      {orders && orders.length > 0 ? (
        <div className="space-y-3">
          {orders.map(order => {
            const statusStyle = ORDER_STATUS_COLORS[order.status as OrderStatus]
            const shipping = order.shipping_address as Record<string, string> | null

            return (
              <div key={order.id} className="rounded-2xl border p-5"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: 'var(--bg3)' }}>📦</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-sm">{order.listing_title}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                        style={{ background: statusStyle.bg, color: statusStyle.text }}>
                        {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                      </span>
                    </div>

                    <div className="text-xs space-y-0.5" style={{ color: 'var(--muted)' }}>
                      <p>👤 {order.buyer?.full_name ?? 'Клиент'} · {order.buyer?.email}</p>
                      <p>🛒 {order.quantity} бр. · {formatDate(order.created_at)}</p>
                      {shipping?.courier && (
                        <p>🚚 {shipping.courier === 'econt' ? 'Еконт' : shipping.courier === 'speedy' ? 'Speedy' : 'Pigeon'} · {shipping.delivery_type === 'office' ? 'До офис' : 'До адрес'} · {shipping.address}</p>
                      )}
                      {shipping?.delivery_type === 'in_person' && <p>🤝 Лично предаване</p>}
                      {order.tracking_number && (
                        <p className="font-semibold" style={{ color: '#60a5fa' }}>
                          📬 Товарителница: {order.tracking_number}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="text-xl font-black" style={{ color: 'var(--accent)' }}>
                      {formatPrice(order.total_amount)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {formatRelativeTime(order.created_at)}
                    </p>
                    <OrderActions orderId={order.id} status={order.status as OrderStatus} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border p-16 text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-5xl mb-4">📭</p>
          <p className="font-bold text-lg mb-1">Няма поръчки</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {filterStatus && filterStatus !== 'all' ? 'Няма поръчки с този статус' : 'Все още нямаш поръчки'}
          </p>
        </div>
      )}
    </div>
  )
}
