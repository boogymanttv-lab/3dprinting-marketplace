'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('Паролите не съвпадат.')
      return
    }
    if (form.password.length < 8) {
      setError('Паролата трябва да е поне 8 символа.')
      return
    }
    if (!agreed) {
      setError('Трябва да се съгласиш с Общите условия и Политиката за поверителност.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/?registered=1')
  }

  const inputStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>
            🖨️
          </div>
          <h1 className="text-2xl font-black">Създай акаунт</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Присъедини се към Print3D
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

          {[
            { label: 'Пълно ime', field: 'full_name', type: 'text', placeholder: 'Иван Иванов' },
            { label: 'Имейл', field: 'email', type: 'email', placeholder: 'you@example.com' },
            { label: 'Парола', field: 'password', type: 'password', placeholder: 'Мин. 8 символа' },
            { label: 'Потвърди паролата', field: 'confirm', type: 'password', placeholder: '••••••••' },
          ].map(({ label, field, type, placeholder }) => (
            <div key={field}>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
              <input
                type={type}
                required
                value={form[field as keyof typeof form]}
                onChange={update(field)}
                placeholder={placeholder}
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          ))}

          <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none" style={{ color: 'var(--muted)' }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 flex-shrink-0"
              style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
            />
            <span>
              Съгласен съм с{' '}
              <Link href="/terms" target="_blank" style={{ color: 'var(--accent)' }} className="font-semibold">
                Общите условия
              </Link>{' '}
              и{' '}
              <Link href="/privacy" target="_blank" style={{ color: 'var(--accent)' }} className="font-semibold">
                Политиката за поверителност
              </Link>{' '}
              на 3DPrintingBG, включително използването на бисквитки.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !agreed}
            className="w-full py-3 rounded-lg text-sm font-bold transition-opacity"
            style={{ background: 'var(--accent)', color: '#fff', opacity: (loading || !agreed) ? 0.5 : 1, cursor: (loading || !agreed) ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Регистрация...' : 'Създай акаунт'}
          </button>

          <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
            Вече имаш акаунт?{' '}
            <Link href="/login" style={{ color: 'var(--accent)' }} className="font-semibold">
              Влез
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
