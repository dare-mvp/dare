-- ============================================================
-- 0005_court_and_quiz.sql
-- Live court sessions, chat, quiz question bank,
-- question round assignments, and player answers.
--
-- Applied gaps:
--   GAP-01  court_sessions.votes_a/b and score_a/b denormalized counters
--   GAP-02  dare_quiz_rounds — authoritative question-assignment record
--   GAP-17  question_delivered_at_a / _b in dare_quiz_rounds so
--           response_ms is computed server-side (not trusted from client)
--   GAP-18  court_sessions.phase comment clarifying authority split
--   GAP-20  quiz_questions.options jsonb array-length check
-- ============================================================

-- ── court_sessions ───────────────────────────────────────────
-- Runtime Court state. One session per DARE.
-- GAP-18: dares.status is the durable business record.
--         court_sessions.phase is the ephemeral operational state.
--         Server functions update both atomically.
create table court_sessions (
  id                    uuid primary key default gen_random_uuid(),
  dare_id               uuid not null unique references dares(id) on delete cascade,
  phase                 text not null default 'waiting',
  player_a_ready        boolean not null default false,
  player_b_ready        boolean not null default false,
  -- GAP-01: denormalized counters updated by server after each vote/answer
  score_a               integer not null default 0,
  score_b               integer not null default 0,
  votes_a               integer not null default 0,
  votes_b               integer not null default 0,
  server_start_time     timestamptz,
  server_end_time       timestamptz,
  player_a_heartbeat_at timestamptz,
  player_b_heartbeat_at timestamptz,
  reconnect_deadline    timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint court_sessions_phase_valid check (phase in (
    'waiting','ready_check','countdown','active',
    'awaiting_result','completed','disputed','forfeited','cancelled'
  )),
  constraint court_sessions_scores_nonnegative
    check (score_a >= 0 and score_b >= 0 and votes_a >= 0 and votes_b >= 0)
);

comment on column court_sessions.phase is
  'Operational court phase. dares.status is the authoritative business record. Both are updated atomically by server functions.';

create index court_sessions_phase_idx   on court_sessions (phase);
create index court_sessions_dare_id_idx on court_sessions (dare_id);

create trigger trg_court_sessions_updated_at
  before update on court_sessions
  for each row execute function set_updated_at();

-- ── court_chat_messages ──────────────────────────────────────
create table court_chat_messages (
  id                  uuid primary key default gen_random_uuid(),
  dare_id             uuid not null references dares(id) on delete cascade,
  user_id             uuid references profiles(id) on delete set null,
  username_snapshot   text,
  message             text not null,
  moderation_status   text not null default 'visible',
  created_at          timestamptz not null default now(),

  constraint court_chat_messages_message_len
    check (char_length(message) between 1 and 500),
  constraint court_chat_messages_moderation_status_valid
    check (moderation_status in ('visible','hidden','flagged','deleted'))
);

create index court_chat_messages_dare_created_idx
  on court_chat_messages (dare_id, created_at desc);
create index court_chat_messages_user_created_idx
  on court_chat_messages (user_id, created_at desc);

-- ── quiz_questions ───────────────────────────────────────────
-- Controlled question bank for Algorithmic DARE MVP.
-- correct_option must never be exposed to clients via direct table read.
-- Serve question payloads through API/RPC only.
create table quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  category       text not null,
  prompt         text not null,
  options        jsonb not null,
  correct_option integer not null,
  difficulty     text not null default 'normal',
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint quiz_questions_category_valid
    check (category in ('knowledge','sports','verbal','creative','other')),
  constraint quiz_questions_prompt_len
    check (char_length(prompt) between 5 and 500),
  constraint quiz_questions_correct_option_range
    check (correct_option between 0 and 5),
  constraint quiz_questions_difficulty_valid
    check (difficulty in ('easy','normal','hard')),
  -- GAP-20: prevent structurally invalid options arrays
  constraint quiz_questions_options_valid
    check (
      jsonb_typeof(options) = 'array'
      and jsonb_array_length(options) between 2 and 6
    )
);

create index quiz_questions_active_category_idx
  on quiz_questions (category, difficulty) where active = true;

create trigger trg_quiz_questions_updated_at
  before update on quiz_questions
  for each row execute function set_updated_at();

-- ── dare_quiz_rounds (GAP-02) ────────────────────────────────
-- Authoritative record of which questions were assigned to each DARE
-- and in what order. Server creates these records before the match starts.
-- Both players receive identical questions via this assignment.
--
-- GAP-17: per-player question_delivered_at columns enable server-side
-- computation of response_ms without trusting any client-sent timing.
create table dare_quiz_rounds (
  id                       uuid primary key default gen_random_uuid(),
  dare_id                  uuid not null references dares(id) on delete cascade,
  question_id              uuid not null references quiz_questions(id) on delete restrict,
  round_index              smallint not null,
  assigned_at              timestamptz not null default now(),
  question_delivered_at_a  timestamptz,   -- set when question is sent to player A
  question_delivered_at_b  timestamptz,   -- set when question is sent to player B

  unique (dare_id, round_index),
  unique (dare_id, question_id),
  constraint dare_quiz_rounds_index_valid
    check (round_index >= 0)
);

create index dare_quiz_rounds_dare_idx on dare_quiz_rounds (dare_id, round_index);

-- ── dare_quiz_answers ────────────────────────────────────────
-- Player answer records. Inserted by the score-answer server function.
-- response_ms is computed by the server as:
--   (answer_received_at - dare_quiz_rounds.question_delivered_at_{a|b})
create table dare_quiz_answers (
  id              uuid primary key default gen_random_uuid(),
  dare_id         uuid not null references dares(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete restrict,
  question_id     uuid not null references quiz_questions(id) on delete restrict,
  round_index     smallint not null,
  selected_option integer not null,
  correct         boolean not null,
  response_ms     integer,

  created_at      timestamptz not null default now(),

  unique (dare_id, user_id, question_id),
  constraint dare_quiz_answers_selected_option_range
    check (selected_option between 0 and 5),
  constraint dare_quiz_answers_response_ms_valid
    check (response_ms is null or response_ms >= 0),
  constraint dare_quiz_answers_round_index_valid
    check (round_index >= 0)
);

create index dare_quiz_answers_dare_user_idx on dare_quiz_answers (dare_id, user_id);
create index dare_quiz_answers_question_idx  on dare_quiz_answers (question_id);
