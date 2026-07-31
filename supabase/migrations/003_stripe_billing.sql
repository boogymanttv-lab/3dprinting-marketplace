-- =============================================
-- Stripe billing — годишни цени + Price ID-та
-- =============================================

alter table public.plans add column if not exists price_yearly numeric(10,2);
alter table public.plans add column if not exists stripe_price_id_monthly text;
alter table public.plans add column if not exists stripe_price_id_yearly text;

-- Годишни цени (~2 месеца безплатно спрямо месечната цена)
update public.plans set price_yearly = 0      where id = 'free';
update public.plans set price_yearly = 99.00  where id = 'starter';
update public.plans set price_yearly = 199.00 where id = 'pro';
update public.plans set price_yearly = 349.00 where id = 'business';
update public.plans set price_yearly = 599.00 where id = 'unlimited';

-- На кой период плаща магазинът в момента (monthly / yearly), null = безплатен план
alter table public.shops add column if not exists billing_interval text
  check (billing_interval in ('monthly', 'yearly'));
