import { createClient } from '@/lib/supabase/server'
import { sendOrderConfirmation } from '@/lib/email'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Create order
  const { data: order, error } = await supabase
    .from('orders')
    .insert({ ...body, buyer_id: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

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
        listingTitle: body.listing_title,
        quantity: body.quantity,
        total: body.total_amount,
        orderId: order.id,
      })
    } catch {
      // Email failure shouldn't break the order
    }
  }

  return NextResponse.json({ order })
}
