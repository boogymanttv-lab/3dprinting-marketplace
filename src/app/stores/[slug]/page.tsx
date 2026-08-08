import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ListingCard } from '@/components/listings/ListingCard'
import { formatDate } from '@/lib/utils'
import type { Listing } from '@/types'
import Image from 'next/image'
import { MapPin, Star, Package, ShoppingBag, ExternalLink } from 'lucide-react'
import { ShareButton, PhoneReveal } from './StoreActions'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: shop } = await supabase
    .from('shops')
    .select('name, description, city, logo_url, banner_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!shop) return { title: 'Магазинът не е намерен' }

  const title = shop.name
  const description = shop.description?.slice(0, 155)
    ?? `${shop.name}${shop.city ? ` — ${shop.city}` : ''}. Разгледай обявите на магазина в 3DPrintingBG.`
  const image = shop.banner_url ?? shop.logo_url

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/stores/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/stores/${slug}`,
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  }
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: shop } = await supabase
    .from('shops')
    .select('*, plan:plans(name, id), owner:profiles(full_name, created_at)')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!shop) notFound()

  const { data: listings } = await supabase
    .from('listings')
    .select('*, shop:shops(id, name, city, rating), category:categories(id, name, slug)')
    .eq('shop_id', shop.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles(full_name)')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })
    .limit(6)

  const shareUrl = `${SITE_URL}/stores/${slug}`

  const storeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: shop.name,
    description: shop.description ?? undefined,
    url: shareUrl,
    image: shop.logo_url ?? shop.banner_url ?? undefined,
    telephone: shop.phone ?? undefined,
    address: shop.city ? { '@type': 'PostalAddress', addressLocality: shop.city, addressCountry: 'BG' } : undefined,
    ...(shop.review_count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: shop.rating,
        reviewCount: shop.review_count,
      },
    } : {}),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Начало', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Магазини', item: `${SITE_URL}/stores` },
      { '@type': 'ListItem', position: 3, name: shop.name, item: shareUrl },
    ],
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <nav className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--muted)' }}>
        <Link href="/" className="hover:text-white transition-colors">Начало</Link>
        <span>›</span>
        <Link href="/stores" className="hover:text-white transition-colors">Магазини</Link>
        <span>›</span>
        <span className="truncate max-w-[200px]">{shop.name}</span>
      </nav>
      {/* Shop Header */}
      <div
        className="rounded-2xl border overflow-hidden mb-8"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* Banner */}
        <div
          className="relative h-32 md:h-48 flex items-center justify-center text-6xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))' }}
        >
          {shop.banner_url
            ? <Image src={shop.banner_url} alt={`${shop.name} банер`} fill className="object-cover" />
            : <span>🏪</span>
          }
        </div>

        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            {/* Logo */}
            <div
              className="-mt-12 w-20 h-20 rounded-2xl flex items-center justify-center text-3xl border-4 flex-shrink-0 overflow-hidden relative"
              style={{
                background: shop.logo_url ? 'var(--bg3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderColor: 'var(--card)'
              }}
            >
              {shop.logo_url
                ? <Image src={shop.logo_url} alt={`${shop.name} лого`} fill className="object-cover" />
                : <span>🏪</span>
              }
            </div>

            <div className="flex-1 md:mt-0 mt-2">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-black">{shop.name}</h1>
                {shop.plan?.id !== 'free' && (
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--accent)' }}
                  >
                    {shop.plan?.name}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm mb-3" style={{ color: 'var(--muted)' }}>
                {shop.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    {shop.rating.toFixed(1)} ({shop.review_count} ревюта)
                  </span>
                )}
                {shop.city && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {shop.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Package size={14} /> {listings?.length ?? 0} обяви
                </span>
                <span className="flex items-center gap-1">
                  <ShoppingBag size={14} /> {shop.total_sales} продажби
                </span>
                {shop.owner?.created_at && (
                  <span>Член от {formatDate(shop.owner.created_at)}</span>
                )}
              </div>

              {shop.description && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--muted)' }}>
                  {shop.description}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                {shop.website && (
                  <a
                    href={shop.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium"
                    style={{ color: 'var(--accent)' }}
                  >
                    <ExternalLink size={14} /> Уебсайт
                  </a>
                )}

                {/* Share */}
                <ShareButton url={shareUrl} />
              </div>
            </div>
          </div>

          {/* Invoice badge */}
          {shop.eik && (
            <div
              className="mt-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}
            >
              ✅ Издава фактури · {shop.company_name ?? shop.name}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        {/* Listings */}
        <div>
          <h2 className="font-bold text-lg mb-4">
            Всички обяви
            <span className="text-sm font-normal ml-2" style={{ color: 'var(--muted)' }}>
              ({listings?.length ?? 0})
            </span>
          </h2>

          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {listings.map(l => (
                <ListingCard key={l.id} listing={l as Listing} />
              ))}
            </div>
          ) : (
            <div
              className="rounded-2xl border p-12 text-center"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <p className="text-4xl mb-3">📭</p>
              <p className="font-semibold">Няма активни обяви</p>
            </div>
          )}
        </div>

        {/* Sidebar — Reviews */}
        <div>
          <h2 className="font-bold text-lg mb-4">
            Ревюта
            {shop.rating > 0 && (
              <span className="text-amber-400 ml-2">★ {shop.rating.toFixed(1)}</span>
            )}
          </h2>

          {reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map(review => (
                <div
                  key={review.id}
                  className="rounded-xl border p-4"
                  style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">
                      {review.reviewer?.full_name ?? 'Анонимен'}
                    </span>
                    <span className="text-amber-400 text-sm">
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div
              className="rounded-xl border p-6 text-center"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Няма ревюта още</p>
            </div>
          )}

          {/* Contact */}
          {shop.phone && (
            <div
              className="rounded-xl border p-4 mt-4"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                Контакт
              </p>
              <PhoneReveal phone={shop.phone} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
