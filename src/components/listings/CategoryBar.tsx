'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Category } from '@/types'
import { Suspense } from 'react'

interface CategoryBarProps {
  categories: Category[]
  subCategories: Category[]
  activeCategory?: string
  activeSub?: string
}

function CategoryBarInner({ categories, subCategories, activeCategory, activeSub }: CategoryBarProps) {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''

  const activeCat = categories.find(c => c.slug === activeCategory)
  const visibleSubs = activeCat
    ? subCategories.filter(s => s.parent_id === activeCat.id)
    : []

  return (
    <div className="px-4 max-w-7xl mx-auto pt-6">
      <p className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Категории</p>
      <div className="flex gap-2.5 flex-wrap">
        <Link
          href={q ? `/?q=${q}` : '/'}
          className="chip"
          data-active={!activeCategory ? 'true' : 'false'}
        >
          <span>📦</span> Всички
        </Link>
        {categories.map(cat => (
          <Link
            key={cat.id}
            href={`/category/${cat.slug}`}
            className="chip"
            data-active={activeCategory === cat.slug ? 'true' : 'false'}
          >
            {cat.icon && <span>{cat.icon}</span>}
            {cat.name}
          </Link>
        ))}
      </div>

      {visibleSubs.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-3">
          <Link
            href={`/category/${activeCategory}`}
            className="subchip"
            data-active={!activeSub ? 'true' : 'false'}
          >
            Всички
          </Link>
          {visibleSubs.map(sub => (
            <Link
              key={sub.id}
              href={`/category/${activeCategory}?sub=${sub.slug}`}
              className="subchip"
              data-active={activeSub === sub.slug ? 'true' : 'false'}
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        .chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 15px; border-radius: 100px;
          font-size: 13px; font-weight: 500;
          background: var(--bg2); border: 1px solid var(--border);
          color: var(--muted); text-decoration: none;
          transition: all 0.15s;
        }
        .chip:hover, .chip[data-active="true"] {
          background: rgba(249,115,22,0.12);
          border-color: var(--accent);
          color: var(--accent);
        }
        .subchip {
          display: inline-flex; align-items: center;
          padding: 4px 12px; border-radius: 6px;
          font-size: 12px; font-weight: 500;
          background: var(--bg2); border: 1px solid var(--border);
          color: var(--muted); text-decoration: none;
          transition: all 0.15s;
        }
        .subchip:hover, .subchip[data-active="true"] {
          background: rgba(249,115,22,0.1);
          border-color: var(--accent);
          color: var(--accent);
        }
      `}</style>
    </div>
  )
}

export function CategoryBar(props: CategoryBarProps) {
  return (
    <Suspense>
      <CategoryBarInner {...props} />
    </Suspense>
  )
}
