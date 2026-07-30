-- =============================================
-- Print3D Marketplace — Initial Schema
-- =============================================

-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  city text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- PLANS
-- =============================================
create table public.plans (
  id text primary key,           -- 'free', 'starter', 'pro', 'business', 'unlimited'
  name text not null,
  price_monthly numeric(10,2) not null default 0,
  max_listings int,              -- null = unlimited
  description text,
  features jsonb default '[]',
  stripe_price_id text,
  sort_order int default 0
);

insert into public.plans (id, name, price_monthly, max_listings, description, features, sort_order) values
  ('free',      'Free',      0,     10,   '10 безплатни обяви',       '["10 активни обяви","Профил на магазин","Чат с купувачи","Базова статистика"]', 1),
  ('starter',   'Starter',   9.90,  15,   '+5 обяви (15 общо)',        '["15 активни обяви","Приоритет в търсене","Детайлна статистика"]', 2),
  ('pro',       'Pro',       19.90, 30,   '+20 обяви (30 общо)',       '["30 активни обяви","Топ позиция","Промо банер","Пълна статистика","Приоритетна поддръжка"]', 3),
  ('business',  'Business',  34.90, 60,   '+50 обяви (60 общо)',       '["60 активни обяви","Всичко от Pro","API достъп","Bulk качване"]', 4),
  ('unlimited', 'Unlimited', 59.90, null, 'Неограничени обяви',        '["Неограничени обяви","Всичко от Business","Персонален мениджър","Промоционални пакети"]', 5);

-- =============================================
-- SHOPS
-- =============================================
create table public.shops (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null unique,
  name text not null,
  slug text unique not null,
  description text,
  logo_url text,
  banner_url text,
  city text,
  phone text,
  website text,
  -- Company / invoice data
  company_name text,
  eik text,              -- ЕИК / Булстат
  vat_number text,       -- ДДС номер
  company_address text,
  -- Plan
  plan_id text references public.plans(id) default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_expires_at timestamptz,
  -- Stats (cached)
  total_sales int default 0,
  rating numeric(3,2) default 0,
  review_count int default 0,
  is_active boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.shops enable row level security;

create policy "Shops are viewable by everyone"
  on public.shops for select using (true);

create policy "Shop owners can update their shop"
  on public.shops for update using (auth.uid() = owner_id);

create policy "Authenticated users can create shops"
  on public.shops for insert with check (auth.uid() = owner_id);

-- =============================================
-- CATEGORIES
-- =============================================
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  icon text,
  parent_id uuid references public.categories(id),
  sort_order int default 0
);

insert into public.categories (name, slug, icon, sort_order) values
  ('Филамент',             'filament',      '🧵', 1),
  ('Принтери',             'printers',      '🖨️', 2),
  ('3D Модели',            'models',        '🗿', 3),
  ('Части & Аксесоари',   'parts',         '⚙️', 4),
  ('Смола',                'resin',         '💧', 5),
  ('Принтирани изделия',   'printed-items', '📦', 6);

-- Subcategories for Filament
with parent as (select id from public.categories where slug = 'filament')
insert into public.categories (name, slug, parent_id, sort_order)
select name, slug, parent.id, sort_order from parent, (values
  ('PLA',    'pla',    1),
  ('PLA+',   'pla-plus', 2),
  ('ABS',    'abs',    3),
  ('PETG',   'petg',   4),
  ('TPU',    'tpu',    5),
  ('Nylon',  'nylon',  6),
  ('ASA',    'asa',    7),
  ('Друго',  'other-filament', 8)
) as s(name, slug, sort_order);

-- Subcategories for Printers
with parent as (select id from public.categories where slug = 'printers')
insert into public.categories (name, slug, parent_id, sort_order)
select name, slug, parent.id, sort_order from parent, (values
  ('FDM',       'fdm',      1),
  ('Resin/SLA', 'sla',      2),
  ('CoreXY',    'corexz',   3),
  ('Нов',       'new-printer', 4),
  ('Употребяван','used-printer', 5)
) as s(name, slug, sort_order);

-- Subcategories for Parts
with parent as (select id from public.categories where slug = 'parts')
insert into public.categories (name, slug, parent_id, sort_order)
select name, slug, parent.id, sort_order from parent, (values
  ('Хотенди',    'hotends',   1),
  ('Екструдери', 'extruders', 2),
  ('Нагреватели','heaters',   3),
  ('Електроника','electronics', 4),
  ('Друго',      'other-parts', 5)
) as s(name, slug, sort_order);

-- Subcategories for Printed Items
with parent as (select id from public.categories where slug = 'printed-items')
insert into public.categories (name, slug, parent_id, sort_order)
select name, slug, parent.id, sort_order from parent, (values
  ('Автомобилни аксесоари',    'car-accessories',   1),
  ('Играчки & Фигурки',        'toys-figures',      2),
  ('Декорация & Дом',          'home-decor',        3),
  ('Инструменти & Органайзери','tools-organizers',  4),
  ('Бижута & Аксесоари',       'jewelry',           5),
  ('Геймърски аксесоари',      'gaming',            6),
  ('Телефонни аксесоари',      'phone-accessories', 7),
  ('Спорт & Фитнес',           'sports-fitness',    8),
  ('Образование & Наука',      'education',         9),
  ('Канцелария & Офис',        'office',            10),
  ('Косплей & Реквизит',       'cosplay',           11),
  ('Градина & Открито',        'garden-outdoor',    12),
  ('Кухня',                    'kitchen',           13),
  ('Домашни любимци',          'pets',              14),
  ('Друго',                    'other-printed',     15)
) as s(name, slug, sort_order);

-- =============================================
-- LISTINGS (Обяви)
-- =============================================
create table public.listings (
  id uuid default uuid_generate_v4() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  category_id uuid references public.categories(id),
  title text not null,
  description text,
  price numeric(10,2) not null,
  currency text default 'EUR',
  quantity int default 1,
  condition text check (condition in ('new','used','refurbished')) default 'new',
  images text[] default '{}',  -- array of storage URLs
  tags text[] default '{}',
  -- Location
  city text,
  -- Status
  is_active boolean default true,
  is_featured boolean default false,
  view_count int default 0,
  -- Stats
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.listings enable row level security;

create policy "Active listings are viewable by everyone"
  on public.listings for select using (is_active = true);

create policy "Shop owners can manage their listings"
  on public.listings for all using (
    exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
  );

-- Full text search index
create index listings_search_idx on public.listings
  using gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')));

create index listings_category_idx on public.listings(category_id);
create index listings_shop_idx on public.listings(shop_id);
create index listings_price_idx on public.listings(price);

-- =============================================
-- USER ADDRESSES
-- =============================================
create table public.addresses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text default 'Домашен',
  full_name text not null,
  phone text,
  street text not null,
  city text not null,
  postal_code text,
  country text default 'Bulgaria',
  is_default boolean default false,
  created_at timestamptz default now() not null
);

alter table public.addresses enable row level security;

create policy "Users can manage own addresses"
  on public.addresses for all using (auth.uid() = user_id);

-- =============================================
-- ORDERS (Поръчки)
-- =============================================
create type order_status as enum ('new', 'accepted', 'processing', 'shipped', 'completed', 'cancelled');
create type payment_method as enum ('card', 'cod', 'in_person');

create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id) not null,
  shop_id uuid references public.shops(id) not null,
  buyer_id uuid references public.profiles(id) not null,
  -- Snapshot at order time
  listing_title text not null,
  listing_price numeric(10,2) not null,
  listing_image text,
  -- Order details
  quantity int not null default 1,
  total_amount numeric(10,2) not null,
  -- Payment
  payment_method payment_method not null default 'cod',
  stripe_payment_intent_id text,
  platform_fee numeric(10,2),       -- % taken by platform
  seller_amount numeric(10,2),      -- amount after fee
  -- Delivery
  shipping_address jsonb,           -- snapshot of address
  needs_invoice boolean default false,
  -- Status
  status order_status default 'new',
  notes text,
  tracking_number text,
  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  completed_at timestamptz
);

alter table public.orders enable row level security;

create policy "Buyers can view their orders"
  on public.orders for select using (auth.uid() = buyer_id);

create policy "Sellers can view orders for their shop"
  on public.orders for select using (
    exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
  );

create policy "Buyers can create orders"
  on public.orders for insert with check (auth.uid() = buyer_id);

create policy "Sellers can update order status"
  on public.orders for update using (
    exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
  );

-- =============================================
-- MESSAGES / CHAT
-- =============================================
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  listing_id uuid references public.listings(id),
  shop_id uuid references public.shops(id) not null,
  buyer_id uuid references public.profiles(id) not null,
  last_message text,
  last_message_at timestamptz,
  buyer_unread int default 0,
  seller_unread int default 0,
  created_at timestamptz default now() not null,
  unique(listing_id, buyer_id)
);

alter table public.conversations enable row level security;

create policy "Participants can view their conversations"
  on public.conversations for select using (
    auth.uid() = buyer_id or
    exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
  );

create policy "Buyers can create conversations"
  on public.conversations for insert with check (auth.uid() = buyer_id);

create policy "Participants can update conversations"
  on public.conversations for update using (
    auth.uid() = buyer_id or
    exists (select 1 from public.shops where id = shop_id and owner_id = auth.uid())
  );

create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now() not null
);

alter table public.messages enable row level security;

create policy "Participants can view messages"
  on public.messages for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or
           exists (select 1 from public.shops where id = c.shop_id and owner_id = auth.uid()))
    )
  );

create policy "Participants can send messages"
  on public.messages for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or
           exists (select 1 from public.shops where id = c.shop_id and owner_id = auth.uid()))
    )
  );

-- =============================================
-- REVIEWS (Ревюта)
-- =============================================
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) unique not null,
  listing_id uuid references public.listings(id) not null,
  shop_id uuid references public.shops(id) not null,
  reviewer_id uuid references public.profiles(id) not null,
  rating int check (rating between 1 and 5) not null,
  comment text,
  created_at timestamptz default now() not null
);

alter table public.reviews enable row level security;

create policy "Reviews are public"
  on public.reviews for select using (true);

create policy "Buyers can leave reviews for completed orders"
  on public.reviews for insert with check (
    auth.uid() = reviewer_id and
    exists (
      select 1 from public.orders
      where id = order_id and buyer_id = auth.uid() and status = 'completed'
    )
  );

-- =============================================
-- FAVORITES / SAVED LISTINGS
-- =============================================
create table public.favorites (
  user_id uuid references public.profiles(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (user_id, listing_id)
);

alter table public.favorites enable row level security;

create policy "Users can manage own favorites"
  on public.favorites for all using (auth.uid() = user_id);

-- =============================================
-- SHOP RATING UPDATE FUNCTION
-- =============================================
create or replace function update_shop_rating()
returns trigger language plpgsql as $$
begin
  update public.shops
  set
    rating = (select avg(rating) from public.reviews where shop_id = new.shop_id),
    review_count = (select count(*) from public.reviews where shop_id = new.shop_id)
  where id = new.shop_id;
  return new;
end;
$$;

create trigger on_review_created
  after insert on public.reviews
  for each row execute procedure update_shop_rating();

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================
create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure handle_updated_at();
create trigger set_updated_at before update on public.shops
  for each row execute procedure handle_updated_at();
create trigger set_updated_at before update on public.listings
  for each row execute procedure handle_updated_at();
create trigger set_updated_at before update on public.orders
  for each row execute procedure handle_updated_at();
