'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAX_ATTEMPTS = 20 // ~30s of polling — webhook usually lands within a second or two

function SuccessContent() {
  const [status, setStatus] = useState<'waiting' | 'done' | 'timeout'>('waiting')
  const [shopSlug, setShopSlug] = useState('')
  const attemptsRef = useRef(0)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    async function poll() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: shop } = await supabase
        .from('shops')
        .select('slug')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (cancelled) return

      if (shop) {
        setShopSlug(shop.slug)
        setStatus('done')
        return
      }

      attemptsRef.current += 1
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setStatus('timeout')
        return
      }
      setTimeout(poll, 1500)
    }

    poll()
    return () => { cancelled = true }
  }, [])

  if (status === 'waiting') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-6 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>
          ✅
        </div>
        <h2 className="text-2xl font-black mb-2">Плащането мина успешно!</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Довършваме настройката на магазина ти — това отнема само няколко секунди...
        </p>
      </div>
    )
  }

  if (status === 'timeout') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <h2 className="text-2xl font-black mb-3">Почти готово</h2>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
          Плащането е потвърдено, но активирането отнема малко по-дълго от обичайното.
          Провери отново след минута — магазинът ти ще се появи автоматично.
        </p>
        <Link href="/dashboard"
          className="inline-flex px-8 py-3.5 rounded-xl text-sm font-bold"
          style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
          Към Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.12)', border: '3px solid rgba(34,197,94,0.4)' }}>
          <span className="text-5xl">✅</span>
        </div>
      </div>

      <h2 className="text-3xl font-black mb-3">Магазинът е готов!</h2>
      <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
        Плащането мина успешно и магазинът ти вече е активен на избрания план.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/dashboard/listings/new"
          className="px-8 py-3.5 rounded-xl text-sm font-bold text-center"
          style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
          ➕ Добави първа обява
        </Link>
        <Link href="/dashboard"
          className="px-8 py-3.5 rounded-xl text-sm font-bold text-center"
          style={{ border: '1.5px solid var(--border)', color: 'var(--text)', textDecoration: 'none' }}>
          🏪 Към магазина
        </Link>
      </div>
      {shopSlug && (
        <p className="text-xs mt-6" style={{ color: 'var(--muted)' }}>
          Публична страница: <Link href={`/stores/${shopSlug}`} style={{ color: 'var(--accent)' }}>3dprintingbg.com/stores/{shopSlug}</Link>
        </p>
      )}
    </div>
  )
}

export default function OpenShopSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
