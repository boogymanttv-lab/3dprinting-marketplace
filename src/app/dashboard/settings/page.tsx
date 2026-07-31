'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Save, LogOut, User, Store, Building2, Lock, Upload, X } from 'lucide-react'

type Tab = 'profile' | 'shop' | 'company' | 'password'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [profile, setProfile] = useState({ full_name: '', phone: '', city: '', email: '' })
  const [shop, setShop] = useState({ name: '', description: '', city: '', phone: '' })
  const [shopSlug, setShopSlug] = useState('')
  const [company, setCompany] = useState({ company_name: '', eik: '', vat_number: '', company_address: '' })
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' })
  const [shopId, setShopId] = useState<string | null>(null)
  const [hasShop, setHasShop] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileData) {
        setProfile({
          full_name: profileData.full_name ?? '',
          phone: profileData.phone ?? '',
          city: profileData.city ?? '',
          email: user.email ?? '',
        })
      }

      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (shopData) {
        setHasShop(true)
        setShopId(shopData.id)
        setShopSlug(shopData.slug ?? '')
        setLogoUrl(shopData.logo_url ?? '')
        setBannerUrl(shopData.banner_url ?? '')
        setShop({
          name: shopData.name ?? '',
          description: shopData.description ?? '',
          city: shopData.city ?? '',
          phone: shopData.phone ?? '',
        })
        setCompany({
          company_name: shopData.company_name ?? '',
          eik: shopData.eik ?? '',
          vat_number: shopData.vat_number ?? '',
          company_address: shopData.company_address ?? '',
        })
      }
    }
    load()
  }, [])

  async function saveProfile() {
    setLoading(true); setError(''); setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({
      full_name: profile.full_name,
      phone: profile.phone || null,
      city: profile.city || null,
    }).eq('id', user.id)

    setLoading(false)
    if (error) setError('Грешка при запазване.')
    else setSaved(true)
  }

  async function saveShop() {
    if (!shopId) return
    setLoading(true); setError(''); setSaved(false)

    const { error } = await supabase.from('shops').update({
      name: shop.name,
      description: shop.description || null,
      city: shop.city || null,
      phone: shop.phone || null,
    }).eq('id', shopId)

    setLoading(false)
    if (error) setError('Грешка при запазване.')
    else setSaved(true)
  }

  async function uploadShopImage(
    file: File,
    type: 'logo' | 'banner',
    setUploading: (v: boolean) => void,
    setUrl: (v: string) => void
  ) {
    if (!shopId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${type}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('shop-images')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Грешка при качване на снимка.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('shop-images')
      .getPublicUrl(path)

    const column = type === 'logo' ? 'logo_url' : 'banner_url'
    await supabase.from('shops').update({ [column]: publicUrl }).eq('id', shopId)
    setUrl(publicUrl)
    setUploading(false)
    setSaved(true)
  }

  async function removeShopImage(type: 'logo' | 'banner', setUrl: (v: string) => void) {
    if (!shopId) return
    const column = type === 'logo' ? 'logo_url' : 'banner_url'
    await supabase.from('shops').update({ [column]: null }).eq('id', shopId)
    setUrl('')
  }

  async function saveCompany() {
    if (!shopId) return
    setLoading(true); setError(''); setSaved(false)

    const { error } = await supabase.from('shops').update({
      company_name: company.company_name || null,
      eik: company.eik || null,
      vat_number: company.vat_number || null,
      company_address: company.company_address || null,
    }).eq('id', shopId)

    setLoading(false)
    if (error) setError('Грешка при запазване.')
    else setSaved(true)
  }

  async function savePassword() {
    setError('')
    if (passwords.newPass !== passwords.confirm) { setError('Паролите не съвпадат.'); return }
    if (passwords.newPass.length < 8) { setError('Паролата трябва да е поне 8 символа.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.newPass })
    setLoading(false)
    if (error) setError(error.message)
    else { setSaved(true); setPasswords({ current: '', newPass: '', confirm: '' }) }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const inputStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  }

  const tabs: { key: Tab; icon: React.ReactNode; label: string; show?: boolean }[] = [
    { key: 'profile', icon: <User size={16} />, label: 'Профил' },
    { key: 'shop', icon: <Store size={16} />, label: 'Магазин', show: hasShop },
    { key: 'company', icon: <Building2 size={16} />, label: 'Фирма', show: hasShop },
    { key: 'password', icon: <Lock size={16} />, label: 'Парола' },
  ]

  function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string
  }) {
    return (
      <div>
        <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
        <input
          type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>
    )
  }

  function TextArea({ label, value, onChange, placeholder = '' }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string
  }) {
    return (
      <div>
        <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
        <textarea
          rows={3} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none transition-colors"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-lg hover:opacity-80"
          style={{ background: 'var(--bg3)', color: 'var(--text)' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">⚙️ Настройки</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Управлявай профила и магазина си</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        {tabs.filter(t => t.show !== false).map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSaved(false); setError('') }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === t.key ? 'var(--card)' : 'transparent',
              color: tab === t.key ? 'var(--text)' : 'var(--muted)',
              border: tab === t.key ? '1px solid var(--border)' : '1px solid transparent',
            }}>
            {t.icon} <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border p-6 space-y-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {/* Profile */}
        {tab === 'profile' && (
          <>
            <h2 className="font-bold flex items-center gap-2"><User size={16} /> Лични данни</h2>
            <Field label="Имейл" value={profile.email} onChange={() => {}} placeholder="Не може да се смени тук" />
            <Field label="Пълно ime" value={profile.full_name} onChange={v => setProfile(p => ({ ...p, full_name: v }))} placeholder="Иван Иванов" />
            <Field label="Телефон" value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} placeholder="+359..." type="tel" />
            <Field label="Град" value={profile.city} onChange={v => setProfile(p => ({ ...p, city: v }))} placeholder="София" />
            <button onClick={saveProfile} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loading ? 0.7 : 1 }}>
              <Save size={15} /> {loading ? 'Запазване...' : 'Запази промените'}
            </button>
          </>
        )}

        {/* Shop */}
        {tab === 'shop' && (
          <>
            <h2 className="font-bold flex items-center gap-2"><Store size={16} /> Данни за магазина</h2>

            {/* Banner upload */}
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>
                Банер <span style={{ fontSize: '11px' }}>(препоръчан размер: 1200 × 300 px)</span>
              </label>
              <div
                className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
                style={{ height: '120px', background: 'var(--bg3)', border: '2px dashed var(--border)' }}
              >
                {bannerUrl ? (
                  <>
                    <Image src={bannerUrl} alt="Banner" fill className="object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <button type="button" onClick={() => bannerInputRef.current?.click()}
                        disabled={bannerUploading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        <Upload size={12} /> Смени
                      </button>
                      <button type="button" onClick={() => removeShopImage('banner', setBannerUrl)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: 'rgba(239,68,68,0.8)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        <X size={12} /> Премахни
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" onClick={() => bannerInputRef.current?.click()}
                    disabled={bannerUploading}
                    className="flex flex-col items-center gap-2"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                    {bannerUploading
                      ? <span className="text-sm">Качване...</span>
                      : <><Upload size={20} /><span className="text-xs">Качи банер (JPG, PNG — макс 5MB)</span></>
                    }
                  </button>
                )}
                <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) uploadShopImage(f, 'banner', setBannerUploading, setBannerUrl)
                    e.target.value = ''
                  }} />
              </div>
            </div>

            {/* Logo upload */}
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>
                Лого <span style={{ fontSize: '11px' }}>(препоръчан размер: 200 × 200 px)</span>
              </label>
              <div className="flex items-center gap-4">
                <div
                  className="relative rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{ width: 80, height: 80, background: 'var(--bg3)', border: '2px dashed var(--border)' }}
                >
                  {logoUrl ? (
                    <>
                      <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                      <button type="button" onClick={() => removeShopImage('logo', setLogoUrl)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        <X size={10} />
                      </button>
                    </>
                  ) : (
                    <span className="text-2xl">🏪</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                    style={{ border: '1.5px solid var(--border)', color: 'var(--muted)', background: 'var(--bg3)', cursor: 'pointer' }}>
                    <Upload size={14} /> {logoUploading ? 'Качване...' : 'Качи лого'}
                  </button>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>JPG, PNG или WebP — макс 2MB</p>
                </div>
                <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) uploadShopImage(f, 'logo', setLogoUploading, setLogoUrl)
                    e.target.value = ''
                  }} />
              </div>
            </div>

            <Field label="Ime на магазина *" value={shop.name} onChange={v => setShop(s => ({ ...s, name: v }))} />
            <TextArea label="Описание" value={shop.description} onChange={v => setShop(s => ({ ...s, description: v }))} placeholder="Разкажи на купувачите какво продаваш..." />
            <Field label="Град" value={shop.city} onChange={v => setShop(s => ({ ...s, city: v }))} placeholder="София" />
            <Field label="Телефон" value={shop.phone} onChange={v => setShop(s => ({ ...s, phone: v }))} placeholder="+359..." type="tel" />

            {/* Shop URL — auto-generated, read-only */}
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>
                Уебсайт на магазина
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 rounded-lg px-3.5 py-2.5 text-sm font-mono truncate"
                  style={{
                    background: 'var(--bg3)',
                    border: '1px solid var(--border)',
                    color: 'var(--muted)',
                    userSelect: 'all',
                  }}
                >
                  {typeof window !== 'undefined' ? `${window.location.origin}/stores/${shopSlug}` : `/stores/${shopSlug}`}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/stores/${shopSlug}`
                    navigator.clipboard.writeText(url)
                  }}
                  className="px-3 py-2.5 rounded-lg text-xs font-semibold flex-shrink-0"
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', cursor: 'pointer' }}
                >
                  📋 Копирай
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Линкът се генерира автоматично и не може да се промени.
              </p>
            </div>

            <button onClick={saveShop} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loading ? 0.7 : 1 }}>
              <Save size={15} /> {loading ? 'Запазване...' : 'Запази промените'}
            </button>
          </>
        )}

        {/* Company */}
        {tab === 'company' && (
          <>
            <h2 className="font-bold flex items-center gap-2"><Building2 size={16} /> Фирмени данни</h2>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Попълни ако издаваш фактури. Данните се показват на купувачите при поръчка.
            </p>
            <Field label="Фирма" value={company.company_name} onChange={v => setCompany(c => ({ ...c, company_name: v }))} placeholder="ЕООД / АД / ЕТ" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="ЕИК / Булстат" value={company.eik} onChange={v => setCompany(c => ({ ...c, eik: v }))} placeholder="123456789" />
              <Field label="ДДС номер" value={company.vat_number} onChange={v => setCompany(c => ({ ...c, vat_number: v }))} placeholder="BG123456789" />
            </div>
            <Field label="Адрес на фирмата" value={company.company_address} onChange={v => setCompany(c => ({ ...c, company_address: v }))} placeholder="ул. Витоша 12, София" />

            {company.eik && (
              <div className="rounded-xl p-3 text-xs"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}>
                ✅ Магазинът предлага фактури — ще се показва на всички обяви
              </div>
            )}

            <button onClick={saveCompany} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loading ? 0.7 : 1 }}>
              <Save size={15} /> {loading ? 'Запазване...' : 'Запази промените'}
            </button>
          </>
        )}

        {/* Password */}
        {tab === 'password' && (
          <>
            <h2 className="font-bold flex items-center gap-2"><Lock size={16} /> Смяна на парола</h2>
            <Field label="Нова парола" value={passwords.newPass} onChange={v => setPasswords(p => ({ ...p, newPass: v }))} type="password" placeholder="Мин. 8 символа" />
            <Field label="Потвърди новата парола" value={passwords.confirm} onChange={v => setPasswords(p => ({ ...p, confirm: v }))} type="password" placeholder="••••••••" />
            <button onClick={savePassword} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff', border: 'none', opacity: loading ? 0.7 : 1 }}>
              <Save size={15} /> {loading ? 'Запазване...' : 'Смени паролата'}
            </button>
          </>
        )}

        {/* Feedback */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            ✅ Промените са запазени успешно!
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border mt-5 p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--muted)' }}>Акаунт</h3>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <LogOut size={15} /> Излез от акаунта
        </button>
      </div>

      {/* Legal */}
      <div className="rounded-2xl border mt-5 p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--muted)' }}>Правна информация</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/terms" style={{ color: 'var(--accent)' }} className="font-semibold">
            Общи условия
          </Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link href="/privacy" style={{ color: 'var(--accent)' }} className="font-semibold">
            Политика за поверителност
          </Link>
        </div>
      </div>
    </div>
  )
}
