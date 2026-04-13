-- Backfill video_approvals project_id from video_versions
UPDATE video_approvals va
SET project_id = vv.project_id
FROM video_versions vv
WHERE va.video_version_id = vv.id
  AND va.project_id IS NULL
  AND vv.project_id IS NOT NULL;