'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

export function DeleteRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (!confirm('Сигурен ли си, че искаш да изтриеш тази заявка? Това действие не може да бъде отменено.')) return

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: deleteError } = await supabase.from('requests').delete().eq('id', requestId)

    if (deleteError) {
      setError('Грешка при изтриване. Опитай отново.')
      setLoading(false)
      return
    }

    router.push('/requests?tab=mine')
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
        style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', opacity: loading ? 0.6 : 1 }}
      >
        <Trash2 size={13} />
        {loading ? 'Изтриване...' : 'Изтрий заявката'}
      </button>
      {error && <p className="text-xs mt-1.5" style={{ color: '#f87171' }}>{error}</p>}
    </div>
  )
}
