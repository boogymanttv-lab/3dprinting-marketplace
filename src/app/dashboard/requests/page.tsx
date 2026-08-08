import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatPrice, formatRelativeTime } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const OFFER_STATUS_LABELS: Record<string, string> = {
  pending: 'Изчаква отговор',
  accepted: 'Приета ✓',
  declined: 'Отхвърлена',
}

const OFFER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'rgba(234,179,8,0.15)', text: '#eab308' },
  accepted: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
  declined: { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' },
}

interface Props { searchParams: Promise<{ tab?: string }> }

export default async function DashboardRequestsPage({ searchParams }: Props) {
  const { tab: tabParam } = await searchParams
  const tab = tabParam === 'mine' ? 'mine' : 'open'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/requests')

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!shop) redirect('/open-shop')

  // Оферти, изпратени от този магазин
  const { data: myOffers } = await supabase
    .from('request_offers')
    .select('*, request:requests(id, title, status)')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })

  const offeredRequestIds = new Set((myOffers ?? []).map(o => o.request_id))

  // Отворени заявки, за които този магазин още не е предложил оферта
  const { data: openRequests } = await supabase
    .from('requests')
    .select('*, category:categories(id, name, slug)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(40)

  const availableRequests = (openRequests ?? []).filter(r => !offeredRequestIds.has(r.id))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">📝 Заявки</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{shop.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {[
          { key: 'open', label: `Отворени заявки (${availableRequests.length})` },
          { key: 'mine', label: `Моите оферти (${myOffers?.length ?? 0})` },
        ].map(t => (
          <Link
            key={t.key}
            href={t.key === 'open' ? '/dashboard/requests' : '/dashboard/requests?tab=mine'}
            className="px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
            style={{
              color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
              borderBottomColor: tab === t.key ? 'var(--accent)' : 'transparent',
              textDecoration: 'none',
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'open' ? (
        availableRequests.length > 0 ? (
          <div className="space-y-3">
            {availableRequests.map(r => (
              <Link
                key={r.id}
                href={`/requests/${r.id}`}
                className="block rounded-2xl border p-5 transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h3 className="font-bold text-sm">{r.title}</h3>
                  <span className="text-xs font-bold px-4 py-1.5 rounded-lg flex-shrink-0" style={{ background: 'var(--accent)', color: '#fff' }}>
                    Оферирай →
                  </span>
                </div>
                <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--muted)' }}>{r.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                  {r.category && <span>📦 {r.category.name}</span>}
                  {(r.budget_min || r.budget_max) && (
                    <span>
                      💰 {r.budget_min && r.budget_max
                        ? `${formatPrice(r.budget_min, r.currency)} – ${formatPrice(r.budget_max, r.currency)}`
                        : formatPrice(r.budget_min ?? r.budget_max, r.currency)}
                    </span>
                  )}
                  <span className="ml-auto">{r.offer_count} {r.offer_count === 1 ? 'оферта' : 'оферти'} · {formatRelativeTime(r.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border p-16 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <p className="text-5xl mb-4">📭</p>
            <p className="font-bold text-lg mb-1">Няма нови отворени заявки</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Провери отново по-късно — купувачите публикуват заявки постоянно.</p>
          </div>
        )
      ) : (
        (myOffers && myOffers.length > 0) ? (
          <div className="space-y-3">
            {myOffers.map(o => {
              const statusStyle = OFFER_STATUS_COLORS[o.status]
              return (
                <Link
                  key={o.id}
                  href={`/requests/${o.request_id}`}
                  className="block rounded-2xl border p-5 transition-all hover:-translate-y-0.5"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h3 className="font-bold text-sm">{o.request?.title ?? 'Заявка'}</h3>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: statusStyle.bg, color: statusStyle.text }}>
                      {OFFER_STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                    <span className="font-bold text-base" style={{ color: 'var(--accent)' }}>{formatPrice(o.price, o.currency)}</span>
                    {o.eta_days && <span>⏱ ~{o.eta_days} дни</span>}
                    <span className="ml-auto">{formatRelativeTime(o.created_at)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl border p-16 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <p className="text-5xl mb-4">📭</p>
            <p className="font-bold text-lg mb-1">Все още нямаш изпратени оферти</p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Разгледай отворените заявки и предложи цена на купувачите.</p>
          </div>
        )
      )}
    </div>
  )
}
