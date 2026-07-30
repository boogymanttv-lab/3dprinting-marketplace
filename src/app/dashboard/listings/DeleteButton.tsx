'use client'

import { Trash2 } from 'lucide-react'

export function DeleteButton({ listingId }: { listingId: string }) {
  return (
    <form
      action={`/api/listings/${listingId}/delete`}
      method="POST"
      onSubmit={e => {
        if (!confirm('Сигурен ли си, че искаш да изтриеш тази обява?')) {
          e.preventDefault()
        }
      }}
    >
      <button
        type="submit"
        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'none', cursor: 'pointer' }}
        title="Изтрий"
      >
        <Trash2 size={15} />
      </button>
    </form>
  )
}
