-- ============================================================
-- push_notifications.sql
-- Expo push token registration and queued notification delivery.
-- ============================================================

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null default 'unknown',
  device_id text,
  app_version text,
  enabled boolean not null default true,
  disabled_reason text,
  last_registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint push_tokens_platform_valid
    check (platform in ('ios', 'android', 'web', 'unknown')),
  constraint push_tokens_token_format
    check (
      char_length(expo_push_token) between 20 and 200
      and (
        expo_push_token like 'ExpoPushToken[%]'
        or expo_push_token like 'ExponentPushToken[%]'
      )
    ),
  constraint push_tokens_device_id_len
    check (device_id is null or char_length(device_id) between 1 and 128),
  constraint push_tokens_app_version_len
    check (app_version is null or char_length(app_version) <= 64)
);

create index push_tokens_user_enabled_idx
  on public.push_tokens (user_id, enabled)
  where enabled = true and revoked_at is null;

create index push_tokens_last_seen_idx
  on public.push_tokens (last_seen_at desc);

create trigger trg_push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();

create table public.notification_push_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  push_token_id uuid not null references public.push_tokens(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  next_attempt_at timestamptz default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_ticket_id text,
  provider_status text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_push_deliveries_status_valid
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  constraint notification_push_deliveries_attempt_count_valid
    check (attempt_count >= 0),
  unique (notification_id, push_token_id)
);

create index notification_push_deliveries_claim_idx
  on public.notification_push_deliveries (status, next_attempt_at, created_at)
  where status in ('pending', 'failed');

create index notification_push_deliveries_user_created_idx
  on public.notification_push_deliveries (user_id, created_at desc);

create trigger trg_notification_push_deliveries_updated_at
  before update on public.notification_push_deliveries
  for each row execute function public.set_updated_at();

create or replace function public.enqueue_notification_push_deliveries()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notification_push_deliveries (
    notification_id,
    push_token_id,
    user_id
  )
  select
    new.id,
    pt.id,
    new.user_id
  from public.push_tokens pt
  where pt.user_id = new.user_id
    and pt.enabled = true
    and pt.revoked_at is null
  on conflict (notification_id, push_token_id) do nothing;

  return new;
end;
$$;

revoke all on function public.enqueue_notification_push_deliveries()
from public, anon, authenticated;

drop trigger if exists trg_notifications_enqueue_push
on public.notifications;

create trigger trg_notifications_enqueue_push
  after insert on public.notifications
  for each row execute function public.enqueue_notification_push_deliveries();

create or replace function public.claim_notification_push_deliveries(
  p_limit integer default 25
)
returns table (
  delivery_id uuid,
  notification_id uuid,
  push_token_id uuid,
  user_id uuid,
  expo_push_token text,
  notification_type text,
  title text,
  body text,
  action jsonb,
  attempt_count integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select npd.id
    from public.notification_push_deliveries npd
    join public.push_tokens pt on pt.id = npd.push_token_id
    where npd.status in ('pending', 'failed')
      and npd.next_attempt_at <= now()
      and npd.attempt_count < 5
      and pt.enabled = true
      and pt.revoked_at is null
    order by npd.created_at asc
    limit greatest(1, least(coalesce(p_limit, 25), 100))
    for update skip locked
  ), updated as (
    update public.notification_push_deliveries npd
      set status = 'sending',
          attempt_count = npd.attempt_count + 1,
          last_attempt_at = now()
    from claimed
    where npd.id = claimed.id
    returning npd.*
  )
  select
    updated.id,
    n.id,
    pt.id,
    updated.user_id,
    pt.expo_push_token,
    n.type,
    n.title,
    n.body,
    n.action,
    updated.attempt_count
  from updated
  join public.notifications n on n.id = updated.notification_id
  join public.push_tokens pt on pt.id = updated.push_token_id;
end;
$$;

revoke all on function public.claim_notification_push_deliveries(integer)
from public, anon, authenticated;
grant execute on function public.claim_notification_push_deliveries(integer)
to service_role;

alter table public.push_tokens enable row level security;
alter table public.notification_push_deliveries enable row level security;

create policy "push_tokens_own_read"
  on public.push_tokens for select
  using (user_id = auth.uid());

create policy "push_tokens_admin_all"
  on public.push_tokens for all
  using (private.is_admin());

create policy "notification_push_deliveries_admin_all"
  on public.notification_push_deliveries for all
  using (private.is_admin());
