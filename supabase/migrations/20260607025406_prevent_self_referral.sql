alter table public.marketing_waitlist
  add constraint no_self_referral
  check (
    referral_code is null
    or referred_by is null
    or referral_code <> referred_by
  );
