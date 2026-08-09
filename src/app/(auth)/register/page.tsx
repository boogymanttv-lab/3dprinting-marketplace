'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Turnstile } from '@/components/Turnstile'
import { OtpInput } from '@/components/OtpInput'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [agreed, setAgreed] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const captchaRequired = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

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
    if (captchaRequired && !captchaToken) {
      setError('Моля, потвърди, че не си робот.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name },
        captchaToken: captchaToken ?? undefined,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setStep('verify')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}>
            🖨️
          </div>
          <h1 className="text-2xl font-black">{step === 'form' ? 'Създай акаунт' : 'Потвърди имейла си'}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {step === 'form' ? 'Присъедини се към 3DPrintingBG' : 'Последна стъпка преди да влезеш'}
          </p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="rounded-2xl border p-8 space-y-4"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>

            {error && (
              <div className="rounded-lg px-4 py-3 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                {error}
              </div>
            )}

            {[
              { label: 'Пълно име', field: 'full_name', type: 'text', placeholder: 'Иван Иванов' },
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
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)' }}
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

            <Turnstile onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

            <button
              type="submit"
              disabled={loading || !agreed || (captchaRequired && !captchaToken)}
              className="w-full py-3 rounded-lg text-sm font-bold transition-opacity"
              style={{
                background: 'var(--accent)', color: '#fff',
                opacity: (loading || !agreed || (captchaRequired && !captchaToken)) ? 0.5 : 1,
                cursor: (loading || !agreed || (captchaRequired && !captchaToken)) ? 'not-allowed' : 'pointer',
              }}
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
        ) : (
          <VerifyStep email={form.email} onBack={() => setStep('form')} />
        )}
      </div>
    </div>
  )
}

function VerifyStep({ email, onBack }: { email: string; onBack: () => void }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendMessage, setResendMessage] = useState('')

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (code.length !== 8) {
      setError('Въведи всичките 8 цифри от кода.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' })
    setLoading(false)

    if (error) {
      setError(error.message.includes('expired') || error.message.includes('invalid')
        ? 'Кодът е грешен или е изтекъл. Провери го отново или изпрати нов.'
        : error.message)
      return
    }

    router.push('/?registered=1')
    router.refresh()
  }

  async function handleResend() {
    setResending(true)
    setError('')
    setResendMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResending(false)

    if (error) {
      setError('Грешка при изпращане на нов код. Опитай отново след малко.')
      return
    }

    setResendMessage('Изпратихме нов код на имейла ти.')
    setResendCooldown(30)
  }

  return (
    <div className="rounded-2xl border p-8 space-y-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
        Изпратихме 8-цифрен код на <strong style={{ color: 'var(--text)' }}>{email}</strong>. Въведи го по-долу, за да активираш акаунта си.
      </p>

      <form onSubmit={handleVerify} className="space-y-4">
        <OtpInput value={code} onChange={setCode} length={8} />

        {error && (
          <div className="rounded-lg px-4 py-3 text-sm text-center"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}
        {resendMessage && !error && (
          <div className="rounded-lg px-4 py-3 text-sm text-center"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            {resendMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 8}
          className="w-full py-3 rounded-lg text-sm font-bold transition-opacity"
          style={{
            background: 'var(--accent)', color: '#fff',
            opacity: (loading || code.length !== 8) ? 0.5 : 1,
            cursor: (loading || code.length !== 8) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Проверка...' : '✓ Активирай'}
        </button>
      </form>

      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
        <button
          type="button"
          onClick={onBack}
          className="font-semibold"
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
        >
          ← Промени имейла
        </button>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="font-semibold"
          style={{
            background: 'none', border: 'none',
            color: (resending || resendCooldown > 0) ? 'var(--muted)' : 'var(--accent)',
            cursor: (resending || resendCooldown > 0) ? 'not-allowed' : 'pointer',
          }}
        >
          {resendCooldown > 0 ? `Изпрати нов код (${resendCooldown}с)` : resending ? 'Изпращане...' : 'Изпрати нов код'}
        </button>
      </div>
    </div>
  )
}
