-- ============================================================
-- auth_profile_username_lint_fix.sql
-- Keep local upgraded databases on the lint-clean username allocator.
-- ============================================================

create or replace function public.available_profile_username(
  p_seed text,
  p_user_id uuid
)
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_base text := public.normalize_profile_username(p_seed, p_user_id);
  v_candidate text;
  v_suffix text;
  v_attempt integer := 0;
begin
  loop
    if v_attempt = 0 then
      v_candidate := v_base;
    else
      v_suffix := right(md5(p_user_id::text || ':' || v_attempt::text), 6);
      v_candidate := left(v_base, 23) || '_' || v_suffix;
    end if;

    if not exists (
      select 1
      from public.profiles p
      where p.username = v_candidate
    ) then
      return v_candidate;
    end if;

    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      return 'user_' || right(replace(p_user_id::text, '-', ''), 8);
    end if;
  end loop;

  return 'user_' || right(replace(p_user_id::text, '-', ''), 8);
end;
$$;

revoke all on function public.available_profile_username(text, uuid)
from public, anon, authenticated;
