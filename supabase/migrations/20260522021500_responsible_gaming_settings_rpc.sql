-- ============================================================
-- responsible_gaming_settings_rpc.sql
-- Responsible gaming limit updates with delayed increases.
-- ============================================================

alter table responsible_gaming_settings
  add column if not exists session_max_minutes integer
    check (session_max_minutes is null or session_max_minutes > 0),
  add column if not exists pending_daily_deposit_limit_kobo integer
    check (pending_daily_deposit_limit_kobo is null or pending_daily_deposit_limit_kobo > 0),
  add column if not exists pending_weekly_deposit_limit_kobo integer
    check (pending_weekly_deposit_limit_kobo is null or pending_weekly_deposit_limit_kobo > 0),
  add column if not exists pending_monthly_deposit_limit_kobo integer
    check (pending_monthly_deposit_limit_kobo is null or pending_monthly_deposit_limit_kobo > 0),
  add column if not exists pending_session_max_minutes integer
    check (pending_session_max_minutes is null or pending_session_max_minutes > 0),
  add column if not exists pending_max_stake_per_dare_kobo integer
    check (pending_max_stake_per_dare_kobo is null or pending_max_stake_per_dare_kobo > 0),
  add column if not exists pending_limits_effective_at timestamptz;

create or replace function public.update_responsible_gaming_settings_action(
  p_user_id uuid,
  p_daily_deposit_limit_kobo integer default null,
  p_weekly_deposit_limit_kobo integer default null,
  p_monthly_deposit_limit_kobo integer default null,
  p_session_max_minutes integer default null,
  p_max_stake_per_dare_kobo integer default null
)
returns table (
  user_id uuid,
  daily_deposit_limit_kobo integer,
  weekly_deposit_limit_kobo integer,
  monthly_deposit_limit_kobo integer,
  session_max_minutes integer,
  max_stake_per_dare_kobo integer,
  pending_daily_deposit_limit_kobo integer,
  pending_weekly_deposit_limit_kobo integer,
  pending_monthly_deposit_limit_kobo integer,
  pending_session_max_minutes integer,
  pending_max_stake_per_dare_kobo integer,
  pending_limits_effective_at timestamptz,
  self_excluded boolean,
  self_exclusion_until timestamptz,
  cooling_off_until timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile profiles%rowtype;
  v_settings responsible_gaming_settings%rowtype;
  v_effective_at timestamptz := now() + interval '24 hours';
begin
  select *
    into v_profile
  from profiles p
  where p.id = p_user_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0001';
  end if;

  if v_profile.account_status <> 'active'
    or v_profile.risk_status not in ('normal', 'watch') then
    raise exception 'account_restricted' using errcode = 'P0001';
  end if;

  insert into responsible_gaming_settings (user_id)
  values (p_user_id)
  on conflict on constraint responsible_gaming_settings_pkey do nothing;

  select *
    into v_settings
  from responsible_gaming_settings rgs
  where rgs.user_id = p_user_id
  for update;

  if v_settings.pending_limits_effective_at is not null
    and v_settings.pending_limits_effective_at <= now() then
    update responsible_gaming_settings rgs
      set daily_deposit_limit_kobo = coalesce(
            rgs.pending_daily_deposit_limit_kobo,
            rgs.daily_deposit_limit_kobo
          ),
          weekly_deposit_limit_kobo = coalesce(
            rgs.pending_weekly_deposit_limit_kobo,
            rgs.weekly_deposit_limit_kobo
          ),
          monthly_deposit_limit_kobo = coalesce(
            rgs.pending_monthly_deposit_limit_kobo,
            rgs.monthly_deposit_limit_kobo
          ),
          session_max_minutes = coalesce(
            rgs.pending_session_max_minutes,
            rgs.session_max_minutes
          ),
          max_stake_per_dare_kobo = coalesce(
            rgs.pending_max_stake_per_dare_kobo,
            rgs.max_stake_per_dare_kobo
          ),
          pending_daily_deposit_limit_kobo = null,
          pending_weekly_deposit_limit_kobo = null,
          pending_monthly_deposit_limit_kobo = null,
          pending_session_max_minutes = null,
          pending_max_stake_per_dare_kobo = null,
          pending_limits_effective_at = null
    where rgs.user_id = p_user_id
    returning * into v_settings;
  end if;

  update responsible_gaming_settings rgs
    set daily_deposit_limit_kobo = case
          when p_daily_deposit_limit_kobo is null then rgs.daily_deposit_limit_kobo
          when rgs.daily_deposit_limit_kobo is null
            or p_daily_deposit_limit_kobo <= rgs.daily_deposit_limit_kobo
            then p_daily_deposit_limit_kobo
          else rgs.daily_deposit_limit_kobo
        end,
        weekly_deposit_limit_kobo = case
          when p_weekly_deposit_limit_kobo is null then rgs.weekly_deposit_limit_kobo
          when rgs.weekly_deposit_limit_kobo is null
            or p_weekly_deposit_limit_kobo <= rgs.weekly_deposit_limit_kobo
            then p_weekly_deposit_limit_kobo
          else rgs.weekly_deposit_limit_kobo
        end,
        monthly_deposit_limit_kobo = case
          when p_monthly_deposit_limit_kobo is null then rgs.monthly_deposit_limit_kobo
          when rgs.monthly_deposit_limit_kobo is null
            or p_monthly_deposit_limit_kobo <= rgs.monthly_deposit_limit_kobo
            then p_monthly_deposit_limit_kobo
          else rgs.monthly_deposit_limit_kobo
        end,
        session_max_minutes = case
          when p_session_max_minutes is null then rgs.session_max_minutes
          when rgs.session_max_minutes is null
            or p_session_max_minutes <= rgs.session_max_minutes
            then p_session_max_minutes
          else rgs.session_max_minutes
        end,
        max_stake_per_dare_kobo = case
          when p_max_stake_per_dare_kobo is null then rgs.max_stake_per_dare_kobo
          when rgs.max_stake_per_dare_kobo is null
            or p_max_stake_per_dare_kobo <= rgs.max_stake_per_dare_kobo
            then p_max_stake_per_dare_kobo
          else rgs.max_stake_per_dare_kobo
        end,
        pending_daily_deposit_limit_kobo = case
          when p_daily_deposit_limit_kobo is not null
            and rgs.daily_deposit_limit_kobo is not null
            and p_daily_deposit_limit_kobo > rgs.daily_deposit_limit_kobo
            then p_daily_deposit_limit_kobo
          when p_daily_deposit_limit_kobo is not null then null
          else rgs.pending_daily_deposit_limit_kobo
        end,
        pending_weekly_deposit_limit_kobo = case
          when p_weekly_deposit_limit_kobo is not null
            and rgs.weekly_deposit_limit_kobo is not null
            and p_weekly_deposit_limit_kobo > rgs.weekly_deposit_limit_kobo
            then p_weekly_deposit_limit_kobo
          when p_weekly_deposit_limit_kobo is not null then null
          else rgs.pending_weekly_deposit_limit_kobo
        end,
        pending_monthly_deposit_limit_kobo = case
          when p_monthly_deposit_limit_kobo is not null
            and rgs.monthly_deposit_limit_kobo is not null
            and p_monthly_deposit_limit_kobo > rgs.monthly_deposit_limit_kobo
            then p_monthly_deposit_limit_kobo
          when p_monthly_deposit_limit_kobo is not null then null
          else rgs.pending_monthly_deposit_limit_kobo
        end,
        pending_session_max_minutes = case
          when p_session_max_minutes is not null
            and rgs.session_max_minutes is not null
            and p_session_max_minutes > rgs.session_max_minutes
            then p_session_max_minutes
          when p_session_max_minutes is not null then null
          else rgs.pending_session_max_minutes
        end,
        pending_max_stake_per_dare_kobo = case
          when p_max_stake_per_dare_kobo is not null
            and rgs.max_stake_per_dare_kobo is not null
            and p_max_stake_per_dare_kobo > rgs.max_stake_per_dare_kobo
            then p_max_stake_per_dare_kobo
          when p_max_stake_per_dare_kobo is not null then null
          else rgs.pending_max_stake_per_dare_kobo
        end
  where rgs.user_id = p_user_id
  returning * into v_settings;

  update responsible_gaming_settings rgs
    set pending_limits_effective_at = case
          when v_settings.pending_daily_deposit_limit_kobo is not null
            or v_settings.pending_weekly_deposit_limit_kobo is not null
            or v_settings.pending_monthly_deposit_limit_kobo is not null
            or v_settings.pending_session_max_minutes is not null
            or v_settings.pending_max_stake_per_dare_kobo is not null
            then coalesce(rgs.pending_limits_effective_at, v_effective_at)
          else null
        end
  where rgs.user_id = p_user_id
  returning * into v_settings;

  user_id := v_settings.user_id;
  daily_deposit_limit_kobo := v_settings.daily_deposit_limit_kobo;
  weekly_deposit_limit_kobo := v_settings.weekly_deposit_limit_kobo;
  monthly_deposit_limit_kobo := v_settings.monthly_deposit_limit_kobo;
  session_max_minutes := v_settings.session_max_minutes;
  max_stake_per_dare_kobo := v_settings.max_stake_per_dare_kobo;
  pending_daily_deposit_limit_kobo := v_settings.pending_daily_deposit_limit_kobo;
  pending_weekly_deposit_limit_kobo := v_settings.pending_weekly_deposit_limit_kobo;
  pending_monthly_deposit_limit_kobo := v_settings.pending_monthly_deposit_limit_kobo;
  pending_session_max_minutes := v_settings.pending_session_max_minutes;
  pending_max_stake_per_dare_kobo := v_settings.pending_max_stake_per_dare_kobo;
  pending_limits_effective_at := v_settings.pending_limits_effective_at;
  self_excluded := v_settings.self_excluded;
  self_exclusion_until := v_settings.self_exclusion_until;
  cooling_off_until := v_settings.cooling_off_until;
  return next;
end;
$$;

revoke all on function public.update_responsible_gaming_settings_action(
  uuid, integer, integer, integer, integer, integer
) from public, anon, authenticated;

grant execute on function public.update_responsible_gaming_settings_action(
  uuid, integer, integer, integer, integer, integer
) to service_role;
