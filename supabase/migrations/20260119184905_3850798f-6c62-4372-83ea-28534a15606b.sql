-- 1. Tabela de audit log para ações administrativas
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para performance
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_admin_user_id ON public.admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);

-- RLS para admin_audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system admins can view audit logs"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_system_admin());

CREATE POLICY "Only system admins can insert audit logs"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.is_system_admin());

-- 2. Tabela de log de webhooks Stripe
CREATE TABLE public.stripe_webhook_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  error_message TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para performance
CREATE INDEX idx_stripe_webhook_log_created_at ON public.stripe_webhook_log(created_at DESC);
CREATE INDEX idx_stripe_webhook_log_status ON public.stripe_webhook_log(status);
CREATE INDEX idx_stripe_webhook_log_event_type ON public.stripe_webhook_log(event_type);

-- RLS para stripe_webhook_log
ALTER TABLE public.stripe_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system admins can view webhook logs"
  ON public.stripe_webhook_log FOR SELECT
  USING (public.is_system_admin());

CREATE POLICY "Service role can manage webhook logs"
  ON public.stripe_webhook_log FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- 3. Adicionar campos ao profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 4. Adicionar campos ao feedback
ALTER TABLE public.feedback 
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 5. Função helper para registar audit log
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can log admin actions';
  END IF;

  INSERT INTO public.admin_audit_log (admin_user_id, action, target_type, target_id, details)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, p_details)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;