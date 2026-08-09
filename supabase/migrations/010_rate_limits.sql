-- =============================================
-- Rate-limiting на ниво база данни — не може да се заобиколи
-- дори при директни заявки към Supabase API.
-- Нови обяви не се лимитират тук — вече са ограничени от
-- плана на магазина (max_listings).
-- =============================================

-- Заявки ("Заяви поръчка") — макс. 3 на час на купувач
create or replace function check_request_rate_limit()
returns trigger language plpgsql as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.requests
  where buyer_id = new.buyer_id and created_at > now() - interval '1 hour';

  if v_count >= 3 then
    raise exception 'Достигна лимита от 3 заявки на час. Опитай отново по-късно.';
  end if;

  return new;
end;
$$;

create trigger enforce_request_rate_limit
  before insert on public.requests
  for each row execute procedure check_request_rate_limit();

-- Оферти по заявки — макс. 20 на ден на магазин
create or replace function check_offer_rate_limit()
returns trigger language plpgsql as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.request_offers
  where shop_id = new.shop_id and created_at > now() - interval '1 day';

  if v_count >= 20 then
    raise exception 'Достигна дневния лимит от 20 оферти. Опитай пак утре.';
  end if;

  return new;
end;
$$;

create trigger enforce_offer_rate_limit
  before insert on public.request_offers
  for each row execute procedure check_offer_rate_limit();
