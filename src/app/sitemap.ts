import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()

  const [{ data: listings }, { data: shops }] = await Promise.all([
    admin
      .from('listings')
      .select('id, updated_at, is_active, shop:shops!inner(is_active)')
      .eq('is_active', true)
      .eq('shop.is_active', true)
      .limit(5000),
    admin
      .from('shops')
      .select('slug, updated_at')
      .eq('is_active', true)
      .limit(2000),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE_URL}/stores`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/plans`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ]

  const listingRoutes: MetadataRoute.Sitemap = (listings ?? []).map(l => ({
    url: `${BASE_URL}/listings/${l.id}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  const shopRoutes: MetadataRoute.Sitemap = (shops ?? []).map(s => ({
    url: `${BASE_URL}/stores/${s.slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...shopRoutes, ...listingRoutes]
}
