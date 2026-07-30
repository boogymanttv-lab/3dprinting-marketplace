'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  shopId: string
  listingId: string
  listingTitle: string
  shopName: string
}

export function ReviewForm({ orderId, shopId, listingId, listingTitle, shopName }: Props) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) { setError('Избери оценка'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, shopId, listingId, rating, comment }),
    })

    if (res.ok) {
      router.push('/dashboard/my-orders')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'Грешка при запазване')
      setLoading(false)
    }
  }

  const stars = [1, 2, 3, 4, 5]
  const STAR_LABELS = ['', 'Лошо', 'Не е добро', 'Добре', 'Много добро', 'Отлично']

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product being reviewed */}
      <div className="rounded-xl p-4" style={{ background: 'var(--bg3)' }}>
        <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>Ревюираш</p>
        <p className="font-bold text-sm">{listingTitle}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>от {shopName}</p>
      </div>

      {/* Star rating */}
      <div>
        <p className="text-sm font-semibold mb-3">Оценка *</p>
        <div className="flex items-center gap-2">
          {stars.map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="text-4xl transition-transform hover:scale-110"
              style={{ background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
            >
              <span style={{
                color: star <= (hovered || rating) ? '#f59e0b' : 'var(--bg3)',
                filter: star <= (hovered || rating) ? 'drop-shadow(0 0 4px #f59e0b)' : 'none',
                transition: 'color 0.1s, filter 0.1s',
              }}>★</span>
            </button>
          ))}
          {(hovered || rating) > 0 && (
            <span className="text-sm font-semibold ml-2" style={{ color: '#f59e0b' }}>
              {STAR_LABELS[hovered || rating]}
            </span>
          )}
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="text-sm font-semibold block mb-2">
          Коментар <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(по избор)</span>
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Сподели опита си с продавача и продукта..."
          rows={4}
          maxLength={1000}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
          style={{
            background: 'var(--bg2)',
            border: '1.5px solid var(--border)',
            color: 'var(--text)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
        />
        <p className="text-xs mt-1 text-right" style={{ color: 'var(--muted)' }}>
          {comment.length}/1000
        </p>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-sm font-semibold"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl text-sm font-semibold"
          style={{ border: '1.5px solid var(--border)', color: 'var(--muted)', background: 'transparent', cursor: 'pointer' }}
        >
          Отказ
        </button>
        <button
          type="submit"
          disabled={loading || rating === 0}
          className="flex-1 py-3 rounded-xl text-sm font-bold"
          style={{
            background: rating > 0 ? 'var(--accent)' : 'var(--bg3)',
            color: rating > 0 ? '#fff' : 'var(--muted)',
            border: 'none',
            cursor: rating > 0 ? 'pointer' : 'not-allowed',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Запазване...' : '⭐ Публикувай ревю'}
        </button>
      </div>
    </form>
  )
}
