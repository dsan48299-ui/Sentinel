-- CapitalFlow AI: invoice persistence and PayPal payment ledger.
-- Run this migration in the Supabase SQL Editor before enabling checkout.

create extension if not exists pgcrypto;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
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

alter table public.invoices enable row level security;
alter table public.paypal_orders enable row level security;
alter table public.paypal_webhook_events enable row level security;

-- No anon/authenticated policies are intentionally created. The server uses
-- SUPABASE_SERVICE_ROLE_KEY; never expose that key to the browser.
