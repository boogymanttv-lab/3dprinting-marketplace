import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navbar } from '@/components/nav/Navbar'
import { Footer } from '@/components/nav/Footer'
import { CookieConsent } from '@/components/CookieConsent'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.3dprintingbg.com'

export const metadata: Metadata = {
  title: {
    default: '3DPrintingBG — Маркетплейс за 3D принтиране',
    template: '%s | 3DPrintingBG',
  },
  description: 'Купувай и продавай филамент, принтери и 3D принтирани продукти в България',
  keywords: ['3D принтиране', 'филамент', 'PLA', 'PETG', 'marketplace', 'обяви', 'България'],
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: '3DPrintingBG — Маркетплейс за 3D принтиране',
    description: 'Купувай и продавай филамент, принтери и 3D принтирани продукти в България',
    url: SITE_URL,
    siteName: '3DPrintingBG',
    locale: 'bg_BG',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '3DPrintingBG' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '3DPrintingBG',
    description: 'Маркетплейс за 3D принтиране в България',
    images: ['/og-image.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#0f0f13',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className="pb-20 md:pb-0" suppressHydrationWarning>
        <Navbar />
        <main>{children}</main>
        <Footer />
        <CookieConsent />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
