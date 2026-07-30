-- =============================================
-- Terms & Privacy consent tracking
-- =============================================

-- Записва кога потребителят се е съгласил с Общите условия и Политиката за поверителност
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- Актуализира тригъра, за да записва момента на съгласие автоматично при регистрация
-- (чекбоксът за съгласие е задължителен във формата за регистрация, т.е. регистрация = съгласие)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, terms_accepted_at)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', now());
  return new;
end;
$$;
