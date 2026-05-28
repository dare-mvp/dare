-- Supabase upsert with onConflict: 'referral_code' requires a non-partial
-- unique index. PostgreSQL unique indexes still allow multiple NULL values,
-- so anonymous tier selections can continue to insert separate rows.

drop index if exists public.challenge_tier_selections_referral_code_unique_idx;

create unique index challenge_tier_selections_referral_code_unique_idx
  on public.challenge_tier_selections (referral_code);
