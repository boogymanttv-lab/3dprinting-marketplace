'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice, formatRelativeTime } from '@/lib/utils'

// ── Seller: submit an offer ──────────────────────────
interface OfferFormProps {
  requestId: string
  shopId: string
  currency: string
}

export function OfferForm({ requestId, shopId, currency }: OfferFormProps) {
  const router = useRouter()
  const [price, setPrice] = useState('')
  const [etaDays, setEtaDays] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!price || parseFloat(price) <= 0) { setError('Въведи валидна цена.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error: insertError } = await supabase.from('request_offers').insert({
      request_id: requestId,
      shop_id: shopId,
      price: parseFloat(price),
      currency,
      eta_days: etaDays ? parseInt(etaDays) : null,
      message: message.trim() || null,
    })

    if (insertError) {
      setError(insertError.message?.includes('лимит') ? insertError.message : 'Грешка при изпращане на офертата. Опитай отново.')
      setLoading(false)
      return
    }

    router.refresh()
  }

  const inputStyle = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <h3 className="font-bold text-sm">💬 Предложи оферта</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--muted)' }}>Цена (€) *</label>
          <input type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="25.00" />
        </div>
        <div>
          <label className="text-xs block mb-1.5" style={{ color: 'var(--muted)' }}>Срок (дни)</label>
          <input type="number" min="1" value={etaDays} onChange={e => setEtaDays(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={inputStyle} placeholder="3" />
        </div>
      </div>
      <div>
        <label className="text-xs block mb-1.5" style={{ color: 'var(--muted)' }}>Съобщение (по избор)</label>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none" style={inputStyle}
          placeholder="Мога да го направя от PETG за здравина..." />
      </div>
      {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-2.5 rounded-xl text-sm font-bold"
        style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Изпращане...' : '📤 Изпрати оферта'}
      </button>
    </form>
  )
}

// ── Buyer: view + accept offers ──────────────────────
interface Offer {
  id: string
  price: number
  currency: string
  eta_days: number | null
  message: string | null
  status: string
  created_at: string
  shop: { id: string; name: string; slug: string; rating: number; review_count: number; logo_url: string | null } | null
}

interface OffersListProps {
  offers: Offer[]
  requestOpen: boolean
}

export function OffersList({ offers, requestOpen }: OffersListProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleAccept(offerId: string) {
    setError('')
    setLoadingId(offerId)
    const supabase = createClient()
    const { data: listingId, error: rpcError } = await supabase.rpc('accept_request_offer', { p_offer_id: offerId })

    if (rpcError || !listingId) {
      setError(rpcError?.message ?? 'Грешка при приемане на офертата.')
      setLoadingId(null)
      return
    }

    router.push(`/listings/${listingId}?fromRequest=1`)
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-3xl mb-2">📭</p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Все още няма оферти. Продавачите ще виждат заявката ти и ще предложат цена.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}
      {offers.map(offer => (
        <div key={offer.id} className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="font-bold text-sm">{offer.shop?.name ?? 'Магазин'}</p>
              {(offer.shop?.review_count ?? 0) > 0 && (
                <p className="text-xs" style={{ color: 'var(--muted)' }}>⭐ {offer.shop?.rating.toFixed(1)} ({offer.shop?.review_count} ревюта)</p>
              )}
            </div>
            <p className="text-xl font-black flex-shrink-0" style={{ color: 'var(--accent)' }}>
              {formatPrice(offer.price, offer.currency)}
            </p>
          </div>
          {offer.eta_days && (
            <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>⏱ Готово за ~{offer.eta_days} {offer.eta_days === 1 ? 'ден' : 'дни'}</p>
          )}
          {offer.message && (
            <p className="text-sm mb-3 rounded-lg p-3" style={{ background: 'var(--bg2)', color: 'var(--text)' }}>
              {offer.message}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{formatRelativeTime(offer.created_at)}</p>
            {offer.status === 'accepted' ? (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                ✓ Приета
              </span>
            ) : offer.status === 'declined' ? (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'var(--bg3)', color: 'var(--muted)' }}>
                Отхвърлена
              </span>
            ) : requestOpen ? (
              <button onClick={() => handleAccept(offer.id)} disabled={loadingId === offer.id}
                className="text-xs font-bold px-4 py-2 rounded-lg"
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loadingId === offer.id ? 0.7 : 1 }}>
                {loadingId === offer.id ? 'Приемане...' : '✓ Приеми офертата'}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}
