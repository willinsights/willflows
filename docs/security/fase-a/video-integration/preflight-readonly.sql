-- WillFlow 2.0 video/quota: READ-ONLY operational preflight.
-- Run with read-only access to the target environment.
-- Does not apply migrations, pause jobs, or prove a recoverable backup.
BEGIN READ ONLY;

-- Required shape. Any missing column/trigger is a hard NO-GO.
SELECT 'schema' AS section,table_name,column_name,data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND (table_name='workspace_storage' AND column_name IN
      ('workspace_id','storage_used_bytes','storage_limit_bytes','base_storage_bytes','extra_storage_bytes')
    OR table_name='video_versions' AND column_name IN
      ('id','workspace_id','is_deleted','file_size_bytes','replacement_file_size_bytes','r2_key','replacement_r2_key','cloudflare_stream_uid'))
ORDER BY table_name,column_name;

-- Identify actual trigger definitions; source commits do not prove deployment.
SELECT c.relname AS relation,t.tgname,pg_get_triggerdef(t.oid) AS active_definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('workspace_storage','video_versions')
AND NOT t.tgisinternal ORDER BY c.relname,t.tgname;

-- Inspect all quota writers without executing them.
SELECT n.nspname AS schema,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
       md5(pg_get_functiondef(p.oid)) AS source_md5
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND (
   p.proname ILIKE '%quota%' OR p.proname ILIKE '%storage%'
   OR p.proname IN ('add_workspace_storage','sync_workspace_storage_from_video_versions')
) ORDER BY p.proname;

-- Aggregate-only anomaly counts; does not expose client IDs.
WITH totals AS (
 SELECT s.workspace_id,s.storage_used_bytes,s.storage_limit_bytes,
        coalesce(sum(
          CASE WHEN v.is_deleted IS NOT TRUE THEN
          coalesce(v.file_size_bytes,0)+coalesce(v.replacement_file_size_bytes,0)
          ELSE 0 END
        ),0) AS computed
 FROM public.workspace_storage s
 LEFT JOIN public.video_versions v ON v.workspace_id=s.workspace_id
 GROUP BY s.workspace_id,s.storage_used_bytes,s.storage_limit_bytes
)
SELECT count(*) AS workspaces_checked,
       count(*) FILTER(WHERE storage_used_bytes IS DISTINCT FROM computed) AS counter_mismatches,
       count(*) FILTER(WHERE storage_used_bytes<0 OR storage_limit_bytes<0 OR storage_used_bytes>storage_limit_bytes) AS invalid_counters,
       count(*) FILTER(WHERE storage_limit_bytes IS NULL) AS missing_limit
FROM totals;

-- The counter-led aggregate above cannot see versions without a storage row.
SELECT count(*) AS versions_without_storage
FROM public.video_versions v
WHERE NOT EXISTS (
  SELECT 1 FROM public.workspace_storage s WHERE s.workspace_id = v.workspace_id
);

-- Backup/restore and HTTP job drain are external operational requirements
-- and cannot be inferred from catalog SELECTs.
ROLLBACK;
