'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface AdminShopRow {
  id: string
  name: string
  slug: string
  city: string | null
  is_active: boolean
  plan_id: string
  billing_interval: 'monthly' | 'yearly' | null
  stripe_subscription_id: string | null
  plan_starts_at: string | null
  plan_expires_at: string | null
  total_sales: number
  created_at: string
  owner_email: string | null
}

export interface AdminPlanOption {
  id: string
  name: string
}

export function ShopsTable({ shops, plans, isSuperAdmin }: {
  shops: AdminShopRow[]; plans: AdminPlanOption[]; isSuperAdmin: boolean
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState({ plan_id: 'free', starts_at: '', expires_at: '' })
  const [error, setError] = useState('')

  const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('bg-BG') : '—')

  function startEdit(shop: AdminShopRow) {
    setError('')
    setEditingId(shop.id)
    setDraft({
      plan_id: shop.plan_id,
      starts_at: toDateInput(shop.plan_starts_at) || new Date().toISOString().slice(0, 10),
      expires_at: toDateInput(shop.plan_expires_at),
    })
  }

  async function savePlan(shopId: string) {
    setError('')
    setLoadingId(shopId)
    const res = await fetch(`/api/admin/shops/${shopId}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: draft.plan_id,
        starts_at: draft.starts_at || null,
        expires_at: draft.expires_at || null,
      }),
    })
    setLoadingId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Грешка при запис.')
      return
    }
    setEditingId(null)
    router.refresh()
  }

  const dateStyle = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }

  return (
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
            {shops.map(shop => (
              <tr key={shop.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-4 py-3 font-semibold">{shop.name}</td>
                <td className="px-4 py-3" style={{ color: 'var(--muted)' }}>{shop.owner_email ?? '—'}</td>
                <td className="px-4 py-3">
                  {isSuperAdmin && editingId === shop.id ? (
                    <div className="space-y-1.5" style={{ minWidth: 190 }}>
                      <select
                        value={draft.plan_id}
                        onChange={e => setDraft(d => ({ ...d, plan_id: e.target.value }))}
                        className="w-full text-xs px-2 py-1.5 rounded-lg outline-none" style={dateStyle}
                      >
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {draft.plan_id !== 'free' && (
                        <>
                          <label className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                            От
                            <input type="date" value={draft.starts_at}
                              onChange={e => setDraft(d => ({ ...d, starts_at: e.target.value }))}
                              className="text-xs px-2 py-1 rounded-lg outline-none" style={dateStyle} />
                          </label>
                          <label className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                            До
                            <input type="date" value={draft.expires_at}
                              onChange={e => setDraft(d => ({ ...d, expires_at: e.target.value }))}
                              className="text-xs px-2 py-1 rounded-lg outline-none" style={dateStyle} />
                          </label>
                        </>
                      )}
                      {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
                      <div className="flex gap-1.5">
                        <button onClick={() => savePlan(shop.id)} disabled={loadingId === shop.id}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg"
                          style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loadingId === shop.id ? 0.6 : 1 }}>
                          Запази
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="text-xs px-2.5 py-1.5 rounded-lg"
                          style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{plans.find(p => p.id === shop.plan_id)?.name ?? shop.plan_id}</span>
                        {!shop.stripe_subscription_id && shop.plan_id !== 'free' && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}
                            title="Планът е зададен ръчно от админ, без Stripe плащане">
                            🎁 ръчно
                          </span>
                        )}
                        {isSuperAdmin && (
                          <button onClick={() => startEdit(shop)} className="text-xs font-semibold"
                            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                            Промени
                          </button>
                        )}
                      </div>
                      {shop.plan_id !== 'free' && shop.plan_expires_at && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                          {shop.plan_starts_at ? `${fmt(shop.plan_starts_at)} → ` : 'до '}{fmt(shop.plan_expires_at)}
                        </p>
                      )}
                    </div>
                  )}
                </td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
