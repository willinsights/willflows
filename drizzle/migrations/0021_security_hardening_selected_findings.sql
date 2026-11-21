
CREATE OR REPLACE FUNCTION public.guard_project_column_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.captacao_column_id IS NOT NULL AND NEW.captacao_column_id IS DISTINCT FROM OLD.captacao_column_id
     AND NOT EXISTS (SELECT 1 FROM kanban_columns c WHERE c.id = NEW.captacao_column_id AND c.workspace_id = NEW.workspace_id AND c.phase = 'captacao') THEN
    RAISE EXCEPTION 'Coluna inválida para este projeto' USING ERRCODE = '42501';
  END IF;
  IF NEW.edicao_column_id IS NOT NULL AND NEW.edicao_column_id IS DISTINCT FROM OLD.edicao_column_id
     AND NOT EXISTS (SELECT 1 FROM kanban_columns c WHERE c.id = NEW.edicao_column_id AND c.workspace_id = NEW.workspace_id AND c.phase = 'edicao') THEN
    RAISE EXCEPTION 'Coluna inválida para este projeto' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_project_column_workspace ON public.projects;
CREATE TRIGGER trg_guard_project_column_workspace BEFORE UPDATE OF captacao_column_id, edicao_column_id ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.guard_project_column_workspace();

DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.get_conversation_page(uuid,integer,timestamptz)'::regprocedure);
  IF position('IF NOT _is_member THEN' in d) = 0 THEN RAISE EXCEPTION 'unexpected definition'; END IF;
  d := replace(d, 'IF NOT _is_member THEN',
    'IF _is_member AND NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = _conversation_id AND public.can_access_feature(c.workspace_id, ''chat'')) THEN
    RAISE EXCEPTION ''Chat not available for this workspace plan'' USING ERRCODE = ''42501'';
  END IF;

  IF NOT _is_member THEN');
  EXECUTE d;
END $do$;

CREATE OR REPLACE FUNCTION public.guard_contract_signature()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'signed' OR NEW.signed_at IS NOT NULL OR NEW.client_signature_data IS NOT NULL OR NEW.client_signed_name IS NOT NULL THEN
        RAISE EXCEPTION 'Contratos só podem ser assinados pelo cliente' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF (NEW.status = 'signed' AND OLD.status IS DISTINCT FROM 'signed')
         OR (OLD.status = 'signed' AND NEW.status IS DISTINCT FROM 'signed')
         OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
         OR NEW.client_signature_data IS DISTINCT FROM OLD.client_signature_data
         OR NEW.client_signed_name IS DISTINCT FROM OLD.client_signed_name
         OR NEW.client_signed_ip IS DISTINCT FROM OLD.client_signed_ip
         OR NEW.client_signed_user_agent IS DISTINCT FROM OLD.client_signed_user_agent THEN
        RAISE EXCEPTION 'Contratos só podem ser assinados pelo cliente' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_contract_signature ON public.contracts;
CREATE TRIGGER trg_guard_contract_signature BEFORE INSERT OR UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.guard_contract_signature();

CREATE TABLE public.video_comment_delete_keys (
  comment_id uuid PRIMARY KEY REFERENCES public.video_comments(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.video_comment_delete_keys FROM anon, authenticated;
GRANT ALL ON public.video_comment_delete_keys TO service_role;
ALTER TABLE public.video_comment_delete_keys ENABLE ROW LEVEL SECURITY;
