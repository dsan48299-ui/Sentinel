-- CapitalFlow AI: private invoice records and PayPal payment ledger.
-- Run in Supabase SQL Editor before enabling the application.

create extension if not exists pgcrypto;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null unique,
  client_name text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  due_date date not null,
  status text not null default 'PENDING' check (status in ('PENDING','PAID','VOID','REFUNDED')),
  paypal_order_id text,
  paypal_capture_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.paypal_orders (
  paypal_order_id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  status text not null default 'CREATED',
  paypal_capture_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.paypal_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

-- Supports account-scoped invoice list queries and the payment-order lookups.
create index if not exists invoices_owner_created_at_idx
  on public.invoices (owner_id, created_at desc);
create index if not exists paypal_orders_owner_id_idx
  on public.paypal_orders (owner_id);
create index if not exists paypal_orders_invoice_id_idx
  on public.paypal_orders (invoice_id);

alter table public.invoices enable row level security;
alter table public.paypal_orders enable row level security;
alter table public.paypal_webhook_events enable row level security;

-- No anon/authenticated table policies are created. All data access is server-side
-- after validating the signed Supabase user session. Never expose the service key.
