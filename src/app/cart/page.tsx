'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { getCart, updateCartQty, removeFromCart, clearCart, type CartItem } from '@/lib/cart'

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

export default function CartPage() {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('office')
  const [courier, setCourier] = useState<Courier>('econt')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setItems(getCart())
    setLoaded(true)
  }, [])

  function refresh() {
    setItems(getCart())
  }

  function changeQty(listingId: string, qty: number) {
    updateCartQty(listingId, qty)
    refresh()
  }

  function remove(listingId: string) {
    removeFromCart(listingId)
    refresh()
  }

  const grandTotal = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const shopGroups = items.reduce<Record<string, { shopName: string; items: CartItem[] }>>((acc, item) => {
    if (!acc[item.shopId]) acc[item.shopId] = { shopName: item.shopName, items: [] }
    acc[item.shopId].items.push(item)
    return acc
  }, {})

  const needsCourier = deliveryType === 'office' || deliveryType === 'address'

  async function handleCheckout() {
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirectTo=/cart')
      return
    }

    if (needsCourier && !address.trim()) {
      setError(deliveryType === 'office' ? 'Моля въведи офис за доставка.' : 'Моля въведи адрес за доставка.')
      return
    }
    if (phone.trim().replace(/[\s()-]/g, '').length < 6) {
      setError('Моля въведи валиден телефон за връзка.')
      return
    }
    if (items.length === 0) return

    setLoading(true)

    // Re-validate stock/наличност преди да поръчаме — цените/наличността в localStorage може да са остарели
    const ids = items.map(i => i.listingId)
    const { data: freshListings } = await supabase
      .from('listings')
      .select('id, quantity, is_active')
      .in('id', ids)

    const problems: string[] = []
    const okItems = items.filter(item => {
      const fresh = freshListings?.find(l => l.id === item.listingId)
      if (!fresh || !fresh.is_active) {
        problems.push(`„${item.title}" вече не е налична и беше премахната от количката.`)
        removeFromCart(item.listingId)
        return false
      }
      if (fresh.quantity < item.qty) {
        problems.push(`„${item.title}" — наличността вече е само ${fresh.quantity} бр.`)
        return false
      }
      return true
    })

    if (problems.length > 0) {
      setError(problems.join(' '))
      refresh()
      setLoading(false)
      return
    }

    const shipping_address = needsCourier
      ? { courier, delivery_type: deliveryType, address }
      : { delivery_type: 'in_person' }
    const payment_method = deliveryType === 'in_person' ? 'in_person' : 'cod'

    let failedCount = 0
    for (const item of okItems) {
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listing_id: item.listingId,
            shop_id: item.shopId,
            listing_title: item.title,
            listing_price: item.price,
            listing_image: item.image,
            quantity: item.qty,
            total_amount: item.price * item.qty,
            payment_method,
            buyer_phone: phone.trim(),
            shipping_address,
            needs_invoice: false,
            status: 'new',
          }),
        })
        if (!res.ok) failedCount++
      } catch {
        failedCount++
      }
    }

    setLoading(false)

    if (failedCount === 0) {
      clearCart()
      router.push('/dashboard/my-orders?success=1')
    } else if (failedCount < okItems.length) {
      setError(`${failedCount} от поръчките не се записаха. Опитай отново с останалите артикули.`)
      refresh()
    } else {
      setError('Възникна грешка при поръчката. Опитай отново.')
    }
  }

  const inputStyle = {
    background: 'rgba(249,115,22,0.06)',
    border: '1.5px solid var(--accent)',
    color: 'var(--text)',
  }

  if (!loaded) return null

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="p-2 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">🛒 Количка</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {items.reduce((s, i) => s + i.qty, 0)} артикула
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border p-16 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-5xl mb-4">🛒</p>
          <p className="font-bold text-lg mb-1">Количката е празна</p>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Разгледай обявите и добави продукти</p>
          <Link href="/" className="inline-flex px-6 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
            Разгледай обяви
          </Link>
        </div>
      ) : (
        <>
          {/* Items grouped by shop */}
          <div className="space-y-5 mb-6">
            {Object.entries(shopGroups).map(([shopId, group]) => (
              <div key={shopId} className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="px-4 py-2.5 text-xs font-bold" style={{ background: 'var(--bg2)', color: 'var(--muted)' }}>
                  🏪 {group.shopName}
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {group.items.map(item => (
                    <div key={item.listingId} className="flex items-center gap-3 p-4">
                      <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative" style={{ background: 'var(--bg3)' }}>
                        {item.image ? (
                          <Image src={item.image} alt={item.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{formatPrice(item.price, item.currency)} / бр.</p>
                      </div>
                      <div className="flex items-center rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid var(--border)' }}>
                        <button onClick={() => changeQty(item.listingId, item.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center"
                          style={{ background: 'var(--bg3)', color: 'var(--text)', border: 'none' }}>
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold">{item.qty}</span>
                        <button onClick={() => changeQty(item.listingId, Math.min(item.maxQty, item.qty + 1))}
                          className="w-7 h-7 flex items-center justify-center"
                          style={{ background: 'var(--bg3)', color: 'var(--text)', border: 'none' }}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <p className="text-sm font-black flex-shrink-0 w-16 text-right" style={{ color: 'var(--accent)' }}>
                        {formatPrice(item.price * item.qty, item.currency)}
                      </p>
                      <button onClick={() => remove(item.listingId)} className="flex-shrink-0 p-1.5 rounded-lg"
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Shared delivery info */}
          <div className="rounded-2xl border p-4 space-y-3 mb-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>🚚 Начин на доставка</p>
            <div className="flex gap-2">
              {DELIVERY_OPTIONS.map(opt => (
                <button key={opt.key} type="button" onClick={() => { setDeliveryType(opt.key); setAddress('') }}
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
                    style={inputStyle}
                  />
                </div>
              </>
            )}

            {deliveryType === 'in_person' && (
              <p className="text-xs rounded-lg px-3 py-2" style={{ background: 'var(--bg3)', color: 'var(--muted)' }}>
                🤝 Ще се договорите с всеки продавач поотделно за място и час на предаване чрез съобщения.
              </p>
            )}

            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--accent)' }}>📞 Телефон за връзка *</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="напр. 0888 123 456"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>

            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              💵 Плащане с наложен платеж{deliveryType === 'in_person' ? ' / лично' : ''}. Всеки продавач ще обработи своята част от поръчката поотделно.
            </p>
          </div>

          {error && (
            <p className="text-xs mb-4 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}>
              {error}
            </p>
          )}

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Общо</span>
            <span className="text-xl font-black" style={{ color: 'var(--accent)' }}>{formatPrice(grandTotal)}</span>
          </div>

          <button onClick={handleCheckout} disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-opacity flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent), #f59e0b)', color: '#fff', border: 'none', opacity: loading ? 0.7 : 1 }}>
            <ShoppingCart size={16} />
            {loading ? 'Обработка...' : `Поръчай — ${formatPrice(grandTotal)}`}
          </button>
        </>
      )}
    </div>
  )
}
