'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Category { id: string; name: string; parent_id: string | null }

interface ListingData {
  id: string
  title: string
  description: string
  price: number
  quantity: number
  condition: 'new' | 'used' | 'refurbished'
  category_id: string
  city: string
  is_active: boolean
  images: string[]
  moderation_note: string | null
  shop_name: string
}

export function AdminListingEditForm({ listing, categories }: { listing: ListingData; categories: Category[] }) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: listing.title,
    description: listing.description,
    price: listing.price.toString(),
    quantity: listing.quantity.toString(),
    condition: listing.condition,
    category_id: listing.category_id,
    city: listing.city,
    is_active: listing.is_active,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = { background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }
  const update = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.title.trim() || !form.price) { setError('Заглавие и цена са задължителни.'); return }

    setLoading(true)
    const res = await fetch(`/api/admin/listings/${listing.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        condition: form.condition,
        category_id: form.category_id || null,
        city: form.city || null,
        is_active: form.is_active,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Грешка при запазване.'); return }
    router.push('/admin/listings')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/listings" className="p-2 rounded-lg"
          style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black">✏️ Редакция от админ</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Магазин: {listing.shop_name}</p>
        </div>
      </div>

      {listing.moderation_note && (
        <div className="rounded-xl p-4 mb-5 text-sm" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#eab308' }}>
          ⚠️ Причина за връщане: {listing.moderation_note}
        </div>
      )}

      {listing.images.length > 0 && (
        <div className="rounded-2xl border p-5 mb-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold mb-3 text-sm">📸 Снимки (само преглед)</h2>
          <div className="grid grid-cols-4 gap-3">
            {listing.images.map((src, i) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Заглавие *</label>
            <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
              value={form.title} onChange={update('title')} />
          </div>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Описание</label>
            <textarea className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none" style={inputStyle}
              value={form.description} onChange={update('description')} rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Цена (€) *</label>
              <input type="number" min="0.01" step="0.01" className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.price} onChange={update('price')} />
            </div>
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Количество</label>
              <input type="number" min="1" className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.quantity} onChange={update('quantity')} />
            </div>
          </div>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Категория</label>
            <select className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none appearance-none" style={inputStyle}
              value={form.category_id} onChange={update('category_id')}>
              <option value="">— Без категория —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.parent_id ? '— ' : ''}{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Град</label>
            <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
              value={form.city} onChange={update('city')} />
          </div>

          <div className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
            <p className="text-sm font-semibold">Активна обява</p>
            <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: form.is_active ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: 'pointer' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                style={{ background: '#fff', left: form.is_active ? '26px' : '2px' }} />
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/admin/listings" className="flex-1 py-3.5 rounded-xl font-bold text-sm text-center"
            style={{ border: '1.5px solid var(--border)', color: 'var(--muted)', textDecoration: 'none' }}>
            Отказ
          </Link>
          <button type="submit" disabled={loading}
            className="flex-1 py-3.5 rounded-xl font-bold text-sm"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loading ? 0.7 : 1, cursor: 'pointer' }}>
            {loading ? 'Запазване...' : 'Запази промените'}
          </button>
        </div>
      </form>
    </div>
  )
}
