-- ============================================================
-- fix_platform_wallet_select.sql
-- Re-apply settle_dare_action with a narrowed platform wallet row.
-- ============================================================

do $$
declare
  v_sql text;
begin
  select pg_get_functiondef('public.settle_dare_action(uuid, uuid)'::regprocedure)
    into v_sql;

  if v_sql is null then
    raise exception 'settle_dare_action_not_found' using errcode = 'P0001';
  end if;

  v_sql := replace(
    v_sql,
    'select *
        into v_platform_wallet
      from wallet_accounts wa',
    'select wa.*
        into v_platform_wallet
      from wallet_accounts wa'
  );

  execute v_sql;
end;
$$;
