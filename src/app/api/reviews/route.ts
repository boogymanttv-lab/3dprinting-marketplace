import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { orderId, shopId, listingId, rating, comment } = body

  if (!orderId || !shopId || !listingId || !rating) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Оценката трябва да е между 1 и 5' }, { status: 400 })
  }

  // Verify the order belongs to this user and is completed
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .eq('buyer_id', user.id)
    .eq('status', 'completed')
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Поръчката не е намерена или не е завършена' }, { status: 403 })
  }

  // Check for duplicate
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Вече имаш ревю за тази поръчка' }, { status: 409 })
  }

  // Insert review — use admin client to bypass RLS safely
  // (ownership already verified above)
  const admin = createAdminClient()
  const { error } = await admin.from('reviews').insert({
    order_id: orderId,
    shop_id: shopId,
    listing_id: listingId,
    reviewer_id: user.id,
    rating,
    comment: comment?.trim() || null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
