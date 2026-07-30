'use client'

import { Archive, ArchiveRestore } from 'lucide-react'

interface Props {
  listingId: string
  isActive: boolean
}

export function ArchiveButton({ listingId, isActive }: Props) {
  return (
    <form
      action={`/api/listings/${listingId}/toggle-active`}
      method="POST"
      onSubmit={e => {
        const msg = isActive
          ? 'Архивирай обявата? Тя ще се скрие от сайта, но можеш да я активираш по всяко време.'
          : 'Активирай обявата отново?'
        if (!confirm(msg)) e.preventDefault()
      }}
    >
      <button
        type="submit"
        title={isActive ? 'Архивирай' : 'Активирай'}
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: isActive ? 'rgba(99,102,241,0.1)' : 'rgba(34,197,94,0.1)',
          color: isActive ? '#818cf8' : '#22c55e',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {isActive ? <Archive size={15} /> : <ArchiveRestore size={15} />}
      </button>
    </form>
  )
}
