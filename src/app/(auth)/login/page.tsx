'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.code === 'email_not_confirmed' || error.message.toLowerCase().includes('email not confirmed')) {
        setError('Имейлът ти още не е потвърден. Провери пощата си за линк за потвърждение.')
      } else if (error.code === 'invalid_credentials') {
        setError('Грешен имейл или парола.')
      } else {
        setError(error.message)
      }
      setLoading(false)
      return
    }

    // Ако акаунтът е бил временно затворен, влизането го връща автоматично
    try { await fetch('/api/account/reactivate', { method: 'POST' }) } catch {}

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>
            🖨️
          </div>
          <h1 className="text-2xl font-black">Вход в 3DPrintingBG</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Влез в акаунта си
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border p-8 space-y-4"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>

          {error && (
            <div className="rounded-lg px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Имейл</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Парола</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-bold transition-opacity"
            style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Влизане...' : 'Влез'}
          </button>

          <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
            Нямаш акаунт?{' '}
            <Link href="/register" style={{ color: 'var(--accent)' }} className="font-semibold">
              Регистрирай се
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
