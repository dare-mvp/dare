-- ============================================================
-- 0010_views.sql
-- Read-model views for wallet, feed, and court.
-- Views are non-materialized; materialize only if query cost warrants it.
-- ============================================================

-- ── wallet_balance_projection ────────────────────────────────
-- Available balance derived from posted ledger entries.
-- Escrow and pending amounts are NOT included here;
-- use wallet_summary for the full breakdown.
create or replace view wallet_balance_projection
with (security_invoker = true) as
select
  le.wallet_account_id,
  le.user_id,
  le.currency,
  coalesce(sum(
    case when le.direction = 'credit' and le.status = 'posted' then le.amount else 0 end
  ), 0)
  -
  coalesce(sum(
    case when le.direction = 'debit' and le.status = 'posted' then le.amount else 0 end
  ), 0) as available_balance
from ledger_entries le
group by le.wallet_account_id, le.user_id, le.currency;

-- ── wallet_summary ───────────────────────────────────────────
-- Full wallet dashboard for a user: available + escrowed + pending
-- + held/frozen balances. Joins ledger projection with escrow holds
-- and pending withdrawals.
create or replace view wallet_summary
with (security_invoker = true) as
select
  wa.id                         as wallet_account_id,
  wa.user_id,
  wa.currency,
  wa.status                     as account_status,
  -- Available: posted credits minus posted debits
  coalesce(bal.available_balance, 0)  as available_balance,
  -- Escrowed: sum of currently held escrow amounts for active dares
  coalesce(esc_active.escrowed, 0)    as escrowed_balance,
  -- Dispute-frozen: held escrow where a jury case is pending
  coalesce(esc_disputed.held, 0)      as dispute_held_balance,
  -- Pending withdrawal: amounts in withdrawal_pending ledger status
  coalesce(wd.pending_withdrawal, 0)  as pending_withdrawal_balance
from wallet_accounts wa
left join wallet_balance_projection bal
  on bal.wallet_account_id = wa.id
left join (
  select wallet_account_id, sum(amount) as escrowed
  from escrow_holds
  where status = 'held' and hold_reason = 'dare_active'
  group by wallet_account_id
) esc_active on esc_active.wallet_account_id = wa.id
left join (
  select wallet_account_id, sum(amount) as held
  from escrow_holds
  where status = 'held' and hold_reason = 'dispute_pending'
  group by wallet_account_id
) esc_disputed on esc_disputed.wallet_account_id = wa.id
left join (
  select wallet_account_id, sum(amount) as pending_withdrawal
  from ledger_entries
  where type = 'withdrawal_pending' and status = 'pending'
  group by wallet_account_id
) wd on wd.wallet_account_id = wa.id;

-- ── public_dare_feed ─────────────────────────────────────────
-- Safe read model for the main feed. Excludes internal risk data,
-- full constitution for targeted DAREs, and private participant data.
create or replace view public_dare_feed
with (security_invoker = true) as
select
  d.id,
  d.title,
  d.category,
  d.resolution_type,
  d.status,
  d.stake_amount,
  d.currency,
  d.duration_seconds,
  d.created_at,
  d.expires_at,
  d.started_at,
  d.completed_at,
  -- Issuer public fields
  ip.username          as issuer_username,
  ip.avatar_emoji      as issuer_avatar_emoji,
  ip.avatar_color      as issuer_avatar_color,
  ip.trust_score       as issuer_trust_score,
  ip.tier              as issuer_tier,
  -- Challenger public fields (null when open)
  cp.username          as challenger_username,
  cp.avatar_emoji      as challenger_avatar_emoji,
  cp.avatar_color      as challenger_avatar_color,
  cp.trust_score       as challenger_trust_score,
  -- Winner public field (null until settled)
  wp.username          as winner_username,
  -- Court live counters (null until court session created)
  cs.score_a,
  cs.score_b,
  cs.votes_a,
  cs.votes_b,
  cs.phase             as court_phase
from dares d
join profiles ip on ip.id = d.issuer_id
left join profiles cp on cp.id = d.challenger_id
left join profiles wp on wp.id = d.winner_id
left join court_sessions cs on cs.dare_id = d.id
where d.status in ('open','active','completed','settled')
  and ip.account_status = 'active';

-- ── active_court_public_state ────────────────────────────────
-- Spectator-safe Court state for live viewing.
-- Does not expose answer correctness, private heartbeat signals,
-- or hidden evidence during an active match.
create or replace view active_court_public_state
with (security_invoker = true) as
select
  d.id                  as dare_id,
  d.title,
  d.category,
  d.status              as dare_status,
  cs.phase              as court_phase,
  cs.server_start_time,
  cs.server_end_time,
  cs.score_a,
  cs.score_b,
  cs.votes_a,
  cs.votes_b,
  -- Player A = issuer
  ip.username           as player_a_username,
  ip.avatar_emoji       as player_a_avatar_emoji,
  ip.avatar_color       as player_a_avatar_color,
  ip.tier               as player_a_tier,
  cs.player_a_ready,
  -- Player B = challenger
  cp.username           as player_b_username,
  cp.avatar_emoji       as player_b_avatar_emoji,
  cp.avatar_color       as player_b_avatar_color,
  cp.tier               as player_b_tier,
  cs.player_b_ready,
  d.duration_seconds,
  d.stake_amount,
  d.currency
from court_sessions cs
join dares d on d.id = cs.dare_id
join profiles ip on ip.id = d.issuer_id
left join profiles cp on cp.id = d.challenger_id
where cs.phase in ('ready_check','countdown','active','awaiting_result');
