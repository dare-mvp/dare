-- Production DARE model:
-- - Skill-Based DAREs use two-sided stake escrow.
-- - Task-Based DAREs use Darer-funded reward escrow.
-- - Resolution is independent: answer_key, witnessed, or evidence.
-- - Legacy quiz tables remain scaffolding; new writes use
--   creator-authored prompt, answer-key, result-claim, and Court-event tables.

alter table public.dares
  add column if not exists dare_type text not null default 'skill',
  add column if not exists funding_model text not null default 'two_sided_stake',
  add column if not exists reward_amount integer not null default 0;

alter table public.dares
  drop constraint if exists dares_stake_positive,
  drop constraint if exists dares_dare_type_valid,
  drop constraint if exists dares_funding_model_valid,
  drop constraint if exists dares_funding_model_matches_type;

alter table public.dares
  add constraint dares_stake_nonnegative
    check (stake_amount >= 0),
  add constraint dares_reward_nonnegative
    check (reward_amount >= 0),
  add constraint dares_dare_type_valid
    check (dare_type in ('skill', 'task')),
  add constraint dares_funding_model_valid
    check (funding_model in ('two_sided_stake', 'darer_reward')),
  add constraint dares_funding_model_matches_type
    check (
      (
        dare_type = 'skill'
        and funding_model = 'two_sided_stake'
        and stake_amount > 0
        and reward_amount = 0
      )
      or
      (
        dare_type = 'task'
        and funding_model = 'darer_reward'
        and stake_amount = 0
        and reward_amount > 0
      )
    );

create index if not exists dares_type_status_created_idx
  on public.dares (dare_type, status, created_at desc);

create index if not exists dares_resolution_status_created_idx
  on public.dares (resolution_type, status, created_at desc);

create table if not exists public.dare_prompts (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references public.dares(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  prompt text not null,
  answer_format text not null default 'short_text',
  response_options jsonb,
  position smallint not null default 0,
  committed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  unique (dare_id, position),
  constraint dare_prompts_prompt_len
    check (char_length(prompt) between 5 and 1000),
  constraint dare_prompts_answer_format_valid
    check (answer_format in ('short_text', 'number', 'choice', 'rules_based')),
  constraint dare_prompts_response_options_valid
    check (
      response_options is null
      or (
        jsonb_typeof(response_options) = 'array'
        and jsonb_array_length(response_options) between 2 and 8
      )
    ),
  constraint dare_prompts_position_nonnegative
    check (position >= 0)
);

create index if not exists dare_prompts_dare_position_idx
  on public.dare_prompts (dare_id, position);

create table if not exists public.dare_answer_keys (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null unique references public.dare_prompts(id) on delete cascade,
  dare_id uuid not null references public.dares(id) on delete cascade,
  answer_hash text not null,
  answer_salt text not null,
  answer_rules text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint dare_answer_keys_hash_len
    check (char_length(answer_hash) = 64),
  constraint dare_answer_keys_salt_len
    check (char_length(answer_salt) >= 16),
  constraint dare_answer_keys_rules_len
    check (answer_rules is null or char_length(answer_rules) <= 1000)
);

create index if not exists dare_answer_keys_dare_id_idx
  on public.dare_answer_keys (dare_id);

create table if not exists public.dare_answer_submissions (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references public.dares(id) on delete cascade,
  prompt_id uuid not null references public.dare_prompts(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  submitted_answer text not null,
  submitted_answer_hash text not null,
  matched boolean,
  response_ms integer,
  created_at timestamptz not null default now(),

  unique (prompt_id, user_id),
  constraint dare_answer_submissions_answer_len
    check (char_length(submitted_answer) between 1 and 2000),
  constraint dare_answer_submissions_hash_len
    check (char_length(submitted_answer_hash) = 64),
  constraint dare_answer_submissions_response_ms_valid
    check (response_ms is null or response_ms >= 0)
);

create index if not exists dare_answer_submissions_dare_user_idx
  on public.dare_answer_submissions (dare_id, user_id);

create table if not exists public.dare_result_claims (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references public.dares(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  claimed_outcome text not null,
  claimed_winner_id uuid references public.profiles(id) on delete restrict,
  rationale text,
  evidence_object_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),

  unique (dare_id, user_id),
  constraint dare_result_claims_outcome_valid
    check (claimed_outcome in ('issuer_won', 'challenger_won', 'performer_completed', 'void', 'dispute')),
  constraint dare_result_claims_rationale_len
    check (rationale is null or char_length(rationale) <= 2000)
);

create index if not exists dare_result_claims_dare_idx
  on public.dare_result_claims (dare_id);

create table if not exists public.dare_court_events (
  id uuid primary key default gen_random_uuid(),
  dare_id uuid not null references public.dares(id) on delete cascade,
  court_session_id uuid references public.court_sessions(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now(),

  constraint dare_court_events_type_valid
    check (event_type in (
      'court_ready',
      'court_started',
      'answer_submitted',
      'witness_vote',
      'result_claim',
      'evidence_submitted',
      'court_completed'
    ))
);

create index if not exists dare_court_events_dare_created_idx
  on public.dare_court_events (dare_id, created_at desc);

alter table public.dare_prompts enable row level security;
alter table public.dare_answer_keys enable row level security;
alter table public.dare_answer_submissions enable row level security;
alter table public.dare_result_claims enable row level security;
alter table public.dare_court_events enable row level security;

drop policy if exists "dare_prompts_participant_read" on public.dare_prompts;
create policy "dare_prompts_participant_read"
  on public.dare_prompts for select
  to authenticated
  using (
    exists (
      select 1
      from public.dares d
      where d.id = dare_prompts.dare_id
        and ((select auth.uid()) = d.issuer_id or (select auth.uid()) = d.challenger_id)
    )
  );

drop policy if exists "dare_answer_submissions_own_read" on public.dare_answer_submissions;
create policy "dare_answer_submissions_own_read"
  on public.dare_answer_submissions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "dare_result_claims_participant_read" on public.dare_result_claims;
create policy "dare_result_claims_participant_read"
  on public.dare_result_claims for select
  to authenticated
  using (
    exists (
      select 1
      from public.dares d
      where d.id = dare_result_claims.dare_id
        and ((select auth.uid()) = d.issuer_id or (select auth.uid()) = d.challenger_id)
    )
  );

drop policy if exists "dare_court_events_participant_read" on public.dare_court_events;
create policy "dare_court_events_participant_read"
  on public.dare_court_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.dares d
      where d.id = dare_court_events.dare_id
        and ((select auth.uid()) = d.issuer_id or (select auth.uid()) = d.challenger_id)
    )
  );

grant select on public.dare_prompts to authenticated;
grant select on public.dare_answer_submissions to authenticated;
grant select on public.dare_result_claims to authenticated;
grant select on public.dare_court_events to authenticated;

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
join public.profiles ip on ip.id = d.issuer_id
left join public.profiles cp on cp.id = d.challenger_id
left join public.profiles wp on wp.id = d.winner_id
left join public.court_sessions cs on cs.dare_id = d.id
where d.status in ('open','active','completed','settled')
  and ip.account_status = 'active';

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
join public.profiles ip on ip.id = d.issuer_id
left join public.profiles cp on cp.id = d.challenger_id
where cs.phase in ('ready_check','countdown','active','awaiting_result');

