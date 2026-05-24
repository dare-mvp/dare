-- ============================================================
-- wallet_storage_fee_fixes.sql
-- Signup wallet provisioning, evidence bucket bootstrap, and platform fees.
-- ============================================================

create or replace function public.create_default_wallet_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into wallet_accounts (user_id, currency, status)
  values (new.id, 'NGN', 'active')
  on conflict (user_id, currency) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_profiles_create_default_wallet on public.profiles;
create trigger trg_profiles_create_default_wallet
  after insert on public.profiles
  for each row execute function public.create_default_wallet_for_profile();

insert into wallet_accounts (user_id, currency, status)
select p.id, 'NGN', 'active'
from profiles p
on conflict (user_id, currency) do nothing;

revoke all on function public.create_default_wallet_for_profile()
from public, anon, authenticated;

do $$
declare
  v_platform_user_id uuid := '00000000-0000-4000-8000-000000000001';
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    v_platform_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'system@internal.dare',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '{}',
    '{"system":true}',
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into profiles (
    id,
    username,
    display_name,
    kyc_tier,
    account_status,
    risk_status,
    is_admin
  )
  values (
    v_platform_user_id,
    'dare_platform',
    'DARE Platform',
    'kyc3',
    'active',
    'normal',
    false
  )
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        kyc_tier = excluded.kyc_tier,
        account_status = excluded.account_status,
        risk_status = excluded.risk_status;

  insert into wallet_accounts (user_id, currency, status)
  values (v_platform_user_id, 'NGN', 'active')
  on conflict (user_id, currency) do nothing;
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'dare-evidence',
  'dare-evidence',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'video/mp4']
)
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.create_dare_action(
  p_issuer_id uuid,
  p_title text,
  p_description text,
  p_category text,
  p_stake_amount integer,
  p_currency text,
  p_duration_seconds integer,
  p_target_username text,
  p_constitution_test text,
  p_constitution_rules text,
  p_constitution_proof_method text,
  p_constitution_edge_cases text,
  p_ledger_idempotency_key text
)
returns table (
  dare_id uuid,
  constitution_id uuid,
  escrow_hold_id uuid,
  ledger_entry_id uuid,
  status text,
  stake_amount integer,
  currency text,
  challenger_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_issuer profiles%rowtype;
  v_target profiles%rowtype;
  v_wallet wallet_accounts%rowtype;
  v_existing record;
  v_available integer;
  v_pending integer;
  v_withdrawable integer;
  v_dare_id uuid;
  v_constitution_id uuid;
  v_ledger_id uuid;
  v_escrow_id uuid;
  v_status text;
  v_platform_fee integer;
  v_winner_payout integer;
begin
  select
    d.id as dare_id,
    d.constitution_id,
    eh.id as escrow_hold_id,
    le.id as ledger_entry_id,
    d.status,
    d.stake_amount,
    d.currency,
    d.challenger_id
    into v_existing
  from ledger_entries le
  join escrow_holds eh on eh.held_ledger_entry_id = le.id
  join dares d on d.id = le.dare_id
  where le.idempotency_key = p_ledger_idempotency_key
  limit 1;

  if found then
    dare_id := v_existing.dare_id;
    constitution_id := v_existing.constitution_id;
    escrow_hold_id := v_existing.escrow_hold_id;
    ledger_entry_id := v_existing.ledger_entry_id;
    status := v_existing.status;
    stake_amount := v_existing.stake_amount;
    currency := v_existing.currency;
    challenger_id := v_existing.challenger_id;
    return next;
    return;
  end if;

  select *
    into v_issuer
  from profiles
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

  if not exists (
    select 1 from dare_categories dc
    where dc.id = p_category and dc.active = true
  ) then
    raise exception 'invalid_category' using errcode = 'P0001';
  end if;

  if p_target_username is not null then
    select *
      into v_target
    from profiles
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

  select *
    into v_wallet
  from wallet_accounts
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
  from ledger_entries le
  where le.wallet_account_id = v_wallet.id;

  select coalesce(sum(le.amount), 0)
    into v_pending
  from ledger_entries le
  where le.wallet_account_id = v_wallet.id
    and le.type = 'withdrawal_pending'
    and le.status = 'pending';

  v_withdrawable := v_available - v_pending;
  if v_withdrawable < p_stake_amount then
    raise exception 'insufficient_funds' using errcode = 'P0001';
  end if;

  v_platform_fee := floor((p_stake_amount * 2) * 0.05)::integer;
  v_winner_payout := (p_stake_amount * 2) - v_platform_fee;

  v_status := case when p_target_username is null then 'open' else 'targeted_pending' end;
  v_dare_id := gen_random_uuid();
  v_constitution_id := gen_random_uuid();
  v_ledger_id := gen_random_uuid();
  v_escrow_id := gen_random_uuid();

  insert into dares (
    id,
    issuer_id,
    challenger_id,
    title,
    description,
    category,
    resolution_type,
    status,
    stake_amount,
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
    'algorithmic',
    v_status,
    p_stake_amount,
    p_currency,
    v_platform_fee,
    v_winner_payout,
    p_duration_seconds,
    now() + interval '24 hours'
  );

  insert into dare_constitutions (
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

  update dares
    set constitution_id = v_constitution_id
  where id = v_dare_id;

  insert into ledger_entries (
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
    p_stake_amount,
    p_currency,
    'posted',
    v_withdrawable,
    v_withdrawable - p_stake_amount,
    p_ledger_idempotency_key,
    jsonb_build_object('role', 'issuer')
  );

  insert into escrow_holds (
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
    p_stake_amount,
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
  stake_amount := p_stake_amount;
  currency := p_currency;
  challenger_id := case when p_target_username is null then null else v_target.id end;
  return next;
end;
$$;

create or replace function public.settle_dare_action(
  p_actor_user_id uuid,
  p_dare_id uuid
)
returns table (
  dare_id uuid,
  status text,
  winner_id uuid,
  payout_amount integer,
  refunded_amount integer,
  ledger_entries_created integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare dares%rowtype;
  v_court court_sessions%rowtype;
  v_hold escrow_holds%rowtype;
  v_winner_wallet wallet_accounts%rowtype;
  v_platform_wallet wallet_accounts%rowtype;
  v_total_held integer;
  v_payout_amount integer;
  v_platform_fee integer;
  v_payout_ledger_id uuid;
  v_platform_fee_ledger_id uuid;
  v_refund_ledger_id uuid;
  v_created integer := 0;
  v_refunded integer := 0;
  v_resulting_score integer;
  v_loser_id uuid;
begin
  select *
    into v_dare
  from dares
  where id = p_dare_id
  for update;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_actor_user_id <> v_dare.issuer_id
    and p_actor_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  select *
    into v_court
  from court_sessions
  where court_sessions.dare_id = p_dare_id
  for update;

  if not found then
    raise exception 'court_not_found' using errcode = 'P0001';
  end if;

  if v_dare.status = 'settled' then
    select coalesce(sum(le.amount), 0)
      into v_total_held
    from ledger_entries le
    where le.dare_id = p_dare_id
      and le.type = 'payout'
      and le.status = 'posted';

    select coalesce(sum(le.amount), 0)
      into v_refunded
    from ledger_entries le
    where le.dare_id = p_dare_id
      and le.type = 'escrow_release'
      and le.status = 'posted';

    dare_id := v_dare.id;
    status := v_dare.status;
    winner_id := v_dare.winner_id;
    payout_amount := v_total_held;
    refunded_amount := v_refunded;
    ledger_entries_created := 0;
    return next;
    return;
  end if;

  if v_dare.status not in ('completed', 'forfeited') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  if v_dare.status = 'completed'
    and v_dare.dispute_deadline_at is not null
    and now() < v_dare.dispute_deadline_at then
    raise exception 'dispute_window_open' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jury_cases jc
    where jc.dare_id = p_dare_id
      and jc.status in ('filed', 'accepted_for_review', 'jury_assignment', 'jury_voting')
  ) then
    raise exception 'dispute_window_open' using errcode = 'P0001';
  end if;

  select coalesce(sum(eh.amount), 0)
    into v_total_held
  from escrow_holds eh
  where eh.dare_id = p_dare_id
    and eh.status = 'held';

  if v_total_held <= 0 then
    raise exception 'escrow_not_found' using errcode = 'P0001';
  end if;

  if v_dare.winner_id is null then
    for v_hold in
      select *
      from escrow_holds
      where escrow_holds.dare_id = p_dare_id
        and escrow_holds.status = 'held'
      for update
    loop
      v_refund_ledger_id := gen_random_uuid();

      insert into ledger_entries (
        id,
        wallet_account_id,
        user_id,
        dare_id,
        type,
        direction,
        amount,
        currency,
        status,
        idempotency_key,
        metadata
      )
      values (
        v_refund_ledger_id,
        v_hold.wallet_account_id,
        v_hold.user_id,
        p_dare_id,
        'escrow_release',
        'credit',
        v_hold.amount,
        v_hold.currency,
        'posted',
        'settle:' || p_dare_id::text || ':refund:' || v_hold.user_id::text,
        jsonb_build_object('reason', 'tie_or_void')
      );

      update escrow_holds
        set status = 'refunded',
            release_ledger_entry_id = v_refund_ledger_id,
            released_at = now()
      where id = v_hold.id;

      v_refunded := v_refunded + v_hold.amount;
      v_created := v_created + 1;
    end loop;
  else
    v_platform_fee := least(v_dare.platform_fee, v_total_held);
    v_payout_amount := case
      when v_dare.winner_payout > 0 then least(v_dare.winner_payout, v_total_held - v_platform_fee)
      else v_total_held - v_platform_fee
    end;

    if v_payout_amount <= 0 then
      raise exception 'invalid_dare_state' using errcode = 'P0001';
    end if;

    select *
      into v_winner_wallet
    from wallet_accounts
    where user_id = v_dare.winner_id
      and currency = v_dare.currency
    for update;

    if not found then
      raise exception 'wallet_not_found' using errcode = 'P0001';
    end if;

    v_payout_ledger_id := gen_random_uuid();

    insert into ledger_entries (
      id,
      wallet_account_id,
      user_id,
      dare_id,
      type,
      direction,
      amount,
      currency,
      status,
      idempotency_key,
      metadata
    )
    values (
      v_payout_ledger_id,
      v_winner_wallet.id,
      v_dare.winner_id,
      p_dare_id,
      'payout',
      'credit',
      v_payout_amount,
      v_dare.currency,
      'posted',
      'settle:' || p_dare_id::text || ':payout',
      jsonb_build_object('winner_id', v_dare.winner_id)
    );

    v_created := v_created + 1;

    if v_platform_fee > 0 then
      select wa.*
        into v_platform_wallet
      from wallet_accounts wa
      join profiles p on p.id = wa.user_id
      where p.username = 'dare_platform'
        and wa.currency = v_dare.currency
        and wa.status = 'active'
      for update of wa;

      if not found then
        raise exception 'platform_wallet_not_found' using errcode = 'P0001';
      end if;

      v_platform_fee_ledger_id := gen_random_uuid();

      insert into ledger_entries (
        id,
        wallet_account_id,
        user_id,
        dare_id,
        type,
        direction,
        amount,
        currency,
        status,
        idempotency_key,
        metadata
      )
      values (
        v_platform_fee_ledger_id,
        v_platform_wallet.id,
        v_platform_wallet.user_id,
        p_dare_id,
        'platform_fee',
        'credit',
        v_platform_fee,
        v_dare.currency,
        'posted',
        'settle:' || p_dare_id::text || ':platform_fee',
        jsonb_build_object('winner_id', v_dare.winner_id)
      );

      v_created := v_created + 1;
    end if;

    update escrow_holds
      set status = 'released',
          release_ledger_entry_id = v_payout_ledger_id,
          released_at = now()
    where escrow_holds.dare_id = p_dare_id
      and escrow_holds.status = 'held';
  end if;

  update dares
    set status = 'settled',
        settled_at = now()
  where id = p_dare_id
  returning * into v_dare;

  update court_sessions
    set phase = 'completed'
  where id = v_court.id;

  if v_dare.winner_id is not null then
    v_loser_id := case
      when v_dare.winner_id = v_dare.issuer_id then v_dare.challenger_id
      else v_dare.issuer_id
    end;

    update profiles
      set wins = wins + 1,
          trust_score = least(1000, trust_score + 10)
    where id = v_dare.winner_id
    returning trust_score into v_resulting_score;

    insert into trust_events (
      user_id,
      event_type,
      delta,
      resulting_score,
      dare_id
    )
    values (v_dare.winner_id, 'dare_win', 10, v_resulting_score, p_dare_id);

    update profiles
      set losses = losses + 1,
          trust_score = greatest(0, trust_score - 5)
    where id = v_loser_id
    returning trust_score into v_resulting_score;

    insert into trust_events (
      user_id,
      event_type,
      delta,
      resulting_score,
      dare_id
    )
    values (v_loser_id, 'dare_loss', -5, v_resulting_score, p_dare_id);
  end if;

  dare_id := v_dare.id;
  status := v_dare.status;
  winner_id := v_dare.winner_id;
  payout_amount := case when v_dare.winner_id is null then 0 else v_payout_amount end;
  refunded_amount := v_refunded;
  ledger_entries_created := v_created;
  return next;
exception
  when unique_violation then
    raise exception 'settlement_already_processed' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_default_wallet_for_profile()
from public, anon, authenticated;

revoke all on function public.create_dare_action(
  uuid, text, text, text, integer, text, integer, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_dare_action(
  uuid, text, text, text, integer, text, integer, text, text, text, text, text, text
) to service_role;

revoke all on function public.settle_dare_action(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.settle_dare_action(uuid, uuid)
to service_role;
