'use client'

import { useRef } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
}

export function OtpInput({ value, onChange, length = 8 }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(i: number, digit: string) {
    const clean = digit.replace(/\D/g, '').slice(-1)
    const chars = value.split('')
    chars[i] = clean
    const next = chars.join('').slice(0, length)
    onChange(next)
    if (clean && i < length - 1) inputsRef.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !value[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted)
    const focusIndex = Math.min(pasted.length, length - 1)
    inputsRef.current[focusIndex]?.focus()
  }

  return (
    <div className="flex gap-1.5 sm:gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-9 h-11 sm:w-10 sm:h-12 text-center text-lg sm:text-xl font-black rounded-xl outline-none transition-colors"
          style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      ))}
    </div>
  )
}
