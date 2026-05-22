-- Address Supabase security advisor warnings:
-- - helper functions should not inherit a mutable role search_path
-- - extensions should not be installed in public when an extensions schema is available

alter function public.set_updated_at() set search_path = public;
alter function public.ledger_immutability_guard() set search_path = public;

do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'citext'
      and n.nspname = 'public'
  ) then
    alter extension citext set schema extensions;
  end if;
end
$$;
