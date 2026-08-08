-- =============================================
-- "Заяви поръчка" — обратен маркетплейс
-- Купувачът публикува заявка какво иска да си поръчa,
-- продавачите наддават с оферти, купувачът приема една.
-- =============================================

create type request_status as enum ('open', 'assigned', 'expired', 'cancelled');
create type offer_status as enum ('pending', 'accepted', 'declined');

-- =============================================
-- REQUESTS (Заявки)
-- =============================================
create table public.requests (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references public.profiles(id) on delete cascade not null,
  category_id uuid references public.categories(id),
  title text not null,
  description text not null,
  image_url text,
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  currency text default 'EUR',
  city text,
  deadline date,
  status request_status default 'open' not null,
  offer_count int default 0 not null,
  accepted_offer_id uuid,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.requests enable row level security;

-- Публично видими за всички — включително възложените, за да personifies
-- се вижда социално доказателство, че заявките реално се изпълняват.
create policy "Requests are viewable by everyone"
  on public.requests for select using (true);

create policy "Users can create requests"
  on public.requests for insert with check (auth.uid() = buyer_id);

create policy "Buyers can update their own requests"
  on public.requests for update using (auth.uid() = buyer_id);

create policy "Buyers can delete their own requests"
  on public.requests for delete using (auth.uid() = buyer_id);

create index requests_status_idx on public.requests(status);
create index requests_category_idx on public.requests(category_id);
create index requests_buyer_idx on public.requests(buyer_id);

create trigger set_updated_at before update on public.requests
  for each row execute procedure handle_updated_at();

-- =============================================
-- REQUEST OFFERS (Оферти от продавачи)
-- =============================================
create table public.request_offers (
  id uuid default uuid_generate_v4() primary key,
  request_id uuid references public.requests(id) on delete cascade not null,
  shop_id uuid references public.shops(id) on delete cascade not null,
  price numeric(10,2) not null,
  currency text default 'EUR',
  eta_days int,
  message text,
  status offer_status default 'pending' not null,
  listing_id uuid references public.listings(id),
  created_at timestamptz default now() not null,
  unique(request_id, shop_id)
);

alter table public.request_offers enable row level security;

-- Само купувачът на заявката и предложилият продавач виждат офертата
-- (пазим офертите частни, за да не се надпреварват продавачите само по цена).
create policy "Buyer and offering shop can view offers"
  on public.request_offers for select using (
    exists (select 1 from public.requests r where r.id = request_id and r.buyer_id = auth.uid())
    or exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "Shop owners can submit offers"
  on public.request_offers for insert with check (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create policy "Shop owners can update their own offer"
  on public.request_offers for update using (
    exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
  );

create index request_offers_request_idx on public.request_offers(request_id);
create index request_offers_shop_idx on public.request_offers(shop_id);

-- Поддържа requests.offer_count автоматично
create or replace function increment_request_offer_count()
returns trigger language plpgsql as $$
begin
  update public.requests set offer_count = offer_count + 1, updated_at = now() where id = new.request_id;
  return new;
end;
$$;

create trigger on_offer_created
  after insert on public.request_offers
  for each row execute procedure increment_request_offer_count();

-- =============================================
-- Свързваме requests → приетата оферта
-- =============================================
alter table public.requests
  add constraint requests_accepted_offer_fkey
  foreign key (accepted_offer_id) references public.request_offers(id);

-- =============================================
-- Скрити обяви, генерирани от приета заявка
-- (не се показват в общото разглеждане/търсене/sitemap,
-- но работят напълно нормално през съществуващата поръчкова система)
-- =============================================
alter table public.listings add column if not exists is_request_order boolean not null default false;

-- =============================================
-- ПРИЕМАНЕ НА ОФЕРТА
-- Изпълнява се от купувача. Проверява права, създава скрита обява
-- със стойността на приетата оферта (за да мине през съществуващия
-- checkout/Stripe Connect/COD поток без промени), отхвърля другите
-- оферти и маркира заявката като "Възложена".
-- =============================================
create or replace function public.accept_request_offer(p_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.request_offers%rowtype;
  v_request public.requests%rowtype;
  v_listing_id uuid;
begin
  select * into v_offer from public.request_offers where id = p_offer_id for update;
  if v_offer.id is null then
    raise exception 'Офертата не е намерена';
  end if;

  select * into v_request from public.requests where id = v_offer.request_id for update;
  if v_request.id is null then
    raise exception 'Заявката не е намерена';
  end if;

  if v_request.buyer_id <> auth.uid() then
    raise exception 'Нямаш право да приемеш тази оферта';
  end if;

  if v_request.status <> 'open' then
    raise exception 'Заявката вече е възложена или затворена';
  end if;

  if v_offer.status <> 'pending' then
    raise exception 'Офертата вече не е активна';
  end if;

  insert into public.listings (
    shop_id, category_id, title, description, price, currency,
    quantity, condition, images, city, is_active, is_request_order
  ) values (
    v_offer.shop_id, v_request.category_id,
    v_request.title,
    coalesce(v_offer.message, '') || case when v_offer.message is not null then E'\n\n' else '' end
      || 'Изработено по заявка: ' || v_request.description,
    v_offer.price, coalesce(v_offer.currency, 'EUR'),
    1, 'new',
    case when v_request.image_url is not null then array[v_request.image_url] else '{}' end,
    v_request.city, true, true
  ) returning id into v_listing_id;

  update public.request_offers set listing_id = v_listing_id, status = 'accepted' where id = p_offer_id;
  update public.request_offers set status = 'declined' where request_id = v_request.id and id <> p_offer_id and status = 'pending';
  update public.requests set status = 'assigned', accepted_offer_id = p_offer_id, updated_at = now() where id = v_request.id;

  return v_listing_id;
end;
$$;

grant execute on function public.accept_request_offer(uuid) to authenticated;
