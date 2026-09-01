-- 1. Central activity check
CREATE OR REPLACE FUNCTION public.workspace_is_active(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN w.subscription_status IN ('active', 'past_due') THEN true
      WHEN w.subscription_status = 'trialing'
        THEN (w.trial_ends_at IS NULL OR w.trial_ends_at > now())
      ELSE false
    END
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
  ), false);
$$;

-- 2. Plan resource limits
CREATE OR REPLACE FUNCTION public.get_plan_resource_limit(p_plan text, p_resource text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_resource
    WHEN 'projects' THEN CASE
      WHEN p_plan IN ('studio') THEN 999999
      WHEN p_plan IN ('pro') THEN 999
      ELSE 20
    END
    WHEN 'clients' THEN CASE
      WHEN p_plan IN ('studio') THEN 999999
      WHEN p_plan IN ('pro') THEN 100
      ELSE 20
    END
    ELSE 999999
  END;
$$;

-- 3. Subscription gate trigger
CREATE OR REPLACE FUNCTION public.enforce_workspace_subscription_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_service_role() THEN
    RETURN NEW;
  END IF;

  IF NEW.workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.workspace_is_active(NEW.workspace_id) THEN
    RAISE EXCEPTION 'A subscrição deste workspace expirou. Faça upgrade do plano para continuar a criar registos.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscription_active_projects ON public.projects;
CREATE TRIGGER trg_subscription_active_projects
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_subscription_active();

DROP TRIGGER IF EXISTS trg_subscription_active_clients ON public.clients;
CREATE TRIGGER trg_subscription_active_clients
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_subscription_active();

DROP TRIGGER IF EXISTS trg_subscription_active_tasks ON public.tasks;
CREATE TRIGGER trg_subscription_active_tasks
  BEFORE INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_subscription_active();

DROP TRIGGER IF EXISTS trg_subscription_active_work_logs ON public.work_logs;
CREATE TRIGGER trg_subscription_active_work_logs
  BEFORE INSERT ON public.work_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_subscription_active();

DROP TRIGGER IF EXISTS trg_subscription_active_video_versions ON public.video_versions;
CREATE TRIGGER trg_subscription_active_video_versions
  BEFORE INSERT ON public.video_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_workspace_subscription_active();

-- 4. Plan quota triggers (projects / clients)
CREATE OR REPLACE FUNCTION public.enforce_plan_project_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_limit int;
  v_count int;
BEGIN
  IF public.is_service_role() OR NEW.workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(subscription_plan::text, 'starter') INTO v_plan
  FROM public.workspaces WHERE id = NEW.workspace_id;

  v_limit := public.get_plan_resource_limit(COALESCE(v_plan, 'starter'), 'projects');

  SELECT COUNT(*)::int INTO v_count
  FROM public.projects WHERE workspace_id = NEW.workspace_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de % projetos atingido para o plano %. Faça upgrade do plano para criar mais projetos.', v_limit, v_plan
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_plan_client_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_limit int;
  v_count int;
BEGIN
  IF public.is_service_role() OR NEW.workspace_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(subscription_plan::text, 'starter') INTO v_plan
  FROM public.workspaces WHERE id = NEW.workspace_id;

  v_limit := public.get_plan_resource_limit(COALESCE(v_plan, 'starter'), 'clients');

  SELECT COUNT(*)::int INTO v_count
  FROM public.clients WHERE workspace_id = NEW.workspace_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Limite de % clientes atingido para o plano %. Faça upgrade do plano para adicionar mais clientes.', v_limit, v_plan
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_plan_project_limit ON public.projects;
CREATE TRIGGER trg_plan_project_limit
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_project_limit();

DROP TRIGGER IF EXISTS trg_plan_client_limit ON public.clients;
CREATE TRIGGER trg_plan_client_limit
  BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_client_limit();

-- 5. A1: workspace_storage limit no longer writable by workspace admins
DROP POLICY IF EXISTS "Workspace admins can manage storage" ON public.workspace_storage;
CREATE POLICY "Workspace admins can view storage"
  ON public.workspace_storage
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id));