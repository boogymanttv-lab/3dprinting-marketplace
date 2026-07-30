import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPrice, formatRelativeTime } from '@/lib/utils'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, type OrderStatus } from '@/types'
import { Plus, Package, ShoppingBag, Star, TrendingUp } from 'lucide-react'
import { OrderActions } from './orders/OrderActions'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard')

  const { data: shop } = await supabase
    .from('shops')
    .select('*, plan:plans(*)')
    .eq('owner_id', user.id)
    .single()

  if (!shop) redirect('/open-shop')

  const { data: orders } = await supabase
    .from('orders')
    .select('*, buyer:profiles(full_name)')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const { count: listingCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shop.id)
    .eq('is_active', true)

  const { count: newOrderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('shop_id', shop.id)
    .eq('status', 'new')

  const maxListings = shop.plan?.max_listings

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
      {/* Sidebar */}
      <aside>
        <div className="rounded-2xl border p-5 mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-3"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            🏪
          </div>
          <p className="font-bold text-base">{shop.name}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Планrove: <span style={{ color: 'var(--accent)' }}>{shop.plan?.name ?? 'Free'}</span>
          </p>
          {maxListings && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--muted)' }}>
                <span>{listingCount ?? 0} / {maxListings} обяви</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                <div className="h-full rounded-full" style={{
                  background: 'var(--accent)',
                  width: `${Math.min(100, ((listingCount ?? 0) / maxListings) * 100)}%`
                }} />
              </div>
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {[
            { href: '/dashboard', icon: '📊', label: 'Обобщение' },
            { href: '/dashboard/listings', icon: '📋', label: 'Мои обяви' },
            { href: '/dashboard/orders', icon: '🛒', label: 'Получени поръчки' },
            { href: '/dashboard/my-orders', icon: '📦', label: 'Моите поръчки' },
            { href: '/messages', icon: '💬', label: 'Съобщения' },
            { href: '/dashboard/reviews', icon: '⭐', label: 'Ревюта' },
            { href: '/plans', icon: '💳', label: 'Абонамент' },
            { href: '/dashboard/settings', icon: '⚙️', label: 'Настройки' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="dash-nav-link">
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black">Добре дошъл, {shop.name} 👋</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Ето резюме на магазина ти</p>
          </div>
          <Link href="/dashboard/listings/new" className="btn-primary">
            <Plus size={15} /> Нова обява
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Package size={18} />, num: `${listingCount ?? 0}${maxListings ? `/${maxListings}` : ''}`, label: 'Активни обяви' },
            { icon: <ShoppingBag size={18} />, num: newOrderCount ?? 0, label: 'Нови поръчки', highlight: true },
            { icon: <TrendingUp size={18} />, num: `€${shop.total_sales ?? 0}`, label: 'Общи приходи' },
            { icon: <Star size={18} />, num: shop.rating > 0 ? `${shop.rating.toFixed(1)} ⭐` : '—', label: 'Рейтинг' },
          ].map((stat, i) => (
            <div key={i} className="rounded-xl border p-4"
              style={{
                background: stat.highlight && (newOrderCount ?? 0) > 0 ? 'rgba(249,115,22,0.05)' : 'var(--card)',
                borderColor: stat.highlight && (newOrderCount ?? 0) > 0 ? 'var(--accent)' : 'var(--border)',
              }}>
              <div className="mb-2" style={{ color: 'var(--muted)' }}>{stat.icon}</div>
              <div className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{stat.num}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Orders */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">Последни поръчки</h2>
          <Link href="/dashboard/orders" className="text-xs" style={{ color: 'var(--muted)' }}>
            Виж всички →
          </Link>
        </div>

        <div className="space-y-3">
          {orders?.length === 0 && (
            <div className="rounded-xl border p-10 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-3xl mb-2">📭</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Нямаш поръчки още</p>
            </div>
          )}
          {orders?.map(order => {
            const statusStyle = ORDER_STATUS_COLORS[order.status as OrderStatus]

            return (
              <div key={order.id} className="rounded-xl border p-4 flex items-center gap-4"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'var(--bg3)' }}>
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{order.listing_title} × {order.quantity}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {order.buyer?.full_name ?? 'Клиент'} · {formatRelativeTime(order.created_at)}
                  </p>
                </div>
                <p className="font-black text-base flex-shrink-0" style={{ color: 'var(--accent)' }}>
                  {formatPrice(order.total_amount)}
                </p>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: statusStyle.bg, color: statusStyle.text }}>
                    {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                  </span>
                  <OrderActions orderId={order.id} status={order.status as OrderStatus} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--accent); color: #fff;
          padding: 9px 18px; border-radius: 9px;
          font-size: 14px; font-weight: 700; border: none; cursor: pointer;
          transition: opacity 0.15s; text-decoration: none;
        }
        .btn-primary:hover { opacity: 0.88; }
        .dash-nav-link {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 12px; border-radius: 12px;
          font-size: 14px; font-weight: 500;
          color: var(--muted); text-decoration: none;
          transition: background 0.15s, color 0.15s;
        }
        .dash-nav-link:hover { background: var(--bg3); color: var(--text); }
      `}</style>
    </div>
  )
}
