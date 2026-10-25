// Кредити: 100 кредита = 1 €. Пакетите за зареждане са тук (цената е в евро).
export const CREDITS_PER_EUR = 100

export interface TopupPackage {
  id: string
  eur: number        // колко се плаща
  credits: number    // колко кредита се получават (без бонуса)
  bonus: number      // бонус кредити
}

export const TOPUP_PACKAGES: TopupPackage[] = [
  { id: 'p5',   eur: 5,   credits: 500,   bonus: 0 },
  { id: 'p10',  eur: 10,  credits: 1000,  bonus: 50 },
  { id: 'p25',  eur: 25,  credits: 2500,  bonus: 250 },
  { id: 'p50',  eur: 50,  credits: 5000,  bonus: 750 },
  { id: 'p100', eur: 100, credits: 10000, bonus: 2000 },
]

export const PROMO_RANK: Record<string, number> = { promo: 1, vip: 2, top: 3 }
export const PROMO_LABEL: Record<number, string> = { 1: 'Промо', 2: 'VIP', 3: 'ТОП' }

export function formatCredits(n: number): string {
  return `${n.toLocaleString('bg-BG')} кр.`
}

// Активна ли е промоцията на обява в момента (по датата, не по rank — rank може да изостава до изтичането)
export function activePromoRank(l: { promo_rank?: number | null; promo_until?: string | null }): number {
  if (!l.promo_rank || !l.promo_until) return 0
  return new Date(l.promo_until).getTime() > Date.now() ? l.promo_rank : 0
}
