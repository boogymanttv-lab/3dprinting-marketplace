'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MATERIAL_LABELS, type Listing } from '@/types'
import { formatPrice, formatRelativeTime } from '@/lib/utils'
import { MapPin } from 'lucide-react'
import { FavoriteButton } from './FavoriteButton'

interface ListingCardProps {
  listing: Listing
}

export function ListingCard({ listing }: ListingCardProps) {
  const mainImage = listing.images?.[0]

  return (
    <Link href={`/listings/${listing.id}`} className="listing-card-link">
      <article
        className="rounded-2xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] bg-[var(--bg3)] flex items-center justify-center">
          {mainImage ? (
            <Image src={mainImage} alt={listing.title} fill className="object-cover" />
          ) : (
            <span className="text-5xl opacity-40">📦</span>
          )}

          {listing.is_featured && (
            <span className="absolute top-2.5 left-2.5 text-xs font-bold px-2 py-1 rounded-md"
              style={{ background: 'var(--accent)', color: '#fff' }}>
              Промо
            </span>
          )}

          <FavoriteButton listingId={listing.id} />
        </div>

        {/* Info */}
        <div className="p-3.5">
          <h3 className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2"
            style={{ color: 'var(--text)' }}>
            {listing.title}
          </h3>

          <p className="text-xl font-black mb-2" style={{ color: 'var(--accent)' }}>
            {formatPrice(listing.price, listing.currency)}
          </p>

          <div className="flex items-center justify-between">
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
            <span className="inline-block text-xs font-bold px-2 py-0.5 rounded-md mt-2"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
              🧵 {MATERIAL_LABELS[listing.material]}
            </span>
          )}
        </div>
      </article>

      <style>{`
        .listing-card-link { text-decoration: none; display: block; }
        .listing-card-link article:hover { border-color: var(--accent); box-shadow: 0 8px 32px rgba(249,115,22,0.1); }
      `}</style>
    </Link>
  )
}
