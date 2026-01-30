-- Server-side feature gating function
-- Validates feature access based on workspace subscription plan

CREATE OR REPLACE FUNCTION public.can_access_feature(
  p_workspace_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_is_member BOOLEAN;
  v_feature_available BOOLEAN;
BEGIN
  -- First verify caller is a member of this workspace
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND is_active = true
  ) INTO v_is_member;
  
  IF NOT v_is_member THEN
    RETURN FALSE;
  END IF;
  
  -- Get workspace subscription plan
  SELECT COALESCE(subscription_plan, 'starter') INTO v_plan
  FROM workspaces
  WHERE id = p_workspace_id;
  
  -- Feature availability by plan
  -- Starter: Basic features, no chat/exports/integrations
  -- Pro: + chat, exports, google calendar
  -- Studio: + video approval, automations, API
  
  CASE p_feature
    -- Starter exclusives (blocked)
    WHEN 'chat' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'exportExcel' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'exportPdf' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'googleCalendar' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'googleMeet' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'reportsAdvanced' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'templates' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'crmComplete' THEN v_feature_available := v_plan IN ('pro', 'studio');
    
    -- Studio exclusives
    WHEN 'videoApproval' THEN v_feature_available := v_plan = 'studio';
    WHEN 'frameio' THEN v_feature_available := v_plan = 'studio';
    WHEN 'automations' THEN v_feature_available := v_plan = 'studio';
    WHEN 'api' THEN v_feature_available := v_plan = 'studio';
    WHEN 'permissions' THEN v_feature_available := v_plan = 'studio';
    
    -- Basic features available to all plans
    WHEN 'kanban' THEN v_feature_available := TRUE;
    WHEN 'crmBasic' THEN v_feature_available := TRUE;
    WHEN 'calendar' THEN v_feature_available := TRUE;
    WHEN 'mediaHub' THEN v_feature_available := TRUE;
    WHEN 'reportsBasic' THEN v_feature_available := TRUE;
    WHEN 'financialReports' THEN v_feature_available := TRUE;
    
    -- Unknown features default to FALSE for security
    ELSE v_feature_available := FALSE;
  END CASE;
  
  RETURN v_feature_available;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_access_feature(UUID, TEXT) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.can_access_feature IS 'Server-side feature gating based on workspace subscription plan. Returns TRUE if the calling user can access the specified feature for the given workspace.';