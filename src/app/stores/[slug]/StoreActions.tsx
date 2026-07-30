'use client'

import { Share2 } from 'lucide-react'
import { useState } from 'react'

export function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-medium"
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: copied ? 'var(--green)' : 'var(--text)' }}
      onClick={handleCopy}
    >
      <Share2 size={13} />
      {copied ? '✓ Копирано!' : 'Копирай линк'}
    </button>
  )
}

export function PhoneReveal({ phone }: { phone: string }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <button
      className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
      style={{
        border: `1px solid ${revealed ? 'var(--green)' : 'var(--border)'}`,
        color: revealed ? 'var(--green)' : 'var(--text)',
        background: 'var(--bg3)',
      }}
      onClick={() => setRevealed(true)}
    >
      {revealed ? `📞 ${phone}` : '📞 Покажи телефон'}
    </button>
  )
}
