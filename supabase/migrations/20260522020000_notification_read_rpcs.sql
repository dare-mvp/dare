-- ============================================================
-- notification_read_rpcs.sql
-- Mark notifications read for the authenticated user.
-- ============================================================

create or replace function public.mark_notification_read_action(
  p_user_id uuid,
  p_notification_id uuid
)
returns table (
  notification_id uuid,
  is_read boolean,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notification notifications%rowtype;
begin
  select *
    into v_notification
  from notifications n
  where n.id = p_notification_id
    and n.user_id = p_user_id
  for update;

  if not found then
    raise exception 'notification_not_found' using errcode = 'P0001';
  end if;

  update notifications n
    set is_read = true,
        read_at = coalesce(n.read_at, now())
  where n.id = p_notification_id
  returning * into v_notification;

  notification_id := v_notification.id;
  is_read := v_notification.is_read;
  read_at := v_notification.read_at;
  return next;
end;
$$;

create or replace function public.mark_all_notifications_read_action(
  p_user_id uuid
)
returns table (
  updated_count integer,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
begin
  update notifications n
    set is_read = true,
        read_at = v_now
  where n.user_id = p_user_id
    and n.is_read = false;

  get diagnostics updated_count = row_count;
  read_at := v_now;
  return next;
end;
$$;

revoke all on function public.mark_notification_read_action(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.mark_notification_read_action(uuid, uuid)
to service_role;

revoke all on function public.mark_all_notifications_read_action(uuid)
from public, anon, authenticated;

grant execute on function public.mark_all_notifications_read_action(uuid)
to service_role;
