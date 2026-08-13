-- Позволява една поръчка (orders) да съдържа няколко различни артикула
-- от един и същи магазин (напр. количка с 5 продукта от 1 магазин = 1
-- поръчка, 1 имейл, вместо по 1 поръчка на артикул).
--
-- orders продължава да пази обобщени полета (listing_id = първия артикул,
-- listing_title = обобщение, quantity = сборно количество, total_amount =
-- сборна сума) — за обратна съвместимост с ревюта/стар код. order_items
-- пази точната разбивка по артикули.

create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  listing_id uuid references public.listings(id),
  listing_title text not null,
  listing_price numeric(10,2) not null,
  listing_image text,
  quantity int not null default 1,
  created_at timestamptz default now() not null
);

alter table public.order_items enable row level security;

create policy "Buyers can view their order items"
  on public.order_items for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
  );

create policy "Sellers can view their order items"
  on public.order_items for select using (
    exists (
      select 1 from public.orders o
      join public.shops s on s.id = o.shop_id
      where o.id = order_id and s.owner_id = auth.uid()
    )
  );

create policy "Buyers can insert items for their own orders"
  on public.order_items for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
  );
