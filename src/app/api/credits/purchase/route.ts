import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PROMO_RANK } from '@/lib/credits'

// Покупка на услуга с кредити: промо/VIP/ТОП обява (прилага се веднага) или
// реклама (създава заявка, която админът изпълнява ръчно).
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const serviceCode = String(body?.serviceCode ?? '')
  const listingId = body?.listingId ? String(body.listingId) : null
  const details = String(body?.details ?? '').trim().slice(0, 1000)

  const admin = createAdminClient()

  const { data: shop } = await admin.from('shops').select('id').eq('owner_id', user.id).maybeSingle()
  if (!shop) return NextResponse.json({ error: 'Нямаш магазин.' }, { status: 403 })

  const { data: service } = await admin.from('services').select('*').eq('code', serviceCode).eq('is_active', true).maybeSingle()
  if (!service) return NextResponse.json({ error: 'Услугата не е налична.' }, { status: 404 })

  const isListingPromo = service.kind !== 'ad'
  const newRank = PROMO_RANK[service.kind] ?? 0
  let startsAt = new Date()

  if (isListingPromo) {
    if (!listingId) return NextResponse.json({ error: 'Избери обява.' }, { status: 400 })
    const { data: listing } = await admin
      .from('listings')
      .select('id, is_active, is_request_order, promo_rank, promo_until')
      .eq('id', listingId).eq('shop_id', shop.id).maybeSingle()
    if (!listing || listing.is_request_order) return NextResponse.json({ error: 'Обявата не е намерена.' }, { status: 404 })
    if (!listing.is_active) return NextResponse.json({ error: 'Обявата е скрита — активирай я първо.' }, { status: 400 })

    const stillActive = listing.promo_rank > 0 && listing.promo_until && new Date(listing.promo_until) > new Date()
    if (stillActive && listing.promo_rank > newRank) {
      return NextResponse.json({ error: 'Обявата вече има по-висока промоция, която още важи.' }, { status: 400 })
    }
    // Същото ниво → удължаваме от текущия край; по-ниско ниво → заменя се от сега
    if (stillActive && listing.promo_rank === newRank) startsAt = new Date(listing.promo_until!)
  } else if (details.length < 5) {
    return NextResponse.json({ error: 'Опиши какво да рекламираме (линк към обява/магазин, цел, бележки).' }, { status: 400 })
  }

  const endsAt = new Date(startsAt.getTime() + service.days * 24 * 60 * 60 * 1000)

  const { data: ok } = await admin.rpc('spend_credits', {
    p_user: user.id,
    p_amount: service.price_credits,
    p_desc: service.name,
    p_ref: service.code,
  })
  if (!ok) return NextResponse.json({ error: 'Нямаш достатъчно кредити.' }, { status: 402 })

  const refund = async () => {
    await admin.rpc('add_credits', {
      p_user: user.id, p_amount: service.price_credits, p_type: 'refund', p_desc: `Връщане: ${service.name}`,
    })
  }

  if (isListingPromo) {
    const { error } = await admin.from('listings')
      .update({ promo_rank: newRank, promo_until: endsAt.toISOString() })
      .eq('id', listingId!).eq('shop_id', shop.id)
    if (error) { await refund(); return NextResponse.json({ error: 'Грешка при прилагане.' }, { status: 500 }) }
  }

  const { error: orderError } = await admin.from('service_orders').insert({
    user_id: user.id,
    shop_id: shop.id,
    service_code: service.code,
    kind: service.kind,
    name: service.name,
    days: service.days,
    price_credits: service.price_credits,
    listing_id: listingId,
    details: details || null,
    status: isListingPromo ? 'active' : 'pending',
    starts_at: isListingPromo ? startsAt.toISOString() : null,
    ends_at: isListingPromo ? endsAt.toISOString() : null,
  })
  if (orderError) console.error('[credits/purchase] order insert failed', orderError)

  return NextResponse.json({ ok: true, pending: !isListingPromo })
}
