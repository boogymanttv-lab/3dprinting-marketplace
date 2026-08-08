// "Наскоро разгледани" — чисто клиентска функционалност (localStorage),
// без база данни. Пази последните няколко разгледани обяви на устройството.

export interface RecentlyViewedItem {
  id: string
  title: string
  price: number
  currency: string
  image: string | null
  shopName: string | null
  viewedAt: number
}

const STORAGE_KEY = 'recently-viewed-listings'
const MAX_ITEMS = 12

export function getRecentlyViewed(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addRecentlyViewed(item: Omit<RecentlyViewedItem, 'viewedAt'>): void {
  try {
    const existing = getRecentlyViewed().filter(i => i.id !== item.id)
    const updated = [{ ...item, viewedAt: Date.now() }, ...existing].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage недостъпен (private mode) — тихо пропускаме.
  }
}
