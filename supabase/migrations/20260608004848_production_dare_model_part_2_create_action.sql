create or replace function public.create_dare_action(
  p_issuer_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_dare_type text,
  p_resolution_type text,
  p_stake_amount integer,
  p_reward_amount integer,
  p_currency text,
  p_duration_seconds integer,
  p_target_username text,
  p_constitution_test text,
  p_constitution_rules text,
  p_constitution_proof_method text,
  p_constitution_edge_cases text,
  p_answer_key_text text,
  p_answer_key_rules text,
  p_ledger_idempotency_key text
)
returns table (
  dare_id uuid,
  constitution_id uuid,
  escrow_hold_id uuid,
  ledger_entry_id uuid,
  status text,
  dare_type text,
  funding_model text,
  stake_amount integer,
  reward_amount integer,
  escrow_amount integer,
  currency text,
  challenger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_issuer public.profiles%rowtype;
  v_target public.profiles%rowtype;
  v_wallet public.wallet_accounts%rowtype;
  v_responsible public.responsible_gaming_settings%rowtype;
  v_existing record;
  v_available integer;
  v_pending integer;
  v_withdrawable integer;
  v_dare_id uuid;
  v_constitution_id uuid;
  v_ledger_id uuid;
  v_escrow_id uuid;
  v_prompt_id uuid;
  v_status text;
  v_platform_fee integer;
  v_winner_payout integer;
  v_funding_model text;
  v_escrow_amount integer;
  v_answer_salt text;
begin
  if p_dare_type not in ('skill', 'task') then
    raise exception 'invalid_dare_type' using errcode = 'P0001';
  end if;

  if p_resolution_type is null
    or p_resolution_type not in ('answer_key', 'witnessed', 'evidence') then
    raise exception 'invalid_resolution_type' using errcode = 'P0001';
  end if;

  v_funding_model := case
    when p_dare_type = 'skill' then 'two_sided_stake'
    else 'darer_reward'
  end;

  if p_dare_type = 'skill' then
    if p_stake_amount is null or p_stake_amount < 1000 then
      raise exception 'invalid_stake_amount' using errcode = 'P0001';
    end if;
    v_escrow_amount := p_stake_amount;
    p_reward_amount := 0;
    v_platform_fee := floor((p_stake_amount * 2) * 0.05)::integer;
    v_winner_payout := (p_stake_amount * 2) - v_platform_fee;
  else
    if p_reward_amount is null or p_reward_amount < 1000 then
      raise exception 'invalid_reward_amount' using errcode = 'P0001';
    end if;
    v_escrow_amount := p_reward_amount;
    p_stake_amount := 0;
    v_platform_fee := floor(p_reward_amount * 0.05)::integer;
    v_winner_payout := p_reward_amount - v_platform_fee;
  end if;

  if p_resolution_type = 'answer_key'
    and (p_answer_key_text is null or btrim(p_answer_key_text) = '') then
    raise exception 'answer_key_required' using errcode = 'P0001';
  end if;

  select
    d.id as dare_id,
    d.constitution_id,
    eh.id as escrow_hold_id,
    le.id as ledger_entry_id,
    d.status,
    d.dare_type,
    d.funding_model,
    d.stake_amount,
    d.reward_amount,
    eh.amount as escrow_amount,
    d.currency,
    d.challenger_id
    into v_existing
  from public.ledger_entries le
  join public.escrow_holds eh on eh.held_ledger_entry_id = le.id
  join public.dares d on d.id = le.dare_id
  where le.idempotency_key = p_ledger_idempotency_key
  limit 1;

  if found then
    dare_id := v_existing.dare_id;
    constitution_id := v_existing.constitution_id;
    escrow_hold_id := v_existing.escrow_hold_id;
    ledger_entry_id := v_existing.ledger_entry_id;
    status := v_existing.status;
    dare_type := v_existing.dare_type;
    funding_model := v_existing.funding_model;
    stake_amount := v_existing.stake_amount;
    reward_amount := v_existing.reward_amount;
    escrow_amount := v_existing.escrow_amount;
    currency := v_existing.currency;
    challenger_id := v_existing.challenger_id;
    return next;
    return;
  end if;

  select * into v_issuer
  from public.profiles
  where id = p_issuer_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  if v_issuer.account_status <> 'active'
    or v_issuer.risk_status not in ('normal', 'watch') then
    raise exception 'account_restricted' using errcode = 'P0001';
  end if;

  if v_issuer.kyc_tier = 'kyc0' then
    raise exception 'kyc_required' using errcode = 'P0001';
  end if;

  select * into v_responsible
  from public.responsible_gaming_settings
  where user_id = p_issuer_id;

  if found then
    if v_responsible.self_excluded
      and (v_responsible.self_exclusion_until is null or v_responsible.self_exclusion_until > now()) then
      raise exception 'self_exclusion_active' using errcode = 'P0001';
    end if;

    if v_responsible.cooling_off_until is not null
      and v_responsible.cooling_off_until > now() then
      raise exception 'cooling_off_active' using errcode = 'P0001';
    end if;

    if v_responsible.max_stake_per_dare_kobo is not null
      and v_escrow_amount > v_responsible.max_stake_per_dare_kobo then
      raise exception 'responsible_gaming_limit' using errcode = 'P0001';
    end if;
  end if;

  if not exists (
    select 1 from public.dare_categories dc
    where dc.id = p_category and dc.active = true
  ) then
    raise exception 'invalid_category' using errcode = 'P0001';
  end if;

  if p_target_username is not null then
    select * into v_target
    from public.profiles
    where username = p_target_username;

    if not found then
      raise exception 'target_not_found' using errcode = 'P0001';
    end if;

    if v_target.id = p_issuer_id then
      raise exception 'self_challenge' using errcode = 'P0001';
    end if;

    if v_target.account_status <> 'active'
      or v_target.risk_status not in ('normal', 'watch')
      or v_target.kyc_tier = 'kyc0' then
      raise exception 'target_restricted' using errcode = 'P0001';
    end if;
  end if;

  select * into v_wallet
  from public.wallet_accounts
  where wallet_accounts.user_id = p_issuer_id
    and wallet_accounts.currency = p_currency
  for update;

  if not found then
    raise exception 'wallet_not_found' using errcode = 'P0001';
  end if;

  if v_wallet.status <> 'active' then
    raise exception 'wallet_restricted' using errcode = 'P0001';
  end if;

  select coalesce(sum(
    case
      when le.direction = 'credit' and le.status = 'posted' then le.amount
      when le.direction = 'debit' and le.status = 'posted' then -le.amount
      else 0
    end
  ), 0)
    into v_available
  from public.ledger_entries le
  where le.wallet_account_id = v_wallet.id;

  select coalesce(sum(le.amount), 0)
    into v_pending
  from public.ledger_entries le
  where le.wallet_account_id = v_wallet.id
    and le.type = 'withdrawal_pending'
    and le.status = 'pending';

  v_withdrawable := v_available - v_pending;
  if v_withdrawable < v_escrow_amount then
    raise exception 'insufficient_funds' using errcode = 'P0001';
  end if;

  v_status := case when p_target_username is null then 'open' else 'targeted_pending' end;
  v_dare_id := gen_random_uuid();
  v_constitution_id := gen_random_uuid();
  v_ledger_id := gen_random_uuid();
  v_escrow_id := gen_random_uuid();

  insert into public.dares (
    id,
    issuer_id,
    challenger_id,
    title,
    description,
    category,
    dare_type,
    funding_model,
    resolution_type,
    status,
    stake_amount,
    reward_amount,
    currency,
    platform_fee,
    winner_payout,
    duration_seconds,
    expires_at
  )
  values (
    v_dare_id,
    p_issuer_id,
    case when p_target_username is null then null else v_target.id end,
    p_title,
    p_description,
    p_category,
    p_dare_type,
    v_funding_model,
    p_resolution_type,
    v_status,
    p_stake_amount,
    p_reward_amount,
    p_currency,
    v_platform_fee,
    v_winner_payout,
    p_duration_seconds,
    now() + interval '24 hours'
  );

  insert into public.dare_constitutions (
    id,
    dare_id,
    test,
    rules,
    proof_method,
    edge_cases,
    accepted_by_issuer_at
  )
  values (
    v_constitution_id,
    v_dare_id,
    p_constitution_test,
    p_constitution_rules,
    p_constitution_proof_method,
    p_constitution_edge_cases,
    now()
  );

  update public.dares
    set constitution_id = v_constitution_id
  where id = v_dare_id;

  if p_resolution_type = 'answer_key' then
    v_prompt_id := gen_random_uuid();
    v_answer_salt := encode(gen_random_bytes(16), 'hex');

    insert into public.dare_prompts (
      id,
      dare_id,
      created_by,
      prompt,
      answer_format,
      position
    )
    values (
      v_prompt_id,
      v_dare_id,
      p_issuer_id,
      p_constitution_test,
      'short_text',
      0
    );

    insert into public.dare_answer_keys (
      prompt_id,
      dare_id,
      answer_hash,
      answer_salt,
      answer_rules,
      created_by
    )
    values (
      v_prompt_id,
      v_dare_id,
      encode(digest(v_answer_salt || ':' || lower(btrim(p_answer_key_text)), 'sha256'), 'hex'),
      v_answer_salt,
      p_answer_key_rules,
      p_issuer_id
    );
  end if;

  insert into public.ledger_entries (
    id,
    wallet_account_id,
    user_id,
    dare_id,
    type,
    direction,
    amount,
    currency,
    status,
    balance_before,
    balance_after,
    idempotency_key,
    metadata
  )
  values (
    v_ledger_id,
    v_wallet.id,
    p_issuer_id,
    v_dare_id,
    'escrow_hold',
    'debit',
    v_escrow_amount,
    p_currency,
    'posted',
    v_withdrawable,
    v_withdrawable - v_escrow_amount,
    p_ledger_idempotency_key,
    jsonb_build_object('role', 'issuer', 'dare_type', p_dare_type, 'funding_model', v_funding_model)
  );

  insert into public.escrow_holds (
    id,
    dare_id,
    user_id,
    wallet_account_id,
    amount,
    currency,
    status,
    hold_reason,
    held_ledger_entry_id
  )
  values (
    v_escrow_id,
    v_dare_id,
    p_issuer_id,
    v_wallet.id,
    v_escrow_amount,
    p_currency,
    'held',
    'dare_active',
    v_ledger_id
  );

  dare_id := v_dare_id;
  constitution_id := v_constitution_id;
  escrow_hold_id := v_escrow_id;
  ledger_entry_id := v_ledger_id;
  status := v_status;
  dare_type := p_dare_type;
  funding_model := v_funding_model;
  stake_amount := p_stake_amount;
  reward_amount := p_reward_amount;
  escrow_amount := v_escrow_amount;
  currency := p_currency;
  challenger_id := case when p_target_username is null then null else v_target.id end;
  return next;
end;
$$;

