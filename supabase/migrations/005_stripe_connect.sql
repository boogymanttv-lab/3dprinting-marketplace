-- =============================================
-- Stripe Connect (плащане с карта за поръчки купувач → продавач)
-- =============================================

alter table public.shops add column if not exists stripe_connect_account_id text;
alter table public.shops add column if not exists stripe_connect_onboarded boolean not null default false;
alter table public.shops add column if not exists stripe_connect_charges_enabled boolean not null default false;
alter table public.shops add column if not exists stripe_connect_payouts_enabled boolean not null default false;
