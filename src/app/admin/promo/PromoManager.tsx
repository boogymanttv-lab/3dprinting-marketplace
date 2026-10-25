'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface PromoRow {
  id: string
  code: string
  plan_name: string
  days: number
  max_uses: number | null
  uses: number
  redeemed: number
  valid_until: string | null
  is_active: boolean
  note: string | null
}

const BASE = 'https://www.3dprintingbg.com'

export function PromoManager({ rows, plans }: { rows: PromoRow[]; plans: { id: string; name: string }[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ plan_id: plans[0]?.id ?? '', days: '30', max_uses: '', valid_until: '', code: '', note: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const inputStyle = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/admin/promo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Грешка.'); return }
    setForm(f => ({ ...f, code: '', note: '', max_uses: '', valid_until: '' }))
    router.refresh()
  }

  async function toggle(id: string, is_active: boolean) {
    await fetch('/api/admin/promo', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active }),
    })
    router.refresh()
  }

  async function copy(code: string) {
    await navigator.clipboard.writeText(`${BASE}/register?promo=${code}`)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="rounded-2xl border p-5 space-y-4 max-w-2xl"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-sm font-bold">Нов промо линк</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            <span className="block mb-1">План</span>
            <select value={form.plan_id} onChange={set('plan_id')} className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle}>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            <span className="block mb-1">Безплатни дни</span>
            <input type="number" min={1} max={365} value={form.days} onChange={set('days')}
              className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle} />
          </label>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            <span className="block mb-1">Макс. регистрации (по избор)</span>
            <input type="number" min={1} value={form.max_uses} onChange={set('max_uses')} placeholder="без лимит"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle} />
          </label>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            <span className="block mb-1">Линкът важи до (по избор)</span>
            <input type="date" value={form.valid_until} onChange={set('valid_until')}
              className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle} />
          </label>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            <span className="block mb-1">Код (по избор, иначе се генерира)</span>
            <input value={form.code} onChange={set('code')} placeholder="напр. FIVERR30" maxLength={20}
              className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle} />
          </label>
          <label className="text-xs" style={{ color: 'var(--muted)' }}>
            <span className="block mb-1">Бележка (по избор)</span>
            <input value={form.note} onChange={set('note')} placeholder="за кого/къде е"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle} />
          </label>
        </div>
        {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
        <button type="submit" disabled={loading} className="text-sm font-bold px-5 py-2.5 rounded-xl"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Създаване...' : 'Създай линк'}
        </button>
      </form>

      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Линк', 'План', 'Регистрации', 'Магазини', 'Валиден до', 'Статус', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ color: 'var(--muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--muted)' }}>Още няма линкове.</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-3">
                    <div className="font-mono font-bold">{r.code}</div>
                    {r.note && <div className="text-xs" style={{ color: 'var(--muted)' }}>{r.note}</div>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.plan_name} · {r.days} дни</td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.uses}{r.max_uses ? ` / ${r.max_uses}` : ''}</td>
                  <td className="px-4 py-3 whitespace-nowrap" title="Отворили магазин с промото">{r.redeemed}</td>
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                    {r.valid_until ? new Date(r.valid_until).toLocaleDateString('bg-BG') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ background: r.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: r.is_active ? '#22c55e' : '#f87171' }}>
                      {r.is_active ? 'Активен' : 'Спрян'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => copy(r.code)} className="text-xs font-semibold mr-3"
                      style={{ color: copied === r.code ? 'var(--green)' : 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {copied === r.code ? '✓ Копирано!' : 'Копирай линка'}
                    </button>
                    <button onClick={() => toggle(r.id, !r.is_active)} className="text-xs"
                      style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {r.is_active ? 'Спри' : 'Включи'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
