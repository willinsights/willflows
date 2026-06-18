
ALTER TABLE public.video_versions
  ADD COLUMN IF NOT EXISTS replacement_stream_uid text,
  ADD COLUMN IF NOT EXISTS replacement_playback_url text,
  ADD COLUMN IF NOT EXISTS replacement_r2_key text,
  ADD COLUMN IF NOT EXISTS replacement_status text,
  ADD COLUMN IF NOT EXISTS replacement_file_name text,
  ADD COLUMN IF NOT EXISTS replacement_file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS replacement_thumbnail_path text,
  ADD COLUMN IF NOT EXISTS replaced_at timestamptz;
