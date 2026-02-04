-- 1. Create RLS policy for super admins to read all feedback
DROP POLICY IF EXISTS "Super admins can read all feedback" ON feedback;

CREATE POLICY "Super admins can read all feedback"
ON feedback FOR SELECT
TO authenticated
USING (
  (SELECT is_system_admin() AS is_admin)
);

-- 2. Create RLS policy for super admins to update feedback
DROP POLICY IF EXISTS "Super admins can update all feedback" ON feedback;

CREATE POLICY "Super admins can update all feedback"
ON feedback FOR UPDATE
TO authenticated
USING (
  (SELECT is_system_admin() AS is_admin)
);

-- 3. Create RLS policy for super admins to delete feedback
DROP POLICY IF EXISTS "Super admins can delete all feedback" ON feedback;

CREATE POLICY "Super admins can delete all feedback"
ON feedback FOR DELETE
TO authenticated
USING (
  (SELECT is_system_admin() AS is_admin)
);

-- 4. Update storage limit for workspace In-Sights to 1TB (1099511627776 bytes)
UPDATE workspace_storage 
SET 
  storage_limit_bytes = 1099511627776,
  base_storage_bytes = 1099511627776,
  updated_at = NOW()
WHERE workspace_id = '6ee9555c-1dbd-4503-8889-24f97226b202';

-- Insert if not exists
INSERT INTO workspace_storage (workspace_id, storage_limit_bytes, base_storage_bytes, storage_used_bytes)
SELECT 
  '6ee9555c-1dbd-4503-8889-24f97226b202',
  1099511627776,
  1099511627776,
  COALESCE((SELECT storage_used_bytes FROM workspace_storage WHERE workspace_id = '6ee9555c-1dbd-4503-8889-24f97226b202'), 0)
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_storage 
  WHERE workspace_id = '6ee9555c-1dbd-4503-8889-24f97226b202'
);