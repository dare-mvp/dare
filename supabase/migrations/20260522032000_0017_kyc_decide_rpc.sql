-- decide_kyc_action: admin approves or rejects a pending KYC verification.
-- On approval, upgrades profiles.kyc_tier to the granted tier.
-- get_latest_kyc_verification: returns the user's most recent KYC record.

-- ── decide_kyc_action ────────────────────────────────────────

create or replace function public.decide_kyc_action(
  p_admin_user_id       uuid,
  p_kyc_verification_id uuid,
  p_verdict             text,   -- 'approved' | 'rejected'
  p_kyc_tier_granted    text,   -- required when verdict = 'approved'
  p_admin_note          text
)
returns table (
  kyc_verification_id uuid,
  user_id             uuid,
  kyc_tier_requested  text,
  kyc_tier_granted    text,
  status              text,
  decided_at          timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rec kyc_verifications%rowtype;
  v_decided_at timestamptz := now();
begin
  if not exists (
    select 1
    from profiles p
    where p.id = p_admin_user_id
      and p.is_admin = true
  ) then
    raise exception 'admin_required' using errcode = 'P0001';
  end if;

  if p_verdict not in ('approved', 'rejected') then
    raise exception 'invalid_kyc_verdict' using errcode = 'P0001';
  end if;

  if p_verdict = 'approved' and p_kyc_tier_granted is null then
    raise exception 'kyc_tier_granted_required' using errcode = 'P0002';
  end if;

  select * into v_rec
  from kyc_verifications
  where id = p_kyc_verification_id
  for update;

  if not found then
    raise exception 'kyc_verification_not_found' using errcode = 'P0003';
  end if;

  if v_rec.status <> 'pending' then
    raise exception 'kyc_verification_not_pending' using errcode = 'P0004';
  end if;

  update kyc_verifications
  set
    status           = p_verdict,
    kyc_tier_granted = case when p_verdict = 'approved' then p_kyc_tier_granted else null end,
    reviewer_user_id = p_admin_user_id,
    reviewer_note    = p_admin_note,
    decided_at       = v_decided_at
  where id = p_kyc_verification_id;

  -- Only upgrade; never downgrade an existing tier.
  if p_verdict = 'approved' then
    update profiles
    set kyc_tier = p_kyc_tier_granted
    where id = v_rec.user_id
      and (case kyc_tier
             when 'kyc0' then 0
             when 'kyc1' then 1
             when 'kyc2' then 2
             when 'kyc3' then 3
             else 0
           end)
        < (case p_kyc_tier_granted
             when 'kyc1' then 1
             when 'kyc2' then 2
             when 'kyc3' then 3
             else 0
           end);
  end if;

  return query
    select
      p_kyc_verification_id,
      v_rec.user_id,
      v_rec.kyc_tier_requested,
      case when p_verdict = 'approved' then p_kyc_tier_granted else null end,
      p_verdict,
      v_decided_at;
end;
$$;

revoke all on function public.decide_kyc_action(uuid, uuid, text, text, text)
from public, anon, authenticated;

grant execute on function public.decide_kyc_action(uuid, uuid, text, text, text)
to service_role;

-- ── get_latest_kyc_verification ─────────────────────────────

create or replace function public.get_latest_kyc_verification(
  p_user_id uuid
)
returns table (
  kyc_verification_id uuid,
  kyc_tier_requested  text,
  kyc_tier_granted    text,
  status              text,
  submitted_at        timestamptz,
  decided_at          timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    id,
    kyc_tier_requested,
    kyc_tier_granted,
    status,
    submitted_at,
    decided_at
  from kyc_verifications
  where user_id = p_user_id
  order by created_at desc
  limit 1;
$$;

revoke all on function public.get_latest_kyc_verification(uuid)
from public, anon, authenticated;

grant execute on function public.get_latest_kyc_verification(uuid)
to service_role;
