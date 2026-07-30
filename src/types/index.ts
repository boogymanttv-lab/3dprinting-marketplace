export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Auth ──────────────────────────────────────────
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  city: string | null
  created_at: string
  updated_at: string
}

// ── Plans ─────────────────────────────────────────
export interface Plan {
  id: string
  name: string
  price_monthly: number
  max_listings: number | null
  description: string
  features: string[]
  stripe_price_id: string | null
  sort_order: number
}

// ── Shop ──────────────────────────────────────────
export interface Shop {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  banner_url: string | null
  city: string | null
  phone: string | null
  website: string | null
  company_name: string | null
  eik: string | null
  vat_number: string | null
  company_address: string | null
  plan_id: string
  plan_expires_at: string | null
  total_sales: number
  rating: number
  review_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Joins
  plan?: Plan
  owner?: Profile
}

// ── Category ──────────────────────────────────────
export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  parent_id: string | null
  sort_order: number
  // Joins
  subcategories?: Category[]
  parent?: Category
}

// ── Listing ───────────────────────────────────────
export type ListingCondition = 'new' | 'used' | 'refurbished'

export interface Listing {
  id: string
  shop_id: string
  category_id: string | null
  title: string
  description: string | null
  price: number
  currency: string
  quantity: number
  condition: ListingCondition
  images: string[]
  tags: string[]
  city: string | null
  is_active: boolean
  is_featured: boolean
  view_count: number
  created_at: string
  updated_at: string
  // Joins
  shop?: Shop
  category?: Category
}

// ── Address ───────────────────────────────────────
export interface Address {
  id: string
  user_id: string
  label: string
  full_name: string
  phone: string | null
  street: string
  city: string
  postal_code: string | null
  country: string
  is_default: boolean
  created_at: string
}

// ── Order ─────────────────────────────────────────
export type OrderStatus = 'new' | 'accepted' | 'processing' | 'shipped' | 'completed' | 'cancelled'
export type PaymentMethod = 'card' | 'cod' | 'in_person'

export interface Order {
  id: string
  listing_id: string
  shop_id: string
  buyer_id: string
  listing_title: string
  listing_price: number
  listing_image: string | null
  quantity: number
  total_amount: number
  payment_method: PaymentMethod
  stripe_payment_intent_id: string | null
  platform_fee: number | null
  seller_amount: number | null
  shipping_address: Address | null
  needs_invoice: boolean
  status: OrderStatus
  notes: string | null
  tracking_number: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  // Joins
  listing?: Listing
  shop?: Shop
  buyer?: Profile
}

// ── Messages ──────────────────────────────────────
export interface Conversation {
  id: string
  listing_id: string | null
  shop_id: string
  buyer_id: string
  last_message: string | null
  last_message_at: string | null
  buyer_unread: number
  seller_unread: number
  created_at: string
  // Joins
  listing?: Listing
  shop?: Shop
  buyer?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
  // Joins
  sender?: Profile
}

// ── Review ────────────────────────────────────────
export interface Review {
  id: string
  order_id: string
  listing_id: string
  shop_id: string
  reviewer_id: string
  rating: number
  comment: string | null
  created_at: string
  // Joins
  reviewer?: Profile
}

// ── UI helpers ────────────────────────────────────
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new:        'Нова',
  accepted:   'Приета',
  processing: 'Обработва се',
  shipped:    'Изпратена',
  completed:  'Завършена',
  cancelled:  'Отказана',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, { bg: string; text: string }> = {
  new:        { bg: 'rgba(99,102,241,0.15)',  text: '#818cf8' },
  accepted:   { bg: 'rgba(249,115,22,0.15)',  text: '#f97316' },
  processing: { bg: 'rgba(234,179,8,0.15)',   text: '#eab308' },
  shipped:    { bg: 'rgba(59,130,246,0.15)',   text: '#60a5fa' },
  completed:  { bg: 'rgba(34,197,94,0.15)',    text: '#22c55e' },
  cancelled:  { bg: 'rgba(239,68,68,0.15)',    text: '#f87171' },
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: '💳 С карта',
  cod: '💵 Наложен платеж',
  in_person: '🤝 Лично предаване',
}

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  new: 'Ново',
  used: 'Употребявано',
  refurbished: 'Обновено',
}
