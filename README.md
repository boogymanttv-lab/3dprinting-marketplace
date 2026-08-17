# 3DPrintingBG

Marketplace platform for 3D printing goods and print-on-demand services in
Bulgaria — built with Next.js (App Router), Supabase (Postgres, Auth,
Storage, RLS) and Stripe (subscriptions + Stripe Connect for seller
payouts).

Live at [3dprintingbg.com](https://www.3dprintingbg.com).

## ⚠️ License

**All Rights Reserved.** This repository is public for portfolio and
demonstration purposes only — see [`LICENSE`](./LICENSE). Cloning or
copying the code does not grant any right to use, deploy, or modify it.
Contact the author for permission.

## Stack

- **Framework:** Next.js 16 (App Router, Server Components, Route Handlers)
- **Database / Auth:** Supabase (Postgres, Row Level Security, email OTP auth)
- **Payments:** Stripe (seller subscription plans + Stripe Connect for
  buyer → seller payouts)
- **Email:** Resend
- **Bot protection:** Cloudflare Turnstile

## Features

- Multi-seller marketplace with shop pages, listings, categories and search
- Shopping cart (multi-shop) with combined per-shop checkout
- Buyer-initiated "request a print" flow with seller offers
- Real-time chat between buyers and sellers
- Reviews, favorites, and seller verification badges
- Full admin panel: user management, listing moderation, order tracking
- SEO: dynamic metadata, JSON-LD structured data, sitemap, blog

## Getting Started

This project requires a Supabase project, Stripe account, and several
environment variables to run — see `.env.local.example` for the required
keys. None of the actual secrets are included in this repository.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.
