-- =============================================
-- Количество в заявка ("Заяви поръчка") — по избор
-- =============================================
alter table public.requests add column if not exists quantity int;

-- Обновяваме accept_request_offer, за да включи количеството
-- (само информативно в описанието на генерираната обява — цената
-- на офертата остава общата договорена сума, не се умножава).
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
      || 'Изработено по заявка: ' || v_request.description
      || case when v_request.quantity is not null then E'\nКоличество: ' || v_request.quantity || ' бр.' else '' end,
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
