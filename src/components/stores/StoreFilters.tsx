'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'

type SortOption = '' | 'listings' | 'sales'

export function StoreFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sort, setSort] = useState<SortOption>((searchParams.get('sort') as SortOption) ?? '')
  const [invoice, setInvoice] = useState(searchParams.get('invoice') === '1')

  function apply() {
    const params = new URLSearchParams(searchParams.toString())
    if (sort) params.set('sort', sort); else params.delete('sort')
    if (invoice) params.set('invoice', '1'); else params.delete('invoice')
    router.push(`/stores?${params.toString()}`)
  }

  const optionStyle = (active: boolean) => ({
    background: active ? 'rgba(249,115,22,0.1)' : 'var(--bg2)',
    border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    color: active ? 'var(--accent)' : 'var(--text)',
  })

  return (
    <div className="rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3"
      style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <span className="flex items-center gap-1.5 text-xs font-bold flex-shrink-0" style={{ color: 'var(--muted)' }}>
        <SlidersHorizontal size={13} /> Подреди по:
      </span>

      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
        style={optionStyle(sort === 'listings')}>
        <input type="checkbox" className="accent-orange-500" checked={sort === 'listings'}
          onChange={() => setSort(s => s === 'listings' ? '' : 'listings')} />
        Най-много обяви
      </label>

      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
        style={optionStyle(sort === 'sales')}>
        <input type="checkbox" className="accent-orange-500" checked={sort === 'sales'}
          onChange={() => setSort(s => s === 'sales' ? '' : 'sales')} />
        Най-много продажби
      </label>

      <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
        style={optionStyle(invoice)}>
        <input type="checkbox" className="accent-orange-500" checked={invoice}
          onChange={() => setInvoice(v => !v)} />
        С фактура
      </label>

      <button onClick={apply}
        className="ml-auto px-4 py-1.5 rounded-lg text-xs font-bold"
        style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
        Приложи
      </button>
    </div>
  )
}
