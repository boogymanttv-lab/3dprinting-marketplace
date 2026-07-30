import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ListingCard } from '@/components/listings/ListingCard'
import type { Listing } from '@/types'

export const dynamic = 'force-dynamic'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/favorites')

  const { data: favorites } = await supabase
    .from('favorites')
    .select('listing_id, listing:listings(*, shop:shops(id, name, city, rating), category:categories(id, name, slug))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const listings = favorites
    ?.map(f => f.listing)
    .filter(Boolean) as Listing[]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/" className="p-2 rounded-lg"
          style={{ background: 'var(--bg3)', color: 'var(--text)', textDecoration: 'none' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">❤️ Любими обяви</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {listings?.length ?? 0} запазени обяви
          </p>
        </div>
      </div>

      {!listings || listings.length === 0 ? (
        <div className="rounded-2xl border p-16 text-center"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-5xl mb-4">🤍</p>
          <p className="font-bold text-lg mb-1">Нямаш любими обяви</p>
          <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
            Натисни сърцето на обява за да я запазиш тук
          </p>
          <Link href="/"
            className="inline-flex px-6 py-3 rounded-xl text-sm font-bold"
            style={{ background: 'var(--accent)', color: '#fff', textDecoration: 'none' }}>
            Разгледай обяви
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {listings.map(listing => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
