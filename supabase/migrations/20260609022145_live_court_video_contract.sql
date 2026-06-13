create table if not exists public.live_court_rooms (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references public.dares(id) on delete cascade,
  court_session_id uuid not null references public.court_sessions(id) on delete cascade,
  provider text not null default 'provider_pending',
  provider_room_id text not null,
  status text not null default 'created',
  audience_enabled boolean not null default true,
  recording_required boolean not null default true,
  recording_status text not null default 'not_started',
  recording_started_at timestamptz,
  recording_ended_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (dare_id),
  unique (court_session_id),
  unique (provider, provider_room_id),
  constraint live_court_rooms_provider_valid
    check (provider in ('provider_pending', 'livekit', 'daily', 'agora', 'mux', 'custom')),
  constraint live_court_rooms_status_valid
    check (status in ('created', 'live', 'ended', 'cancelled')),
  constraint live_court_rooms_recording_status_valid
    check (recording_status in ('not_started', 'recording', 'processing', 'available', 'failed', 'disabled'))
);

create index if not exists live_court_rooms_status_idx
  on public.live_court_rooms (status, updated_at desc);

create table if not exists public.live_court_participants (
  id uuid primary key default gen_random_uuid(),
  live_court_room_id uuid not null references public.live_court_rooms(id) on delete cascade,
  dare_id uuid not null references public.dares(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  connection_status text not null default 'joined',
  consented_to_recording boolean not null default false,
  consent_text_version text not null default 'live-court-consent-v1',
  consented_at timestamptz,
  audio_enabled boolean not null default false,
  video_enabled boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (live_court_room_id, user_id),
  constraint live_court_participants_role_valid
    check (role in ('participant_a', 'participant_b', 'spectator')),
  constraint live_court_participants_connection_valid
    check (connection_status in ('joined', 'reconnecting', 'left'))
);

create index if not exists live_court_participants_dare_role_idx
  on public.live_court_participants (dare_id, role, connection_status);

create index if not exists live_court_participants_user_idx
  on public.live_court_participants (user_id, last_seen_at desc);

create table if not exists public.live_court_recordings (
  id uuid primary key default gen_random_uuid(),
  live_court_room_id uuid not null references public.live_court_rooms(id) on delete cascade,
  dare_id uuid not null references public.dares(id) on delete cascade,
  provider text not null default 'provider_pending',
  provider_recording_id text,
  evidence_object_id uuid references public.evidence_objects(id) on delete set null,
  storage_bucket text,
  storage_path text,
  status text not null default 'requested',
  started_at timestamptz,
  ended_at timestamptz,
  retention_expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint live_court_recordings_provider_valid
    check (provider in ('provider_pending', 'livekit', 'daily', 'agora', 'mux', 'custom')),
  constraint live_court_recordings_status_valid
    check (status in ('requested', 'recording', 'processing', 'available', 'failed', 'deleted'))
);

create index if not exists live_court_recordings_dare_idx
  on public.live_court_recordings (dare_id, created_at desc);

create table if not exists public.live_court_provider_events (
  id uuid primary key default gen_random_uuid(),
  live_court_room_id uuid references public.live_court_rooms(id) on delete cascade,
  dare_id uuid not null references public.dares(id) on delete cascade,
  provider text not null default 'provider_pending',
  provider_event_id text,
  event_type text not null,
  payload jsonb not null default '{}',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint live_court_provider_events_provider_valid
    check (provider in ('provider_pending', 'livekit', 'daily', 'agora', 'mux', 'custom'))
);

create unique index if not exists live_court_provider_events_unique_provider_event_idx
  on public.live_court_provider_events (provider, provider_event_id)
  where provider_event_id is not null;

create index if not exists live_court_provider_events_dare_idx
  on public.live_court_provider_events (dare_id, received_at desc);

alter table public.live_court_rooms enable row level security;
alter table public.live_court_participants enable row level security;
alter table public.live_court_recordings enable row level security;
alter table public.live_court_provider_events enable row level security;

revoke all on public.live_court_rooms from public, anon, authenticated;
revoke all on public.live_court_participants from public, anon, authenticated;
revoke all on public.live_court_recordings from public, anon, authenticated;
revoke all on public.live_court_provider_events from public, anon, authenticated;

grant select, insert, update on public.live_court_rooms to service_role;
grant select, insert, update on public.live_court_participants to service_role;
grant select, insert, update on public.live_court_recordings to service_role;
grant select, insert, update on public.live_court_provider_events to service_role;

create or replace function public.live_court_requirement_met(p_dare_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.dares d
    join public.live_court_rooms lcr on lcr.dare_id = d.id
    join public.live_court_participants issuer_participant
      on issuer_participant.live_court_room_id = lcr.id
      and issuer_participant.user_id = d.issuer_id
      and issuer_participant.role = 'participant_a'
      and issuer_participant.connection_status in ('joined', 'reconnecting')
      and issuer_participant.consented_to_recording = true
      and issuer_participant.video_enabled = true
    join public.live_court_participants challenger_participant
      on challenger_participant.live_court_room_id = lcr.id
      and challenger_participant.user_id = d.challenger_id
      and challenger_participant.role = 'participant_b'
      and challenger_participant.connection_status in ('joined', 'reconnecting')
      and challenger_participant.consented_to_recording = true
      and challenger_participant.video_enabled = true
    where d.id = p_dare_id
      and d.challenger_id is not null
      and lcr.status in ('created', 'live', 'ended')
  );
$$;

revoke all on function public.live_court_requirement_met(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.live_court_requirement_met(uuid)
to service_role;

create or replace function public.get_live_court_state_action(
  p_user_id uuid,
  p_dare_id uuid
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
begin
  select * into v_dare
  from public.dares
  where id = p_dare_id;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if p_user_id = v_dare.issuer_id then
    v_viewer_role := 'participant_a';
  elsif p_user_id = v_dare.challenger_id then
    v_viewer_role := 'participant_b';
  elsif v_dare.status in ('active', 'awaiting_result', 'completed', 'dispute_pending', 'jury_open', 'settlement_pending', 'settled') then
    v_viewer_role := 'spectator';
  else
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  select * into v_room
  from public.live_court_rooms lcr
  where lcr.dare_id = p_dare_id;

  if not found then
    live_court_room_id := null;
    dare_id := v_dare.id;
    court_session_id := v_court.id;
    provider := 'provider_pending';
    provider_room_id := 'dare-' || v_dare.id::text;
    provider_token := null;
    viewer_role := v_viewer_role;
    room_status := 'created';
    recording_required := true;
    recording_status := 'not_started';
    participant_count := 0;
    spectator_count := 0;
    issuer_live := false;
    challenger_live := false;
    viewer_joined := false;
    live_requirement_met := false;
    return next;
    return;
  end if;

  live_court_room_id := v_room.id;
  dare_id := v_room.dare_id;
  court_session_id := v_room.court_session_id;
  provider := v_room.provider;
  provider_room_id := v_room.provider_room_id;
  provider_token := null;
  viewer_role := v_viewer_role;
  room_status := v_room.status;
  recording_required := v_room.recording_required;
  recording_status := v_room.recording_status;
  select count(*)::integer into participant_count
    from public.live_court_participants lcp
    where lcp.live_court_room_id = v_room.id
      and lcp.role in ('participant_a', 'participant_b')
      and lcp.connection_status in ('joined', 'reconnecting');
  select count(*)::integer into spectator_count
    from public.live_court_participants lcp
    where lcp.live_court_room_id = v_room.id
      and lcp.role = 'spectator'
      and lcp.connection_status in ('joined', 'reconnecting');
  issuer_live := exists (
    select 1 from public.live_court_participants lcp
    where lcp.live_court_room_id = v_room.id
      and lcp.role = 'participant_a'
      and lcp.connection_status in ('joined', 'reconnecting')
      and lcp.consented_to_recording
      and lcp.video_enabled
  );
  challenger_live := exists (
    select 1 from public.live_court_participants lcp
    where lcp.live_court_room_id = v_room.id
      and lcp.role = 'participant_b'
      and lcp.connection_status in ('joined', 'reconnecting')
      and lcp.consented_to_recording
      and lcp.video_enabled
  );
  viewer_joined := exists (
    select 1 from public.live_court_participants lcp
    where lcp.live_court_room_id = v_room.id
      and lcp.user_id = p_user_id
      and lcp.connection_status in ('joined', 'reconnecting')
  );
  live_requirement_met := public.live_court_requirement_met(p_dare_id);
  return next;
end;
$$;

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
    case when v_dare.resolution_type = 'evidence' then 'recording' else 'not_started' end,
    case when v_room_status = 'live' then now() else null end,
    case when v_dare.resolution_type = 'evidence' and v_room_status = 'live' then now() else null end,
    jsonb_build_object('resolutionType', v_dare.resolution_type, 'dareType', v_dare.dare_type)
  )
  on conflict (dare_id) do update
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
  on conflict (live_court_room_id, user_id) do update
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

create or replace function public.record_live_court_presence_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_connection_status text default 'joined',
  p_recording_consent boolean default true,
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
  v_room public.live_court_rooms%rowtype;
begin
  if p_connection_status not in ('joined', 'reconnecting', 'left') then
    raise exception 'invalid_live_court_state' using errcode = 'P0001';
  end if;

  select * into v_room
  from public.live_court_rooms lcr
  where lcr.dare_id = p_dare_id;

  if not found then
    raise exception 'live_court_required' using errcode = 'P0001';
  end if;

  update public.live_court_participants lcp
    set connection_status = p_connection_status,
        consented_to_recording = p_recording_consent,
        consented_at = case
          when p_recording_consent then coalesce(lcp.consented_at, now())
          else null
        end,
        audio_enabled = p_audio_enabled,
        video_enabled = p_video_enabled,
        last_seen_at = now(),
        left_at = case when p_connection_status = 'left' then now() else null end,
        updated_at = now()
  where lcp.live_court_room_id = v_room.id
    and lcp.user_id = p_user_id;

  if not found then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  return query
    select *
    from public.get_live_court_state_action(p_user_id, p_dare_id);
end;
$$;

revoke all on function public.get_live_court_state_action(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function public.enter_live_court_action(uuid, uuid, boolean, boolean, boolean)
from public, anon, authenticated, service_role;
revoke all on function public.record_live_court_presence_action(uuid, uuid, text, boolean, boolean, boolean)
from public, anon, authenticated, service_role;

grant execute on function public.get_live_court_state_action(uuid, uuid)
to service_role;
grant execute on function public.enter_live_court_action(uuid, uuid, boolean, boolean, boolean)
to service_role;
grant execute on function public.record_live_court_presence_action(uuid, uuid, text, boolean, boolean, boolean)
to service_role;

create or replace function public.require_live_court_requirement(p_dare_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.live_court_requirement_met(p_dare_id) then
    raise exception 'live_court_required' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.require_live_court_requirement(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.require_live_court_requirement(uuid)
to service_role;

create or replace function public.enforce_live_court_before_answer_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_live_court_requirement(new.dare_id);
  return new;
end;
$$;

drop trigger if exists trg_dare_answer_submissions_live_required on public.dare_answer_submissions;
create trigger trg_dare_answer_submissions_live_required
  before insert on public.dare_answer_submissions
  for each row execute function public.enforce_live_court_before_answer_submission();

create or replace function public.enforce_live_court_before_result_claim()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_live_court_requirement(new.dare_id);
  return new;
end;
$$;

drop trigger if exists trg_dare_result_claims_live_required on public.dare_result_claims;
create trigger trg_dare_result_claims_live_required
  before insert on public.dare_result_claims
  for each row execute function public.enforce_live_court_before_result_claim();

create or replace function public.enforce_live_court_before_dare_completion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed'
    and old.status in ('active', 'awaiting_result')
    and new.winner_id is not null then
    perform public.require_live_court_requirement(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_dares_live_completion_required on public.dares;
create trigger trg_dares_live_completion_required
  before update of status on public.dares
  for each row execute function public.enforce_live_court_before_dare_completion();

revoke all on function public.enforce_live_court_before_answer_submission()
from public, anon, authenticated, service_role;
revoke all on function public.enforce_live_court_before_result_claim()
from public, anon, authenticated, service_role;
revoke all on function public.enforce_live_court_before_dare_completion()
from public, anon, authenticated, service_role;
