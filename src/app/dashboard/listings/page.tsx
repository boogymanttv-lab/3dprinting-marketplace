import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, formatRelativeTime } from '@/lib/utils'
import { Plus, Edit, Eye, Package } from 'lucide-react'
import { DeleteButton } from './DeleteButton'
import { ArchiveButton } from './ArchiveButton'

export const dynamic = 'force-dynamic'

export default async function ListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/listings')

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, plan:plans(max_listings)')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!shop) redirect('/open-shop')

  const { data: listings } = await supabase
    .from('listings')
    .select('*, category:categories(name)')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })

  const maxListings = (shop.plan as any)?.max_listings
  const activeCount = listings?.filter(l => l.is_active).length ?? 0

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm mb-1" style={{ color: 'var(--muted)' }}>
            <Link href="/dashboard" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Dashboard</Link>
            <span>/</span>
            <span>Мои обяви</span>
          </div>
          <h1 className="text-2xl font-black">📋 Мои обяви</h1>
          {maxListings && (
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              {activeCount} / {maxListings} активни обяви
            </p>
          )}
        </div>
        <Link
          href="/dashboard/listings/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}
        >
          <Plus size={15} /> Нова обява
        </Link>
      </div>

      {/* Progress bar */}
      {maxListings && (
        <div className="rounded-xl border p-4 mb-6 flex items-center gap-4"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <Package size={18} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
              <span>{activeCount} активни</span>
              <span>{maxListings} лимит</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (activeCount / maxListings) * 100)}%`,
                  background: activeCount >= maxListings ? '#f87171' : 'var(--accent)',
                }} />
            </div>
          </div>
          {activeCount >= maxListings && (
            <Link href="/plans" className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
              style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--accent)', textDecoration: 'none' }}>
              Надгради →
            </Link>
          )}
        </div>
      )}

      {/* Listings */}
      {listings && listings.length > 0 ? (
        <div className="space-y-3">
          {listings.map(listing => (
            <div key={listing.id}
              className="rounded-2xl border flex items-center gap-4 p-4"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: 'var(--bg3)' }}>
                {listing.images?.[0] ? (
                  <Image src={listing.images[0]} alt={listing.title} width={64} height={64} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-semibold text-sm truncate">{listing.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0`}
                    style={{
                      background: listing.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: listing.is_active ? '#22c55e' : '#f87171',
                    }}>
                    {listing.is_active ? 'Активна' : 'Неактивна'}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {listing.category?.name ?? '—'} · {formatRelativeTime(listing.created_at)}
                </p>
              </div>

              {/* Price */}
              <p className="font-black text-base flex-shrink-0" style={{ color: 'var(--accent)' }}>
                {formatPrice(listing.price, listing.currency)}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Link href={`/listings/${listing.id}`}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'var(--bg3)', color: 'var(--muted)', textDecoration: 'none' }}
                  title="Виж обявата">
                  <Eye size={15} />
                </Link>
                <Link href={`/dashboard/listings/${listing.id}/edit`}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: 'var(--bg3)', color: 'var(--muted)', textDecoration: 'none' }}
                  title="Редактирай">
                  <Edit size={15} />
                </Link>
                <ArchiveButton listingId={listing.id} isActive={listing.is_active} />
                <DeleteButton listingId={listing.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border p-16 text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-5xl mb-4">📭</p>
          <p className="font-bold text-lg mb-1">Нямаш обяви още</p>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Добави първата си обява и започни да продаваш</p>
          <Link href="/dashboard/listings/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
            <Plus size={15} /> Добави обява
          </Link>
        </div>
      )}
    </div>
  )
}

