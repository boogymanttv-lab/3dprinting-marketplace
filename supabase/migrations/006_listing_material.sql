-- =============================================
-- Материал на обявата (само 3D материали за печат)
-- =============================================

alter table public.listings add column if not exists material text
  check (material in ('pla', 'petg', 'abs', 'tpu', 'asa', 'nylon', 'resin', 'wood_fill', 'carbon_fiber', 'metal_powder'));
