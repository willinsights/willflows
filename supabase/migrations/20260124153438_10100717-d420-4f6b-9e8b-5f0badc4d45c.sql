-- Backfill payment_amount for all existing project_team members
-- Only updates records where payment_amount is NULL (preserves manual edits)

-- Update captacao team members
UPDATE project_team pt
SET payment_amount = (
  SELECT COALESCE(p.custo_captacao, 0) / NULLIF(
    (SELECT COUNT(*) FROM project_team pt2 WHERE pt2.project_id = pt.project_id AND pt2.phase = 'captacao'),
    0
  )
  FROM projects p
  WHERE p.id = pt.project_id
)
WHERE pt.phase = 'captacao'
  AND pt.payment_amount IS NULL;

-- Update edicao team members
UPDATE project_team pt
SET payment_amount = (
  SELECT COALESCE(p.custo_edicao, 0) / NULLIF(
    (SELECT COUNT(*) FROM project_team pt2 WHERE pt2.project_id = pt.project_id AND pt2.phase = 'edicao'),
    0
  )
  FROM projects p
  WHERE p.id = pt.project_id
)
WHERE pt.phase = 'edicao'
  AND pt.payment_amount IS NULL;