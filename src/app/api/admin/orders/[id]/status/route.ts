import { NextResponse } from 'next/server'
import { getCurrentUserAndRole, hasMinRole } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendStatusUpdate } from '@/lib/email'
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types'

const VALID_STATUSES: OrderStatus[] = ['new', 'accepted', 'processing', 'shipped', 'completed', 'cancelled']

// Admin override — за разлика от /api/orders/[id]/status (само за собственика на магазина),
// този route позволява на operator+ да сменят статуса на КОЯТО и да е поръчка в платформата
// (напр. да анулират поръчка при спор/измама), без ограничение за позволени преходи.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, role } = await getCurrentUserAndRole()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasMinRole(role, 'operator')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const newStatus = body?.status as string
  if (!VALID_STATUSES.includes(newStatus as OrderStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: order } = await admin
    .from('orders')
    .select('*, buyer:profiles(full_name, email)')
    .eq('id', id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updateData: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'completed') updateData.completed_at = new Date().toISOString()

  const { error: updateError } = await admin.from('orders').update(updateData).eq('id', id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  if (order.buyer?.email) {
    try {
      await sendStatusUpdate(order.buyer.email, {
        buyerName: order.buyer.full_name ?? 'Клиент',
        listingTitle: order.listing_title,
        status: newStatus,
        statusLabel: ORDER_STATUS_LABELS[newStatus as OrderStatus] ?? newStatus,
        orderId: id,
      })
    } catch {
      // Email failure shouldn't break the admin action
    }
  }

  return NextResponse.json({ ok: true })
}
