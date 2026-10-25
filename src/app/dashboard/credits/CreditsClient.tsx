'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TOPUP_PACKAGES, formatCredits, PROMO_LABEL, activePromoRank } from '@/lib/credits'

export interface ServiceRow { code: string; kind: 'promo' | 'vip' | 'top' | 'ad'; channel: string | null; name: string; days: number; price_credits: number }
export interface ListingOption { id: string; title: string; promo_rank: number; promo_until: string | null }
export interface TxRow { id: string; amount: number; type: string; description: string | null; created_at: string }
export interface OrderRow { id: string; name: string; status: string; ends_at: string | null; created_at: string }

const KIND_INFO: Record<string, { title: string; icon: string; desc: string }> = {
  promo: { title: 'Промо обява', icon: '🏷️', desc: 'Значка „Промо“ върху обявата.' },
  vip:   { title: 'VIP обява',   icon: '⭐', desc: 'Златна рамка и значка VIP, над обикновените.' },
  top:   { title: 'ТОП обява',   icon: '🔥', desc: 'Най-горе в списъците + значка ТОП.' },
  ad:    { title: 'Реклами',     icon: '📣', desc: 'Ние пускаме реклама за теб. Изпълнява се ръчно до 48 часа.' },
}
const CHANNEL_ICON: Record<string, string> = { facebook: '📘', instagram: '📸', google: '🔎', tiktok: '🎵' }
const STATUS_LABEL: Record<string, string> = {
  active: 'Активна', pending: 'Чака изпълнение', in_progress: 'В изпълнение', done: 'Изпълнена', cancelled: 'Отказана',
}

export function CreditsClient({ balance, topupStatus, services, listings, txs, orders }: {
  balance: number; topupStatus: string | null
  services: ServiceRow[]; listings: ListingOption[]; txs: TxRow[]; orders: OrderRow[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(
    topupStatus === 'success' ? { ok: true, text: 'Плащането е прието. Кредитите се добавят до няколко секунди — обнови страницата, ако още не се виждат.' }
    : topupStatus === 'cancelled' ? { ok: false, text: 'Зареждането беше отказано.' } : null
  )
  const [selected, setSelected] = useState<ServiceRow | null>(null)
  const [listingId, setListingId] = useState('')
  const [details, setDetails] = useState('')

  const inputStyle = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }

  async function topup(packageId: string) {
    setMsg(null); setBusy(packageId)
    try {
      const res = await fetch('/api/credits/topup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      setMsg({ ok: false, text: data.error || 'Грешка при зареждане.' })
    } catch { setMsg({ ok: false, text: 'Грешка при зареждане.' }) }
    setBusy(null)
  }

  async function purchase() {
    if (!selected) return
    setMsg(null); setBusy('buy')
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceCode: selected.code, listingId: listingId || null, details }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ ok: false, text: data.error || 'Грешка при покупката.' }) }
      else {
        setMsg({ ok: true, text: data.pending ? 'Заявката е изпратена. Ще я изпълним до 48 часа.' : 'Готово! Промоцията е активна.' })
        setSelected(null); setListingId(''); setDetails('')
        router.refresh()
      }
    } catch { setMsg({ ok: false, text: 'Грешка при покупката.' }) }
    setBusy(null)
  }

  const kinds: ('promo' | 'vip' | 'top' | 'ad')[] = ['promo', 'vip', 'top', 'ad']
  const enough = selected ? balance >= selected.price_credits : true

  return (
    <div className="space-y-8">
      {/* Баланс */}
      <div className="rounded-2xl border p-6 flex items-center justify-between flex-wrap gap-4"
        style={{ background: 'rgba(249,115,22,0.06)', borderColor: 'var(--accent)' }}>
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Твоят баланс</p>
          <p className="text-4xl font-black" style={{ color: 'var(--accent)' }}>{formatCredits(balance)}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>≈ {(balance / 100).toFixed(2)} €</p>
        </div>
        <p className="text-xs max-w-xs" style={{ color: 'var(--muted)' }}>
          Кредитите се използват само за услуги в 3DPrintingBG. Не се теглят и не се връщат в пари.
        </p>
      </div>

      {msg && (
        <p className="text-sm rounded-xl px-4 py-3"
          style={{ background: msg.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: msg.ok ? 'var(--green)' : '#f87171' }}>
          {msg.text}
        </p>
      )}

      {/* Зареждане */}
      <section>
        <h2 className="font-bold mb-3">Зареди кредити</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {TOPUP_PACKAGES.map(p => (
            <button key={p.id} onClick={() => topup(p.id)} disabled={busy !== null}
              className="rounded-2xl border p-4 text-center transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)', cursor: 'pointer', opacity: busy && busy !== p.id ? 0.5 : 1 }}>
              <p className="text-xl font-black">{(p.credits + p.bonus).toLocaleString('bg-BG')}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>кредита</p>
              {p.bonus > 0
                ? <p className="text-xs font-bold mt-1" style={{ color: '#22c55e' }}>+{p.bonus} бонус</p>
                : <p className="text-xs mt-1">&nbsp;</p>}
              <p className="mt-2 text-sm font-bold" style={{ color: 'var(--accent)' }}>
                {busy === p.id ? '...' : `${p.eur} €`}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Услуги */}
      <section className="space-y-6">
        <h2 className="font-bold">Услуги</h2>
        {kinds.map(kind => {
          const list = services.filter(s => s.kind === kind)
          if (list.length === 0) return null
          const info = KIND_INFO[kind]
          return (
            <div key={kind}>
              <p className="text-sm font-bold">{info.icon} {info.title}</p>
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{info.desc}</p>
              <div className="flex flex-wrap gap-2">
                {list.map(s => (
                  <button key={s.code} onClick={() => { setSelected(s); setMsg(null) }}
                    className="rounded-xl border px-3.5 py-2.5 text-left"
                    style={{
                      background: selected?.code === s.code ? 'rgba(249,115,22,0.1)' : 'var(--card)',
                      borderColor: selected?.code === s.code ? 'var(--accent)' : 'var(--border)',
                      color: 'var(--text)', cursor: 'pointer',
                    }}>
                    <p className="text-xs font-semibold">
                      {s.channel ? `${CHANNEL_ICON[s.channel] ?? ''} ${s.name.replace(/^Реклама (във|в) /, '').replace(/ — .*/, '')} · ` : ''}{s.days} {s.days === 1 ? 'ден' : 'дни'}
                    </p>
                    <p className="text-sm font-black" style={{ color: 'var(--accent)' }}>{formatCredits(s.price_credits)}</p>
                  </button>
                ))}
              </div>
            </div>
          )
        })}

        {selected && (
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--accent)' }}>
            <p className="font-bold text-sm">{selected.name} — {formatCredits(selected.price_credits)}</p>

            {selected.kind !== 'ad' ? (
              <label className="block text-xs" style={{ color: 'var(--muted)' }}>
                <span className="block mb-1.5">Избери обява</span>
                <select value={listingId} onChange={e => setListingId(e.target.value)}
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none" style={inputStyle}>
                  <option value="">— избери —</option>
                  {listings.map(l => {
                    const r = activePromoRank(l)
                    return <option key={l.id} value={l.id}>{l.title}{r ? ` (сега: ${PROMO_LABEL[r]})` : ''}</option>
                  })}
                </select>
                <span className="block mt-1.5">Ако обявата вече има същото ниво, времето се удължава. По-ниско ниво се заменя от по-високото.</span>
              </label>
            ) : (
              <label className="block text-xs" style={{ color: 'var(--muted)' }}>
                <span className="block mb-1.5">Какво да рекламираме? (линк към обява/магазин, цел, град, бележки)</span>
                <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4} maxLength={1000}
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none resize-y" style={inputStyle} />
              </label>
            )}

            {!enough && (
              <p className="text-xs" style={{ color: '#f87171' }}>
                Нямаш достатъчно кредити (липсват {formatCredits(selected.price_credits - balance)}). Зареди отгоре.
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={purchase} disabled={busy !== null || !enough || (selected.kind !== 'ad' && !listingId)}
                className="text-sm font-bold px-5 py-2.5 rounded-xl"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none',
                  opacity: (busy !== null || !enough || (selected.kind !== 'ad' && !listingId)) ? 0.5 : 1 }}>
                {busy === 'buy' ? 'Обработка...' : `Купи за ${formatCredits(selected.price_credits)}`}
              </button>
              <button onClick={() => setSelected(null)} className="text-sm px-4 py-2.5 rounded-xl"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}>
                Отказ
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Поръчани услуги */}
      {orders.length > 0 && (
        <section>
          <h2 className="font-bold mb-3">Моите услуги</h2>
          <div className="rounded-2xl border divide-y overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            {orders.map(o => (
              <div key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{o.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(o.created_at).toLocaleDateString('bg-BG')}
                    {o.ends_at ? ` · до ${new Date(o.ends_at).toLocaleDateString('bg-BG')}` : ''}
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: 'var(--bg3)', color: o.status === 'done' || o.status === 'active' ? '#22c55e' : 'var(--muted)' }}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* История */}
      <section>
        <h2 className="font-bold mb-3">История</h2>
        {txs.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Още няма движения.</p>
        ) : (
          <div className="rounded-2xl border divide-y overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            {txs.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <p>{t.description ?? t.type}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(t.created_at).toLocaleString('bg-BG')}</p>
                </div>
                <span className="font-black" style={{ color: t.amount > 0 ? '#22c55e' : 'var(--text)' }}>
                  {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString('bg-BG')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
