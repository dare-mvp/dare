-- ============================================================
-- self_exclusion_rpc.sql
-- Responsible gaming self-exclusion with DARE cleanup.
-- ============================================================

create or replace function public.self_exclude_action(
  p_user_id uuid,
  p_duration_days integer,
  p_reason text default null,
  p_ledger_idempotency_key text default null
)
returns table (
  user_id uuid,
  self_excluded boolean,
  self_exclusion_until timestamptz,
  account_status text,
  cancelled_dares integer,
  forfeited_dares integer,
  refunded_amount integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile profiles%rowtype;
  v_settings responsible_gaming_settings%rowtype;
  v_dare dares%rowtype;
  v_hold escrow_holds%rowtype;
  v_release_ledger_id uuid;
  v_available integer;
  v_until timestamptz := now() + make_interval(days => p_duration_days);
  v_cancelled integer := 0;
  v_forfeited integer := 0;
  v_refunded integer := 0;
  v_winner_id uuid;
  v_resulting_score integer;
begin
  if p_duration_days is null or p_duration_days < 1 or p_duration_days > 365 then
    raise exception 'invalid_self_exclusion_duration' using errcode = 'P0001';
  end if;

  if p_reason is not null and char_length(p_reason) > 500 then
    raise exception 'invalid_self_exclusion_reason' using errcode = 'P0001';
  end if;

  select *
    into v_profile
  from profiles p
  where p.id = p_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  insert into responsible_gaming_settings (user_id)
  values (p_user_id)
  on conflict on constraint responsible_gaming_settings_pkey do nothing;

  select *
    into v_settings
  from responsible_gaming_settings rgs
  where rgs.user_id = p_user_id
  for update;

  if v_settings.self_excluded
    and (
      v_settings.self_exclusion_until is null
      or v_settings.self_exclusion_until > now()
    ) then
    raise exception 'self_exclusion_active' using errcode = 'P0001';
  end if;

  update responsible_gaming_settings rgs
    set self_excluded = true,
        self_exclusion_until = v_until,
        cooling_off_until = null,
        pending_daily_deposit_limit_kobo = null,
        pending_weekly_deposit_limit_kobo = null,
        pending_monthly_deposit_limit_kobo = null,
        pending_session_max_minutes = null,
        pending_max_stake_per_dare_kobo = null,
        pending_limits_effective_at = null
  where rgs.user_id = p_user_id
  returning * into v_settings;

  update profiles p
    set account_status = 'limited',
        jury_opt_in = false,
        jury_categories = '{}'
  where p.id = p_user_id
  returning * into v_profile;

  for v_dare in
    select *
    from dares d
    where d.issuer_id = p_user_id
      and d.status in ('open', 'targeted_pending')
    for update
  loop
    select *
      into v_hold
    from escrow_holds eh
    where eh.dare_id = v_dare.id
      and eh.user_id = p_user_id
      and eh.status = 'held'
    for update;

    if found then
      select coalesce(sum(
        case
          when le.direction = 'credit' and le.status = 'posted' then le.amount
          when le.direction = 'debit' and le.status = 'posted' then -le.amount
          else 0
        end
      ), 0)
        into v_available
      from ledger_entries le
      where le.wallet_account_id = v_hold.wallet_account_id;

      v_release_ledger_id := gen_random_uuid();

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
        v_release_ledger_id,
        v_hold.wallet_account_id,
        p_user_id,
        v_dare.id,
        'escrow_release',
        'credit',
        v_hold.amount,
        v_hold.currency,
        'posted',
        v_available,
        v_available + v_hold.amount,
        coalesce(
          p_ledger_idempotency_key,
          'self-exclude:' || p_user_id::text
        ) || ':cancel:' || v_dare.id::text,
        jsonb_build_object('reason', 'self_exclusion')
      );

      update escrow_holds eh
        set status = 'refunded',
            release_ledger_entry_id = v_release_ledger_id,
            released_at = now()
      where eh.id = v_hold.id;

      v_refunded := v_refunded + v_hold.amount;
    end if;

    update dares d
      set status = 'cancelled'
    where d.id = v_dare.id;

    insert into notifications (
      user_id,
      type,
      title,
      body,
      action
    )
    values (
      p_user_id,
      'system',
      'DARE cancelled',
      'Your open DARE was cancelled because self-exclusion is active.',
      jsonb_build_object('type', 'dare', 'dareId', v_dare.id)
    );

    v_cancelled := v_cancelled + 1;
  end loop;

  update dares d
    set status = 'declined'
  where d.challenger_id = p_user_id
    and d.issuer_id <> p_user_id
    and d.status = 'targeted_pending';

  for v_dare in
    select *
    from dares d
    where (d.issuer_id = p_user_id or d.challenger_id = p_user_id)
      and d.status in ('accepted', 'ready_check', 'active', 'awaiting_result')
      and d.challenger_id is not null
    for update
  loop
    v_winner_id := case
      when v_dare.issuer_id = p_user_id then v_dare.challenger_id
      else v_dare.issuer_id
    end;

    update court_sessions cs
      set phase = 'forfeited',
          server_end_time = coalesce(cs.server_end_time, now())
    where cs.dare_id = v_dare.id;

    update dares d
      set status = 'forfeited',
          winner_id = v_winner_id,
          completed_at = coalesce(d.completed_at, now()),
          dispute_deadline_at = now()
    where d.id = v_dare.id;

    update profiles p
      set trust_score = greatest(0, p.trust_score - 10)
    where p.id = p_user_id
    returning p.trust_score into v_resulting_score;

    insert into trust_events (
      user_id,
      event_type,
      delta,
      resulting_score,
      dare_id
    )
    values (
      p_user_id,
      'dare_forfeit',
      -10,
      v_resulting_score,
      v_dare.id
    );

    insert into notifications (
      user_id,
      type,
      title,
      body,
      action
    )
    values
      (
        p_user_id,
        'match_result',
        'DARE forfeited',
        'Your active DARE was forfeited because self-exclusion is active.',
        jsonb_build_object('type', 'dare', 'dareId', v_dare.id)
      ),
      (
        v_winner_id,
        'match_result',
        'Opponent forfeited',
        'This DARE is ready for settlement.',
        jsonb_build_object('type', 'dare', 'dareId', v_dare.id)
      );

    v_forfeited := v_forfeited + 1;
  end loop;

  insert into notifications (
    user_id,
    type,
    title,
    body,
    action
  )
  values (
    p_user_id,
    'system',
    'Self-exclusion active',
    'Your self-exclusion period is now active.',
    jsonb_build_object('type', 'responsible_gaming')
  );

  user_id := p_user_id;
  self_excluded := v_settings.self_excluded;
  self_exclusion_until := v_settings.self_exclusion_until;
  account_status := v_profile.account_status;
  cancelled_dares := v_cancelled;
  forfeited_dares := v_forfeited;
  refunded_amount := v_refunded;
  return next;
end;
$$;

revoke all on function public.self_exclude_action(
  uuid, integer, text, text
) from public, anon, authenticated;

grant execute on function public.self_exclude_action(
  uuid, integer, text, text
) to service_role;
