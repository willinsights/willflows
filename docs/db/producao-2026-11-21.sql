-- =====================================================================
-- WillFlow — alterações aplicadas DIRETAMENTE em produção a 2026-11-21
-- (com autorização do proprietário, fora das migrações do repositório)
--
-- ESTE FICHEIRO É UM REGISTO, NÃO UMA MIGRAÇÃO.
-- Não está em supabase/migrations nem em drizzle/migrations de propósito:
-- a plataforma de alojamento pode aplicar migrações novas automaticamente,
-- e estas alterações já existem na base de dados. Servem para:
--   1) reconstruir a base de dados do zero com o comportamento atual;
--   2) evitar que uma migração antiga reaplicada apague estas regras
--      (ex.: a can_access_feature das migrações de 2026-01 NÃO tem a exceção
--       do teste válido e a migração 20260901102920 tem a workspace_is_active antiga).
-- Extraído de produção com pg_get_functiondef / pg_get_triggerdef.
-- =====================================================================

-- 1. Colunas novas -----------------------------------------------------
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS past_due_since timestamptz;

-- 2. Permissões ---------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.verify_invitation_token(text) FROM PUBLIC, anon, authenticated;

-- 3. Funções ------------------------------------------------------------
-- 3.1 Acesso a funcionalidades: teste válido = todas as funcionalidades (Studio)
CREATE OR REPLACE FUNCTION public.can_access_feature(p_workspace_id uuid, p_feature text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan TEXT;
  v_is_member BOOLEAN;
  v_feature_available BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
    AND user_id = auth.uid()
    AND is_active = true
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN FALSE;
  END IF;

  SELECT COALESCE(subscription_plan, 'starter') INTO v_plan
  FROM workspaces
  WHERE id = p_workspace_id;

  -- Valid trial: all features as Studio (owner decision, 2026-11-21)
  IF EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = p_workspace_id
      AND subscription_status = 'trialing'
      AND trial_ends_at > now()
  ) THEN
    v_plan := 'studio';
  END IF;

  CASE p_feature
    WHEN 'chat' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'exportExcel' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'exportPdf' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'googleCalendar' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'googleMeet' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'reportsAdvanced' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'templates' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'crmComplete' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'videoApproval' THEN v_feature_available := v_plan = 'studio';
    WHEN 'frameio' THEN v_feature_available := v_plan = 'studio';
    WHEN 'automations' THEN v_feature_available := v_plan = 'studio';
    WHEN 'api' THEN v_feature_available := v_plan = 'studio';
    WHEN 'permissions' THEN v_feature_available := v_plan = 'studio';
    WHEN 'kanban' THEN v_feature_available := TRUE;
    WHEN 'crmBasic' THEN v_feature_available := TRUE;
    WHEN 'calendar' THEN v_feature_available := TRUE;
    WHEN 'mediaHub' THEN v_feature_available := TRUE;
    WHEN 'reportsBasic' THEN v_feature_available := TRUE;
    WHEN 'financialReports' THEN v_feature_available := TRUE;
    ELSE v_feature_available := FALSE;
  END CASE;

  RETURN v_feature_available;
END;
$function$;

-- 3.2 Criação de workspace: um teste por conta, limite por plano (1/3/10),
--     dono = criador, ligação à subscrição Stripe da conta
CREATE OR REPLACE FUNCTION public.create_workspace_with_admin(p_name text, p_slug text, p_country country_region DEFAULT 'PT'::country_region, p_currency text DEFAULT 'EUR'::text, p_locale text DEFAULT 'pt-PT'::text, p_timezone text DEFAULT 'Europe/Lisbon'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_workspace_id uuid;
  v_user_id uuid;
  v_is_super_admin boolean;
  v_plan subscription_plan;
  v_status text;
  v_trial_ends timestamptz;
  v_us_plan subscription_plan;
  v_us_status text;
  v_us_trial_started timestamptz;
  v_us_trial_ends timestamptz;
  v_us_customer text;
  v_us_subscription text;
  v_owned integer;
  v_limit integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.system_admins WHERE user_id = v_user_id
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    v_plan := 'studio';
    v_status := 'active';
    v_trial_ends := NULL;
  ELSE
    INSERT INTO public.user_subscriptions (user_id, subscription_plan, subscription_status)
    VALUES (v_user_id, 'essencial', 'trialing')
    ON CONFLICT DO NOTHING;

    SELECT us.subscription_plan, us.subscription_status::text, us.trial_started_at,
           us.trial_ends_at, us.stripe_customer_id, us.stripe_subscription_id
      INTO v_us_plan, v_us_status, v_us_trial_started,
           v_us_trial_ends, v_us_customer, v_us_subscription
    FROM public.user_subscriptions us
    WHERE us.user_id = v_user_id
    FOR UPDATE;

    SELECT count(*) INTO v_owned
    FROM public.workspaces
    WHERE owner_id = v_user_id;

    IF v_us_status = 'active' THEN
      v_limit := CASE v_us_plan::text WHEN 'studio' THEN 10 WHEN 'pro' THEN 3 ELSE 1 END;
    ELSE
      v_limit := 1;
    END IF;

    IF v_owned >= v_limit THEN
      RAISE EXCEPTION 'WORKSPACE_LIMIT_REACHED' USING ERRCODE = 'P0001';
    END IF;

    IF v_us_status = 'active' THEN
      v_plan := v_us_plan;
      v_status := 'active';
      v_trial_ends := NULL;
    ELSIF v_us_trial_started IS NULL THEN
      v_plan := 'essencial';
      v_status := 'trialing';
      v_trial_ends := now() + interval '7 days';
      UPDATE public.user_subscriptions
        SET trial_started_at = now(),
            trial_ends_at = v_trial_ends,
            subscription_plan = 'essencial',
            subscription_status = 'trialing'
      WHERE user_id = v_user_id;
    ELSIF v_us_trial_ends IS NOT NULL AND v_us_trial_ends > now() THEN
      v_plan := 'essencial';
      v_status := 'trialing';
      v_trial_ends := v_us_trial_ends;
    ELSE
      RAISE EXCEPTION 'TRIAL_ALREADY_USED' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO workspaces (
    name, slug, country, currency, locale, timezone,
    subscription_status, subscription_plan, trial_ends_at,
    stripe_customer_id, stripe_subscription_id, owner_id
  )
  VALUES (
    p_name, p_slug, p_country, p_currency, p_locale, p_timezone,
    v_status, v_plan, v_trial_ends,
    CASE WHEN v_status = 'active' THEN v_us_customer END,
    CASE WHEN v_status = 'active' THEN v_us_subscription END,
    v_user_id
  )
  RETURNING id INTO v_workspace_id;

  INSERT INTO workspace_members (workspace_id, user_id, role, is_active, joined_at)
  VALUES (v_workspace_id, v_user_id, 'admin', true, now());

  PERFORM initialize_workspace_permissions(v_workspace_id);

  RETURN v_workspace_id;
END;
$function$;

-- 3.3 Workspace ativo: pagamento em atraso com 7 dias de tolerância;
--     teste só é válido com data de fim no futuro
CREATE OR REPLACE FUNCTION public.workspace_is_active(p_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE((
    SELECT CASE
      WHEN w.subscription_status = 'active' THEN true
      WHEN w.subscription_status = 'past_due'
        THEN COALESCE(w.past_due_since, now()) > now() - interval '7 days'
      WHEN w.subscription_status = 'trialing'
        THEN w.trial_ends_at IS NOT NULL AND w.trial_ends_at > now()
      ELSE false
    END
    FROM public.workspaces w WHERE w.id = p_workspace_id
  ), false);
$function$;

-- 3.4 Guarda de acesso no resumo de tempo de projeto
CREATE OR REPLACE FUNCTION public.get_project_time_summary(p_project_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_total_active integer;
  v_first_started timestamptz;
  v_delivered_at timestamptz;
  v_rework_count integer;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id
      AND public.is_workspace_member(auth.uid(), p.workspace_id)
  ) THEN
    RAISE EXCEPTION 'Sem acesso a este projeto' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(SUM(
    CASE WHEN ended_at IS NOT NULL THEN duration_seconds
    ELSE EXTRACT(EPOCH FROM (now() - started_at))::integer
    END
  ), 0)
  INTO v_total_active
  FROM time_sessions
  WHERE project_id = p_project_id;

  SELECT MIN(started_at) INTO v_first_started
  FROM time_sessions WHERE project_id = p_project_id;

  SELECT delivered_at INTO v_delivered_at
  FROM projects WHERE id = p_project_id;

  SELECT COUNT(*) INTO v_rework_count
  FROM kanban_column_transitions kct
  JOIN kanban_columns kc_from ON kc_from.id = kct.from_column_id
  JOIN kanban_columns kc_to ON kc_to.id = kct.to_column_id
  WHERE kct.project_id = p_project_id
    AND kc_to.position < kc_from.position;

  SELECT jsonb_build_object(
    'total_active_seconds', v_total_active,
    'total_cycle_seconds', CASE
      WHEN v_first_started IS NOT NULL AND v_delivered_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (v_delivered_at - v_first_started))::integer
      WHEN v_first_started IS NOT NULL
      THEN EXTRACT(EPOCH FROM (now() - v_first_started))::integer
      ELSE 0
    END,
    'rework_count', COALESCE(v_rework_count, 0),
    'first_started_at', v_first_started,
    'delivered_at', v_delivered_at,
    'column_breakdown', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'column_id', sub.to_column_id,
        'column_name', kc.name,
        'total_seconds', sub.total_seconds,
        'entry_count', sub.entry_count
      ))
      FROM (
        SELECT
          kct.to_column_id,
          COUNT(*) as entry_count,
          SUM(
            EXTRACT(EPOCH FROM (
              COALESCE(
                (SELECT MIN(kct2.moved_at) FROM kanban_column_transitions kct2
                 WHERE kct2.project_id = kct.project_id AND kct2.moved_at > kct.moved_at),
                COALESCE(v_delivered_at, now())
              ) - kct.moved_at
            ))::integer
          ) as total_seconds
        FROM kanban_column_transitions kct
        WHERE kct.project_id = p_project_id
        GROUP BY kct.to_column_id
      ) sub
      JOIN kanban_columns kc ON kc.id = sub.to_column_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- 3.5 Resumo mensal: verificação de permissão (versão aplicada pela plataforma;
--     depende de get_monthly_summary_unchecked, criada pela mesma alteração)
CREATE OR REPLACE FUNCTION public.get_monthly_summary(p_workspace_id uuid, p_year integer, p_month integer)
 RETURNS TABLE(total_revenue numeric, total_cost numeric, total_profit numeric, margin_percent numeric, project_count bigint, delivered_count bigint, team_payments_pending numeric, team_payments_paid numeric, extras_pending numeric, extras_paid numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND NOT coalesce(public.has_workspace_permission(auth.uid(), p_workspace_id, 'payments.view'), false) THEN
    RAISE EXCEPTION 'Sem acesso aos dados financeiros' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.get_monthly_summary_unchecked(p_workspace_id, p_year, p_month);
END;
$function$;

-- 3.6 Funções de trigger
CREATE OR REPLACE FUNCTION public.prevent_conversation_member_identity_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Não é permitido alterar a conversa ou o utilizador de um membro'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.guard_workspace_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'Workspace owner cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.track_workspace_past_due()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.subscription_status = 'past_due' THEN
    IF TG_OP = 'INSERT' OR OLD.subscription_status IS DISTINCT FROM 'past_due' THEN
      NEW.past_due_since := now();
    END IF;
  ELSE
    NEW.past_due_since := NULL;
  END IF;
  RETURN NEW;
END $function$;

-- 4. Triggers -------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_prevent_conv_member_identity_change ON public.conversation_members;
CREATE TRIGGER trg_prevent_conv_member_identity_change BEFORE UPDATE OF conversation_id, user_id ON public.conversation_members FOR EACH ROW EXECUTE FUNCTION prevent_conversation_member_identity_change();
DROP TRIGGER IF EXISTS trg_guard_workspace_owner ON public.workspaces;
CREATE TRIGGER trg_guard_workspace_owner BEFORE UPDATE OF owner_id ON public.workspaces FOR EACH ROW EXECUTE FUNCTION guard_workspace_owner();
DROP TRIGGER IF EXISTS trg_track_workspace_past_due ON public.workspaces;
CREATE TRIGGER trg_track_workspace_past_due BEFORE INSERT OR UPDATE OF subscription_status ON public.workspaces FOR EACH ROW EXECUTE FUNCTION track_workspace_past_due();
DROP TRIGGER IF EXISTS trg_subscription_active_projects_upd ON public.projects;
CREATE TRIGGER trg_subscription_active_projects_upd BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION enforce_workspace_subscription_active();
DROP TRIGGER IF EXISTS trg_subscription_active_clients_upd ON public.clients;
CREATE TRIGGER trg_subscription_active_clients_upd BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION enforce_workspace_subscription_active();
DROP TRIGGER IF EXISTS trg_subscription_active_tasks_upd ON public.tasks;
CREATE TRIGGER trg_subscription_active_tasks_upd BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION enforce_workspace_subscription_active();
DROP TRIGGER IF EXISTS trg_subscription_active_work_logs_upd ON public.work_logs;
CREATE TRIGGER trg_subscription_active_work_logs_upd BEFORE UPDATE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION enforce_workspace_subscription_active();
DROP TRIGGER IF EXISTS trg_subscription_active_video_versions_upd ON public.video_versions;
CREATE TRIGGER trg_subscription_active_video_versions_upd BEFORE UPDATE ON public.video_versions FOR EACH ROW EXECUTE FUNCTION enforce_workspace_subscription_active();

-- 5. Alterações de DADOS feitas no mesmo dia (não repetir; só registo) ----
-- * user_subscriptions.trial_started_at preenchido a partir do primeiro workspace de admin de cada conta.
-- * workspaces.owner_id preenchido com o primeiro administrador ativo de cada workspace.
-- * Apagados 4 workspaces vazios de teste e alinhados 6 workspaces com o plano da conta do dono.
-- * Removida uma entrada órfã em system_admins (fica só a conta do proprietário).
