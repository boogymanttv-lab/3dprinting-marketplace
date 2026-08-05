'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { MATERIAL_LABELS, type MaterialType } from '@/types'

interface Category { id: string; name: string; slug: string; parent_id: string | null; icon: string | null }

export default function EditListingPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [parentCats, setParentCats] = useState<Category[]>([])
  const [subCats, setSubCats] = useState<Category[]>([])
  const [selectedParent, setSelectedParent] = useState('')

  // Existing URLs from DB + new File objects for new uploads
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newPreviews, setNewPreviews] = useState<string[]>([])

  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(true)
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
    is_active: true,
  })
  const [moderationNote, setModerationNote] = useState<string | null>(null)
  const [isFlagged, setIsFlagged] = useState(false)

  const totalImages = existingImages.length + newFiles.length

  // Load listing + categories
  useEffect(() => {
    const supabase = createClient()

    supabase.from('categories').select('*').order('sort_order').then(({ data }) => {
      const cats = data ?? []
      setCategories(cats)
      setParentCats(cats.filter((c: Category) => !c.parent_id))
    })

    async function loadListing() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: shop } = await supabase
        .from('shops').select('id').eq('owner_id', user.id).maybeSingle()
      if (!shop) { router.push('/dashboard'); return }

      const { data: listing } = await supabase
        .from('listings')
        .select('*, category:categories(id, parent_id)')
        .eq('id', id)
        .eq('shop_id', shop.id)
        .maybeSingle()

      if (!listing) { router.push('/dashboard/listings'); return }

      setForm({
        title: listing.title ?? '',
        description: listing.description ?? '',
        price: listing.price?.toString() ?? '',
        quantity: listing.quantity?.toString() ?? '1',
        condition: listing.condition ?? 'new',
        material: listing.material ?? '',
        category_id: listing.category_id ?? '',
        city: listing.city ?? '',
        tags: (listing.tags ?? []).join(', '),
        is_active: listing.is_active ?? true,
      })
      setExistingImages(listing.images ?? [])
      setModerationNote(listing.moderation_note ?? null)
      setIsFlagged(listing.moderation_status === 'flagged')

      // Set parent category
      if (listing.category?.parent_id) {
        setSelectedParent(listing.category.parent_id)
      } else if (listing.category_id) {
        setSelectedParent(listing.category_id)
      }

      setFetchLoading(false)
    }

    loadListing()
  }, [id])

  // Update subcats when parent changes
  useEffect(() => {
    if (selectedParent) {
      setSubCats(categories.filter(c => c.parent_id === selectedParent))
    }
  }, [selectedParent, categories])

  const update = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))

  async function compressImage(file: File): Promise<File> {
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1920
        let { width, height } = img
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX }
          else { width = Math.round(width * MAX / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.85)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const toAdd = Array.from(files).slice(0, 6 - totalImages)
    const compressed = await Promise.all(toAdd.map(compressImage))
    setNewFiles(prev => [...prev, ...compressed])
    compressed.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => setNewPreviews(prev => [...prev, e.target?.result as string])
      reader.readAsDataURL(file)
    })
  }

  function removeExisting(i: number) {
    setExistingImages(prev => prev.filter((_, idx) => idx !== i))
  }

  function removeNew(i: number) {
    setNewFiles(prev => prev.filter((_, idx) => idx !== i))
    setNewPreviews(prev => prev.filter((_, idx) => idx !== i))
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
      .from('shops').select('id').eq('owner_id', user.id).single()
    if (!shop) { setError('Нямаш магазин.'); setLoading(false); return }

    // Upload new images
    setUploading(true)
    const newUrls: string[] = []
    for (const file of newFiles) {
      const ext = file.name.split('.').pop()
      const path = `listings/${shop.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(path)
        newUrls.push(publicUrl)
      }
    }
    setUploading(false)

    const allImages = [...existingImages, ...newUrls]
    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []

    const { error: updateError } = await supabase
      .from('listings')
      .update({
        title: form.title,
        description: form.description || null,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        condition: form.condition,
        material: form.material || null,
        category_id: form.category_id || null,
        city: form.city || null,
        tags,
        images: allImages,
        is_active: form.is_active,
        // Редакция от продавача след флаг = проблемът е адресиран
        ...(isFlagged ? { moderation_status: 'active', moderation_note: null, flagged_by: null, flagged_at: null } : {}),
      })
      .eq('id', id)
      .eq('shop_id', shop.id)

    if (updateError) {
      setError('Грешка при запазване. Опитай отново.')
      setLoading(false)
      return
    }

    router.push('/dashboard/listings')
  }

  const inputStyle = {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  }

  if (fetchLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p style={{ color: 'var(--muted)' }}>Зарежда...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/listings" className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">✏️ Редактирай обява</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Промени информацията за продукта</p>
        </div>
      </div>

      {isFlagged && moderationNote && (
        <div className="rounded-xl p-4 mb-5 text-sm" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#eab308' }}>
          ⚠️ Тази обява беше свалена от екипа ни: <strong>{moderationNote}</strong>
          <br />Направи нужните промени и запази — обявата ще се маркира отново като редовна.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Images */}
        <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold mb-4 flex items-center gap-2">
            📸 Снимки
            <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>{totalImages}/6</span>
          </h2>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {/* Existing images */}
            {existingImages.map((src, i) => (
              <div key={`ex-${i}`} className="relative aspect-square rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--border)' }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeExisting(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <X size={12} color="#fff" />
                </button>
                {i === 0 && existingImages.length > 0 && (
                  <span className="absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded font-bold"
                    style={{ background: 'var(--accent)', color: '#fff' }}>Главна</span>
                )}
              </div>
            ))}

            {/* New images previews */}
            {newPreviews.map((src, i) => (
              <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--accent)', opacity: 0.85 }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeNew(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <X size={12} color="#fff" />
                </button>
                <span className="absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded font-bold"
                  style={{ background: 'rgba(249,115,22,0.8)', color: '#fff' }}>Нова</span>
              </div>
            ))}

            {/* Add button */}
            {totalImages < 6 && (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl flex flex-col items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                style={{ border: '2px dashed var(--border)', color: 'var(--muted)', background: 'var(--bg2)' }}>
                <Plus size={24} />
                <span className="text-xs">Добави</span>
              </button>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { handleFiles(e.target.files); e.target.value = '' }} />
        </div>

        {/* Basic Info */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold">📝 Основна информация</h2>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Заглавие *</label>
            <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
              value={form.title} onChange={update('title')}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Описание</label>
            <textarea className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none resize-none" style={inputStyle}
              value={form.description} onChange={update('description')} rows={4}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Цена (€) *</label>
              <input type="number" min="0.01" step="0.01"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.price} onChange={update('price')}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Количество</label>
              <input type="number" min="1"
                className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.quantity} onChange={update('quantity')}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
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

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2 px-3 rounded-xl"
            style={{ background: 'var(--bg3)' }}>
            <div>
              <p className="text-sm font-semibold">Активна обява</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Изключи за да скриеш временно</p>
            </div>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: form.is_active ? 'var(--accent)' : 'var(--border)' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                style={{
                  background: '#fff',
                  left: form.is_active ? '26px' : '2px',
                }} />
            </button>
          </div>
        </div>

        {/* Category */}
        <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold">📦 Категория</h2>

          <div>
            <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Основна категория</label>
            <select className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none appearance-none" style={inputStyle}
              value={selectedParent} onChange={e => { setSelectedParent(e.target.value); setForm(f => ({ ...f, category_id: '' })) }}>
              <option value="">— Избери категория —</option>
              {parentCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          {subCats.length > 0 && (
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Подкатегория</label>
              <select className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none appearance-none" style={inputStyle}
                value={form.category_id} onChange={update('category_id')}>
                <option value="">— Избери подкатегория —</option>
                {subCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div>
              <label className="text-sm block mb-1.5" style={{ color: 'var(--muted)' }}>Тагове</label>
              <input className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none" style={inputStyle}
                value={form.tags} onChange={update('tags')} placeholder="PLA, 1.75mm, бял"
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'} />
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

        <div className="flex gap-3">
          <Link href="/dashboard/listings"
            className="flex-1 py-4 rounded-xl font-bold text-base text-center"
            style={{ border: '1.5px solid var(--border)', color: 'var(--muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Отказ
          </Link>
          <button type="submit" disabled={loading || uploading}
            className="flex-1 py-4 rounded-xl font-bold text-base transition-opacity"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #f59e0b)',
              color: '#fff', border: 'none',
              opacity: loading || uploading ? 0.7 : 1, cursor: loading || uploading ? 'not-allowed' : 'pointer',
            }}>
            {uploading ? '📤 Качване...' : loading ? '⏳ Запазване...' : '💾 Запази промените'}
          </button>
        </div>
      </form>
    </div>
  )
}
