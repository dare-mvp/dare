-- ============================================================
-- court_heartbeat_rpc.sql
-- Participant heartbeat for active Court sessions.
-- ============================================================

create or replace function public.record_court_heartbeat_action(
  p_user_id uuid,
  p_dare_id uuid
)
returns table (
  dare_id uuid,
  court_session_id uuid,
  phase text,
  player_role text,
  player_a_heartbeat_at timestamptz,
  player_b_heartbeat_at timestamptz,
  reconnect_deadline timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_now timestamptz := now();
  v_role text;
begin
  select *
    into v_dare
  from dares d
  where d.id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_user_id = v_dare.issuer_id then
    v_role := 'A';
  elsif p_user_id = v_dare.challenger_id then
    v_role := 'B';
  else
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  if v_dare.status <> 'active' then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  select *
    into v_court
  from court_sessions cs
  where cs.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_court.phase <> 'active' then
    raise exception 'invalid_court_state' using errcode = 'P0001';
  end if;

  if v_role = 'A'
    and v_court.player_a_heartbeat_at is not null
    and v_now < v_court.player_a_heartbeat_at + interval '10 seconds' then
    raise exception 'heartbeat_rate_limited' using errcode = 'P0001';
  end if;

  if v_role = 'B'
    and v_court.player_b_heartbeat_at is not null
    and v_now < v_court.player_b_heartbeat_at + interval '10 seconds' then
    raise exception 'heartbeat_rate_limited' using errcode = 'P0001';
  end if;

  update court_sessions cs
    set player_a_heartbeat_at = case
          when v_role = 'A' then v_now
          else cs.player_a_heartbeat_at
        end,
        player_b_heartbeat_at = case
          when v_role = 'B' then v_now
          else cs.player_b_heartbeat_at
        end,
        reconnect_deadline = v_now + interval '60 seconds'
  where cs.id = v_court.id
  returning * into v_court;

  dare_id := v_dare.id;
  court_session_id := v_court.id;
  phase := v_court.phase;
  player_role := v_role;
  player_a_heartbeat_at := v_court.player_a_heartbeat_at;
  player_b_heartbeat_at := v_court.player_b_heartbeat_at;
  reconnect_deadline := v_court.reconnect_deadline;
  return next;
end;
$$;

revoke all on function public.record_court_heartbeat_action(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.record_court_heartbeat_action(uuid, uuid)
to service_role;
