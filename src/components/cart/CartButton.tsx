'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { getCartCount, CART_EVENT } from '@/lib/cart'

export function CartButton() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(getCartCount())
    const update = () => setCount(getCartCount())
    window.addEventListener(CART_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(CART_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])

  return (
    <Link
      href="/cart"
      className="relative flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)' }}
      aria-label="Количка"
    >
      <ShoppingCart size={16} />
      {count > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
