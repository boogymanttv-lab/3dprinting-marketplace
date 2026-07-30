'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface Listing { id: string; title: string; price: number; currency: string; images: string[]; shop: { name: string } | null }
interface Category { id: string; name: string; slug: string }
interface Results { listings: Listing[]; categories: Category[] }

interface Props {
  defaultValue?: string
}

export function SearchBar({ defaultValue = '' }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState(defaultValue)
  const [results, setResults] = useState<Results | null>(null)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 3) { setResults(null); setOpen(false); return }
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    const hasResults = data.listings?.length > 0 || data.categories?.length > 0
    setResults(data)
    setOpen(hasResults)
    setHighlighted(-1)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchSuggestions(query), 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, fetchSuggestions])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allItems = [
    ...(results?.categories ?? []).map(c => ({ type: 'category' as const, ...c })),
    ...(results?.listings ?? []).map(l => ({ type: 'listing' as const, ...l })),
  ]

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)) }
    if (e.key === 'Escape') { setOpen(false); setHighlighted(-1) }
    if (e.key === 'Enter') {
      if (highlighted >= 0 && allItems[highlighted]) {
        e.preventDefault()
        navigate(allItems[highlighted])
      } else {
        submit()
      }
    }
  }

  function navigate(item: typeof allItems[0]) {
    setOpen(false)
    if (item.type === 'category') router.push(`/?category=${item.slug}`)
    else router.push(`/listings/${item.id}`)
  }

  function submit() {
    setOpen(false)
    if (query.trim()) router.push(`/?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div ref={wrapperRef} className="relative max-w-lg mx-auto w-full">
      <div
        className="flex rounded-xl overflow-visible"
        style={{
          background: 'var(--bg2)',
          border: `1.5px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: open && results ? '12px 12px 0 0' : '12px',
          transition: 'border-color 0.15s',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results && query.length >= 3) setOpen(true) }}
          placeholder="Търси обяви, категории..."
          className="flex-1 bg-transparent px-5 py-3.5 text-sm outline-none"
          style={{ color: 'var(--text)' }}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={submit}
          className="px-5 flex items-center justify-center"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '0 10px 10px 0' }}
        >
          <Search size={18} />
        </button>
      </div>

      {/* Dropdown */}
      {open && results && (
        <div
          className="absolute left-0 right-0 z-50 overflow-hidden"
          style={{
            background: 'var(--card)',
            border: '1.5px solid var(--accent)',
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {/* Categories */}
          {results.categories.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Категории
              </p>
              {results.categories.map((cat, i) => (
                <button
                  key={cat.id}
                  type="button"
                  onMouseDown={() => navigate({ type: 'category', ...cat })}
                  onMouseEnter={() => setHighlighted(i)}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors"
                  style={{
                    background: highlighted === i ? 'var(--bg3)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text)',
                  }}
                >
                  <span className="text-base">📦</span>
                  <span className="font-semibold">{cat.name}</span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--muted)' }}>Категория</span>
                </button>
              ))}
            </div>
          )}

          {/* Listings */}
          {results.listings.length > 0 && (
            <div>
              {results.categories.length > 0 && <div className="mx-4 my-1" style={{ borderTop: '1px solid var(--border)' }} />}
              <p className="px-4 pt-2 pb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Обяви
              </p>
              {results.listings.map((listing, i) => {
                const idx = results.categories.length + i
                return (
                  <button
                    key={listing.id}
                    type="button"
                    onMouseDown={() => navigate({ type: 'listing', ...listing })}
                    onMouseEnter={() => setHighlighted(idx)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors"
                    style={{
                      background: highlighted === idx ? 'var(--bg3)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                      style={{ background: 'var(--bg3)' }}>
                      {listing.images?.[0]
                        ? <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                        : <span className="text-base">📦</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                        {highlight(listing.title, query)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {listing.shop?.name}
                      </p>
                    </div>
                    <span className="text-sm font-black flex-shrink-0" style={{ color: 'var(--accent)' }}>
                      {formatPrice(listing.price, listing.currency)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* All results link */}
          <button
            type="button"
            onMouseDown={submit}
            className="w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-2 border-t"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--accent)',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <Search size={14} />
            Виж всички резултати за „{query}"
          </button>
        </div>
      )}
    </div>
  )
}

// Bold-ва съвпадащите букви
function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  )
}
