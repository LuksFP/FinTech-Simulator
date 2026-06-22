-- Gera transações reais a partir das recorrências ativas que venceram.
-- SECURITY INVOKER: roda como o usuário chamador, então a RLS se aplica e a
-- função só consegue tocar nos dados do próprio usuário. Faz catch-up de
-- múltiplos períodos perdidos.
create or replace function public.generate_due_recurring()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  r record;
  v_due date;
  created_count int := 0;
begin
  for r in
    select * from recurring_transactions
    where is_active = true
      and next_due_date <= current_date
      and user_id = auth.uid()
    for update
  loop
    v_due := r.next_due_date;
    while v_due <= current_date loop
      insert into transactions (description, amount, type, date, category_id, user_id)
      values (r.description, r.amount, r.type, v_due, r.category_id, r.user_id);
      created_count := created_count + 1;
      v_due := (v_due + case r.frequency
        when 'daily'   then interval '1 day'
        when 'weekly'  then interval '1 week'
        when 'monthly' then interval '1 month'
        when 'yearly'  then interval '1 year'
        else interval '1 month'
      end)::date;
    end loop;
    update recurring_transactions set next_due_date = v_due where id = r.id;
  end loop;
  return created_count;
end $$;

revoke execute on function public.generate_due_recurring() from public, anon;
grant execute on function public.generate_due_recurring() to authenticated;
