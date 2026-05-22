-- Harden Supabase dashboard-generated RLS helper if it exists.
-- Some projects include public.rls_auto_enable() as a SECURITY DEFINER
-- event-trigger function. It should not be callable through the Data API.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
    grant execute on function public.rls_auto_enable() to service_role;
  end if;
end
$$;
