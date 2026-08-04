'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Share2, X, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Image gallery with thumbnail switching + fullscreen lightbox ────
export function ImageGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const goPrev = useCallback(() => setActive(i => (i - 1 + images.length) % images.length), [images.length])
  const goNext = useCallback(() => setActive(i => (i + 1) % images.length), [images.length])

  // Keyboard nav while lightbox is open
  useEffect(() => {
    if (!lightboxOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightboxOpen, goPrev, goNext])

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div
        className="relative aspect-[4/3] bg-[var(--bg3)] flex items-center justify-center"
        style={{ cursor: images[active] ? 'zoom-in' : 'default' }}
        onClick={() => images[active] && setLightboxOpen(true)}
      >
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
              style={{ borderColor: i === active ? 'var(--accent)' : 'var(--border)', background: 'none', padding: 0, cursor: 'pointer' }}
            >
              <Image src={img} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen lightbox */}
      {lightboxOpen && images[active] && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer' }}
            aria-label="Затвори"
          >
            <X size={20} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); goPrev() }}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer' }}
                aria-label="Предишна снимка"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); goNext() }}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer' }}
                aria-label="Следваща снимка"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          <div
            className="relative w-[92vw] h-[80vh] max-w-5xl"
            onClick={e => e.stopPropagation()}
          >
            <Image src={images[active]} alt={title} fill className="object-contain" />
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
              {active + 1} / {images.length}
            </div>
          )}
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
