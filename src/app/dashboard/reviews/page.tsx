import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import { ArrowLeft, Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/reviews')

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, rating, review_count')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!shop) redirect('/open-shop')

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles(full_name, avatar_url)')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })

  // Rating distribution
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  reviews?.forEach(r => { dist[r.rating] = (dist[r.rating] ?? 0) + 1 })

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">⭐ Ревюта</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{shop.name}</p>
        </div>
      </div>

      {/* Stats card */}
      {(reviews?.length ?? 0) > 0 && (
        <div className="rounded-2xl border p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-6"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {/* Average */}
          <div className="flex items-center gap-5">
            <div>
              <p className="text-6xl font-black" style={{ color: 'var(--accent)' }}>
                {shop.rating > 0 ? shop.rating.toFixed(1) : '—'}
              </p>
              <div className="flex gap-0.5 my-1">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={16}
                    className={s <= Math.round(shop.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-600'} />
                ))}
              </div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{shop.review_count} ревюта</p>
            </div>
          </div>

          {/* Distribution */}
          <div className="space-y-2">
            {[5,4,3,2,1].map(star => {
              const count = dist[star] ?? 0
              const pct = shop.review_count > 0 ? (count / shop.review_count) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2.5 text-xs">
                  <span className="w-3 text-right font-semibold" style={{ color: 'var(--muted)' }}>{star}</span>
                  <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)', transition: 'width 0.6s' }} />
                  </div>
                  <span className="w-4" style={{ color: 'var(--muted)' }}>{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="rounded-2xl border p-5"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}>
                    {(review.reviewer?.full_name ?? 'А').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{review.reviewer?.full_name ?? 'Анонимен'}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{formatRelativeTime(review.created_at)}</p>
                  </div>
                </div>

                {/* Stars */}
                <div className="flex gap-0.5 flex-shrink-0">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14}
                      className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-600'} />
                  ))}
                </div>
              </div>

              {review.comment && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  "{review.comment}"
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border p-16 text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-5xl mb-4">⭐</p>
          <p className="font-bold text-lg mb-1">Нямаш ревюта още</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Ревютата се появяват след завършени поръчки
          </p>
        </div>
      )}
    </div>
  )
}
