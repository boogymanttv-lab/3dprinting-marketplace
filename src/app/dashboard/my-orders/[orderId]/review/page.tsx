import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReviewForm } from './ReviewForm'

interface Props {
  params: Promise<{ orderId: string }>
}

export default async function ReviewPage({ params }: Props) {
  const { orderId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch the order — must belong to this user and be completed
  const { data: order } = await supabase
    .from('orders')
    .select('*, shop:shops(id, name)')
    .eq('id', orderId)
    .eq('buyer_id', user.id)
    .eq('status', 'completed')
    .single()

  if (!order) redirect('/dashboard/my-orders')

  // Check if already reviewed
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .single()

  if (existing) redirect('/dashboard/my-orders')

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/my-orders"
          className="p-2 rounded-lg"
          style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">⭐ Остави ревю</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Помогни на другите купувачи
          </p>
        </div>
      </div>

      <div className="rounded-2xl border p-6"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <ReviewForm
          orderId={orderId}
          shopId={order.shop_id}
          listingId={order.listing_id}
          listingTitle={order.listing_title}
          shopName={order.shop?.name ?? ''}
        />
      </div>
    </div>
  )
}
