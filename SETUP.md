# Print3D Marketplace — Setup Guide

## 1. Инсталирай зависимостите
```bash
npm install
```

## 2. Настрой Supabase
1. Създай акаунт на [supabase.com](https://supabase.com)
2. Създай нов проект
3. Отиди на **SQL Editor** и изпълни файла `supabase/migrations/001_initial.sql`
4. Вземи API ключовете от **Settings → API**

## 3. Настрой environment variables
```bash
cp .env.local.example .env.local
```
Попълни `.env.local` с твоите ключове от Supabase (и Stripe по-късно).

## 4. Стартирай development сървъра
```bash
npm run dev
```
Отвори [http://localhost:3000](http://localhost:3000)

---

## Структура на проекта
```
src/
├── app/
│   ├── (auth)/login/         # Вход
│   ├── (auth)/register/      # Регистрация
│   ├── (main)/listings/[id]/ # Детайли на обява
│   ├── api/orders/[id]/      # API за статуси на поръчки
│   ├── dashboard/            # Dashboard на продавача
│   ├── open-shop/            # Отвори магазин
│   ├── plans/                # Планове и цени
│   └── page.tsx              # Начална страница
├── components/
│   ├── listings/             # ListingCard, CategoryBar
│   ├── nav/                  # Navbar
│   └── ui/                   # Badge и др.
├── lib/
│   ├── supabase/             # Client + Server клиенти
│   └── utils.ts              # Помощни функции
└── types/                    # TypeScript типове
supabase/
└── migrations/001_initial.sql  # Цялата схема на базата данни
```

## Следващи стъпки (Фаза 2)
- [ ] Чат в реално време (Supabase Realtime)
- [ ] Качване на снимки (Supabase Storage)
- [ ] Страница за магазин (`/stores/[slug]`)
- [ ] Dashboard: Мои обяви + форма за нова обява
- [ ] Email известия (Resend)
- [ ] Stripe плащания
- [ ] Push известия (Firebase)
