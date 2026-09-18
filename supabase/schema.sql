-- Visitor Management System schema
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).

create extension if not exists "pgcrypto";

-- Office staff directory, managed by admins. Powers the autofill sign-in list.
create table if not exists office_staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  department text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Admins: one row per person allowed into the admin panel.
-- id matches the corresponding auth.users id (created via Supabase Auth).
create table if not exists admins (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- Every sign-in/out event, for staff, non-office guests, and visitors.
create table if not exists visit_logs (
  id uuid primary key default gen_random_uuid(),
  visitor_type text not null check (visitor_type in ('staff', 'guest', 'visitor')),
  office_staff_id uuid references office_staff (id) on delete set null,
  name text not null,
  company text,
  purpose text,
  host_name text,
  signed_in_at timestamptz not null default now(),
  signed_out_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists visit_logs_signed_in_at_idx on visit_logs (signed_in_at);
create index if not exists visit_logs_office_staff_id_idx on visit_logs (office_staff_id);
create index if not exists visit_logs_open_idx on visit_logs (signed_out_at) where signed_out_at is null;

-- De-duplication ledger so cron jobs never send the same notification twice in a day.
create table if not exists notification_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null,
  run_date date not null,
  created_at timestamptz not null default now(),
  unique (run_type, run_date)
);

-- Lock every table down by default. The app talks to Postgres only through
-- Next.js server-side route handlers using the Supabase service role key,
-- which bypasses RLS, so no client-side policies are required.
alter table office_staff enable row level security;
alter table admins enable row level security;
alter table visit_logs enable row level security;
alter table notification_runs enable row level security;
