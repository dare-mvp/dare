create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter function public.create_dare_action(
  uuid,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) set search_path = public, extensions, pg_temp;

alter function public.submit_dare_answer_action(
  uuid,
  uuid,
  uuid,
  text
) set search_path = public, extensions, pg_temp;
