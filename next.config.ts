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
    // Vercel-ската вградена оптимизация на снимки има месечен лимит на брой
    // уникални трансформации (Hobby план), който изчерпахме бързо. Вместо да
    // го изключваме напълно (което тегли пълния оригинал винаги), препращаме
    // през custom loader към wsrv.nl — безплатен, без лимит, преоразмерява
    // снимките спрямо реалния размер, в който се показват.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
};

export default nextConfig;
