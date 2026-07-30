import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendStatusUpdate } from '@/lib/email'
import { NextResponse } from 'next/server'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types'

const VALID_TRANSITIONS: Record<string, string[]> = {
  new:        ['accepted', 'cancelled'],
  accepted:   ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['completed'],
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.formData().catch(() => null)
  const newStatus = body?.get('status') as string
  const trackingNumber = body?.get('tracking_number') as string | null

  // Get order with buyer info
  const { data: order } = await supabase
    .from('orders')
    .select('*, shop:shops(owner_id, name), buyer:profiles(full_name, email)')
    .eq('id', id)
    .single()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (order.shop?.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const allowed = VALID_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(newStatus)) return NextResponse.json({ error: 'Invalid transition' }, { status: 400 })

  const updateData: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'completed') updateData.completed_at = new Date().toISOString()
  if (newStatus === 'shipped' && trackingNumber?.trim()) {
    updateData.tracking_number = trackingNumber.trim()
  }

  // Use admin client to bypass RLS — ownership already verified above
  const admin = createAdminClient()
  const { error: updateError } = await admin
    .from('orders')
    .update(updateData)
    .eq('id', id)

  if (updateError) {
    console.error('[orders/status] DB update failed:', updateError)
    return NextResponse.json({ error: 'DB update failed', detail: updateError.message }, { status: 500 })
  }

  // Update shop total_sales when order is completed
  if (newStatus === 'completed' && order.total_amount) {
    await admin.rpc('increment_shop_sales', {
      p_shop_id: order.shop_id,
      p_amount: order.total_amount,
    }).catch(() => {
      // Function may not exist yet — silent fail, doesn't break the flow
      console.warn('[orders/status] increment_shop_sales RPC not found')
    })
  }

  // Send email to buyer
  if (order.buyer?.email) {
    await sendStatusUpdate(order.buyer.email, {
      buyerName: order.buyer.full_name ?? 'Клиент',
      listingTitle: order.listing_title,
      status: newStatus,
      statusLabel: ORDER_STATUS_LABELS[newStatus as OrderStatus] ?? newStatus,
      orderId: id,
      trackingNumber: newStatus === 'shipped' && trackingNumber ? trackingNumber : undefined,
    }).catch(() => {})
  }

  const referer = request.headers.get('referer') || '/dashboard/orders'
  return NextResponse.redirect(referer, { status: 303 })
}
