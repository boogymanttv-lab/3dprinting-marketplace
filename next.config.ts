import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Vercel-ската оптимизация на снимки има таймаут при бавен ориджин и месечен
    // лимит на брой уникални снимки (Hobby план) — при нашия обем на снимки от
    // Supabase Storage това води до случайни неуспешни зареждания. Пускаме
    // снимките директно от Supabase CDN-а вместо през Vercel прокси, за стабилност.
    unoptimized: true,
  },
};

export default nextConfig;
