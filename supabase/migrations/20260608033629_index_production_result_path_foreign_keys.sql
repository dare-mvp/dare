create index if not exists dare_answer_keys_created_by_idx
on public.dare_answer_keys (created_by);

create index if not exists dare_answer_submissions_user_id_idx
on public.dare_answer_submissions (user_id);

create index if not exists dare_court_events_actor_user_id_idx
on public.dare_court_events (actor_user_id);

create index if not exists dare_court_events_court_session_id_idx
on public.dare_court_events (court_session_id);

create index if not exists dare_prompts_created_by_idx
on public.dare_prompts (created_by);

create index if not exists dare_result_claims_claimed_winner_id_idx
on public.dare_result_claims (claimed_winner_id);

create index if not exists dare_result_claims_user_id_idx
on public.dare_result_claims (user_id);
