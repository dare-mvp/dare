revoke all on public.dare_prompts from anon, authenticated;
revoke all on public.dare_answer_keys from anon, authenticated;
revoke all on public.dare_answer_submissions from anon, authenticated;
revoke all on public.dare_result_claims from anon, authenticated;
revoke all on public.dare_court_events from anon, authenticated;

grant select on public.dare_prompts to authenticated;
grant select on public.dare_answer_submissions to authenticated;
grant select on public.dare_result_claims to authenticated;
grant select on public.dare_court_events to authenticated;
