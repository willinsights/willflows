-- Backfill video_approvals with project_id from tasks
UPDATE video_approvals va
SET project_id = t.project_id
FROM tasks t
WHERE va.task_id = t.id
  AND va.project_id IS NULL
  AND t.project_id IS NOT NULL;