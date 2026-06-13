create unique index if not exists live_court_recordings_unique_provider_recording_idx
  on public.live_court_recordings (provider, provider_recording_id)
  where provider_recording_id is not null;
