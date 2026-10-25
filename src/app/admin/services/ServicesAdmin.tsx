'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface AdminServiceRow { code: string; kind: string; name: string; days: number; price_credits: number; is_active: boolean }
export interface AdminOrderRow {
  id: string; name: string; kind: string; status: string; price_credits: number; details: string | null
  listing_id: string | null; created_at: string; ends_at: string | null
  shop_name: string; shop_slug: string | null; email: string
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Активна', pending: 'Чака', in_progress: 'В изпълнение', done: 'Изпълнена', cancelled: 'Отказана',
}

export function ServicesAdmin({ services, orders }: { services: AdminServiceRow[]; orders: AdminOrderRow[] }) {
  const router = useRouter()
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [grant, setGrant] = useState({ email: '', amount: '', note: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const inputStyle = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }
  const pending = orders.filter(o => o.kind === 'ad' && (o.status === 'pending' || o.status === 'in_progress'))

  async function call(url: string, method: string, body: unknown) {
    setBusy(true); setMsg(null)
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Грешка.' }); return false }
    router.refresh()
    return true
  }

  async function setStatus(id: string, status: string) {
    if (status === 'cancelled' && !confirm('Да откажа ли поръчката и да върна кредитите на клиента?')) return
    await call('/api/admin/services', 'POST', { id, status })
  }

  async function savePrice(code: string) {
    const value = prices[code]
    if (!value) return
    if (await call('/api/admin/services', 'PATCH', { code, price_credits: value })) {
      setPrices(p => { const n = { ...p }; delete n[code]; return n })
    }
  }

  async function giveCredits(e: React.FormEvent) {
    e.preventDefault()
    if (await call('/api/admin/credits/grant', 'POST', grant)) {
      setMsg({ ok: true, text: `Добавени ${grant.amount} кредита на ${grant.email}.` })
      setGrant({ email: '', amount: '', note: '' })
    }
  }

  return (
    <div className="space-y-8">
      {msg && (
        <p className="text-sm rounded-xl px-4 py-3"
          style={{ background: msg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: msg.ok ? 'var(--green)' : '#f87171' }}>
          {msg.text}
        </p>
      )}

      {/* Опашка с реклами */}
      <section>
        <h3 className="font-bold mb-3">📣 Реклами за изпълнение ({pending.length})</h3>
        {pending.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Няма чакащи реклами.</p>
        ) : (
          <div className="space-y-3">
            {pending.map(o => (
              <div key={o.id} className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-sm">{o.name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {o.shop_slug ? <Link href={`/stores/${o.shop_slug}`} target="_blank" style={{ color: 'var(--accent)' }}>{o.shop_name}</Link> : o.shop_name}
                      {' · '}{o.email}{' · '}{new Date(o.created_at).toLocaleString('bg-BG')}{' · '}{o.price_credits} кр.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'var(--bg3)' }}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>
                {o.details && (
                  <p className="text-sm mt-3 rounded-lg px-3 py-2 whitespace-pre-wrap" style={{ background: 'var(--bg2)' }}>{o.details}</p>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {o.status === 'pending' && (
                    <button onClick={() => setStatus(o.id, 'in_progress')} disabled={busy}
                      className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
                      Започни
                    </button>
                  )}
                  <button onClick={() => setStatus(o.id, 'done')} disabled={busy}
                    className="text-xs font-bold px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: 'none' }}>
                    ✓ Изпълнена
                  </button>
                  <button onClick={() => setStatus(o.id, 'cancelled')} disabled={busy}
                    className="text-xs px-3 py-2 rounded-lg" style={{ border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', background: 'transparent' }}>
                    Откажи и върни кредитите
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Подарък */}
      <section>
        <h3 className="font-bold mb-3">🎁 Подари кредити</h3>
        <form onSubmit={giveCredits} className="flex gap-2 flex-wrap items-end">
          <input type="email" required placeholder="имейл на потребителя" value={grant.email}
            onChange={e => setGrant(g => ({ ...g, email: e.target.value }))}
            className="text-sm px-3 py-2 rounded-lg outline-none" style={{ ...inputStyle, minWidth: 220 }} />
          <input type="number" required min={1} placeholder="кредити" value={grant.amount}
            onChange={e => setGrant(g => ({ ...g, amount: e.target.value }))}
            className="text-sm px-3 py-2 rounded-lg outline-none w-28" style={inputStyle} />
          <input placeholder="бележка (по избор)" value={grant.note}
            onChange={e => setGrant(g => ({ ...g, note: e.target.value }))}
            className="text-sm px-3 py-2 rounded-lg outline-none" style={inputStyle} />
          <button type="submit" disabled={busy} className="text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>Добави</button>
        </form>
      </section>

      {/* Каталог */}
      <section>
        <h3 className="font-bold mb-3">🏷️ Цени на услугите</h3>
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <tbody>
              {services.map(s => (
                <tr key={s.code} style={{ borderBottom: '1px solid var(--border)', opacity: s.is_active ? 1 : 0.5 }}>
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <input type="number" min={1} value={prices[s.code] ?? String(s.price_credits)}
                      onChange={e => setPrices(p => ({ ...p, [s.code]: e.target.value }))}
                      className="text-sm px-2 py-1 rounded-lg outline-none w-24" style={inputStyle} /> кр.
                    <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>
                      ({((parseInt(prices[s.code] ?? String(s.price_credits), 10) || 0) / 100).toFixed(2)} €)
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    {prices[s.code] !== undefined && (
                      <button onClick={() => savePrice(s.code)} disabled={busy} className="text-xs font-bold mr-3"
                        style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Запази</button>
                    )}
                    <button onClick={() => call('/api/admin/services', 'PATCH', { code: s.code, is_active: !s.is_active })}
                      className="text-xs" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {s.is_active ? 'Скрий' : 'Покажи'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Последни покупки */}
      <section>
        <h3 className="font-bold mb-3">Последни покупки</h3>
        <div className="rounded-2xl border overflow-x-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <tbody>
              {orders.length === 0 && <tr><td className="px-4 py-6 text-center" style={{ color: 'var(--muted)' }}>Още няма покупки.</td></tr>}
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="px-4 py-2.5">{o.name}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>{o.shop_name}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{o.price_credits} кр.</td>
                  <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--muted)' }}>{new Date(o.created_at).toLocaleDateString('bg-BG')}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{STATUS_LABEL[o.status] ?? o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
