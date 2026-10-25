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

  // ── Масов избор ──
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulk, setBulk] = useState({ plan_id: 'free', starts_at: new Date().toISOString().slice(0, 10), expires_at: '' })
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const allSelected = shops.length > 0 && selected.size === shops.length
  const toggleOne = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(shops.map(s => s.id)))

  async function applyBulk() {
    setBulkMsg(null)
    const planName = plans.find(p => p.id === bulk.plan_id)?.name ?? bulk.plan_id
    const period = bulk.plan_id === 'free' ? '' : ` до ${bulk.expires_at || '?'}`
    if (!confirm(`Да зададя план „${planName}“${period} на ${selected.size} магазина? На всеки собственик ще се прати имейл.`)) return

    setBulkLoading(true)
    const res = await fetch('/api/admin/shops/bulk-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shop_ids: [...selected],
        plan_id: bulk.plan_id,
        starts_at: bulk.starts_at || null,
        expires_at: bulk.expires_at || null,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setBulkLoading(false)
    if (!res.ok) { setBulkMsg({ ok: false, text: data.error || 'Грешка при запис.' }); return }
    setBulkMsg({
      ok: true,
      text: `Обновени: ${data.updated}${data.skipped ? ` · пропуснати (платен Stripe абонамент): ${data.skipped}` : ''}${data.hidden ? ` · скрити обяви: ${data.hidden}` : ''}`,
    })
    setSelected(new Set())
    router.refresh()
  }

  return (
    <>
    {isSuperAdmin && (selected.size > 0 || bulkMsg) && (
      <div className="rounded-2xl border p-4 mb-4 space-y-3"
        style={{ background: 'var(--card)', borderColor: 'var(--accent)' }}>
        {selected.size > 0 && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-bold">Избрани: {selected.size} магазина</p>
              <button onClick={() => setSelected(new Set())} className="text-xs"
                style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Изчисти избора
              </button>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <label className="text-xs" style={{ color: 'var(--muted)' }}>
                <span className="block mb-1">План</span>
                <select value={bulk.plan_id} onChange={e => setBulk(b => ({ ...b, plan_id: e.target.value }))}
                  className="text-xs px-2 py-1.5 rounded-lg outline-none" style={dateStyle}>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              {bulk.plan_id !== 'free' && (
                <>
                  <label className="text-xs" style={{ color: 'var(--muted)' }}>
                    <span className="block mb-1">От</span>
                    <input type="date" value={bulk.starts_at}
                      onChange={e => setBulk(b => ({ ...b, starts_at: e.target.value }))}
                      className="text-xs px-2 py-1 rounded-lg outline-none" style={dateStyle} />
                  </label>
                  <label className="text-xs" style={{ color: 'var(--muted)' }}>
                    <span className="block mb-1">До</span>
                    <input type="date" value={bulk.expires_at}
                      onChange={e => setBulk(b => ({ ...b, expires_at: e.target.value }))}
                      className="text-xs px-2 py-1 rounded-lg outline-none" style={dateStyle} />
                  </label>
                </>
              )}
              <button onClick={applyBulk} disabled={bulkLoading}
                className="text-sm font-bold px-4 py-2 rounded-xl"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: bulkLoading ? 0.6 : 1 }}>
                {bulkLoading ? 'Прилагане...' : `Приложи на ${selected.size}`}
              </button>
            </div>
          </>
        )}
        {bulkMsg && (
          <p className="text-xs rounded-lg px-3 py-2"
            style={{ background: bulkMsg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: bulkMsg.ok ? 'var(--green)' : '#f87171' }}>
            {bulkMsg.text}
          </p>
        )}
      </div>
    )}
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {isSuperAdmin && (
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-orange-500"
                    title="Маркирай всички" />
                </th>
              )}
              {['Магазин', 'Собственик', 'План', 'Град', 'Статус', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shops.map(shop => (
              <tr key={shop.id} style={{ borderBottom: '1px solid var(--border)', background: selected.has(shop.id) ? 'rgba(249,115,22,0.05)' : undefined }}>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(shop.id)} onChange={() => toggleOne(shop.id)}
                      className="accent-orange-500" />
                  </td>
                )}
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
    </>
  )
}
