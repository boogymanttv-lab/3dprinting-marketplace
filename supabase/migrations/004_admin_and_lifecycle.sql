-- =============================================
-- Admin roles + account lifecycle (deactivate/delete)
-- =============================================

-- ── Roles ─────────────────────────────────────
alter table public.profiles add column if not exists role text not null default 'user'
  check (role in ('user', 'moderator', 'operator', 'super_admin'));

alter table public.profiles add column if not exists is_deactivated boolean not null default false;
alter table public.profiles add column if not exists deactivated_at timestamptz;

-- Направи главния акаунт super_admin
update public.profiles set role = 'super_admin' where email = 'wellecfx@gmail.com';

-- ── Listing moderation ────────────────────────
alter table public.listings add column if not exists moderation_status text not null default 'active'
  check (moderation_status in ('active', 'flagged'));
alter table public.listings add column if not exists moderation_note text;
alter table public.listings add column if not exists flagged_by uuid references public.profiles(id) on delete set null;
alter table public.listings add column if not exists flagged_at timestamptz;

-- ── Fix FK constraints so permanent account deletion doesn't get blocked ──
-- Поръчки/ревюта/съобщения на изтрит потребител остават (за историята на
-- другата страна — продавач/купувач), но връзката към профила се null-ва.

alter table public.orders alter column buyer_id drop not null;
alter table public.orders drop constraint if exists orders_buyer_id_fkey;
alter table public.orders add constraint orders_buyer_id_fkey
  foreign key (buyer_id) references public.profiles(id) on delete set null;

alter table public.reviews alter column reviewer_id drop not null;
alter table public.reviews drop constraint if exists reviews_reviewer_id_fkey;
alter table public.reviews add constraint reviews_reviewer_id_fkey
  foreign key (reviewer_id) references public.profiles(id) on delete set null;

alter table public.conversations alter column buyer_id drop not null;
alter table public.conversations drop constraint if exists conversations_buyer_id_fkey;
alter table public.conversations add constraint conversations_buyer_id_fkey
  foreign key (buyer_id) references public.profiles(id) on delete set null;

alter table public.messages alter column sender_id drop not null;
alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references public.profiles(id) on delete set null;
