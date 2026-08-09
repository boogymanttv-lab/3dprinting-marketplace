import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatPrice, formatRelativeTime, formatDate } from '@/lib/utils'
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS, type RequestStatus } from '@/types'
import { Plus, Clock, MapPin } from 'lucide-react'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export const metadata: Metadata = {
  title: 'Заяви поръчка — Кажи какво искаш, продавачите наддават',
  description: 'Публикувай заявка за 3D печат или продукт, който търсиш, и получи оферти от продавачи в 3DPrintingBG. Обратен маркетплейс — ти казваш какво искаш, те се борят за теб.',
  alternates: { canonical: `${SITE_URL}/requests` },
}

export const revalidate = 60

interface SearchParams { category?: string; tab?: string }

export default async function RequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const tab = params.tab === 'mine' && user ? 'mine' : 'open'

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .is('parent_id', null)
    .order('sort_order')

  let query = supabase
    .from('requests')
    .select('*, category:categories(id, name, slug)')
    .order('created_at', { ascending: false })
    .limit(60)

  if (tab === 'mine') {
    query = query.eq('buyer_id', user!.id)
  } else {
    query = query.eq('status', 'open')
    if (params.category) {
      const cat = categories?.find(c => c.slug === params.category)
      if (cat) query = query.eq('category_id', cat.id)
    }
  }

  const { data: requests } = await query

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black mb-1.5">📝 Заяви поръчка</h1>
          <p className="text-sm max-w-lg" style={{ color: 'var(--muted)' }}>
            Не намираш готово? Кажи какво търсиш и продавачите ще ти предложат оферти.
          </p>
        </div>
        <Link
          href={user ? '/requests/new' : '/login?redirectTo=/requests/new'}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--accent), #f59e0b)', color: '#fff', textDecoration: 'none' }}
        >
          <Plus size={16} /> Публикувай заявка
        </Link>
      </div>

      {/* Tabs */}
      {user && (
        <div className="flex gap-1 border-b mb-5" style={{ borderColor: 'var(--border)' }}>
          {[
            { key: 'open', label: 'Отворени заявки' },
            { key: 'mine', label: 'Моите заявки' },
          ].map(t => (
            <Link
              key={t.key}
              href={t.key === 'open' ? '/requests' : '/requests?tab=mine'}
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
      )}

      {/* Category chips — only on open tab */}
      {tab === 'open' && categories && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6" style={{ scrollbarWidth: 'thin' }}>
          <Link
            href="/requests"
            className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: !params.category ? 'var(--accent)' : 'var(--card)',
              color: !params.category ? '#fff' : 'var(--muted)',
              border: `1px solid ${!params.category ? 'var(--accent)' : 'var(--border)'}`,
              textDecoration: 'none',
            }}
          >
            Всички
          </Link>
          {categories.map(c => (
            <Link
              key={c.id}
              href={`/requests?category=${c.slug}`}
              className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: params.category === c.slug ? 'var(--accent)' : 'var(--card)',
                color: params.category === c.slug ? '#fff' : 'var(--muted)',
                border: `1px solid ${params.category === c.slug ? 'var(--accent)' : 'var(--border)'}`,
                textDecoration: 'none',
              }}
            >
              {c.icon} {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* List */}
      {requests && requests.length > 0 ? (
        <div className="space-y-3">
          {requests.map(r => {
            const statusStyle = REQUEST_STATUS_COLORS[r.status as RequestStatus]
            return (
              <Link
                key={r.id}
                href={`/requests/${r.id}`}
                className="block rounded-2xl border p-5 transition-all hover:-translate-y-0.5"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-bold text-base leading-snug">{r.title}</h3>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{ background: statusStyle.bg, color: statusStyle.text }}
                  >
                    {REQUEST_STATUS_LABELS[r.status as RequestStatus]}
                  </span>
                </div>
                <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--muted)' }}>
                  {r.description}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted)' }}>
                  {r.category && <span>📦 {r.category.name}</span>}
                  {(r.budget_min || r.budget_max) && (
                    <span>
                      💰 {r.budget_min && r.budget_max
                        ? `${formatPrice(r.budget_min, r.currency)} – ${formatPrice(r.budget_max, r.currency)}`
                        : formatPrice(r.budget_min ?? r.budget_max, r.currency)}
                    </span>
                  )}
                  {r.quantity && <span>🔢 {r.quantity} бр.</span>}
                  {r.city && <span className="flex items-center gap-1"><MapPin size={12} /> {r.city}</span>}
                  {r.deadline && <span className="flex items-center gap-1"><Clock size={12} /> до {formatDate(r.deadline)}</span>}
                  <span className="ml-auto font-semibold" style={{ color: r.offer_count > 0 ? 'var(--accent)' : 'var(--muted)' }}>
                    {r.offer_count} {r.offer_count === 1 ? 'оферта' : 'оферти'}
                  </span>
                  <span>{formatRelativeTime(r.created_at)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border p-16 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-5xl mb-4">📭</p>
          <p className="font-bold text-lg mb-1">
            {tab === 'mine' ? 'Нямаш публикувани заявки' : 'Няма отворени заявки в момента'}
          </p>
          <p className="text-sm mb-5" style={{ color: 'var(--muted)' }}>
            {tab === 'mine' ? 'Публикувай какво търсиш и продавачите ще ти предложат оферти.' : 'Бъди първият, който публикува заявка!'}
          </p>
          <Link
            href={user ? '/requests/new' : '/login?redirectTo=/requests/new'}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}
          >
            <Plus size={16} /> Публикувай заявка
          </Link>
        </div>
      )}
    </div>
  )
}
