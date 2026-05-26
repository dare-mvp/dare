-- Marketing waitlist fields used by the web landing page.
create table if not exists public.marketing_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text,
  country text,
  phone text,
  created_at timestamptz not null default now(),
  constraint marketing_waitlist_email_key unique (email),
  constraint marketing_waitlist_email_format
    check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

alter table public.marketing_waitlist
  add column if not exists country text,
  add column if not exists phone text;

alter table public.marketing_waitlist
  add column if not exists role text,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists marketing_waitlist_email_unique_idx
  on public.marketing_waitlist (email);

alter table public.marketing_waitlist enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marketing_waitlist'
      and policyname = 'Service role manages marketing waitlist'
  ) then
    create policy "Service role manages marketing waitlist"
      on public.marketing_waitlist
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
