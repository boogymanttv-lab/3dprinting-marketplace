import { createClient } from '@/lib/supabase/server'
import { sendOrderConfirmation } from '@/lib/email'
import { NextResponse } from 'next/server'

interface IncomingItem {
  listing_id: string
  title: string
  price: number
  image: string | null
  quantity: number
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Поддържа две форми: единичен артикул (стар/"Купи сега" flow) или
  // масив от артикули от 1 магазин (количка) — обединени в 1 поръчка.
  const items: IncomingItem[] = Array.isArray(body.items) && body.items.length > 0
    ? body.items
    : [{
        listing_id: body.listing_id,
        title: body.listing_title,
        price: body.listing_price,
        image: body.listing_image ?? null,
        quantity: body.quantity ?? 1,
      }]

  if (items.length === 0 || !body.shop_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0)
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const first = items[0]
  const summaryTitle = items.length > 1 ? `${first.title} + още ${items.length - 1}` : first.title

  // Create order (summary row)
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      shop_id: body.shop_id,
      buyer_id: user.id,
      listing_id: first.listing_id,
      listing_title: summaryTitle,
      listing_price: first.price,
      listing_image: first.image,
      quantity: totalQuantity,
      total_amount: totalAmount,
      payment_method: body.payment_method,
      buyer_phone: body.buyer_phone ?? null,
      shipping_address: body.shipping_address ?? null,
      needs_invoice: !!body.needs_invoice,
      status: 'new',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Line items
  const { error: itemsError } = await supabase.from('order_items').insert(
    items.map(i => ({
      order_id: order.id,
      listing_id: i.listing_id,
      listing_title: i.title,
      listing_price: i.price,
      listing_image: i.image,
      quantity: i.quantity,
    }))
  )
  if (itemsError) console.error('[api/orders] order_items insert failed:', itemsError)

  // Fetch buyer + seller emails for notifications
  const [{ data: buyer }, { data: shop }] = await Promise.all([
    supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
    supabase.from('shops')
      .select('name, owner:profiles(email, full_name)')
      .eq('id', body.shop_id)
      .single(),
  ])

  const sellerEmail = (shop?.owner as { email?: string } | null)?.email
  if (buyer?.email && sellerEmail) {
    try {
      await sendOrderConfirmation(buyer.email, sellerEmail, {
        buyerName: buyer.full_name ?? 'Клиент',
        shopName: shop?.name ?? '',
        listingTitle: summaryTitle,
        items: items.map(i => ({ title: i.title, quantity: i.quantity, price: i.price })),
        total: totalAmount,
        orderId: order.id,
      })
    } catch {
      // Email failure shouldn't break the order
    }
  }

  return NextResponse.json({ order })
}
