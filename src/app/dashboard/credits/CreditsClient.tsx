'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TOPUP_PACKAGES, formatCredits, PROMO_LABEL, activePromoRank } from '@/lib/credits'

export interface ServiceRow { code: string; kind: 'promo' | 'vip' | 'top' | 'ad'; channel: string | null; name: string; days: number; price_credits: number }
export interface ListingOption { id: string; title: string; promo_rank: number; promo_until: string | null }
export interface TxRow { id: string; amount: number; type: string; description: string | null; created_at: string }
export interface OrderRow { id: string; name: string; status: string; ends_at: string | null; created_at: string }

interface BasketItem { service: ServiceRow; listing: ListingOption | null }

const KIND_INFO: Record<string, { title: string; icon: string; desc: string }> = {
  promo: { title: 'Промо обява', icon: '🏷️', desc: 'Значка „Промо“ върху обявата.' },
  vip:   { title: 'VIP обява',   icon: '⭐', desc: 'Златна рамка и значка VIP, над обикновените.' },
  top:   { title: 'ТОП обява',   icon: '🔥', desc: 'Най-горе в списъците + значка ТОП.' },
  ad:    { title: 'Реклами',     icon: '📣', desc: 'Ние пускаме реклама за теб. Изпълнява се ръчно до 48 часа. Можеш да избереш няколко канала наведнъж.' },
}
const CHANNEL_ICON: Record<string, string> = { facebook: '📘', instagram: '📸', google: '🔎', tiktok: '🎵' }
const CHANNEL_NAME: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', google: 'Google', tiktok: 'TikTok' }
const STATUS_LABEL: Record<string, string> = {
  active: 'Активна', pending: 'Чака изпълнение', in_progress: 'В изпълнение', done: 'Изпълнена', cancelled: 'Отказана',
}

function serviceLabel(s: ServiceRow) {
  return `${s.channel ? `${CHANNEL_ICON[s.channel] ?? ''} ${CHANNEL_NAME[s.channel] ?? s.channel} · ` : ''}${s.days} ${s.days === 1 ? 'ден' : 'дни'}`
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
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [picker, setPicker] = useState<ServiceRow | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [details, setDetails] = useState('')

  const inputStyle = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }
  const total = basket.reduce((s, b) => s + b.service.price_credits, 0)
  const hasAd = basket.some(b => b.service.kind === 'ad')
  const enough = balance >= total
  const canBuy = basket.length > 0 && enough && busy === null && (!hasAd || details.trim().length >= 5)

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

  function clickService(s: ServiceRow) {
    setMsg(null)
    if (s.kind === 'ad') {
      // Реклама: превключваме в пакета (един и същи канал/срок само веднъж)
      setPicker(null)
      setBasket(b => b.some(x => x.service.code === s.code)
        ? b.filter(x => x.service.code !== s.code)
        : [...b, { service: s, listing: null }])
    } else {
      setPicker(s)
      setPicked(new Set())
    }
  }

  function addPicked() {
    if (!picker) return
    const chosen = listings.filter(l => picked.has(l.id))
    // Една промоция на обява на покупка: новият избор замества стария за същата обява
    setBasket(b => [
      ...b.filter(x => !x.listing || !picked.has(x.listing.id)),
      ...chosen.map(l => ({ service: picker, listing: l })),
    ])
    setPicker(null)
    setPicked(new Set())
  }

  async function buy() {
    setMsg(null); setBusy('buy')
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: basket.map(b => ({ serviceCode: b.service.code, listingId: b.listing?.id ?? null })),
          details,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ ok: false, text: data.error || 'Грешка при покупката.' }) }
      else {
        setMsg({ ok: true, text: data.pending ? 'Готово! Промоциите са активни, а рекламите ще изпълним до 48 часа.' : `Готово! Активирани: ${data.count}.` })
        setBasket([]); setDetails(''); setPicker(null)
        router.refresh()
      }
    } catch { setMsg({ ok: false, text: 'Грешка при покупката.' }) }
    setBusy(null)
  }

  const kinds: ('promo' | 'vip' | 'top' | 'ad')[] = ['promo', 'vip', 'top', 'ad']

  return (
    <div className="space-y-8">
      {/* Баланс */}
      <div className="rounded-2xl border p-6 flex items-center justify-between flex-wrap gap-4"
        style={{ background: 'rgba(249,115,22,0.06)', borderColor: 'var(--accent)' }}>
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Твоят баланс</p>
          <p className="text-4xl font-black" style={{ color: 'var(--accent)' }}>{formatCredits(balance)}</p>
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
        <div>
          <h2 className="font-bold">Услуги</h2>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Можеш да комбинираш: избери услуга, маркирай няколко обяви и ги добави в пакета. Плащаш всичко наведнъж.
          </p>
        </div>

        {kinds.map(kind => {
          const list = services.filter(s => s.kind === kind)
          if (list.length === 0) return null
          const info = KIND_INFO[kind]
          return (
            <div key={kind}>
              <p className="text-sm font-bold">{info.icon} {info.title}</p>
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>{info.desc}</p>
              <div className="flex flex-wrap gap-2">
                {list.map(s => {
                  const inBasket = s.kind === 'ad' && basket.some(b => b.service.code === s.code)
                  const active = inBasket || picker?.code === s.code
                  return (
                    <button key={s.code} onClick={() => clickService(s)}
                      className="rounded-xl border px-3.5 py-2.5 text-left"
                      style={{
                        background: active ? 'rgba(249,115,22,0.1)' : 'var(--card)',
                        borderColor: active ? 'var(--accent)' : 'var(--border)',
                        color: 'var(--text)', cursor: 'pointer',
                      }}>
                      <p className="text-xs font-semibold">{inBasket ? '✓ ' : ''}{serviceLabel(s)}</p>
                      <p className="text-sm font-black" style={{ color: 'var(--accent)' }}>{formatCredits(s.price_credits)}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Избор на обяви */}
        {picker && (
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--accent)' }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="font-bold text-sm">{picker.name} — {formatCredits(picker.price_credits)} на обява</p>
              <button onClick={() => setPicked(picked.size === listings.length ? new Set() : new Set(listings.map(l => l.id)))}
                className="text-xs font-semibold" style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                {picked.size === listings.length ? 'Махни всички' : 'Избери всички'}
              </button>
            </div>

            {listings.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Нямаш активни обяви.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-xl border divide-y" style={{ borderColor: 'var(--border)' }}>
                {listings.map(l => {
                  const r = activePromoRank(l)
                  const other = basket.find(b => b.listing?.id === l.id && b.service.code !== picker.code)
                  return (
                    <label key={l.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm cursor-pointer" style={{ borderColor: 'var(--border)' }}>
                      <input type="checkbox" className="accent-orange-500" checked={picked.has(l.id)}
                        onChange={() => setPicked(p => { const n = new Set(p); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n })} />
                      <span className="flex-1 truncate">{l.title}</span>
                      {r > 0 && <span className="text-xs" style={{ color: 'var(--muted)' }}>сега: {PROMO_LABEL[r]}</span>}
                      {other && <span className="text-xs" style={{ color: '#eab308' }}>в пакета: {other.service.name.split(' — ')[0]} (ще се замени)</span>}
                    </label>
                  )
                })}
              </div>
            )}

            <div className="flex gap-2 items-center flex-wrap">
              <button onClick={addPicked} disabled={picked.size === 0}
                className="text-sm font-bold px-5 py-2.5 rounded-xl"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: picked.size === 0 ? 0.5 : 1 }}>
                Добави в пакета ({picked.size}) · {formatCredits(picked.size * picker.price_credits)}
              </button>
              <button onClick={() => setPicker(null)} className="text-sm px-4 py-2.5 rounded-xl"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}>Затвори</button>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Ако обявата вече има същото ниво, времето се удължава. По-ниско ниво се заменя от по-високото.
            </p>
          </div>
        )}

        {/* Пакет */}
        {basket.length > 0 && (
          <div className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--accent)' }}>
            <p className="font-bold text-sm">🛒 Твоят пакет ({basket.length})</p>
            <div className="divide-y rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {basket.map((b, i) => (
                <div key={`${b.service.code}-${b.listing?.id ?? i}`} className="flex items-center gap-3 px-3.5 py-2.5 text-sm" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{b.service.name}</p>
                    {b.listing && <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{b.listing.title}</p>}
                  </div>
                  <span className="font-black whitespace-nowrap" style={{ color: 'var(--accent)' }}>{formatCredits(b.service.price_credits)}</span>
                  <button onClick={() => setBasket(bs => bs.filter((_, j) => j !== i))}
                    className="text-xs px-2 py-1 rounded-lg" aria-label="Премахни"
                    style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>

            {hasAd && (
              <label className="block text-xs" style={{ color: 'var(--muted)' }}>
                <span className="block mb-1.5">Какво да рекламираме? (линк към обява/магазин, цел, град, бележки) — важи за всички реклами в пакета</span>
                <textarea value={details} onChange={e => setDetails(e.target.value)} rows={4} maxLength={1000}
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none resize-y" style={inputStyle} />
              </label>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Общо</span>
              <span className="text-xl font-black" style={{ color: 'var(--accent)' }}>{formatCredits(total)}</span>
            </div>

            {!enough && (
              <p className="text-xs" style={{ color: '#f87171' }}>
                Нямаш достатъчно кредити (липсват {formatCredits(total - balance)}). Зареди отгоре.
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={buy} disabled={!canBuy}
                className="text-sm font-bold px-5 py-2.5 rounded-xl"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: canBuy ? 1 : 0.5 }}>
                {busy === 'buy' ? 'Обработка...' : `Купи пакета за ${formatCredits(total)}`}
              </button>
              <button onClick={() => { setBasket([]); setDetails('') }} className="text-sm px-4 py-2.5 rounded-xl"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)', background: 'transparent' }}>
                Изчисти
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
