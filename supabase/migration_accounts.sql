-- Cuentas (Nequi, Daviplata, Nu, Bancolombia, Efectivo, Tarjeta…).
-- Seguro correr aunque ya exista: usa "if not exists".
create table if not exists accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  kind       text not null default 'banco',   -- banco | efectivo | tarjeta | billetera
  balance    numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Vincular cada movimiento a una cuenta.
alter table transactions add column if not exists account_id uuid references accounts(id) on delete set null;

create index if not exists idx_acc_user on accounts(user_id);

alter table accounts enable row level security;
drop policy if exists "own accounts" on accounts;
create policy "own accounts" on accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
