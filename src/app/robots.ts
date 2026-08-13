import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/admin',
          '/admin/',
          '/api/',
          '/open-shop',
          '/open-shop/',
          '/favorites',
          '/messages',
          '/cart',
          '/cart/',
          '/login',
          '/register',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
