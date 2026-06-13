-- Allow one row per (referral_code, tier) so a Legend selection does not
-- overwrite the prior Standard / Champion row that the eligibility gate depends on.
--
-- Before: partial unique index on (referral_code) — one row per person.
-- After:  unique constraint on (referral_code, tier) — one row per person per tier.
--
-- NULL referral_code rows are unaffected: NULL != NULL means they never conflict.

drop index if exists challenge_tier_selections_referral_code_unique_idx;

alter table public.challenge_tier_selections
  add constraint challenge_tier_selections_referral_code_tier_unique
  unique (referral_code, tier);
