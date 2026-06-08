-- No-op history alignment migration.
-- The preceding migration was made rerunnable after an interrupted push had
-- already created public.court_witness_attendance on the remote database.
-- Align witnessed attendance schema after the first remote apply and remove a duplicate index.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'court_witness_attendance'
      and column_name = 'user_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'court_witness_attendance'
      and column_name = 'witness_user_id'
  ) then
    alter table public.court_witness_attendance
      rename column user_id to witness_user_id;
  end if;
end $$;

alter table public.court_witness_attendance
  add column if not exists status text not null default 'present';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'court_witness_attendance_status_valid'
      and conrelid = 'public.court_witness_attendance'::regclass
  ) then
    alter table public.court_witness_attendance
      add constraint court_witness_attendance_status_valid
      check (status in ('present', 'left'));
  end if;
end $$;

drop index if exists public.court_witness_attendance_dare_witness_uidx;
drop index if exists public.court_witness_attendance_witness_idx;

create index if not exists court_witness_attendance_user_seen_idx
  on public.court_witness_attendance (witness_user_id, last_seen_at desc);

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
  on conflict (dare_id, witness_user_id) do update
    set court_session_id = excluded.court_session_id,
        last_seen_at = now(),
        status = 'present'
  returning * into v_attendance;

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

create or replace function public.submit_witness_vote_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_vote text
)
returns table (
  vote_id uuid,
  dare_id uuid,
  voter_id uuid,
  vote text,
  votes_a integer,
  votes_b integer,
  phase text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare public.dares%rowtype;
  v_court public.court_sessions%rowtype;
  v_attendance public.court_witness_attendance%rowtype;
  v_vote_id uuid := gen_random_uuid();
begin
  if p_vote not in ('A', 'B') then
    raise exception 'invalid_witness_vote' using errcode = 'P0001';
  end if;

  select * into v_dare
  from public.dares
  where id = p_dare_id
  for update;

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

  select * into v_court
  from public.court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_court.phase not in ('active', 'awaiting_result') then
    raise exception 'invalid_court_phase' using errcode = 'P0001';
  end if;

  select * into v_attendance
  from public.court_witness_attendance cwa
  where cwa.dare_id = p_dare_id
    and cwa.court_session_id = v_court.id
    and cwa.witness_user_id = p_user_id
  for update;

  if not found then
    raise exception 'witness_attendance_required' using errcode = 'P0001';
  end if;

  if v_attendance.last_seen_at < now() - interval '90 seconds'
    or now() < v_attendance.vote_eligible_at
    or v_attendance.status <> 'present' then
    raise exception 'witness_attendance_not_eligible' using errcode = 'P0001';
  end if;

  insert into public.dare_votes (id, dare_id, voter_id, vote)
  values (v_vote_id, p_dare_id, p_user_id, p_vote);

  update public.court_sessions
    set votes_a = votes_a + case when p_vote = 'A' then 1 else 0 end,
        votes_b = votes_b + case when p_vote = 'B' then 1 else 0 end,
        phase = case when phase = 'active' then 'awaiting_result' else phase end
  where id = v_court.id
  returning * into v_court;

  update public.dares
    set status = case when status = 'active' then 'awaiting_result' else status end
  where id = v_dare.id
  returning * into v_dare;

  insert into public.dare_court_events (
    dare_id,
    court_session_id,
    actor_user_id,
    event_type,
    payload
  )
  values (
    p_dare_id,
    v_court.id,
    p_user_id,
    'witness_vote',
    jsonb_build_object('vote', p_vote)
  );

  vote_id := v_vote_id;
  dare_id := p_dare_id;
  voter_id := p_user_id;
  vote := p_vote;
  votes_a := v_court.votes_a;
  votes_b := v_court.votes_b;
  phase := v_court.phase;
  return next;
exception
  when unique_violation then
    raise exception 'witness_vote_already_submitted' using errcode = 'P0001';
end;
$$;

revoke all on function public.record_witness_attendance_action(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.record_witness_attendance_action(uuid, uuid)
  to service_role;

revoke all on function public.submit_witness_vote_action(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.submit_witness_vote_action(uuid, uuid, text)
  to service_role;
