create or replace function public.profile_public_cards()
returns table (
  user_id uuid,
  username text,
  avatar_emoji text,
  avatar_color text,
  trust_score integer,
  tier text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    p.id as user_id,
    p.username::text as username,
    p.avatar_emoji,
    p.avatar_color,
    p.trust_score,
    p.tier
  from public.profiles p
  where p.account_status = 'active';
$$;

revoke all on function public.profile_public_cards() from public, anon, authenticated;
grant execute on function public.profile_public_cards() to anon, authenticated, service_role;

drop view if exists public.public_dare_feed;
create or replace view public.public_dare_feed
with (security_invoker = true) as
with profile_cards as (
  select * from public.profile_public_cards()
)
select
  d.id,
  d.title,
  d.category,
  d.dare_type,
  d.funding_model,
  d.resolution_type,
  d.status,
  d.stake_amount,
  d.reward_amount,
  d.currency,
  d.duration_seconds,
  d.created_at,
  d.expires_at,
  d.started_at,
  d.completed_at,
  ip.username          as issuer_username,
  ip.avatar_emoji      as issuer_avatar_emoji,
  ip.avatar_color      as issuer_avatar_color,
  ip.trust_score       as issuer_trust_score,
  ip.tier              as issuer_tier,
  cp.username          as challenger_username,
  cp.avatar_emoji      as challenger_avatar_emoji,
  cp.avatar_color      as challenger_avatar_color,
  cp.trust_score       as challenger_trust_score,
  wp.username          as winner_username,
  cs.score_a,
  cs.score_b,
  cs.votes_a,
  cs.votes_b,
  cs.phase             as court_phase
from public.dares d
join profile_cards ip on ip.user_id = d.issuer_id
left join profile_cards cp on cp.user_id = d.challenger_id
left join profile_cards wp on wp.user_id = d.winner_id
left join public.court_sessions cs on cs.dare_id = d.id
where d.status in (
  'open',
  'active',
  'completed',
  'dispute_pending',
  'jury_open',
  'settlement_pending',
  'settled'
);

drop view if exists public.active_court_public_state;
create or replace view public.active_court_public_state
with (security_invoker = true) as
with profile_cards as (
  select * from public.profile_public_cards()
)
select
  d.id                  as dare_id,
  d.title,
  d.category,
  d.dare_type,
  d.funding_model,
  d.resolution_type,
  d.status              as dare_status,
  cs.phase              as court_phase,
  cs.server_start_time,
  cs.server_end_time,
  cs.score_a,
  cs.score_b,
  cs.votes_a,
  cs.votes_b,
  ip.username           as player_a_username,
  ip.avatar_emoji       as player_a_avatar_emoji,
  ip.avatar_color       as player_a_avatar_color,
  ip.tier               as player_a_tier,
  cs.player_a_ready,
  cp.username           as player_b_username,
  cp.avatar_emoji       as player_b_avatar_emoji,
  cp.avatar_color       as player_b_avatar_color,
  cp.tier               as player_b_tier,
  cs.player_b_ready,
  d.duration_seconds,
  d.stake_amount,
  d.reward_amount,
  d.currency
from public.court_sessions cs
join public.dares d on d.id = cs.dare_id
join profile_cards ip on ip.user_id = d.issuer_id
left join profile_cards cp on cp.user_id = d.challenger_id
where cs.phase in (
  'ready_check',
  'countdown',
  'active',
  'awaiting_result',
  'disputed',
  'settlement_pending',
  'settled'
);

grant select on public.public_dare_feed to anon, authenticated;
grant select on public.active_court_public_state to anon, authenticated;
