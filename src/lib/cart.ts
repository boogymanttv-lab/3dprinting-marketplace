// Количка — чисто клиентска функционалност (localStorage), без база данни.
// Позволява продукти от различни магазини едновременно. При checkout
// (/cart) всеки артикул се превръща в отделна поръчка чрез /api/orders,
// със споделена информация за доставка/телефон.

export interface CartItem {
  listingId: string
  title: string
  price: number
  currency: string
  image: string | null
  shopId: string
  shopName: string
  maxQty: number
  qty: number
}

const STORAGE_KEY = 'cart-items'
export const CART_EVENT = 'cart-updated'

function read(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new Event(CART_EVENT))
  } catch {
    // localStorage недостъпен (private mode) — тихо пропускаме.
  }
}

export function getCart(): CartItem[] {
  return read()
}

export function getCartCount(): number {
  return read().reduce((sum, i) => sum + i.qty, 0)
}

export function addToCart(item: Omit<CartItem, 'qty'>, qty = 1): void {
  const items = read()
  const existing = items.find(i => i.listingId === item.listingId)
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, item.maxQty)
  } else {
    items.push({ ...item, qty: Math.min(qty, item.maxQty) })
  }
  write(items)
}

export function updateCartQty(listingId: string, qty: number): void {
  const items = read()
  if (qty <= 0) {
    write(items.filter(i => i.listingId !== listingId))
    return
  }
  const existing = items.find(i => i.listingId === listingId)
  if (existing) existing.qty = Math.min(qty, existing.maxQty)
  write(items)
}

export function removeFromCart(listingId: string): void {
  write(read().filter(i => i.listingId !== listingId))
}

export function clearCart(): void {
  write([])
}
