'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getRecentlyViewed, type RecentlyViewedItem } from '@/lib/recently-viewed'
import { formatPrice } from '@/lib/utils'

interface Props {
  excludeId?: string
}

export function RecentlyViewedSection({ excludeId }: Props) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([])

  useEffect(() => {
    const all = getRecentlyViewed().filter(i => i.id !== excludeId)
    setItems(all)
  }, [excludeId])

  if (items.length === 0) return null

  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-6">
      <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--muted)' }}>🕓 Наскоро разгледани</h2>
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
        {items.map(item => (
          <Link
            key={item.id}
            href={`/listings/${item.id}`}
            className="flex-shrink-0 self-stretch w-32 sm:w-36 rounded-xl overflow-hidden border transition-all hover:-translate-y-0.5 flex flex-col"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="relative aspect-square bg-[var(--bg3)] flex items-center justify-center flex-shrink-0">
              {item.image ? (
                <Image src={item.image} alt={item.title} fill className="object-cover" sizes="144px" />
              ) : (
                <span className="text-2xl opacity-40">📦</span>
              )}
            </div>
            <div className="p-2 flex flex-col flex-1">
              <p className="text-xs font-semibold leading-snug line-clamp-2 mb-1 min-h-[2rem]" style={{ color: 'var(--text)' }}>
                {item.title}
              </p>
              <p className="text-xs font-black mt-auto" style={{ color: 'var(--accent)' }}>
                {formatPrice(item.price, item.currency)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
