import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ListingCard } from '@/components/listings/ListingCard'
import { BULGARIAN_CITIES, findCityBySlug } from '@/lib/cities'
import type { Listing } from '@/types'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

async function cityHasContent(cityName: string): Promise<boolean> {
  const admin = createAdminClient()
  const [{ count: shopCount }, { count: listingCount }] = await Promise.all([
    admin.from('shops').select('id', { count: 'exact', head: true }).eq('is_active', true).ilike('city', `%${cityName}%`),
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('is_active', true).ilike('city', `%${cityName}%`),
  ])
  return (shopCount ?? 0) > 0 || (listingCount ?? 0) > 0
}

export async function generateStaticParams() {
  const results = await Promise.all(
    BULGARIAN_CITIES.map(async city => ({ city, has: await cityHasContent(city.name) }))
  )
  return results.filter(r => r.has).map(r => ({ slug: r.city.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const city = findCityBySlug(slug)
  if (!city) return { title: 'Градът не е намерен' }

  const title = `3D печат в ${city.name} — продавачи и обяви`
  const description = `Намери 3D принтери, филамент и 3D принтирани продукти от продавачи в ${city.name}. Разгледай магазини, обяви и услуги за 3D печат директно в твоя град.`

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/grad/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/grad/${slug}`,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '3DPrintingBG' }],
    },
    twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
  }
}

export const revalidate = 300

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const city = findCityBySlug(slug)
  if (!city) notFound()

  const supabase = await createClient()

  const [{ data: listings }, { data: shops }] = await Promise.all([
    supabase
      .from('listings')
      .select('*, shop:shops!inner(id, name, city, rating, is_active), category:categories(id, name, slug)')
      .eq('is_active', true)
      .eq('shop.is_active', true)
      .eq('is_request_order', false)
      .ilike('city', `%${city.name}%`)
      .order('created_at', { ascending: false })
      .limit(48),
    supabase
      .from('shops')
      .select('*, plan:plans(name)')
      .eq('is_active', true)
      .ilike('city', `%${city.name}%`)
      .order('rating', { ascending: false })
      .limit(24),
  ])

  if ((!listings || listings.length === 0) && (!shops || shops.length === 0)) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `3D печат в ${city.name} — 3DPrintingBG`,
    url: `${SITE_URL}/grad/${slug}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: (listings ?? []).slice(0, 20).map((l, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE_URL}/listings/${l.id}`,
        name: l.title,
      })),
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Начало', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: `3D печат в ${city.name}`, item: `${SITE_URL}/grad/${slug}` },
    ],
  }

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Hero */}
      <section
        className="border-b py-12 px-4"
        style={{ background: 'linear-gradient(180deg, rgba(249,115,22,0.06) 0%, transparent 100%)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
            <Link href="/" className="hover:underline">Начало</Link> / {city.name}
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            📍 3D печат в {city.name}
          </h1>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            Намери 3D принтери, филамент, готови 3D принтирани продукти и услуги по поръчка от продавачи в {city.name}.
            Всички магазини и обяви тук са от независими продавачи и малки бизнеси, свързани директно с купувачите —
            без посредници.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-7 space-y-12">
        {/* Shops */}
        {shops && shops.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">🏪 Магазини в {city.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shops.map(shop => (
                <Link key={shop.id} href={`/stores/${shop.slug}`}>
                  <div
                    className="rounded-2xl border p-6 h-full flex flex-col transition-all hover:-translate-y-0.5 cursor-pointer"
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
                    <div className="flex gap-5 mt-auto">
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
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Listings */}
        {listings && listings.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4">📋 Обяви в {city.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {listings.map(l => (
                <ListingCard key={l.id} listing={l as Listing} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
