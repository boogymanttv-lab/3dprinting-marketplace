-- =============================================
-- Изтриване на заявка — само докато е отворена.
-- Веднъж възложена, пазим я видима (статистика/доверие на магазина),
-- затова не позволяваме изтриване след 'assigned'.
-- =============================================

drop policy if exists "Buyers can delete their own requests" on public.requests;

create policy "Buyers can delete their own open requests"
  on public.requests for delete using (
    auth.uid() = buyer_id and status = 'open'
  );
