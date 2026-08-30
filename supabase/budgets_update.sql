-- Presupuestos: un límite recurrente por categoría (sin mes).
-- Ejecutar en Supabase → SQL Editor → New query → pegar → Run.
-- Seguro: la tabla estaba vacía.

drop table if exists budgets cascade;

create table budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     text not null,
  limit_amount numeric(14,2) not null,
  created_at   timestamptz not null default now(),
  unique (user_id, category)
);

alter table budgets enable row level security;
drop policy if exists "own budgets" on budgets;
create policy "own budgets" on budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
