import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Star, Package, ShoppingBag, Search } from 'lucide-react'
import type { Metadata } from 'next'
import { StoreFilters } from '@/components/stores/StoreFilters'
import { VerifiedSellerBadge } from '@/components/shops/VerifiedSellerBadge'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Онлайн магазини',
  description: 'Разгледай всички магазини за 3D принтиране, филамент и принтери в 3DPrintingBG.',
  alternates: { canonical: '/stores' },
}

interface SearchParams { q?: string; city?: string; sort?: string; invoice?: string }

export default async function StoresPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('shops')
    .select('*, plan:plans(name, id)')
    .eq('is_active', true)

  if (params.city) {
    query = query.ilike('city', `%${params.city}%`)
  }

  if (params.q) {
    query = query.ilike('name', `%${params.q}%`)
  }

  if (params.invoice === '1') {
    query = query.not('eik', 'is', null)
  }

  // "Най-много обяви" sorts client-side below (not a shops column) —
  // everything else can be ordered directly by Supabase.
  if (params.sort === 'sales') {
    query = query.order('total_sales', { ascending: false })
  } else if (params.sort !== 'listings') {
    query = query.order('rating', { ascending: false })
  }

  const { data: shopsRaw } = await query.limit(48)

  // Count active listings per shop (shown alongside sales)
  const shopIds = (shopsRaw ?? []).map(s => s.id)
  const listingCounts = new Map<string, number>()
  if (shopIds.length > 0) {
    const { data: listingRows } = await supabase
      .from('listings')
      .select('shop_id')
      .eq('is_active', true)
      .in('shop_id', shopIds)

    for (const row of listingRows ?? []) {
      listingCounts.set(row.shop_id, (listingCounts.get(row.shop_id) ?? 0) + 1)
    }
  }

  const shops = params.sort === 'listings'
    ? [...(shopsRaw ?? [])].sort((a, b) => (listingCounts.get(b.id) ?? 0) - (listingCounts.get(a.id) ?? 0))
    : shopsRaw

  // Get unique cities for filter
  const { data: allShops } = await supabase
    .from('shops')
    .select('city')
    .eq('is_active', true)
    .not('city', 'is', null)

  const cities = [...new Set(allShops?.map(s => s.city).filter(Boolean))].sort()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">🏪 Онлайн магазини</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {shops?.length ?? 0} магазина в платформата
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form action="/stores" method="GET" className="flex flex-1 gap-3">
          <div
            className="flex flex-1 rounded-xl overflow-hidden"
            style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)' }}
          >
            <span className="flex items-center pl-4" style={{ color: 'var(--muted)' }}>
              <Search size={16} />
            </span>
            <input
              name="q"
              defaultValue={params.q}
              className="flex-1 bg-transparent px-3 py-3 text-sm outline-none"
              style={{ color: 'var(--text)' }}
              placeholder="Търси магазин..."
            />
          </div>

          {cities.length > 0 && (
            <select
              name="city"
              defaultValue={params.city ?? ''}
              className="rounded-xl px-4 py-3 text-sm outline-none appearance-none"
              style={{ background: 'var(--bg2)', border: '1.5px solid var(--border)', color: 'var(--text)', minWidth: '140px' }}
            >
              <option value="">📍 Всички градове</option>
              {cities.map(city => (
                <option key={city} value={city!}>{city}</option>
              ))}
            </select>
          )}

          <button
            type="submit"
            className="px-5 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}
          >
            Търси
          </button>
        </form>
      </div>

      <Suspense fallback={null}>
        <StoreFilters />
      </Suspense>

      {/* Grid */}
      {shops && shops.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {shops.map(shop => (
            <Link key={shop.id} href={`/stores/${shop.slug}`} className="h-full">
              <div
                className="rounded-2xl border p-5 h-full flex flex-col transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                {/* Avatar */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 overflow-hidden relative flex-shrink-0"
                  style={{ background: shop.logo_url ? 'var(--bg3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  {shop.logo_url
                    ? <Image src={shop.logo_url} alt={`${shop.name} лого`} fill className="object-cover" />
                    : <span>🏪</span>
                  }
                </div>

                {/* Name + Plan */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-base leading-tight">{shop.name}</h3>
                  {shop.plan?.id !== 'free' && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--accent)' }}
                    >
                      {shop.plan?.name}
                    </span>
                  )}
                </div>

                {shop.stripe_connect_charges_enabled && (
                  <div className="mb-1">
                    <VerifiedSellerBadge />
                  </div>
                )}

                {/* Description */}
                {shop.description && (
                  <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--muted)' }}>
                    {shop.description}
                  </p>
                )}

                {/* Meta */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                  {shop.rating > 0 && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                      <Star size={11} className="fill-amber-400 text-amber-400" />
                      {shop.rating.toFixed(1)}
                      <span style={{ color: 'var(--border)' }}>·</span>
                      {shop.review_count} ревюта
                    </span>
                  )}
                  {shop.city && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                      <MapPin size={11} /> {shop.city}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-auto pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                    <Package size={12} />
                    <span><strong style={{ color: 'var(--text)' }}>{listingCounts.get(shop.id) ?? 0}</strong> обяви</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                    <ShoppingBag size={12} />
                    <span><strong style={{ color: 'var(--text)' }}>{shop.total_sales}</strong> продажби</span>
                  </div>
                  {shop.eik && (
                    <span className="text-xs" style={{ color: 'var(--green)' }}>✅ Фактури</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl border p-20 text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <p className="text-5xl mb-4">🔍</p>
          <p className="font-bold text-lg mb-1">Няма намерени магазини</p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Опитай с различно търсене или{' '}
            <Link href="/stores" style={{ color: 'var(--accent)' }}>виж всички</Link>
          </p>
        </div>
      )}

      <style>{`
        a { text-decoration: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  )
}
