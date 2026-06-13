-- Private KYC document storage and KYC submit hardening.
-- Raw document images and full identity numbers must not be stored in JSONB.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'kyc-documents',
  'kyc-documents',
  false,
  8388608,
  array['image/png', 'image/jpeg']
)
on conflict (id) do update
  set name = excluded.name,
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "kyc_documents_user_insert" on storage.objects;

create policy "kyc_documents_user_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg')
  );

create or replace function public.submit_kyc_action(
  p_user_id   uuid,
  p_tier      text,
  p_documents jsonb
)
returns table (
  kyc_verification_id uuid,
  user_id             uuid,
  kyc_tier_requested  text,
  status              text,
  submitted_at        timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account_status text;
  v_contract       text;
  v_doc_image      jsonb;
  v_provider       text;
  v_reference      text;
  v_byte_size      bigint;
  v_id             uuid;
  v_submitted_at   timestamptz := now();
begin
  if p_tier not in ('kyc1', 'kyc2', 'kyc3') then
    raise exception 'invalid_kyc_tier' using errcode = 'P0001';
  end if;

  if p_documents is null or jsonb_typeof(p_documents) <> 'object' then
    raise exception 'invalid_kyc_documents' using errcode = 'P0001';
  end if;

  if p_documents ?| array[
    'bvn',
    'documentNumber',
    'legalFirstName',
    'legalLastName',
    'documentImageBase64',
    'imageBase64',
    'base64',
    'rawImage'
  ] then
    raise exception 'invalid_kyc_documents' using errcode = 'P0001';
  end if;

  v_contract := p_documents->>'contract';

  if v_contract = 'private_storage_v1' then
    v_doc_image := p_documents->'documentImage';
    v_provider := 'supabase_storage';
    v_reference := v_doc_image->>'storagePath';

    if p_documents->>'documentType' not in ('bvn', 'nin', 'passport')
      or (p_documents->>'documentNumberLast4') !~ '^[A-Z0-9]{4}$'
      or jsonb_typeof(p_documents->'legalName') <> 'object'
      or (p_documents->'legalName'->>'firstInitial') !~ '^[A-Z]$'
      or (p_documents->'legalName'->>'lastInitial') !~ '^[A-Z]$'
      or jsonb_typeof(v_doc_image) <> 'object'
      or v_doc_image->>'storageBucket' <> 'kyc-documents'
      or (v_doc_image->>'mimeType') not in ('image/png', 'image/jpeg')
      or nullif(v_reference, '') is null
      or v_reference not like p_user_id::text || '/%'
      or v_reference like '%..%'
      or v_reference like '%//%'
      or coalesce(v_doc_image->>'byteSize', '') !~ '^[0-9]{1,8}$'
      or char_length(coalesce(v_doc_image->>'originalFileName', '')) < 1
      or char_length(coalesce(v_doc_image->>'originalFileName', '')) > 180 then
      raise exception 'invalid_kyc_documents' using errcode = 'P0001';
    end if;

    v_byte_size := (v_doc_image->>'byteSize')::bigint;
    if v_byte_size < 1 or v_byte_size > 8388608 then
      raise exception 'invalid_kyc_documents' using errcode = 'P0001';
    end if;

    if (v_doc_image->>'mimeType') = 'image/png'
      and lower(v_reference) not like '%.png' then
      raise exception 'invalid_kyc_documents' using errcode = 'P0001';
    end if;

    if (v_doc_image->>'mimeType') = 'image/jpeg'
      and lower(v_reference) not like '%.jpg'
      and lower(v_reference) not like '%.jpeg' then
      raise exception 'invalid_kyc_documents' using errcode = 'P0001';
    end if;
  elsif v_contract = 'provider_reference_v1' then
    v_provider := p_documents->>'provider';
    v_reference := p_documents->>'providerReference';

    if p_documents->>'documentType' not in ('bvn', 'nin', 'passport')
      or (p_documents->>'documentNumberLast4') !~ '^[A-Z0-9]{4}$'
      or jsonb_typeof(p_documents->'legalName') <> 'object'
      or (p_documents->'legalName'->>'firstInitial') !~ '^[A-Z]$'
      or (p_documents->'legalName'->>'lastInitial') !~ '^[A-Z]$'
      or v_provider not in ('dojah', 'prembly', 'smile_identity')
      or v_reference !~ '^[A-Za-z0-9:_-]{8,180}$' then
      raise exception 'invalid_kyc_documents' using errcode = 'P0001';
    end if;
  else
    raise exception 'invalid_kyc_documents' using errcode = 'P0001';
  end if;

  select account_status into v_account_status
  from profiles
  where id = p_user_id;

  if not found then
    raise exception 'user_not_found' using errcode = 'P0001';
  end if;

  if v_account_status <> 'active' then
    raise exception 'account_not_active' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from kyc_verifications
    where kyc_verifications.user_id = p_user_id
      and kyc_verifications.kyc_tier_requested = p_tier
      and kyc_verifications.status = 'pending'
  ) then
    raise exception 'kyc_verification_pending' using errcode = 'P0003';
  end if;

  insert into kyc_verifications (
    user_id,
    kyc_tier_requested,
    provider,
    provider_reference,
    documents,
    submitted_at
  )
  values (
    p_user_id,
    p_tier,
    v_provider,
    v_reference,
    p_documents,
    v_submitted_at
  )
  returning id into v_id;

  return query
    select v_id, p_user_id, p_tier, 'pending'::text, v_submitted_at;
end;
$$;

revoke all on function public.submit_kyc_action(uuid, text, jsonb)
from public, anon, authenticated;

grant execute on function public.submit_kyc_action(uuid, text, jsonb)
to service_role;

revoke all on table public.kyc_verifications from anon, authenticated;
