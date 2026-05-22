-- ============================================================
-- forfeit_dare_rpc.sql
-- Mark active DARE forfeits and hand off to settlement.
-- ============================================================

create or replace function public.forfeit_dare_action(
  p_actor_user_id uuid,
  p_dare_id uuid
)
returns table (
  dare_id uuid,
  status text,
  forfeiter_id uuid,
  winner_id uuid,
  court_phase text,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_winner_id uuid;
  v_resulting_score integer;
begin
  select *
    into v_dare
  from dares d
  where d.id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_actor_user_id <> v_dare.issuer_id and p_actor_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  if v_dare.status = 'forfeited' then
    select *
      into v_court
    from court_sessions cs
    where cs.dare_id = p_dare_id;

    dare_id := v_dare.id;
    status := v_dare.status;
    forfeiter_id := p_actor_user_id;
    winner_id := v_dare.winner_id;
    court_phase := coalesce(v_court.phase, 'forfeited');
    completed_at := v_dare.completed_at;
    return next;
    return;
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

  v_winner_id := case
    when p_actor_user_id = v_dare.issuer_id then v_dare.challenger_id
    else v_dare.issuer_id
  end;

  update court_sessions cs
    set phase = 'forfeited',
        server_end_time = coalesce(cs.server_end_time, now())
  where cs.id = v_court.id
  returning * into v_court;

  update dares d
    set status = 'forfeited',
        winner_id = v_winner_id,
        completed_at = coalesce(d.completed_at, now()),
        dispute_deadline_at = now()
  where d.id = p_dare_id
  returning * into v_dare;

  update profiles p
    set trust_score = greatest(0, p.trust_score - 10)
  where p.id = p_actor_user_id
  returning p.trust_score into v_resulting_score;

  insert into trust_events (
    user_id,
    event_type,
    delta,
    resulting_score,
    dare_id
  )
  values (
    p_actor_user_id,
    'dare_forfeit',
    -10,
    v_resulting_score,
    p_dare_id
  );

  dare_id := v_dare.id;
  status := v_dare.status;
  forfeiter_id := p_actor_user_id;
  winner_id := v_dare.winner_id;
  court_phase := v_court.phase;
  completed_at := v_dare.completed_at;
  return next;
end;
$$;

revoke all on function public.forfeit_dare_action(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.forfeit_dare_action(uuid, uuid)
to service_role;
