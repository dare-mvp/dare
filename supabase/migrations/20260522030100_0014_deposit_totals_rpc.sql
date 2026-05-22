-- Returns the sum of verified deposits for a user within rolling time windows.
-- Used by the deposit action to enforce cumulative responsible-gaming limits
-- without exposing raw ledger data to the application layer.
create or replace function public.get_user_deposit_totals_kobo(
  p_user_id uuid
)
returns table (
  daily_total_kobo   bigint,
  weekly_total_kobo  bigint,
  monthly_total_kobo bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(case when created_at >= now() - interval '1 day'  then amount else 0 end), 0)::bigint as daily_total_kobo,
    coalesce(sum(case when created_at >= now() - interval '7 days' then amount else 0 end), 0)::bigint as weekly_total_kobo,
    coalesce(sum(case when created_at >= now() - interval '30 days' then amount else 0 end), 0)::bigint as monthly_total_kobo
  from public.ledger_entries
  where user_id = p_user_id
    and type = 'deposit_confirmed'
    and direction = 'credit'
    and status = 'posted';
$$;

revoke all on function public.get_user_deposit_totals_kobo(uuid) from public, anon, authenticated;
grant execute on function public.get_user_deposit_totals_kobo(uuid) to service_role;
