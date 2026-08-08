'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/image-compress'
import { Upload, X, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Category { id: string; name: string; slug: string; parent_id: string | null; icon: string | null }

export default function NewRequestPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [parentCats, setParentCats] = useState<Category[]>([])
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    category_id: '',
    budget_min: '',
    budget_max: '',
    city: '',
    deadline: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login?redirectTo=/requests/new')
    })
    supabase.from('categories').select('*').is('parent_id', null).order('sort_order').then(({ data }) => {
      setParentCats(data ?? [])
    })
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      setCategories(data ?? [])
    })
  }, [router])

  const update = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleFile(files: FileList | null) {
    if (!files || files.length === 0) return
    const compressed = await compressImage(files[0])
    setImage(compressed)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(compressed)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.title.trim() || !form.description.trim()) {
      setError('Заглавие и описание са задължителни.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login?redirectTo=/requests/new'); return }

    let imageUrl: string | null = null
    if (image) {
      const ext = image.name.split('.').pop()
      const path = `requests/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, image, { cacheControl: '3600', upsert: false })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(path)
        imageUrl = publicUrl
      }
    }

    const { data: request, error: insertError } = await supabase
      .from('requests')
      .insert({
        buyer_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: form.category_id || null,
        budget_min: form.budget_min ? parseFloat(form.budget_min) : null,
        budget_max: form.budget_max ? parseFloat(form.budget_max) : null,
        city: form.city.trim() || null,
        deadline: form.deadline || null,
        image_url: imageUrl,
      })
      .select()
      .single()

    if (insertError || !request) {
      setError('Грешка при публикуване. Опитай отново.')
      setLoading(false)
      return
    }

    router.push(`/requests/${request.id}?new=1`)
  }

  const inputStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/requests" className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: 'var(--bg3)', color: 'var(--text)' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">📝 Публикувай заявка</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Кажи какво търсиш — продавачите ще ти предложат оферти</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold">📝 Какво търсиш</h2>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Заглавие *</label>
            <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
              value={form.title} onChange={update('title')} placeholder="напр. Държач за телефон с инициали"
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Описание *</label>
            <textarea className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none" style={inputStyle}
              value={form.description} onChange={update('description')}
              placeholder="Опиши подробно — размери, цвят, материал, за какво ще се ползва..." rows={5}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Референтна снимка (по избор)</label>
            {preview ? (
              <div className="relative w-28 aspect-square rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => { setImage(null); setPreview(null) }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <X size={12} color="#fff" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-28 aspect-square rounded-xl flex flex-col items-center justify-center gap-2 transition-colors hover:opacity-80"
                style={{ border: '2px dashed var(--border)', color: 'var(--muted)', background: 'var(--bg2)' }}>
                <Upload size={20} />
                <span className="text-xs">Добави</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />
          </div>
        </div>

        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold">📦 Категория и бюджет</h2>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Категория</label>
            <select className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none appearance-none" style={inputStyle}
              value={form.category_id} onChange={update('category_id')}>
              <option value="">— Избери категория —</option>
              {parentCats.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
              {categories.filter(c => c.parent_id).length > 0 && (
                <optgroup label="Подкатегории">
                  {categories.filter(c => c.parent_id).map(c => (
                    <option key={c.id} value={c.id}>↳ {c.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Бюджет от (€)</label>
              <input type="number" min="0" step="0.01"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.budget_min} onChange={update('budget_min')} placeholder="10"
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Бюджет до (€)</label>
              <input type="number" min="0" step="0.01"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.budget_max} onChange={update('budget_max')} placeholder="30"
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold">📍 Допълнително</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Град (по избор)</label>
              <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.city} onChange={update('city')} placeholder="София"
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Срок (по избор)</label>
              <input type="date" className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.deadline} onChange={update('deadline')}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-base transition-opacity"
          style={{
            background: 'linear-gradient(135deg, var(--accent), #f59e0b)',
            color: '#fff', border: 'none',
            opacity: loading ? 0.7 : 1,
          }}>
          {loading ? '⏳ Публикуване...' : '🚀 Публикувай заявката'}
        </button>
      </form>
    </div>
  )
}
