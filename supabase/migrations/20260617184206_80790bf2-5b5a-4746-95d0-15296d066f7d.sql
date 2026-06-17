
-- Seat-limit enforcement on workspace_members
-- Blocks INSERT or reactivation (UPDATE is_active false→true) when active members
-- would exceed the plan limit. 'starter'=2, 'pro'=10, 'studio'=999.
-- Legacy 'essencial' is treated as 'starter'.

CREATE OR REPLACE FUNCTION public.get_plan_seat_limit(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_plan IN ('studio') THEN 999
    WHEN p_plan IN ('pro')    THEN 10
    WHEN p_plan IN ('starter','essencial') THEN 2
    ELSE 2
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_workspace_seat_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_limit int;
  v_active_count int;
  v_is_new_seat boolean := false;
BEGIN
  -- Determine if this operation consumes a new seat
  IF TG_OP = 'INSERT' THEN
    v_is_new_seat := COALESCE(NEW.is_active, true);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reactivation: inactive → active
    IF COALESCE(OLD.is_active, false) = false AND COALESCE(NEW.is_active, false) = true THEN
      v_is_new_seat := true;
    END IF;
  END IF;

  IF NOT v_is_new_seat THEN
    RETURN NEW;
  END IF;

  -- Resolve plan from workspace
  SELECT COALESCE(subscription_plan::text, 'starter')
    INTO v_plan
  FROM public.workspaces
  WHERE id = NEW.workspace_id;

  v_limit := public.get_plan_seat_limit(COALESCE(v_plan, 'starter'));

  -- Count currently active members (excluding this row if updating it)
  SELECT COUNT(*)::int INTO v_active_count
  FROM public.workspace_members
  WHERE workspace_id = NEW.workspace_id
    AND is_active = true
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF v_active_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de % utilizadores atingido para o plano %. Faça upgrade do plano para adicionar mais membros.',
      v_limit, v_plan
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_workspace_seat_limit ON public.workspace_members;

CREATE TRIGGER trg_enforce_workspace_seat_limit
BEFORE INSERT OR UPDATE OF is_active ON public.workspace_members
FOR EACH ROW
EXECUTE FUNCTION public.enforce_workspace_seat_limit();
