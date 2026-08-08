'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { MATERIAL_LABELS, type MaterialType } from '@/types'
import { compressImage } from '@/lib/image-compress'

interface Category { id: string; name: string; slug: string; parent_id: string | null; icon: string | null }

export default function NewListingPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [parentCats, setParentCats] = useState<Category[]>([])
  const [subCats, setSubCats] = useState<Category[]>([])
  const [selectedParent, setSelectedParent] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    quantity: '1',
    condition: 'new' as 'new' | 'used' | 'refurbished',
    material: '' as MaterialType | '',
    category_id: '',
    city: '',
    tags: '',
  })

  useEffect(() => {
    const supabase = createClient()
    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      setCategories(data ?? [])
      setParentCats((data ?? []).filter((c: Category) => !c.parent_id))
    })
  }, [])

  useEffect(() => {
    if (selectedParent) {
      setSubCats(categories.filter(c => c.parent_id === selectedParent))
      setForm(f => ({ ...f, category_id: '' }))
    }
  }, [selectedParent, categories])

  const update = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 6 - images.length)
    const compressed = await Promise.all(newFiles.map(compressImage))
    setImages(prev => [...prev, ...compressed])
    compressed.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => setPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  function removeImage(i: number) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
    setPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.title || !form.price) { setError('Заглавие и цена са задължителни.'); return }
    if (parseFloat(form.price) <= 0) { setError('Цената трябва да е над 0.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: shop } = await supabase
      .from('shops')
      .select('id, plan:plans(max_listings)')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!shop) { setError('Нямаш магазин. Първо отвори магазин.'); setLoading(false); return }

    // Check listing limit
    const planData = Array.isArray(shop.plan) ? shop.plan[0] : shop.plan
    const maxListings = (planData as { max_listings: number | null } | null)?.max_listings
    if (maxListings !== null && maxListings !== undefined) {
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', shop.id)
        .eq('is_active', true)
        .eq('is_request_order', false)

      if ((count ?? 0) >= maxListings) {
        setError(`Достигна лимита от ${maxListings} обяви за твоя план. Надгради от Абонамент.`)
        setLoading(false)
        return
      }
    }

    // Upload images to Supabase Storage
    setUploading(true)
    const imageUrls: string[] = []

    for (const file of images) {
      const ext = file.name.split('.').pop()
      const path = `listings/${shop.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(path)
        imageUrls.push(publicUrl)
      }
    }
    setUploading(false)

    // Create listing
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        shop_id: shop.id,
        title: form.title,
        description: form.description || null,
        price: parseFloat(form.price),
        currency: 'EUR',
        quantity: parseInt(form.quantity),
        condition: form.condition,
        material: form.material || null,
        category_id: form.category_id || null,
        city: form.city || null,
        tags,
        images: imageUrls,
        is_active: true,
      })
      .select()
      .single()

    if (listingError) {
      setError('Грешка при публикуване. Опитай отново.')
      setLoading(false)
      return
    }

    // IndexNow — известява Bing/Yandex моментално за новата обява (best-effort).
    fetch('/api/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: [`${window.location.origin}/listings/${listing.id}`] }),
    }).catch(() => {})

    router.push(`/listings/${listing.id}?new=1`)
  }

  const inputStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: 'var(--bg3)', color: 'var(--text)' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">Нова обява</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Попълни информацията за продукта</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Images */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold mb-4 flex items-center gap-2">
            📸 Снимки
            <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>до 6</span>
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border)' }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <X size={12} color="#fff" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded font-bold"
                    style={{ background: 'var(--accent)', color: '#fff' }}>Главна</span>
                )}
              </div>
            ))}

            {previews.length < 6 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-2 transition-colors hover:opacity-80"
                style={{ border: '2px dashed var(--border)', color: 'var(--muted)', background: 'var(--bg2)' }}
              >
                <Plus size={24} />
                <span className="text-xs">Добави</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
        </div>

        {/* Basic Info */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold">📝 Основна информация</h2>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Заглавие *</label>
            <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
              value={form.title} onChange={update('title')} placeholder="напр. PLA+ Filament 1kg — Бял"
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Описание</label>
            <textarea className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none" style={inputStyle}
              value={form.description} onChange={update('description')}
              placeholder="Опиши продукта — материал, размери, употреба..." rows={4}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Цена (€) *</label>
              <input type="number" min="0.01" step="0.01"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.price} onChange={update('price')} placeholder="0.00"
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Количество</label>
              <input type="number" min="1"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.quantity} onChange={update('quantity')}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          <div>
            <label className="text-sm block mb-2" style={{ color: 'var(--muted)' }}>Състояние</label>
            <div className="flex gap-2">
              {([
                { key: 'new', label: '✨ Ново' },
                { key: 'used', label: '🔄 Употребявано' },
                { key: 'refurbished', label: '🔧 Обновено' },
              ] as const).map(opt => (
                <button key={opt.key} type="button"
                  onClick={() => setForm(f => ({ ...f, condition: opt.key }))}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: form.condition === opt.key ? 'rgba(249,115,22,0.1)' : 'var(--bg2)',
                    border: `1.5px solid ${form.condition === opt.key ? 'var(--accent)' : 'var(--border)'}`,
                    color: form.condition === opt.key ? 'var(--accent)' : 'var(--muted)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Материал</label>
            <select className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none appearance-none" style={inputStyle}
              value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value as MaterialType | '' }))}>
              <option value="">— Не е приложимо / друго —</option>
              {(Object.keys(MATERIAL_LABELS) as MaterialType[]).map(m => (
                <option key={m} value={m}>{MATERIAL_LABELS[m]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold">📦 Категория</h2>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Основна категория</label>
            <select className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none appearance-none" style={inputStyle}
              value={selectedParent} onChange={e => setSelectedParent(e.target.value)}>
              <option value="">— Избери категория —</option>
              {parentCats.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {subCats.length > 0 && (
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Подкатегория</label>
              <select className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none appearance-none" style={inputStyle}
                value={form.category_id} onChange={update('category_id')}>
                <option value="">— Избери подкатегория —</option>
                {subCats.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Extra */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold">📍 Допълнително</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Град</label>
              <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.city} onChange={update('city')} placeholder="София"
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Тагове</label>
              <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.tags} onChange={update('tags')} placeholder="PLA, 1.75mm, бял"
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Разделени с запетая</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || uploading}
          className="w-full py-4 rounded-xl font-bold text-base transition-opacity"
          style={{
            background: 'linear-gradient(135deg, var(--accent), #f59e0b)',
            color: '#fff', border: 'none',
            opacity: loading || uploading ? 0.7 : 1,
          }}>
          {uploading ? '📤 Качване на снимки...' : loading ? '⏳ Публикуване...' : '🚀 Публикувай обявата'}
        </button>
      </form>
    </div>
  )
}
