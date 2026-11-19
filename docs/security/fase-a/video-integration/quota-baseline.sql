-- Read-only. Each row describes one divergent counter; object names stay inside the database.
SELECT s.workspace_id, s.storage_used_bytes AS stored_bytes, v.active_bytes, v.active_versions,
       v.unverified_sizes, v.snapshot_hash
FROM public.workspace_storage AS s
CROSS JOIN LATERAL (
  SELECT COALESCE(sum(COALESCE(file_size_bytes,0)::numeric + COALESCE(replacement_file_size_bytes,0)),0) AS active_bytes,
         count(*) AS active_versions,
         count(*) FILTER (WHERE file_size_bytes IS NULL OR file_size_bytes <= 0
             OR replacement_file_size_bytes < 0
             OR (replacement_r2_key IS NOT NULL AND COALESCE(replacement_file_size_bytes,0) = 0)) AS unverified_sizes,
         encode(sha256(convert_to(COALESCE(jsonb_agg(jsonb_build_array(
             id, file_size_bytes, replacement_file_size_bytes, r2_key, replacement_r2_key, file_path
           ) ORDER BY id)::text, '[]'), 'UTF8')), 'hex') AS snapshot_hash
  FROM public.video_versions
  WHERE workspace_id = s.workspace_id AND is_deleted IS NOT TRUE
) AS v
WHERE s.storage_used_bytes IS DISTINCT FROM v.active_bytes;
