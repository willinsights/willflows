
-- Add onboarding fields to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_business_type text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Per-user dismissal state for the checklist (per workspace)
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS onboarding_state jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill: existing workspaces with any project are considered "onboarded"
UPDATE public.workspaces w
SET onboarding_completed = true,
    onboarding_completed_at = COALESCE(onboarding_completed_at, now())
WHERE onboarding_completed = false
  AND EXISTS (SELECT 1 FROM public.projects p WHERE p.workspace_id = w.id);

-- RPC: mark onboarding complete + store business type
-- Validates caller is an admin of the workspace
CREATE OR REPLACE FUNCTION public.complete_workspace_onboarding(
  p_workspace_id uuid,
  p_business_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_business_type NOT IN ('freelancer','studio','agency') THEN
    RAISE EXCEPTION 'invalid business_type: %', p_business_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = auth.uid()
      AND role = 'admin'::app_role
      AND COALESCE(is_active, true) = true
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.workspaces
  SET onboarding_completed = true,
      onboarding_business_type = p_business_type,
      onboarding_completed_at = now(),
      updated_at = now()
  WHERE id = p_workspace_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_workspace_onboarding(uuid, text) TO authenticated;
