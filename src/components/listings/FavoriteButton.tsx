'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Heart } from 'lucide-react'

interface Props {
  listingId: string
}

export function FavoriteButton({ listingId }: Props) {
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      supabase
        .from('favorites')
        .select('listing_id')
        .eq('user_id', data.user.id)
        .eq('listing_id', listingId)
        .maybeSingle()
        .then(({ data: fav }) => setIsFav(!!fav))
    })
  }, [listingId])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) {
      window.location.href = '/login'
      return
    }
    setLoading(true)
    const supabase = createClient()
    if (isFav) {
      await supabase.from('favorites').delete()
        .eq('user_id', userId).eq('listing_id', listingId)
      setIsFav(false)
    } else {
      await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId })
      setIsFav(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all"
      style={{
        background: isFav ? 'rgba(239,68,68,0.85)' : 'rgba(0,0,0,0.5)',
        border: 'none',
        cursor: 'pointer',
        transform: loading ? 'scale(0.9)' : 'scale(1)',
      }}
      title={isFav ? 'Премахни от любими' : 'Добави в любими'}
    >
      <Heart
        size={15}
        color="#fff"
        fill={isFav ? '#fff' : 'none'}
      />
    </button>
  )
}
