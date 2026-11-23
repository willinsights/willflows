-- S6 — CANDIDATO, NÃO APLICAR sem aprovação do proprietário.
-- 1) Chat: o autor pode editar o texto, mas nunca mudar a conversa, o autor,
--    o fio (parent_message_id) nem a data de criação de uma mensagem.
-- 2) Push: a subscrição gravada tem de ter a forma de uma Web Push válida para
--    um serviço de browser conhecido (mesma lista de _shared/push-endpoint.ts).
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_message_identity() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.parent_message_id IS DISTINCT FROM OLD.parent_message_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'MESSAGE_IDENTITY_IMMUTABLE' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_message_identity ON public.messages;
CREATE TRIGGER trg_guard_message_identity BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_message_identity();

-- A política de UPDATE do autor passa a ter WITH CHECK explícito e a exigir
-- que continue membro da conversa.
DROP POLICY IF EXISTS "Authors can update messages" ON public.messages;
CREATE POLICY "Authors can update messages" ON public.messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.is_trusted_push_subscription(p jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE ep text; host text;
BEGIN
  IF p IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(p) <> 'object' OR octet_length(p::text) > 2048 THEN RETURN false; END IF;
  ep := p->>'endpoint';
  IF ep IS NULL OR length(ep) > 1024 OR ep !~ '^https://[a-z0-9.-]+/[^#\s\\]*$' THEN RETURN false; END IF;
  host := substring(ep FROM '^https://([a-z0-9.-]+)/');
  IF NOT (host ~ '^fcm\.googleapis\.com$' OR host ~ '^android\.googleapis\.com$'
          OR host ~ '(^|\.)push\.services\.mozilla\.com$' OR host ~ '(^|\.)notify\.windows\.com$'
          OR host ~ '(^|\.)push\.apple\.com$') THEN RETURN false; END IF;
  IF coalesce(p->'keys'->>'p256dh', '') !~ '^[A-Za-z0-9_-]{40,200}=*$'
     OR coalesce(p->'keys'->>'auth', '') !~ '^[A-Za-z0-9_-]{8,64}=*$' THEN RETURN false; END IF;
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION public.guard_push_subscription() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT public.is_trusted_push_subscription(NEW.push_subscription) THEN
    RAISE EXCEPTION 'PUSH_SUBSCRIPTION_INVALID' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_push_subscription ON public.user_push_preferences;
CREATE TRIGGER trg_guard_push_subscription BEFORE INSERT OR UPDATE OF push_subscription ON public.user_push_preferences
  FOR EACH ROW EXECUTE FUNCTION public.guard_push_subscription();

-- A política de UPDATE das preferências ganha WITH CHECK explícito.
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_push_preferences;
CREATE POLICY "Users can update their own preferences" ON public.user_push_preferences FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
COMMIT;

-- Verificação antes de aplicar (só leitura): subscrições já gravadas que o
-- trigger recusaria numa próxima escrita.
-- SELECT count(*) FROM public.user_push_preferences WHERE NOT public.is_trusted_push_subscription(push_subscription);
