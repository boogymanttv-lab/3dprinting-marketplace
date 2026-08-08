'use client'

import { useEffect } from 'react'
import { addRecentlyViewed } from '@/lib/recently-viewed'

interface Props {
  id: string
  title: string
  price: number
  currency: string
  image: string | null
  shopName: string | null
}

export function RecordRecentlyViewed({ id, title, price, currency, image, shopName }: Props) {
  useEffect(() => {
    addRecentlyViewed({ id, title, price, currency, image, shopName })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return null
}
