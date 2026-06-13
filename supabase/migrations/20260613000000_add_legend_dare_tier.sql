-- Extend the tier check constraint to allow the new Legend Dare tier.
alter table public.challenge_tier_selections
  drop constraint challenge_tier_selections_tier_check;

alter table public.challenge_tier_selections
  add constraint challenge_tier_selections_tier_check
    check (tier in ('standard', 'champion', 'legend'));
