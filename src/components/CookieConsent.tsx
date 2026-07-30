'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'cookie-consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(STORAGE_KEY)
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] p-4 md:pb-4 pb-24"
      style={{ background: 'transparent' }}
    >
      <div
        className="max-w-3xl mx-auto rounded-2xl border p-4 md:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center gap-4"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm flex-1" style={{ color: 'var(--text)' }}>
          🍪 Използваме бисквитки, необходими за функционирането на сайта (вход в акаунт, сесии) и за
          подобряване на изживяването Ви. Прочети повече в{' '}
          <Link href="/privacy" style={{ color: 'var(--accent)' }} className="font-semibold">
            Политиката за поверителност
          </Link>.
        </p>
        <button
          onClick={accept}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl text-sm font-bold flex-shrink-0"
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          Разбрах
        </button>
      </div>
    </div>
  )
}
