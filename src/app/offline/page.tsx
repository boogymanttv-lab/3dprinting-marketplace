import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Няма връзка',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="text-6xl mb-5">📡</div>
      <h1 className="text-xl font-black mb-2">Няма връзка с интернет</h1>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        Изглежда си офлайн. Провери връзката си и опитай отново — 3DPrintingBG има нужда
        от интернет за актуални цени, наличности и поръчки.
      </p>
    </div>
  )
}
