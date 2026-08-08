import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { BULGARIAN_CITIES } from '@/lib/cities'
import { BLOG_POSTS } from '@/lib/blog-posts'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()

  const [{ data: listings }, { data: shops }, { data: categories }] = await Promise.all([
    admin
      .from('listings')
      .select('id, updated_at, is_active, shop:shops!inner(is_active)')
      .eq('is_active', true)
      .eq('shop.is_active', true)
      .eq('is_request_order', false)
      .limit(5000),
    admin
      .from('shops')
      .select('slug, updated_at')
      .eq('is_active', true)
      .limit(2000),
    admin
      .from('categories')
      .select('slug')
      .is('parent_id', null),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE_URL}/stores`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/plans`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/requests`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
  ]

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map(p => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

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

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map(c => ({
    url: `${BASE_URL}/category/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.7,
  }))

  const cityChecks = await Promise.all(
    BULGARIAN_CITIES.map(async city => {
      const [{ count: shopCount }, { count: listingCount }] = await Promise.all([
        admin.from('shops').select('id', { count: 'exact', head: true }).eq('is_active', true).ilike('city', `%${city.name}%`),
        admin.from('listings').select('id', { count: 'exact', head: true }).eq('is_active', true).ilike('city', `%${city.name}%`),
      ])
      return { city, has: (shopCount ?? 0) > 0 || (listingCount ?? 0) > 0 }
    })
  )

  const cityRoutes: MetadataRoute.Sitemap = cityChecks
    .filter(c => c.has)
    .map(c => ({
      url: `${BASE_URL}/grad/${c.city.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    }))

  return [...staticRoutes, ...blogRoutes, ...categoryRoutes, ...cityRoutes, ...shopRoutes, ...listingRoutes]
}
