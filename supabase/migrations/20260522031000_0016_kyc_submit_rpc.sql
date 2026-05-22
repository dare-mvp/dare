-- submit_kyc_action: user-initiated KYC verification request.
-- Validates account status and prevents duplicate pending submissions
-- for the same tier.  Returns the new record.

create or replace function public.submit_kyc_action(
  p_user_id   uuid,
  p_tier      text,
  p_documents jsonb
)
returns table (
  kyc_verification_id uuid,
  user_id             uuid,
  kyc_tier_requested  text,
  status              text,
  submitted_at        timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_status text;
  v_id             uuid;
  v_submitted_at   timestamptz := now();
begin
  if p_tier not in ('kyc1', 'kyc2', 'kyc3') then
    raise exception 'invalid_kyc_tier' using errcode = 'P0001';
  end if;

  if p_documents is null or jsonb_typeof(p_documents) <> 'object' then
    raise exception 'invalid_kyc_documents' using errcode = 'P0001';
  end if;

  select account_status into v_account_status
  from profiles
  where id = p_user_id;

  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  if v_account_status <> 'active' then
    raise exception 'account_not_active' using errcode = 'P0002';
  end if;

  -- Prevent duplicate pending submissions for the same tier
  if exists (
    select 1
    from kyc_verifications
    where kyc_verifications.user_id = p_user_id
      and kyc_verifications.kyc_tier_requested = p_tier
      and kyc_verifications.status = 'pending'
  ) then
    raise exception 'kyc_verification_pending' using errcode = 'P0003';
  end if;

  insert into kyc_verifications (
    user_id,
    kyc_tier_requested,
    documents,
    submitted_at
  )
  values (p_user_id, p_tier, p_documents, v_submitted_at)
  returning id into v_id;

  return query
    select v_id, p_user_id, p_tier, 'pending'::text, v_submitted_at;
end;
$$;

revoke all on function public.submit_kyc_action(uuid, text, jsonb)
from public, anon, authenticated;

grant execute on function public.submit_kyc_action(uuid, text, jsonb)
to service_role;
