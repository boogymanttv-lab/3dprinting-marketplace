import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, formatRelativeTime } from '@/lib/utils'
import { OrderForm } from './OrderForm'
import { ReviewsList } from './ReviewsList'
import { MATERIAL_LABELS, type Listing } from '@/types'
import { MapPin, Eye, Star } from 'lucide-react'
import { ImageGallery, ShareButton, PhoneReveal } from './ListingActions'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('title, description, price, currency, images, city, shop:shops!inner(name, is_active)')
    .eq('id', id)
    .eq('is_active', true)
    .eq('shop.is_active', true)
    .maybeSingle()

  if (!listing) return { title: 'Обявата не е намерена' }

  const shop = Array.isArray(listing.shop) ? listing.shop[0] : listing.shop
  const priceLabel = formatPrice(listing.price, listing.currency)
  const title = `${listing.title} — ${priceLabel}`
  const description = listing.description?.slice(0, 155)
    ?? `${listing.title} — ${priceLabel}${listing.city ? ` в ${listing.city}` : ''}. Купи от ${shop?.name ?? 'магазин'} в 3DPrintingBG.`
  const image = listing.images?.[0]

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/listings/${id}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/listings/${id}`,
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

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('listings')
    .select(`
      *,
      shop:shops!inner(*, owner:profiles(full_name, avatar_url)),
      category:categories(id, name, slug, parent:categories(name, slug))
    `)
    .eq('id', id)
    .eq('is_active', true)
    .eq('shop.is_active', true)
    .maybeSingle()

  if (!listing) notFound()

  // Increment view count (ignore errors)
  await supabase.from('listings').update({ view_count: (listing.view_count ?? 0) + 1 }).eq('id', id)

  // Fetch reviews
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, reviewer:profiles(full_name, avatar_url)')
    .eq('listing_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const l = listing as Listing & { shop: NonNullable<Listing['shop']> & { phone?: string } }
  const shareUrl = `${SITE_URL}/listings/${id}`

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: l.title,
    description: l.description ?? undefined,
    image: l.images && l.images.length > 0 ? l.images : undefined,
    sku: l.id,
    material: l.material ? MATERIAL_LABELS[l.material] : undefined,
    // Продуктите са уникални/по поръчка на отделни продавачи — няма
    // единен глобален идентификатор (GTIN/MPN). Това казва на Google,
    // че липсата е нарочна, не пропусната.
    identifierExists: false,
    offers: {
      '@type': 'Offer',
      url: shareUrl,
      priceCurrency: l.currency,
      price: l.price,
      availability: l.quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: l.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      seller: { '@type': 'Organization', name: l.shop.name },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 14,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
        applicableCountry: 'BG',
      },
    },
    ...(l.shop.review_count > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: l.shop.rating,
        reviewCount: l.shop.review_count,
      },
    } : {}),
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: 'var(--muted)' }}>
        <Link href="/" className="hover:text-white transition-colors">Начало</Link>
        <span>›</span>
        {l.category?.parent && (
          <>
            <Link href={`/category/${l.category.parent.slug}`} className="hover:text-white transition-colors">
              {l.category.parent.name}
            </Link>
            <span>›</span>
          </>
        )}
        {l.category && (
          <Link
            href={l.category.parent ? `/category/${l.category.parent.slug}?sub=${l.category.slug}` : `/category/${l.category.slug}`}
            className="hover:text-white transition-colors"
          >
            {l.category.name}
          </Link>
        )}
        <span>›</span>
        <span className="truncate max-w-[200px]">{l.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-7">
        {/* LEFT — Images + Info */}
        <div className="space-y-5">
          {/* Gallery */}
          <ImageGallery images={l.images ?? []} title={l.title} />

          {/* Description */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--muted)' }}>📄 ОПИСАНИЕ</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--muted)' }}>
              {l.description ?? 'Без описание.'}
            </p>
            {l.tags && l.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {l.tags.map(tag => (
                  <span key={tag} className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Reviews */}
          <ReviewsList reviews={reviews ?? []} />
        </div>

        {/* RIGHT — Order + Seller */}
        <div className="space-y-4">
          {/* Main Card */}
          <div className="rounded-2xl border p-5 sticky top-20" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            {l.category && (
              <p className="text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
                {l.category.name}
              </p>
            )}
            <h1 className="text-xl font-black mb-3 leading-snug">{l.title}</h1>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-3xl font-black" style={{ color: 'var(--accent)' }}>
                {formatPrice(l.price, l.currency)}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>вкл. ДДС</span>
            </div>

            <div className="flex items-center gap-3 mb-5 text-xs" style={{ color: 'var(--muted)' }}>
              {l.city && <span className="flex items-center gap-1"><MapPin size={11} />{l.city}</span>}
              <span className="flex items-center gap-1"><Eye size={11} />{l.view_count} прегледа</span>
              <span>{formatRelativeTime(l.created_at)}</span>
            </div>

            {l.material && (
              <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-lg mb-4"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                🧵 {MATERIAL_LABELS[l.material]}
              </span>
            )}

            <OrderForm
              listing={l as Listing}
              shopHasInvoice={!!l.shop?.eik}
              cardEnabled={!!l.shop?.stripe_connect_charges_enabled}
            />

            {/* Share */}
            <ShareButton url={shareUrl} />
          </div>

          {/* Seller Card */}
          <div className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 overflow-hidden relative"
                style={{ background: l.shop.logo_url ? 'var(--bg3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {l.shop.logo_url
                  ? <Image src={l.shop.logo_url} alt={`${l.shop.name} лого`} fill className="object-cover" />
                  : <span>🏪</span>
                }
              </div>
              <div>
                <p className="font-bold">{l.shop.name}</p>
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                  {l.shop.rating > 0 && (
                    <><Star size={11} className="fill-amber-400 text-amber-400" />
                    {l.shop.rating.toFixed(1)} · </>
                  )}
                  {l.shop.review_count} ревюта
                  {l.shop.city && <> · 📍 {l.shop.city}</>}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href={`/messages?shop=${l.shop.id}&listing=${l.id}`}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center"
                style={{ background: 'transparent', border: '1.5px solid var(--accent)', color: 'var(--accent)' }}>
                💬 Съобщение
              </Link>
              {l.shop.phone && <PhoneReveal phone={l.shop.phone} />}
            </div>

            <Link href={`/stores/${l.shop.slug}`}
              className="block text-center text-xs mt-3 transition-colors hover:opacity-80"
              style={{ color: 'var(--muted)' }}>
              Виж целия магазин →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
