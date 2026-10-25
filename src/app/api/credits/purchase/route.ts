import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PROMO_RANK } from '@/lib/credits'

interface Item { serviceCode: string; listingId?: string | null }
interface Service { code: string; kind: string; name: string; days: number; price_credits: number }

// Покупка на няколко услуги наведнъж (пакет): промо/VIP/ТОП на няколко обяви и/или
// няколко реклами. Всичко се плаща с едно движение на кредитите.
// Промоциите на обяви се прилагат веднага; рекламите стават заявки за админа.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const items: Item[] = Array.isArray(body?.items)
    ? body.items
    : body?.serviceCode ? [{ serviceCode: body.serviceCode, listingId: body.listingId }] : []
  const details = String(body?.details ?? '').trim().slice(0, 1000)

  if (items.length === 0) return NextResponse.json({ error: 'Пакетът е празен.' }, { status: 400 })
  if (items.length > 50) return NextResponse.json({ error: 'Максимум 50 артикула наведнъж.' }, { status: 400 })

  const admin = createAdminClient()

  const { data: shop } = await admin.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
  if (!shop) return NextResponse.json({ error: 'Нямаш магазин.' }, { status: 403 })

  // ── Услуги ──
  const codes = [...new Set(items.map(i => String(i.serviceCode)))]
  const { data: services } = await admin.from('services').select('*').in('code', codes).eq('is_active', true)
  const byCode = new Map<string, Service>((services ?? []).map((s: Service) => [s.code, s]))
  if (codes.some(c => !byCode.has(c))) return NextResponse.json({ error: 'Някоя услуга не е налична.' }, { status: 404 })

  // ── Обяви ──
  const listingIds = [...new Set(items.filter(i => byCode.get(String(i.serviceCode))!.kind !== 'ad').map(i => String(i.listingId ?? '')))]
  const { data: listings } = listingIds.length
    ? await admin.from('listings')
        .select('id, title, is_active, is_request_order, promo_rank, promo_until')
        .in('id', listingIds).eq('shop_id', shop.id)
    : { data: [] as { id: string; title: string; is_active: boolean; is_request_order: boolean; promo_rank: number; promo_until: string | null }[] }
  const listingById = new Map((listings ?? []).map(l => [l.id, l]))

  // ── Валидация на целия пакет, преди да се вземат кредити ──
  const usedListings = new Set<string>()
  let hasAd = false
  const plan: { service: Service; listingId: string | null; rank: number; startsAt: Date; endsAt: Date }[] = []

  for (const it of items) {
    const service = byCode.get(String(it.serviceCode))!
    if (service.kind === 'ad') {
      hasAd = true
      plan.push({ service, listingId: null, rank: 0, startsAt: new Date(), endsAt: new Date() })
      continue
    }

    const listing = listingById.get(String(it.listingId ?? ''))
    if (!listing || listing.is_request_order) return NextResponse.json({ error: 'Някоя обява не е намерена.' }, { status: 404 })
    if (!listing.is_active) return NextResponse.json({ error: `„${listing.title}“ е скрита — активирай я първо.` }, { status: 400 })
    if (usedListings.has(listing.id)) {
      return NextResponse.json({ error: `„${listing.title}“ е избрана два пъти. Една промоция на обява на покупка.` }, { status: 400 })
    }
    usedListings.add(listing.id)

    const rank = PROMO_RANK[service.kind] ?? 0
    const stillActive = listing.promo_rank > 0 && listing.promo_until && new Date(listing.promo_until) > new Date()
    if (stillActive && listing.promo_rank > rank) {
      return NextResponse.json({ error: `„${listing.title}“ вече има по-висока промоция, която още важи.` }, { status: 400 })
    }
    // Същото ниво → удължаваме от текущия край; по-ниско ниво → заменя се от сега
    const startsAt = stillActive && listing.promo_rank === rank ? new Date(listing.promo_until!) : new Date()
    const endsAt = new Date(startsAt.getTime() + service.days * 86400000)
    plan.push({ service, listingId: listing.id, rank, startsAt, endsAt })
  }

  if (hasAd && details.length < 5) {
    return NextResponse.json({ error: 'Опиши какво да рекламираме (линк към обява/магазин, цел, бележки).' }, { status: 400 })
  }

  const total = plan.reduce((s, p) => s + p.service.price_credits, 0)

  const { data: ok } = await admin.rpc('spend_credits', {
    p_user: user.id,
    p_amount: total,
    p_desc: plan.length === 1 ? plan[0].service.name : `Пакет: ${plan.length} услуги`,
    p_ref: plan.length === 1 ? plan[0].service.code : 'bundle',
  })
  if (!ok) return NextResponse.json({ error: `Нямаш достатъчно кредити (нужни: ${total.toLocaleString('bg-BG')}).` }, { status: 402 })

  // ── Прилагане ──
  let refundAmount = 0
  const orders: Record<string, unknown>[] = []

  for (const p of plan) {
    const isAd = p.service.kind === 'ad'
    if (!isAd) {
      const { error } = await admin.from('listings')
        .update({ promo_rank: p.rank, promo_until: p.endsAt.toISOString() })
        .eq('id', p.listingId!).eq('shop_id', shop.id)
      if (error) { refundAmount += p.service.price_credits; continue }
    }
    orders.push({
      user_id: user.id,
      shop_id: shop.id,
      service_code: p.service.code,
      kind: p.service.kind,
      name: p.service.name,
      days: p.service.days,
      price_credits: p.service.price_credits,
      listing_id: p.listingId,
      details: isAd ? details : null,
      status: isAd ? 'pending' : 'active',
      starts_at: isAd ? null : p.startsAt.toISOString(),
      ends_at: isAd ? null : p.endsAt.toISOString(),
    })
  }

  if (refundAmount > 0) {
    await admin.rpc('add_credits', {
      p_user: user.id, p_amount: refundAmount, p_type: 'refund', p_desc: 'Връщане: неприложени услуги от пакета',
    })
  }
  if (orders.length > 0) {
    const { error } = await admin.from('service_orders').insert(orders)
    if (error) console.error('[credits/purchase] order insert failed', error)
  }
  if (orders.length === 0) return NextResponse.json({ error: 'Грешка при прилагане. Кредитите са върнати.' }, { status: 500 })

  return NextResponse.json({ ok: true, count: orders.length, pending: hasAd })
}
