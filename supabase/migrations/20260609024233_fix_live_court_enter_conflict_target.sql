create or replace function public.enter_live_court_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_recording_consent boolean,
  p_audio_enabled boolean default true,
  p_video_enabled boolean default true
)
returns table (
  live_court_room_id uuid,
  dare_id uuid,
  court_session_id uuid,
  provider text,
  provider_room_id text,
  provider_token text,
  viewer_role text,
  room_status text,
  recording_required boolean,
  recording_status text,
  participant_count integer,
  spectator_count integer,
  issuer_live boolean,
  challenger_live boolean,
  viewer_joined boolean,
  live_requirement_met boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_room public.live_court_rooms%rowtype;
  v_viewer_role text;
  v_room_status text;
begin
  select * into v_dare
  from public.dares
  where id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('ready_check', 'active', 'awaiting_result', 'completed', 'dispute_pending', 'jury_open') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if p_user_id = v_dare.issuer_id then
    v_viewer_role := 'participant_a';
  elsif p_user_id = v_dare.challenger_id then
    v_viewer_role := 'participant_b';
  elsif v_dare.status in ('active', 'awaiting_result') then
    v_viewer_role := 'spectator';
  else
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  v_room_status := case
    when v_dare.status in ('active', 'awaiting_result') then 'live'
    else 'created'
  end;

  insert into public.live_court_rooms (
    dare_id,
    court_session_id,
    provider,
    provider_room_id,
    status,
    recording_required,
    recording_status,
    started_at,
    recording_started_at,
    metadata
  )
  values (
    v_dare.id,
    v_court.id,
    'provider_pending',
    'dare-' || v_dare.id::text,
    v_room_status,
    true,
    case when v_room_status = 'live' then 'recording' else 'not_started' end,
    case when v_room_status = 'live' then now() else null end,
    case when v_room_status = 'live' then now() else null end,
    jsonb_build_object('resolutionType', v_dare.resolution_type, 'dareType', v_dare.dare_type)
  )
  on conflict on constraint live_court_rooms_dare_id_key do update
    set status = case
          when public.live_court_rooms.status = 'ended' then public.live_court_rooms.status
          else excluded.status
        end,
        recording_status = case
          when public.live_court_rooms.recording_status in ('available', 'processing') then public.live_court_rooms.recording_status
          when excluded.recording_status = 'recording' then 'recording'
          else public.live_court_rooms.recording_status
        end,
        started_at = coalesce(public.live_court_rooms.started_at, excluded.started_at),
        recording_started_at = coalesce(public.live_court_rooms.recording_started_at, excluded.recording_started_at),
        updated_at = now()
  returning * into v_room;

  insert into public.live_court_participants (
    live_court_room_id,
    dare_id,
    user_id,
    role,
    connection_status,
    consented_to_recording,
    consent_text_version,
    consented_at,
    audio_enabled,
    video_enabled,
    joined_at,
    last_seen_at,
    left_at,
    metadata
  )
  values (
    v_room.id,
    v_dare.id,
    p_user_id,
    v_viewer_role,
    'joined',
    p_recording_consent,
    'live-court-consent-v1',
    case when p_recording_consent then now() else null end,
    coalesce(p_audio_enabled, false),
    coalesce(p_video_enabled, false),
    now(),
    now(),
    null,
    jsonb_build_object('entry', 'court')
  )
  on conflict on constraint live_court_participants_live_court_room_id_user_id_key do update
    set role = excluded.role,
        connection_status = 'joined',
        consented_to_recording = excluded.consented_to_recording,
        consent_text_version = excluded.consent_text_version,
        consented_at = case
          when excluded.consented_to_recording then coalesce(public.live_court_participants.consented_at, now())
          else null
        end,
        audio_enabled = excluded.audio_enabled,
        video_enabled = excluded.video_enabled,
        last_seen_at = now(),
        left_at = null,
        updated_at = now();

  return query
    select *
    from public.get_live_court_state_action(p_user_id, p_dare_id);
end;
$$;

revoke all on function public.enter_live_court_action(uuid, uuid, boolean, boolean, boolean)
from public, anon, authenticated, service_role;

grant execute on function public.enter_live_court_action(uuid, uuid, boolean, boolean, boolean)
to service_role;
