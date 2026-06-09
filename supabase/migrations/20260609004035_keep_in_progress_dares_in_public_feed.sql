create or replace view public.public_dare_feed
with (security_invoker = true) as
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
  cs.phase             as court_phase,
  d.description,
  dc.rules
from public.dares d
join public.profile_public_cards ip on ip.user_id = d.issuer_id
left join public.profile_public_cards cp on cp.user_id = d.challenger_id
left join public.profile_public_cards wp on wp.user_id = d.winner_id
left join public.court_sessions cs on cs.dare_id = d.id
left join public.dare_constitutions dc on dc.id = d.constitution_id
where d.status in (
  'open',
  'targeted_pending',
  'ready_check',
  'active',
  'completed',
  'dispute_pending',
  'jury_open',
  'settlement_pending'
);

revoke all on public.public_dare_feed from public, anon, authenticated;
grant select on public.public_dare_feed to anon, authenticated;
