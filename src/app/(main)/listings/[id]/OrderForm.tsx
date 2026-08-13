'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { addToCart } from '@/lib/cart'
import { ShoppingCart } from 'lucide-react'
import type { Listing } from '@/types'

interface OrderFormProps {
  listing: Listing
  shopHasInvoice: boolean
  cardEnabled: boolean
  shopName: string
}

type PaymentMethod = 'card' | 'cod' | 'in_person'
type Courier = 'econt' | 'speedy' | 'pigeon'
type DeliveryType = 'office' | 'address' | 'in_person'

const COURIERS: { key: Courier; label: string; logo: string }[] = [
  { key: 'econt',  label: 'Еконт',         logo: '📦' },
  { key: 'speedy', label: 'Speedy',         logo: '🚀' },
  { key: 'pigeon', label: 'Pigeon Express', logo: '🕊️' },
]

const DELIVERY_OPTIONS: { key: DeliveryType; label: string }[] = [
  { key: 'office',    label: '🏢 До офис' },
  { key: 'address',   label: '🏠 До адрес' },
  { key: 'in_person', label: '🤝 Лично предаване' },
]

// Which payment methods are allowed per delivery type. Card payments
// (via Stripe Connect) only show up if the seller has completed onboarding
// — see `cardEnabled` prop, driven by shops.stripe_connect_charges_enabled.
function allowedPayments(cardEnabled: boolean): Record<DeliveryType, { key: PaymentMethod; label: string }[]> {
  const card = { key: 'card' as const, label: '💳 С карта' }
  const cod = { key: 'cod' as const, label: '💵 Наложен платеж' }
  return {
    office:    cardEnabled ? [card, cod] : [cod],
    address:   cardEnabled ? [card, cod] : [cod],
    in_person: [{ key: 'in_person', label: '🤝 Лично' }],
  }
}

export function OrderForm({ listing, shopHasInvoice, cardEnabled, shopName }: OrderFormProps) {
  const ALLOWED_PAYMENTS = allowedPayments(cardEnabled)
  const router = useRouter()
  const [qty, setQty] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('office')
  const [payment, setPayment] = useState<PaymentMethod>('cod')
  const [courier, setCourier] = useState<Courier>('econt')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [needsInvoice, setNeedsInvoice] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // When delivery type changes, auto-select first allowed payment method
  function handleDeliveryChange(type: DeliveryType) {
    setDeliveryType(type)
    setPayment(ALLOWED_PAYMENTS[type][0].key)
    setAddress('')
  }

  const needsCourier = deliveryType === 'office' || deliveryType === 'address'

  const total = listing.price * qty

  async function handleOrder() {
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/login?redirectTo=/listings/${listing.id}`)
      return
    }

    if (needsCourier && !address.trim()) {
      setError(deliveryType === 'office' ? 'Моля въведи офис за доставка.' : 'Моля въведи адрес за доставка.')
      setLoading(false)
      return
    }

    if (phone.trim().replace(/[\s()-]/g, '').length < 6) {
      setError('Моля въведи валиден телефон за връзка.')
      setLoading(false)
      return
    }

    if (payment === 'card') {
      try {
        const res = await fetch('/api/stripe/order-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listingId: listing.id,
            quantity: qty,
            deliveryType,
            courier: needsCourier ? courier : undefined,
            address: needsCourier ? address : undefined,
            phone: phone.trim(),
            needsInvoice,
          }),
        })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
          return
        }
        setError(data.error || 'Грешка при връзка със Stripe.')
      } catch {
        setError('Грешка при връзка със Stripe.')
      }
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.id,
          shop_id: listing.shop_id,
          listing_title: listing.title,
          listing_price: listing.price,
          listing_image: listing.images?.[0] ?? null,
          quantity: qty,
          total_amount: total,
          payment_method: payment,
          buyer_phone: phone.trim(),
          shipping_address: needsCourier
            ? { courier, delivery_type: deliveryType, address }
            : { delivery_type: 'in_person' },
          needs_invoice: needsInvoice,
          status: 'new',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Грешка при поръчката. Опитай отново.')
        setLoading(false)
        return
      }
    } catch {
      setError('Грешка при поръчката. Опитай отново.')
      setLoading(false)
      return
    }

    router.push('/dashboard/my-orders?success=1')
  }

  function handleAddToCart() {
    addToCart({
      listingId: listing.id,
      title: listing.title,
      price: listing.price,
      currency: listing.currency,
      image: listing.images?.[0] ?? null,
      shopId: listing.shop_id,
      shopName,
      maxQty: listing.quantity,
    }, qty)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  const inputStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  }

  // Highlighted style for required fields that are easy to miss (address, phone)
  const requiredInputStyle = {
    background: 'rgba(249,115,22,0.06)',
    border: '1.5px solid var(--accent)',
    color: 'var(--text)',
  }

  return (
    <div className="space-y-4">
      {/* Quantity */}
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: 'var(--muted)' }}>Количество:</span>
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center text-lg font-bold hover:opacity-80"
            style={{ background: 'var(--bg3)', color: 'var(--text)', border: 'none' }}>−</button>
          <span className="w-10 text-center font-bold text-sm">{qty}</span>
          <button onClick={() => setQty(q => Math.min(listing.quantity, q + 1))}
            className="w-9 h-9 flex items-center justify-center text-lg font-bold hover:opacity-80"
            style={{ background: 'var(--bg3)', color: 'var(--text)', border: 'none' }}>+</button>
        </div>
        {qty > 1 && (
          <span className="text-xs" style={{ color: 'var(--muted)' }}>= {formatPrice(total, listing.currency)}</span>
        )}
        <button
          type="button"
          onClick={handleAddToCart}
          className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg transition-colors"
          style={{
            background: addedToCart ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.1)',
            border: `1.5px solid ${addedToCart ? 'var(--green)' : 'var(--accent)'}`,
            color: addedToCart ? 'var(--green)' : 'var(--accent)',
          }}
        >
          <ShoppingCart size={13} />
          {addedToCart ? '✓ Добавено!' : 'Добави в количката'}
        </button>
      </div>

      {/* Delivery section */}
      <div className="rounded-xl border p-4 space-y-3" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>🚚 Начин на доставка</p>

        {/* Delivery type */}
        <div className="flex gap-2">
          {DELIVERY_OPTIONS.map(opt => (
            <button key={opt.key} type="button" onClick={() => handleDeliveryChange(opt.key)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: deliveryType === opt.key ? 'rgba(249,115,22,0.08)' : 'var(--bg3)',
                border: `1.5px solid ${deliveryType === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                color: deliveryType === opt.key ? 'var(--accent)' : 'var(--muted)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Courier + address — only for office/address delivery */}
        {needsCourier && (
          <>
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Куриерска фирма</p>
              <div className="flex gap-2">
                {COURIERS.map(c => (
                  <button key={c.key} type="button" onClick={() => setCourier(c.key)}
                    className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: courier === c.key ? 'rgba(249,115,22,0.08)' : 'var(--bg3)',
                      border: `1.5px solid ${courier === c.key ? 'var(--accent)' : 'var(--border)'}`,
                      color: courier === c.key ? 'var(--accent)' : 'var(--muted)',
                    }}>
                    <span className="text-base">{c.logo}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--accent)' }}>
                {deliveryType === 'office' ? '🏢 Офис за доставка *' : '🏠 Адрес за доставка *'}
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder={deliveryType === 'office'
                  ? `Офис на ${COURIERS.find(c => c.key === courier)?.label} — напр. „Ленин 5, София"`
                  : 'ул. Витоша 12, ет. 3, София 1000'}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
                style={requiredInputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--accent)'}
              />
            </div>
          </>
        )}

        {deliveryType === 'in_person' && (
          <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg3)', color: 'var(--muted)' }}>
            🤝 Ще се договорите с продавача за място и час на предаване чрез съобщения.
          </p>
        )}

        {/* Phone — required so the seller/courier can reach the buyer */}
        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--accent)' }}>📞 Телефон за връзка *</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="напр. 0888 123 456"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
            style={requiredInputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--accent)'}
          />
        </div>
      </div>

      {/* Payment — options depend on delivery type */}
      <div>
        <label className="text-sm block mb-2" style={{ color: 'var(--muted)' }}>Начин на плащане</label>
        <div className="flex gap-2 flex-wrap">
          {ALLOWED_PAYMENTS[deliveryType].map(opt => (
            <button key={opt.key} type="button" onClick={() => setPayment(opt.key)}
              className="px-3 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: payment === opt.key ? 'rgba(249,115,22,0.1)' : 'var(--bg2)',
                border: `1.5px solid ${payment === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                color: payment === opt.key ? 'var(--accent)' : 'var(--muted)',
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice */}
      {shopHasInvoice ? (
        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: 'var(--muted)' }}>
          <input type="checkbox" checked={needsInvoice} onChange={e => setNeedsInvoice(e.target.checked)} className="accent-orange-500" />
          Искам фактура
        </label>
      ) : (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>ℹ️ Магазинът не предлага фактури</p>
      )}

      {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

      {/* Order Button */}
      <button onClick={handleOrder} disabled={loading}
        className="w-full py-3.5 rounded-xl text-sm font-bold transition-opacity"
        style={{ background: 'linear-gradient(135deg, var(--accent), #f59e0b)', color: '#fff', border: 'none', opacity: loading ? 0.7 : 1 }}>
        {loading ? 'Обработка...' : `🛒 Поръчай — ${formatPrice(total, listing.currency)}`}
      </button>
    </div>
  )
}
