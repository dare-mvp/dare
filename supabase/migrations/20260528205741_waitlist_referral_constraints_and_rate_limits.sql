-- Adds check constraints, rate-limit table, and the RPC used by the challenge waitlist action.
-- The constraints are NOT VALID so existing rows do not block deployment.

update public.marketing_waitlist
set source = 'homepage'
where source is null;

alter table public.marketing_waitlist
  alter column source set default 'homepage',
  alter column source set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketing_waitlist_referral_code_format'
      and conrelid = 'public.marketing_waitlist'::regclass
  ) then
    alter table public.marketing_waitlist
      add constraint marketing_waitlist_referral_code_format
      check (referral_code is null or referral_code ~ '^[A-Z0-9]{8}$')
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketing_waitlist_referred_by_format'
      and conrelid = 'public.marketing_waitlist'::regclass
  ) then
    alter table public.marketing_waitlist
      add constraint marketing_waitlist_referred_by_format
      check (referred_by is null or referred_by ~ '^[A-Z0-9]{8}$')
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'marketing_waitlist_source_allowed'
      and conrelid = 'public.marketing_waitlist'::regclass
  ) then
    alter table public.marketing_waitlist
      add constraint marketing_waitlist_source_allowed
      check (source in ('homepage', 'challenge'))
      not valid;
  end if;
end $$;

create table if not exists public.marketing_waitlist_rate_limits (
  scope text not null,
  identifier_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (scope, identifier_hash),
  constraint marketing_waitlist_rate_limits_scope_length
    check (char_length(scope) between 3 and 80),
  constraint marketing_waitlist_rate_limits_identifier_hash_format
    check (identifier_hash ~ '^[a-f0-9]{64}$'),
  constraint marketing_waitlist_rate_limits_count_nonnegative
    check (request_count >= 0)
);

alter table public.marketing_waitlist_rate_limits enable row level security;

drop policy if exists "marketing_waitlist_rate_limits_no_user_access"
  on public.marketing_waitlist_rate_limits;

create policy "marketing_waitlist_rate_limits_no_user_access"
  on public.marketing_waitlist_rate_limits
  for all
  using (false)
  with check (false);

create or replace function public.consume_marketing_waitlist_rate_limit(
  p_scope text,
  p_identifier_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  limit_count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'invalid_rate_limit' using errcode = 'P0001';
  end if;

  if char_length(coalesce(p_scope, '')) < 3
    or char_length(p_scope) > 80
    or p_identifier_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_rate_limit_identifier' using errcode = 'P0001';
  end if;

  insert into public.marketing_waitlist_rate_limits (
    scope,
    identifier_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_scope,
    p_identifier_hash,
    now(),
    1,
    now()
  )
  on conflict (scope, identifier_hash)
  do update
    set window_started_at = case
          when public.marketing_waitlist_rate_limits.window_started_at
            <= now() - make_interval(secs => p_window_seconds)
            then now()
          else public.marketing_waitlist_rate_limits.window_started_at
        end,
        request_count = case
          when public.marketing_waitlist_rate_limits.window_started_at
            <= now() - make_interval(secs => p_window_seconds)
            then 1
          else public.marketing_waitlist_rate_limits.request_count + 1
        end,
        updated_at = now()
  returning window_started_at, request_count
  into v_window_started_at, v_request_count;

  allowed := v_request_count <= p_limit;
  limit_count := p_limit;
  remaining := greatest(0, p_limit - v_request_count);
  reset_at := v_window_started_at + make_interval(secs => p_window_seconds);
  return next;
end;
$$;

revoke all on function public.consume_marketing_waitlist_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_marketing_waitlist_rate_limit(text, text, integer, integer)
  to service_role;
