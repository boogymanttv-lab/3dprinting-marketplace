'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Share2 } from 'lucide-react'

// ── Image gallery with thumbnail switching ──────────────────────────
export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0)

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="relative aspect-[4/3] bg-[var(--bg3)] flex items-center justify-center">
        {images[active] ? (
          <Image src={images[active]} alt={title} fill className="object-cover" />
        ) : (
          <span className="text-7xl opacity-30">📦</span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 relative"
              style={{ borderColor: i === active ? 'var(--accent)' : 'var(--border)', background: 'none', padding: 0 }}
            >
              <Image src={img} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Share / copy link button ────────────────────────────────────────
export function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex gap-2 mt-4">
      <div className="flex-1 rounded-lg px-3 py-2 text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap"
        style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
        {url}
      </div>
      <button
        onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: copied ? 'var(--green)' : 'var(--text)' }}
      >
        <Share2 size={12} /> {copied ? 'Копирано!' : 'Копирай'}
      </button>
    </div>
  )
}

// ── Phone reveal button ─────────────────────────────────────────────
export function PhoneReveal({ phone }: { phone: string }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <button
      onClick={() => setRevealed(true)}
      className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors"
      style={{
        background: 'var(--bg3)',
        border: `1px solid ${revealed ? 'var(--green)' : 'var(--border)'}`,
        color: revealed ? 'var(--green)' : 'var(--text)',
      }}
    >
      {revealed ? `📞 ${phone}` : '📞 Покажи телефон'}
    </button>
  )
}
