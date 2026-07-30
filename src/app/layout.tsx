import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/nav/Navbar'
import { CookieConsent } from '@/components/CookieConsent'

export const metadata: Metadata = {
  title: '3DPrintingBG — Маркетплейс за 3D принтиране',
  description: 'Купувай и продавай филамент, принтери и 3D принтирани продукти в България',
  keywords: ['3D принтиране', 'филамент', 'PLA', 'PETG', 'marketplace', 'обяви', 'България'],
  metadataBase: new URL('https://3dprintingbg.com'),
  openGraph: {
    title: '3DPrintingBG — Маркетплейс за 3D принтиране',
    description: 'Купувай и продавай филамент, принтери и 3D принтирани продукти в България',
    url: 'https://3dprintingbg.com',
    siteName: '3DPrintingBG',
    locale: 'bg_BG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3DPrintingBG',
    description: 'Маркетплейс за 3D принтиране в България',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg">
      <body className="pb-20 md:pb-0" suppressHydrationWarning>
        <Navbar />
        <main>{children}</main>
        <CookieConsent />
      </body>
    </html>
  )
}
