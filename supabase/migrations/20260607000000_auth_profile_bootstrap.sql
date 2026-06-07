-- ============================================================
-- auth_profile_bootstrap.sql
-- Provision app profile records when Supabase Auth creates users.
-- ============================================================

create or replace function public.normalize_profile_username(
  p_seed text,
  p_user_id uuid
)
returns text
language plpgsql
volatile
set search_path = public, pg_temp
as $$
declare
  v_base text;
begin
  v_base := lower(coalesce(nullif(trim(p_seed), ''), 'user'));
  v_base := regexp_replace(v_base, '@.*$', '');
  v_base := regexp_replace(v_base, '[^a-z0-9_]+', '_', 'g');
  v_base := regexp_replace(v_base, '^_+|_+$', '', 'g');

  if char_length(v_base) < 3 then
    v_base := 'user_' || right(replace(p_user_id::text, '-', ''), 8);
  end if;

  return left(v_base, 30);
end;
$$;

create or replace function public.available_profile_username(
  p_seed text,
  p_user_id uuid
)
returns text
language plpgsql
stable
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

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_display_name text;
  v_username_seed text;
begin
  v_display_name := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');
  v_username_seed := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    v_display_name,
    nullif(trim(new.email), ''),
    'user'
  );

  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_url
  )
  values (
    new.id,
    public.available_profile_username(v_username_seed, new.id),
    v_display_name,
    nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_auth_users_create_profile on auth.users;
create trigger trg_auth_users_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();

create or replace function public.create_responsible_gaming_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.responsible_gaming_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_profiles_create_responsible_gaming
  on public.profiles;
create trigger trg_profiles_create_responsible_gaming
  after insert on public.profiles
  for each row execute function public.create_responsible_gaming_for_profile();

do $$
declare
  v_user auth.users%rowtype;
begin
  for v_user in
    select *
    from auth.users u
    where not exists (
      select 1
      from public.profiles p
      where p.id = u.id
    )
    order by u.created_at, u.id
  loop
    insert into public.profiles (
      id,
      username,
      display_name,
      avatar_url
    )
    values (
      v_user.id,
      public.available_profile_username(
        coalesce(
          nullif(trim(v_user.raw_user_meta_data->>'username'), ''),
          nullif(trim(v_user.raw_user_meta_data->>'display_name'), ''),
          nullif(trim(v_user.email), ''),
          'user'
        ),
        v_user.id
      ),
      nullif(trim(coalesce(v_user.raw_user_meta_data->>'display_name', '')), ''),
      nullif(trim(coalesce(v_user.raw_user_meta_data->>'avatar_url', '')), '')
    )
    on conflict (id) do nothing;
  end loop;
end;
$$;

insert into public.responsible_gaming_settings (user_id)
select p.id
from public.profiles p
on conflict (user_id) do nothing;

revoke all on function public.normalize_profile_username(text, uuid)
from public, anon, authenticated;
revoke all on function public.available_profile_username(text, uuid)
from public, anon, authenticated;
revoke all on function public.create_profile_for_auth_user()
from public, anon, authenticated;
revoke all on function public.create_responsible_gaming_for_profile()
from public, anon, authenticated;
