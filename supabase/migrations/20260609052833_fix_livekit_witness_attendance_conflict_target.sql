create or replace function public.record_witness_attendance_action(
  p_user_id uuid,
  p_dare_id uuid
)
returns table (
  attendance_id uuid,
  dare_id uuid,
  user_id uuid,
  joined_at timestamptz,
  last_seen_at timestamptz,
  vote_eligible_at timestamptz,
  eligible_to_vote boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_attendance public.court_witness_attendance%rowtype;
begin
  select * into v_dare
  from public.dares
  where id = p_dare_id;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if v_dare.resolution_type <> 'witnessed' then
    raise exception 'invalid_resolution_type' using errcode = 'P0001';
  end if;

  if p_user_id = v_dare.issuer_id or p_user_id = v_dare.challenger_id then
    raise exception 'participant_cannot_witness_vote' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('active', 'awaiting_result') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.account_status = 'active'
      and p.kyc_tier <> 'kyc0'
  ) then
    raise exception 'witness_not_eligible' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id
    and court_sessions.phase in ('active', 'awaiting_result')
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if not public.livekit_spectator_presence_verified(p_user_id, p_dare_id, v_court.id) then
    raise exception 'livekit_witness_presence_required' using errcode = 'P0001';
  end if;

  update public.court_witness_attendance cwa
    set court_session_id = v_court.id,
        last_seen_at = now(),
        status = 'present'
  where cwa.dare_id = p_dare_id
    and cwa.witness_user_id = p_user_id
  returning * into v_attendance;

  if not found then
    begin
      insert into public.court_witness_attendance (
        dare_id,
        court_session_id,
        witness_user_id
      )
      values (
        p_dare_id,
        v_court.id,
        p_user_id
      )
      returning * into v_attendance;
    exception
      when unique_violation then
        update public.court_witness_attendance cwa
          set court_session_id = v_court.id,
              last_seen_at = now(),
              status = 'present'
        where cwa.dare_id = p_dare_id
          and cwa.witness_user_id = p_user_id
        returning * into v_attendance;
    end;
  end if;

  attendance_id := v_attendance.id;
  dare_id := v_attendance.dare_id;
  user_id := v_attendance.witness_user_id;
  joined_at := v_attendance.joined_at;
  last_seen_at := v_attendance.last_seen_at;
  vote_eligible_at := v_attendance.vote_eligible_at;
  eligible_to_vote := now() >= v_attendance.vote_eligible_at
    and v_attendance.last_seen_at >= now() - interval '90 seconds'
    and v_attendance.status = 'present';
  return next;
end;
$$;

revoke all on function public.record_witness_attendance_action(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.record_witness_attendance_action(uuid, uuid)
to service_role;
