import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CreditsClient, type ServiceRow, type ListingOption, type TxRow, type OrderRow } from './CreditsClient'

export const dynamic = 'force-dynamic'

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ topup?: string }> }) {
  const { topup } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/dashboard/credits')

  const { data: shop } = await supabase.from('shops').select('id, name').eq('owner_id', user.id).maybeSingle()
  if (!shop) redirect('/plans')

  const [{ data: bal }, { data: services }, { data: listings }, { data: txs }, { data: orders }] = await Promise.all([
    supabase.from('credit_balances').select('balance').eq('user_id', user.id).maybeSingle(),
    supabase.from('services').select('code, kind, channel, name, days, price_credits').order('sort_order'),
    supabase.from('listings').select('id, title, promo_rank, promo_until').eq('shop_id', shop.id).eq('is_active', true).eq('is_request_order', false).order('created_at', { ascending: false }),
    supabase.from('credit_transactions').select('id, amount, type, description, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30),
    supabase.from('service_orders').select('id, name, status, ends_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="p-2 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">💎 Кредити</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{shop.name} · 100 кредита = 1 €</p>
        </div>
      </div>

      <CreditsClient
        balance={bal?.balance ?? 0}
        topupStatus={topup ?? null}
        services={(services ?? []) as ServiceRow[]}
        listings={(listings ?? []) as ListingOption[]}
        txs={(txs ?? []) as TxRow[]}
        orders={(orders ?? []) as OrderRow[]}
      />
    </div>
  )
}
