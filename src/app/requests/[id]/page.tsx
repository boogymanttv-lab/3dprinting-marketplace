import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, formatDate, formatRelativeTime } from '@/lib/utils'
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS, type RequestStatus } from '@/types'
import { ArrowLeft, MapPin, Clock } from 'lucide-react'
import { OfferForm, OffersList } from './RequestActions'
import { DeleteRequestButton } from './DeleteRequestButton'
import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: request } = await supabase.from('requests').select('title, description').eq('id', id).maybeSingle()

  if (!request) return { title: 'Заявката не е намерена' }

  return {
    title: `${request.title} — Заяви поръчка`,
    description: request.description.slice(0, 155),
    alternates: { canonical: `${SITE_URL}/requests/${id}` },
    robots: { index: false, follow: true }, // индивидуалните заявки не са SEO-ценни, но остават достъпни
  }
}

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: request } = await supabase
    .from('requests')
    .select('*, category:categories(id, name, slug)')
    .eq('id', id)
    .maybeSingle()

  if (!request) notFound()

  const isBuyer = user?.id === request.buyer_id

  const { data: offers } = await supabase
    .from('request_offers')
    .select('*, shop:shops(id, name, slug, rating, review_count, logo_url)')
    .eq('request_id', id)
    .order('price', { ascending: true })

  // Ако потребителят има магазин, провери дали вече е предложил оферта
  let myShop: { id: string } | null = null
  let myOffer: { id: string } | null = null
  if (user && !isBuyer) {
    const { data: shop } = await supabase.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
    myShop = shop
    if (shop) {
      const { data: offer } = await supabase
        .from('request_offers')
        .select('id')
        .eq('request_id', id)
        .eq('shop_id', shop.id)
        .maybeSingle()
      myOffer = offer
    }
  }

  const statusStyle = REQUEST_STATUS_COLORS[request.status as RequestStatus]
  const requestOpen = request.status === 'open'

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/requests" className="p-2 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ background: statusStyle.bg, color: statusStyle.text }}
        >
          {REQUEST_STATUS_LABELS[request.status as RequestStatus]}
        </span>
        {isBuyer && requestOpen && (
          <div className="ml-auto">
            <DeleteRequestButton requestId={request.id} />
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-6 mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex flex-col sm:flex-row gap-5">
          {request.image_url && (
            <div className="relative w-full sm:w-40 aspect-square rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--bg3)' }}>
              <Image src={request.image_url} alt={request.title} fill className="object-cover" unoptimized />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black mb-2">{request.title}</h1>
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text)' }}>{request.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--muted)' }}>
              {request.category && <span>📦 {request.category.name}</span>}
              {(request.budget_min || request.budget_max) && (
                <span>
                  💰 {request.budget_min && request.budget_max
                    ? `${formatPrice(request.budget_min, request.currency)} – ${formatPrice(request.budget_max, request.currency)}`
                    : formatPrice(request.budget_min ?? request.budget_max, request.currency)}
                </span>
              )}
              {request.city && <span className="flex items-center gap-1"><MapPin size={12} /> {request.city}</span>}
              {request.deadline && <span className="flex items-center gap-1"><Clock size={12} /> до {formatDate(request.deadline)}</span>}
              <span>{formatRelativeTime(request.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buyer view: offers list */}
      {isBuyer && (
        <>
          <h2 className="font-bold text-base mb-3">
            Оферти <span className="font-normal" style={{ color: 'var(--muted)' }}>({offers?.length ?? 0})</span>
          </h2>
          <OffersList offers={(offers ?? []) as any} requestOpen={requestOpen} />
        </>
      )}

      {/* Seller view: offer form or their own offer */}
      {!isBuyer && user && (
        <>
          {!myShop ? (
            <div className="rounded-2xl border p-5 text-center text-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Само магазини могат да предлагат оферти. <Link href="/plans" style={{ color: 'var(--accent)' }}>Отвори магазин</Link>, за да наддадеш.
            </div>
          ) : !requestOpen ? (
            <div className="rounded-2xl border p-5 text-center text-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Тази заявка вече е възложена на друг продавач.
            </div>
          ) : myOffer ? (
            <div className="rounded-2xl border p-5 text-center text-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              ✓ Вече изпрати оферта за тази заявка. Купувачът ще прегледа предложенията и ще избере.
            </div>
          ) : (
            <OfferForm requestId={request.id} shopId={myShop.id} currency={request.currency} />
          )}
        </>
      )}

      {!user && (
        <div className="rounded-2xl border p-5 text-center text-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
          <Link href={`/login?redirectTo=/requests/${id}`} style={{ color: 'var(--accent)' }}>Влез в профила си</Link>, за да предложиш оферта.
        </div>
      )}
    </div>
  )
}
