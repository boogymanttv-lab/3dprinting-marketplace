'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MATERIAL_LABELS, type Listing } from '@/types'
import { formatPrice } from '@/lib/utils'
import { activePromoRank } from '@/lib/credits'
import { MapPin } from 'lucide-react'
import { FavoriteButton } from './FavoriteButton'

interface ListingCardProps {
  listing: Listing
}

export function ListingCard({ listing }: ListingCardProps) {
  const mainImage = listing.images?.[0]
  const rank = activePromoRank(listing)   // 0 няма, 1 промо, 2 VIP, 3 ТОП

  const borderColor = rank === 3 ? '#ef4444' : rank === 2 ? '#eab308' : 'var(--border)'
  const badge = rank === 3
    ? { text: '🔥 ТОП', bg: 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff' }
    : rank === 2
      ? { text: '⭐ VIP', bg: 'linear-gradient(135deg,#eab308,#f59e0b)', color: '#1a1a1a' }
      : (rank === 1 || listing.is_featured)
        ? { text: 'Промо', bg: 'var(--accent)', color: '#fff' }
        : null

  return (
    <Link href={`/listings/${listing.id}`} className="listing-card-link">
      <article
        className="h-full flex flex-col rounded-2xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: 'var(--card)',
          borderColor,
          borderWidth: rank >= 2 ? 2 : 1,
          boxShadow: rank === 3 ? '0 0 24px rgba(239,68,68,0.18)' : rank === 2 ? '0 0 24px rgba(234,179,8,0.15)' : undefined,
        }}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] bg-[var(--bg3)] flex items-center justify-center flex-shrink-0">
          {mainImage ? (
            <Image src={mainImage} alt={listing.title} fill className="object-cover" />
          ) : (
            <span className="text-5xl opacity-40">📦</span>
          )}

          {badge && (
            <span className="absolute top-2.5 left-2.5 text-xs font-bold px-2 py-1 rounded-md"
              style={{ background: badge.bg, color: badge.color }}>
              {badge.text}
            </span>
          )}

          <FavoriteButton listingId={listing.id} />
        </div>

        {/* Info */}
        <div className="p-3.5 flex flex-col flex-1">
          <h3 className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2 min-h-[2.5rem]"
            style={{ color: 'var(--text)' }}>
            {listing.title}
          </h3>

          <p className="text-xl font-black mb-2" style={{ color: 'var(--accent)' }}>
            {formatPrice(listing.price, listing.currency)}
          </p>

          <div className="flex items-center justify-between mt-auto">
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
              🏪 {listing.shop?.name ?? '—'}
            </span>
            {listing.city && (
              <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--muted)' }}>
                <MapPin size={11} />
                {listing.city}
              </span>
            )}
          </div>

          {listing.material && (
            <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-md mt-2 self-start"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
              🧵 {MATERIAL_LABELS[listing.material]}
            </span>
          )}
        </div>
      </article>

      <style>{`
        .listing-card-link { text-decoration: none; display: block; height: 100%; }
        .listing-card-link article:hover { border-color: var(--accent); box-shadow: 0 8px 32px rgba(249,115,22,0.1); }
      `}</style>
    </Link>
  )
}
