-- ============================================================
-- evidence_upload_rpcs.sql
-- Evidence upload request and confirmation actions.
-- ============================================================

create or replace function public.create_evidence_upload_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_file_name text,
  p_mime_type text,
  p_file_size_bytes bigint
)
returns table (
  evidence_object_id uuid,
  dare_id uuid,
  user_id uuid,
  storage_bucket text,
  storage_path text,
  media_type text,
  byte_size bigint,
  status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare dares%rowtype;
  v_evidence_id uuid := gen_random_uuid();
  v_extension text;
  v_path text;
  v_existing_count integer;
begin
  if p_file_name is null
    or char_length(trim(p_file_name)) < 1
    or char_length(trim(p_file_name)) > 180 then
    raise exception 'invalid_evidence_file_name' using errcode = 'P0001';
  end if;

  if p_mime_type not in ('image/png', 'image/jpeg', 'video/mp4') then
    raise exception 'invalid_evidence_mime_type' using errcode = 'P0001';
  end if;

  if p_file_size_bytes is null
    or p_file_size_bytes < 1
    or p_file_size_bytes > 10485760 then
    raise exception 'invalid_evidence_file_size' using errcode = 'P0001';
  end if;

  select *
    into v_dare
  from dares d
  where d.id = p_dare_id;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_user_id <> v_dare.issuer_id and p_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  if v_dare.status not in ('completed', 'dispute_pending', 'jury_open') then
    raise exception 'invalid_dare_state' using errcode = 'P0001';
  end if;

  select count(*)
    into v_existing_count
  from evidence_objects eo
  where eo.dare_id = p_dare_id
    and eo.user_id = p_user_id
    and eo.status <> 'deleted';

  if v_existing_count >= 5 then
    raise exception 'evidence_limit_exceeded' using errcode = 'P0001';
  end if;

  v_extension := case p_mime_type
    when 'image/png' then '.png'
    when 'image/jpeg' then '.jpg'
    when 'video/mp4' then '.mp4'
  end;
  v_path := p_dare_id::text || '/' || p_user_id::text || '/' ||
    v_evidence_id::text || v_extension;

  insert into evidence_objects (
    id,
    dare_id,
    user_id,
    storage_bucket,
    storage_path,
    media_type,
    byte_size,
    status,
    metadata
  )
  values (
    v_evidence_id,
    p_dare_id,
    p_user_id,
    'dare-evidence',
    v_path,
    p_mime_type,
    p_file_size_bytes,
    'pending',
    jsonb_build_object('original_file_name', trim(p_file_name))
  );

  evidence_object_id := v_evidence_id;
  dare_id := p_dare_id;
  user_id := p_user_id;
  storage_bucket := 'dare-evidence';
  storage_path := v_path;
  media_type := p_mime_type;
  byte_size := p_file_size_bytes;
  status := 'pending';
  return next;
end;
$$;

create or replace function public.confirm_evidence_upload_action(
  p_user_id uuid,
  p_dare_id uuid,
  p_evidence_object_id uuid,
  p_content_hash text default null
)
returns table (
  evidence_object_id uuid,
  jury_case_id uuid,
  dare_id uuid,
  side text,
  status text,
  uploaded_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dare dares%rowtype;
  v_evidence evidence_objects%rowtype;
  v_case jury_cases%rowtype;
  v_side text;
begin
  if p_content_hash is not null
    and (
      char_length(p_content_hash) < 16
      or char_length(p_content_hash) > 128
    ) then
    raise exception 'invalid_evidence_content_hash' using errcode = 'P0001';
  end if;

  select *
    into v_dare
  from dares d
  where d.id = p_dare_id;

  if not found then
    raise exception 'dare_not_found' using errcode = 'P0001';
  end if;

  if p_user_id <> v_dare.issuer_id and p_user_id <> v_dare.challenger_id then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;

  select *
    into v_evidence
  from evidence_objects eo
  where eo.id = p_evidence_object_id
    and eo.dare_id = p_dare_id
    and eo.user_id = p_user_id
  for update;

  if not found then
    raise exception 'evidence_not_found' using errcode = 'P0001';
  end if;

  if v_evidence.status not in ('pending', 'uploaded') then
    raise exception 'invalid_evidence_state' using errcode = 'P0001';
  end if;

  select *
    into v_case
  from jury_cases jc
  where jc.dare_id = p_dare_id
    and jc.status in (
      'filed',
      'accepted_for_review',
      'jury_assignment',
      'jury_voting'
    )
  order by jc.opened_at desc
  limit 1
  for update;

  if not found then
    raise exception 'jury_case_not_found' using errcode = 'P0001';
  end if;

  v_side := case when p_user_id = v_dare.issuer_id then 'A' else 'B' end;

  if v_side = 'A'
    and v_case.evidence_a_id is not null
    and v_case.evidence_a_id <> p_evidence_object_id then
    raise exception 'evidence_slot_filled' using errcode = 'P0001';
  end if;

  if v_side = 'B'
    and v_case.evidence_b_id is not null
    and v_case.evidence_b_id <> p_evidence_object_id then
    raise exception 'evidence_slot_filled' using errcode = 'P0001';
  end if;

  update evidence_objects eo
    set status = 'uploaded',
        uploaded_at = coalesce(eo.uploaded_at, now()),
        content_hash = coalesce(p_content_hash, eo.content_hash)
  where eo.id = p_evidence_object_id
  returning * into v_evidence;

  update jury_cases jc
    set evidence_a_id = case
          when v_side = 'A' then p_evidence_object_id
          else jc.evidence_a_id
        end,
        evidence_b_id = case
          when v_side = 'B' then p_evidence_object_id
          else jc.evidence_b_id
        end
  where jc.id = v_case.id
  returning * into v_case;

  evidence_object_id := v_evidence.id;
  jury_case_id := v_case.id;
  dare_id := p_dare_id;
  side := v_side;
  status := v_evidence.status;
  uploaded_at := v_evidence.uploaded_at;
  return next;
end;
$$;

revoke all on function public.create_evidence_upload_action(
  uuid, uuid, text, text, bigint
) from public, anon, authenticated;

revoke all on function public.confirm_evidence_upload_action(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.create_evidence_upload_action(
  uuid, uuid, text, text, bigint
) to service_role;

grant execute on function public.confirm_evidence_upload_action(
  uuid, uuid, uuid, text
) to service_role;
