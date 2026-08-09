'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string
      reset: (widgetId?: string) => void
    }
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void
  onExpire?: () => void
}

// Cloudflare Turnstile — невидим/лек CAPTCHA виджет.
// Ако NEXT_PUBLIC_TURNSTILE_SITE_KEY не е зададен, компонентът не рендира
// нищо (soft-fallback), за да не се чупи регистрацията преди да конфигурираш ключовете.
export function Turnstile({ onVerify, onExpire }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !siteKey || !window.turnstile) return
    if (widgetId.current) return

    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onVerify(token),
      'expired-callback': () => onExpire?.(),
      theme: 'dark',
    })
  }, [scriptLoaded, siteKey, onVerify, onExpire])

  if (!siteKey) return null

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} />
    </>
  )
}
