-- Idempotency store for money-moving and state-changing action requests.
-- Only service_role can access this table; anon/authenticated are revoked.
-- Records expire after 24 hours; a pg_cron job should purge expired rows.

create table idempotency_records (
  key_hash    text        primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  body_hash   text        not null,
  status_code smallint    not null,
  response_body jsonb     not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '24 hours'
);

revoke all on table idempotency_records from public, anon, authenticated;
grant select, insert on table idempotency_records to service_role;

alter table idempotency_records enable row level security;

create index idempotency_records_expires_idx on idempotency_records (expires_at);
create index idempotency_records_user_idx    on idempotency_records (user_id);

-- Run once after pg_cron extension is enabled:
-- select cron.schedule(
--   'idempotency-cleanup',
--   '0 * * * *',
--   'delete from idempotency_records where expires_at < now()'
-- );
