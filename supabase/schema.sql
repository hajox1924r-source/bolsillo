-- ============================================================
-- Bolsillo — esquema de base de datos (Supabase / PostgreSQL)
-- Cómo ejecutarlo: en Supabase → SQL Editor → New query →
-- pegar todo esto → botón "Run". Crea las tablas y la seguridad.
-- ============================================================

-- Cuentas del usuario (Bancolombia, Nequi, efectivo, tarjeta…)
create table if not exists accounts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  kind       text not null default 'banco',   -- banco | efectivo | tarjeta | billetera
  balance    numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- Movimientos: ingresos (monto positivo) y gastos (monto negativo)
create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  account_id  uuid references accounts(id) on delete set null,
  category    text not null,                  -- mercado, transporte, ingreso…
  description text,
  amount      numeric(14,2) not null,         -- negativo = gasto, positivo = ingreso
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Presupuestos por categoría y mes
create table if not exists budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     text not null,
  limit_amount numeric(14,2) not null,
  month        date not null,                 -- primer día del mes (2026-08-01)
  unique (user_id, category, month)
);

-- Metas de ahorro
create table if not exists goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  emoji         text,
  target_amount numeric(14,2) not null,
  saved_amount  numeric(14,2) not null default 0,
  due_date      date,
  created_at    timestamptz not null default now()
);

-- Índices para las consultas más frecuentes
create index if not exists idx_tx_user_date on transactions(user_id, occurred_at desc);
create index if not exists idx_acc_user     on accounts(user_id);

-- ============================================================
-- Seguridad (Row Level Security): cada usuario solo puede ver
-- y modificar SUS propias filas. Sin esto, cualquiera vería
-- los datos de todos. Es obligatorio para datos financieros.
-- ============================================================
alter table accounts     enable row level security;
alter table transactions enable row level security;
alter table budgets      enable row level security;
alter table goals        enable row level security;

drop policy if exists "own accounts" on accounts;
create policy "own accounts"     on accounts     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own transactions" on transactions;
create policy "own transactions" on transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own budgets" on budgets;
create policy "own budgets"      on budgets      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own goals" on goals;
create policy "own goals"        on goals        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
