import type { Review } from '@/types'
import { formatRelativeTime, getInitials } from '@/lib/utils'

interface ReviewsListProps {
  reviews: Review[]
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) return null

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length

  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold" style={{ color: 'var(--muted)' }}>
          ⭐ РЕВЮТА ({reviews.length})
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-black" style={{ color: 'var(--accent)' }}>
            {avgRating.toFixed(1)}
          </span>
          <span className="text-amber-400">{'★'.repeat(Math.round(avgRating))}</span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map(review => (
          <div key={review.id} className="pb-4 border-b last:border-0 last:pb-0"
            style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--bg3)', color: 'var(--muted)' }}>
                {review.reviewer?.full_name ? getInitials(review.reviewer.full_name) : '?'}
              </div>
              <div>
                <p className="text-sm font-semibold">{review.reviewer?.full_name ?? 'Анонимен'}</p>
              </div>
              <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>
                {formatRelativeTime(review.created_at)}
              </span>
            </div>
            <div className="text-amber-400 text-sm mb-1.5">
              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
            </div>
            {review.comment && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {review.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
