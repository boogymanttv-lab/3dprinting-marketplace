'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

export function SafetyBanner() {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  return (
    <div
      className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
      style={{
        background: 'rgba(249,115,22,0.08)',
        borderBottom: '1px solid rgba(249,115,22,0.2)',
        color: 'var(--text)',
      }}
    >
      <p className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0">🛡️</span>
        <span className="truncate sm:whitespace-normal">
          Никога не споделяй данните на банковата си карта при продажба на артикул.
        </span>
      </p>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/safety"
          className="font-bold whitespace-nowrap hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          Научи повече
        </Link>
        <button
          onClick={() => setVisible(false)}
          aria-label="Затвори"
          className="p-1 rounded-md hover:opacity-70 transition-opacity"
          style={{ color: 'var(--muted)' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
