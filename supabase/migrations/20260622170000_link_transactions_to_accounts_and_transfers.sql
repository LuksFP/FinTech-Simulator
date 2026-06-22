-- Liga transações a contas + transferências entre contas + saldo computado.

-- 1) account_id em transactions (se a conta sumir, vira null)
alter table public.transactions
  add column if not exists account_id uuid references public.bank_accounts(id) on delete set null;
create index if not exists transactions_account_id_idx on public.transactions(account_id);

-- 2) Tabela de transferências (não contam como receita/despesa)
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  to_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  amount numeric not null check (amount > 0),
  description text,
  date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint transfers_distinct_accounts check (from_account_id <> to_account_id)
);

alter table public.transfers enable row level security;

create policy "transfers_select_own" on public.transfers
  for select to authenticated using (auth.uid() = user_id);
create policy "transfers_insert_own" on public.transfers
  for insert to authenticated with check (auth.uid() = user_id);
create policy "transfers_update_own" on public.transfers
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transfers_delete_own" on public.transfers
  for delete to authenticated using (auth.uid() = user_id);

-- 3) Saldo computado por conta (security_invoker respeita a RLS das tabelas base)
create or replace view public.account_balances with (security_invoker = on) as
select
  a.id, a.user_id, a.name, a.type, a.color, a.icon, a.is_default,
  a.balance as initial_balance,
  a.balance
    + coalesce((select sum(case when t.type = 'entrada' then t.amount else -t.amount end)
               from public.transactions t where t.account_id = a.id), 0)
    + coalesce((select sum(amount) from public.transfers tr where tr.to_account_id = a.id), 0)
    - coalesce((select sum(amount) from public.transfers tr where tr.from_account_id = a.id), 0)
    as current_balance
from public.bank_accounts a;

grant select on public.account_balances to authenticated;
