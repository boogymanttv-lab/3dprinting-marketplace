import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard } from '@/components/listings/ListingCard'
import { CategoryBar } from '@/components/listings/CategoryBar'
import { RecentlyViewedSection } from '@/components/listings/RecentlyViewedSection'
import { SearchBar } from '@/components/search/SearchBar'
import Link from 'next/link'
import Image from 'next/image'
import type { Listing, Shop, Category } from '@/types'

export const revalidate = 60

interface SearchParams { category?: string; sub?: string; q?: string; tab?: string; deactivated?: string; account_deleted?: string; page?: string }

const PAGE_SIZE = 15

export default async function HomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const tab = params.tab ?? 'listings'
  const supabase = await createClient()

  // Fetch categories
  const { data: allCategories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  const parentCats = allCategories?.filter(c => !c.parent_id) ?? []
  const subCats = allCategories?.filter(c => c.parent_id) ?? []

  // Пагинация
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Build query for listings
  let listingsQuery = supabase
    .from('listings')
    .select('*, shop:shops!inner(id, name, city, rating, is_active), category:categories(id, name, slug)', { count: 'exact' })
    .eq('is_active', true)
    .eq('shop.is_active', true)
    .eq('is_request_order', false)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (params.q) {
    listingsQuery = listingsQuery.textSearch('title', params.q, { type: 'websearch' })
  }
  if (params.sub) {
    const cat = allCategories?.find(c => c.slug === params.sub)
    if (cat) listingsQuery = listingsQuery.eq('category_id', cat.id)
  } else if (params.category) {
    const parent = allCategories?.find(c => c.slug === params.category)
    if (parent) {
      const childIds = allCategories?.filter(c => c.parent_id === parent.id).map(c => c.id) ?? []
      if (childIds.length > 0) {
        listingsQuery = listingsQuery.in('category_id', [parent.id, ...childIds])
      }
    }
  }

  const { data: listings, count: listingTotal } = await listingsQuery
  const totalPages = Math.max(1, Math.ceil((listingTotal ?? 0) / PAGE_SIZE))

  const pageHref = (n: number) => {
    const qs = new URLSearchParams()
    if (params.category) qs.set('category', params.category)
    if (params.sub) qs.set('sub', params.sub)
    if (params.q) qs.set('q', params.q)
    if (n > 1) qs.set('page', String(n))
    const s = qs.toString()
    return s ? `/?${s}` : '/'
  }

  // Fetch shops
  const { data: shops } = await supabase
    .from('shops')
    .select('*, plan:plans(name)')
    .eq('is_active', true)
    .order('rating', { ascending: false })
    .limit(12)

  // Статистики за социално доказателство в hero секцията
  const [{ count: shopCount }, { count: listingCount }, { data: cityRows }] = await Promise.all([
    supabase.from('shops').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('is_request_order', false),
    supabase.from('shops').select('city').eq('is_active', true).not('city', 'is', null),
  ])
  const cityCount = new Set((cityRows ?? []).map(r => r.city?.trim().toLowerCase()).filter(Boolean)).size

  return (
    <div>
      {(params.deactivated === '1' || params.account_deleted === '1') && (
        <div className="px-4 pt-4 max-w-3xl mx-auto">
          <div className="rounded-xl px-5 py-3.5 text-sm text-center font-semibold"
            style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            {params.account_deleted === '1'
              ? '✅ Акаунтът ти беше изтрит завинаги. Съжаляваме, че си тръгваш!'
              : '⏸️ Акаунтът ти е временно затворен. Влез отново по всяко време, за да върнеш всичко.'}
          </div>
        </div>
      )}
      {/* Hero */}
      <section
        className="border-b py-14 px-4 text-center"
        style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.06) 0%, transparent 100%)', borderColor: 'var(--border)' }}
      >
        <h1 className="text-4xl md:text-6xl font-black leading-tight mb-3 tracking-tight">
          Пазарът за<br />
          <span style={{ color: 'var(--accent)' }}>3D принтиране</span>
        </h1>
        <p className="text-base md:text-lg mb-8 max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
          Купувай и продавай филамент, принтери и 3D принтирани продукти
        </p>
        <SearchBar defaultValue={params.q} />

        {(shopCount ?? 0) > 0 && (
          <div className="flex items-center justify-center gap-6 sm:gap-10 mt-9 flex-wrap">
            <div className="text-center">
              <div className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{shopCount}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{shopCount === 1 ? 'магазин' : 'магазина'}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{listingCount ?? 0}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{listingCount === 1 ? 'обява' : 'обяви'}</div>
            </div>
            {cityCount > 0 && (
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: 'var(--accent)' }}>{cityCount}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{cityCount === 1 ? 'град' : 'града'}</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Category chips */}
      <Suspense>
        <CategoryBar
          categories={parentCats as Category[]}
          subCategories={subCats as Category[]}
          activeCategory={params.category}
          activeSub={params.sub}
        />
      </Suspense>

      {/* Tabs */}
      <div
        className="px-4 max-w-7xl mx-auto flex gap-1 border-b mt-4"
        style={{ borderColor: 'var(--border)' }}
      >
        {[
          { label: '📋 Обяви', key: 'listings' },
          { label: '🏪 Онлайн магазини', key: 'stores' },
        ].map(t => (
          <Link
            key={t.key}
            href={`/?tab=${t.key}${params.category ? `&category=${params.category}` : ''}${params.q ? `&q=${params.q}` : ''}`}
            className="px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors"
            style={{
              color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
              borderBottomColor: tab === t.key ? 'var(--accent)' : 'transparent',
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-7">
        {tab === 'listings' ? (
          <>
            {listings && listings.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {listings.map(l => (
                    <ListingCard key={l.id} listing={l as Listing} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Link
                      href={pageHref(page - 1)}
                      aria-disabled={page <= 1}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      style={{
                        color: page <= 1 ? 'var(--muted)' : 'var(--text)',
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        pointerEvents: page <= 1 ? 'none' : 'auto',
                        opacity: page <= 1 ? 0.5 : 1,
                      }}
                    >
                      ← Назад
                    </Link>
                    <span className="text-sm px-3" style={{ color: 'var(--muted)' }}>
                      Страница {page} от {totalPages}
                    </span>
                    <Link
                      href={pageHref(page + 1)}
                      aria-disabled={page >= totalPages}
                      className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      style={{
                        color: page >= totalPages ? 'var(--muted)' : 'var(--text)',
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        pointerEvents: page >= totalPages ? 'none' : 'auto',
                        opacity: page >= totalPages ? 0.5 : 1,
                      }}
                    >
                      Напред →
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-24" style={{ color: 'var(--muted)' }}>
                <div className="text-5xl mb-4">📭</div>
                <p className="font-semibold">Няма намерени обяви</p>
                <p className="text-sm mt-1">Опитай с различни ключови думи</p>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shops?.map(shop => (
              <Link key={shop.id} href={`/stores/${shop.slug}`}>
                <div
                  className="rounded-2xl border p-6 transition-all hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                >
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-3 overflow-hidden relative flex-shrink-0"
                    style={{ background: shop.logo_url ? 'var(--bg3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    {shop.logo_url
                      ? <Image src={shop.logo_url} alt={`${shop.name} лого`} fill className="object-cover" />
                      : <span>🏪</span>
                    }
                  </div>
                  <h3 className="text-base font-bold mb-1">{shop.name}</h3>
                  <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--muted)' }}>
                    {shop.description ?? 'Без описание'}
                  </p>
                  <div className="flex gap-5">
                    <div>
                      <div className="text-lg font-black" style={{ color: 'var(--accent)' }}>{shop.total_sales}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>Продажби</div>
                    </div>
                    <div>
                      <div className="text-lg font-black" style={{ color: 'var(--accent)' }}>
                        {shop.rating > 0 ? shop.rating.toFixed(1) : '—'}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>Рейтинг ⭐</div>
                    </div>
                    {shop.city && (
                      <div>
                        <div className="text-sm font-semibold">📍 {shop.city}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>Локация</div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {tab === 'listings' && <RecentlyViewedSection />}
    </div>
  )
}
