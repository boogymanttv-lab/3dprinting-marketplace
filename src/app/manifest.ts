import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '3DPrintingBG — Маркетплейс за 3D принтиране',
    short_name: '3DPrintingBG',
    description: 'Купувай и продавай филамент, принтери и 3D принтирани продукти в България',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f13',
    theme_color: '#f97316',
    orientation: 'portrait-primary',
    lang: 'bg',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
