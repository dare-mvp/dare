drop view if exists public.public_active_players;

create or replace view public.public_active_players
with (security_invoker = true) as
with player_events as (
  select
    d.issuer_id as user_id,
    d.category,
    d.status,
    greatest(
      d.created_at,
      coalesce(d.started_at, d.created_at),
      coalesce(d.completed_at, d.created_at)
    ) as activity_at
  from public.dares d
  where d.status not in ('cancelled', 'expired')

  union all

  select
    d.challenger_id as user_id,
    d.category,
    d.status,
    greatest(
      d.created_at,
      coalesce(d.started_at, d.created_at),
      coalesce(d.completed_at, d.created_at)
    ) as activity_at
  from public.dares d
  where d.challenger_id is not null
    and d.status not in ('cancelled', 'expired')
),
activity as (
  select
    pe.user_id,
    count(*) filter (where pe.activity_at >= now() - interval '30 days')::integer as recent_dares,
    count(*) filter (
      where pe.status in ('completed', 'settlement_pending', 'settled')
    )::integer as completed_dares,
    max(pe.activity_at) as last_active_at
  from player_events pe
  group by pe.user_id
),
category_rank as (
  select
    pe.user_id,
    pe.category,
    row_number() over (
      partition by pe.user_id
      order by count(*) desc, max(pe.activity_at) desc, pe.category asc
    ) as rank
  from player_events pe
  group by pe.user_id, pe.category
)
select
  pc.user_id,
  pc.username,
  pc.avatar_emoji,
  pc.avatar_color,
  pc.trust_score,
  pc.tier,
  coalesce(a.recent_dares, 0) as recent_dares,
  coalesce(a.completed_dares, 0) as completed_dares,
  a.last_active_at,
  cr.category as top_category,
  (
    pc.trust_score
    + coalesce(a.recent_dares, 0) * 5
    + coalesce(a.completed_dares, 0) * 2
  )::integer as ranking_score
from public.profile_public_cards pc
left join activity a on a.user_id = pc.user_id
left join category_rank cr on cr.user_id = pc.user_id and cr.rank = 1
where coalesce(a.recent_dares, 0) > 0
   or coalesce(a.completed_dares, 0) > 0
   or pc.trust_score > 0;

revoke all on public.public_active_players from public, anon, authenticated;
grant select on public.public_active_players to anon, authenticated;
