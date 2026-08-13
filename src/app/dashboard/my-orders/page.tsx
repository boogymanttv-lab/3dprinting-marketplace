import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, formatRelativeTime, formatDate } from '@/lib/utils'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type OrderStatus } from '@/types'
import { ArrowLeft, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

const COURIER_TRACK: Record<string, string> = {
  econt:  'https://www.econt.com/services/track-shipment.html',
  speedy: 'https://www.speedy.bg/bg/track-shipment/',
  pigeon: 'https://www.pigeon.bg/',
}

const COURIER_LABELS: Record<string, string> = {
  econt:  'Еконт',
  speedy: 'Speedy',
  pigeon: 'Pigeon Express',
}

interface Props { searchParams: Promise<{ success?: string }> }

export default async function MyOrdersPage({ searchParams }: Props) {
  const { success } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/my-orders')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, shop:shops(id, name, slug, city), items:order_items(*)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch existing reviews by this user so we can show "вече ревюирано"
  const completedOrderIds = orders
    ?.filter(o => o.status === 'completed')
    .map(o => o.id) ?? []

  const { data: existingReviews } = completedOrderIds.length > 0
    ? await supabase
        .from('reviews')
        .select('order_id')
        .in('order_id', completedOrderIds)
    : { data: [] }

  const reviewedOrderIds = new Set(existingReviews?.map(r => r.order_id) ?? [])

  const activeOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)) ?? []
  const pastOrders = orders?.filter(o => ['completed', 'cancelled'].includes(o.status)) ?? []

  function OrderCard({ order, reviewed }: { order: NonNullable<typeof orders>[0]; reviewed: boolean }) {
    const statusStyle = ORDER_STATUS_COLORS[order.status as OrderStatus]
    const shipping = order.shipping_address as Record<string, string> | null
    const courierKey = shipping?.courier
    const trackUrl = courierKey ? COURIER_TRACK[courierKey] : null

    return (
      <div className="rounded-2xl border overflow-hidden"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {formatDate(order.created_at)}
            </span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full font-bold"
            style={{ background: statusStyle.bg, color: statusStyle.text }}>
            {ORDER_STATUS_LABELS[order.status as OrderStatus]}
          </span>
        </div>

        <div className="p-5">
          <div className="flex gap-4">
            {/* Image */}
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative"
              style={{ background: 'var(--bg3)' }}>
              {order.listing_image ? (
                <Image src={order.listing_image} alt={order.listing_title} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm mb-0.5 truncate">
                {order.items && order.items.length > 1 ? `${order.items.length} артикула` : order.listing_title}
              </h3>
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>
                🏪 <Link href={`/stores/${order.shop?.slug}`}
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  {order.shop?.name}
                </Link>
                {order.shop?.city && ` · 📍 ${order.shop.city}`}
              </p>
              {order.items && order.items.length > 1 ? (
                <ul className="text-xs space-y-0.5" style={{ color: 'var(--muted)' }}>
                  {order.items.map((i: { id: string; listing_title: string; quantity: number }) => (
                    <li key={i.id}>• {i.listing_title} × {i.quantity}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {order.quantity} бр. · {formatRelativeTime(order.created_at)}
                </p>
              )}
            </div>

            {/* Price */}
            <p className="text-lg font-black flex-shrink-0" style={{ color: 'var(--accent)' }}>
              {formatPrice(order.total_amount)}
            </p>
          </div>

          {/* Status progress */}
          <div className="mt-4">
            <div className="flex items-center gap-1">
              {(['new','accepted','processing','shipped','completed'] as OrderStatus[]).map((s, i) => {
                const statuses: OrderStatus[] = ['new','accepted','processing','shipped','completed']
                const currentIdx = statuses.indexOf(order.status as OrderStatus)
                const stepIdx = i
                const isDone = stepIdx <= currentIdx && order.status !== 'cancelled'
                const isActive = stepIdx === currentIdx && order.status !== 'cancelled'

                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: isDone ? (isActive ? 'var(--accent)' : 'var(--green)') : 'var(--bg3)',
                          color: isDone ? '#fff' : 'var(--muted)',
                          border: `2px solid ${isDone ? (isActive ? 'var(--accent)' : 'var(--green)') : 'var(--border)'}`,
                        }}>
                        {isDone && !isActive ? '✓' : stepIdx + 1}
                      </div>
                      <span className="text-xs mt-0.5 hidden sm:block whitespace-nowrap"
                        style={{ color: isActive ? 'var(--text)' : 'var(--muted)', fontSize: '10px' }}>
                        {ORDER_STATUS_LABELS[s]}
                      </span>
                    </div>
                    {i < 4 && (
                      <div className="flex-1 h-0.5 mx-1"
                        style={{ background: stepIdx < currentIdx && order.status !== 'cancelled' ? 'var(--green)' : 'var(--border)' }} />
                    )}
                  </div>
                )
              })}
            </div>
            {order.status === 'cancelled' && (
              <p className="text-xs mt-2 font-semibold" style={{ color: '#f87171' }}>❌ Поръчката е отказана</p>
            )}
          </div>

          {/* Tracking number */}
          {order.tracking_number && (
            <div className="mt-4 rounded-xl p-3 flex items-center justify-between gap-3"
              style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
              <div>
                <p className="text-xs font-bold" style={{ color: '#60a5fa' }}>
                  📬 Товарителница — {courierKey ? COURIER_LABELS[courierKey] : ''}
                </p>
                <p className="text-sm font-mono font-bold mt-0.5">{order.tracking_number}</p>
              </div>
              {trackUrl && (
                <a href={`${trackUrl}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0"
                  style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', textDecoration: 'none' }}>
                  <ExternalLink size={12} /> Проследи
                </a>
              )}
            </div>
          )}

          {/* Delivery info */}
          {shipping && shipping.delivery_type !== 'in_person' && (
            <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
              🚚 {courierKey ? COURIER_LABELS[courierKey] : ''} · {shipping.delivery_type === 'office' ? 'До офис' : 'До адрес'}: {shipping.address}
            </p>
          )}
          {shipping?.delivery_type === 'in_person' && (
            <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>🤝 Лично предаване</p>
          )}

          {/* Review button for completed orders */}
          {order.status === 'completed' && (
            <div className="mt-4 pt-4 border-t flex items-center justify-between"
              style={{ borderColor: 'var(--border)' }}>
              {reviewed ? (
                <span className="text-xs font-semibold flex items-center gap-1.5"
                  style={{ color: 'var(--green)' }}>
                  ✅ Вече остави ревю
                </span>
              ) : (
                <Link
                  href={`/dashboard/my-orders/${order.id}/review`}
                  className="text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5"
                  style={{
                    background: 'rgba(249,115,22,0.12)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(249,115,22,0.3)',
                    textDecoration: 'none',
                  }}
                >
                  ⭐ Остави ревю
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="p-2 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">📦 Моите поръчки</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {orders?.length ?? 0} поръчки общо
          </p>
        </div>
      </div>

      {success === '1' && (
        <div className="rounded-xl p-4 mb-6 text-sm font-semibold"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: 'var(--green)' }}>
          ✅ Поръчката е направена успешно! Продавачът е известен и скоро ще я обработи.
        </div>
      )}

      {orders?.length === 0 ? (
        <div className="rounded-2xl border p-16 text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-5xl mb-4">🛍️</p>
          <p className="font-bold text-lg mb-1">Нямаш поръчки още</p>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Разгледай обявите и направи първата си поръчка</p>
          <Link href="/" className="inline-flex px-6 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
            Разгледай обяви
          </Link>
        </div>
      ) : (
        <>
          {/* Active orders */}
          {activeOrders.length > 0 && (
            <div className="mb-8">
              <h2 className="font-bold text-base mb-4">
                🔔 Активни поръчки
                <span className="ml-2 text-sm font-normal" style={{ color: 'var(--muted)' }}>({activeOrders.length})</span>
              </h2>
              <div className="space-y-4">
                {activeOrders.map(order => <OrderCard key={order.id} order={order} reviewed={false} />)}
              </div>
            </div>
          )}

          {/* Past orders */}
          {pastOrders.length > 0 && (
            <div>
              <h2 className="font-bold text-base mb-4">
                📁 Минали поръчки
                <span className="ml-2 text-sm font-normal" style={{ color: 'var(--muted)' }}>({pastOrders.length})</span>
              </h2>
              <div className="space-y-4">
                {pastOrders.map(order => (
                  <OrderCard key={order.id} order={order} reviewed={reviewedOrderIds.has(order.id)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
