-- Добавя задължителен телефон на купувача към поръчките, за да могат
-- продавачите да се свържат директно (куриер/личен контакт).
alter table public.orders add column if not exists buyer_phone text;
