import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navbar } from '@/components/nav/Navbar'
import { Footer } from '@/components/nav/Footer'
import { CookieConsent } from '@/components/CookieConsent'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { SafetyBanner } from '@/components/SafetyBanner'

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

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '3DPrintingBG',
  alternateName: '3D Printing BG',
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description: 'Маркетплейс за 3D принтиране в България — филамент, принтери и 3D принтирани продукти от независими продавачи.',
  // Добави тук линкове към официални Facebook/Instagram страници, когато ги направиш:
  // sameAs: ['https://www.facebook.com/3dprintingbg', 'https://www.instagram.com/3dprintingbg'],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'wellecfx@gmail.com',
    contactType: 'customer service',
    areaServed: 'BG',
    availableLanguage: 'Bulgarian',
  },
}

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '3DPrintingBG',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className="pb-20 md:pb-0" suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <Navbar />
        <SafetyBanner />
        <main>{children}</main>
        <Footer />
        <CookieConsent />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
