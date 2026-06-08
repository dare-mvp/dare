create table if not exists public.profile_public_cards (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  username text not null,
  avatar_emoji text,
  avatar_color text,
  trust_score integer not null,
  tier text not null,
  updated_at timestamptz not null default now()
);

alter table public.profile_public_cards enable row level security;

drop policy if exists "profile_public_cards_any_read" on public.profile_public_cards;
create policy "profile_public_cards_any_read"
  on public.profile_public_cards
  for select
  to anon, authenticated
  using (true);

revoke all on public.profile_public_cards from public, anon, authenticated;
grant select on public.profile_public_cards to anon, authenticated;

insert into public.profile_public_cards (
  user_id,
  username,
  avatar_emoji,
  avatar_color,
  trust_score,
  tier,
  updated_at
)
select
  p.id,
  p.username::text,
  p.avatar_emoji,
  p.avatar_color,
  p.trust_score,
  p.tier,
  now()
from public.profiles p
where p.account_status = 'active'
on conflict (user_id) do update set
  username = excluded.username,
  avatar_emoji = excluded.avatar_emoji,
  avatar_color = excluded.avatar_color,
  trust_score = excluded.trust_score,
  tier = excluded.tier,
  updated_at = now();

delete from public.profile_public_cards card
where not exists (
  select 1
  from public.profiles p
  where p.id = card.user_id
    and p.account_status = 'active'
);

create or replace function public.sync_profile_public_card()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.profile_public_cards where user_id = old.id;
    return old;
  end if;

  if new.account_status = 'active' then
    insert into public.profile_public_cards (
      user_id,
      username,
      avatar_emoji,
      avatar_color,
      trust_score,
      tier,
      updated_at
    )
    values (
      new.id,
      new.username::text,
      new.avatar_emoji,
      new.avatar_color,
      new.trust_score,
      new.tier,
      now()
    )
    on conflict (user_id) do update set
      username = excluded.username,
      avatar_emoji = excluded.avatar_emoji,
      avatar_color = excluded.avatar_color,
      trust_score = excluded.trust_score,
      tier = excluded.tier,
      updated_at = now();
  else
    delete from public.profile_public_cards where user_id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_profile_public_card() from public, anon, authenticated;

drop trigger if exists trg_profiles_sync_public_card on public.profiles;
create trigger trg_profiles_sync_public_card
  after insert or update of
    username,
    avatar_emoji,
    avatar_color,
    trust_score,
    tier,
    account_status
    or delete
  on public.profiles
  for each row
  execute function public.sync_profile_public_card();

drop view if exists public.public_dare_feed;
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
  cs.phase             as court_phase
from public.dares d
join public.profile_public_cards ip on ip.user_id = d.issuer_id
left join public.profile_public_cards cp on cp.user_id = d.challenger_id
left join public.profile_public_cards wp on wp.user_id = d.winner_id
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
join public.profile_public_cards ip on ip.user_id = d.issuer_id
left join public.profile_public_cards cp on cp.user_id = d.challenger_id
where cs.phase in (
  'ready_check',
  'countdown',
  'active',
  'awaiting_result',
  'disputed',
  'settlement_pending',
  'settled'
);

revoke all on public.public_dare_feed from public, anon, authenticated;
revoke all on public.active_court_public_state from public, anon, authenticated;
grant select on public.public_dare_feed to anon, authenticated;
grant select on public.active_court_public_state to anon, authenticated;

drop function if exists public.profile_public_cards();
