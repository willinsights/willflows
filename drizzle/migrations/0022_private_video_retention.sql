-- CANDIDATO — NÃO APLICAR sem aprovação do proprietário.
-- Retenção das versões privadas (wf2_): 7 dias após a aprovação (decisão de 23/11/2026).
-- Aditivo: não altera versões existentes, comentários nem aprovações; só retira
-- (state='withdrawn') versões cuja aprovação no mesmo âmbito (projeto+tarefa)
-- tem mais de 7 dias, e põe os objetos no outbox `assets` para o worker apagar.
ALTER TABLE willflow_video_private.assets
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

-- Interruptor do servidor: desligado por omissão; sem linha = desligado.
CREATE TABLE IF NOT EXISTS willflow_video_private.retention_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  retention_days integer NOT NULL DEFAULT 7 CHECK (retention_days BETWEEN 1 AND 365)
);
REVOKE ALL ON willflow_video_private.retention_settings FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE willflow_video_private.retention_settings ENABLE ROW LEVEL SECURITY;

-- 0) Pré-visualização (só leitura): o que seria retirado, mesmo com o interruptor desligado.
CREATE OR REPLACE FUNCTION public.private_video_retention_preview(p_days integer DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE d integer; cutoff timestamptz;
BEGIN
  PERFORM willflow_video_private.service_check();
  d := coalesce(p_days, (SELECT retention_days FROM willflow_video_private.retention_settings WHERE singleton), 7);
  cutoff := clock_timestamp() - make_interval(days => d);
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('version_id',x.id,'workspace_id',x.workspace_id,'project_id',x.project_id,'task_id',x.task_id,
      'file_name',x.file_name,'bytes',x.bytes,'state',x.state,'has_stream',x.stream_uid IS NOT NULL) ORDER BY x.created_at, x.id)
    FROM willflow_video_private.versions x
    WHERE x.state IN ('persisted','ready')
      AND EXISTS (SELECT 1 FROM willflow_video_private.approvals a JOIN willflow_video_private.versions av ON av.id=a.version_id
                  WHERE av.workspace_id=x.workspace_id AND av.project_id=x.project_id AND av.task_id IS NOT DISTINCT FROM x.task_id AND a.approved_at < cutoff)
      AND NOT EXISTS (SELECT 1 FROM willflow_video_private.approvals a JOIN willflow_video_private.versions av ON av.id=a.version_id
                  WHERE av.workspace_id=x.workspace_id AND av.project_id=x.project_id AND av.task_id IS NOT DISTINCT FROM x.task_id AND a.approved_at >= cutoff)),'[]'::jsonb);
END $$;

-- 1) Retirar versões vencidas. Âmbito = (workspace, projeto, tarefa) da aprovação.
--    Uma aprovação mais recente que o corte no mesmo âmbito reinicia a janela.
--    Versões em submitting/uncertain nunca são tocadas (fornecedor por reconciliar).
CREATE OR REPLACE FUNCTION public.private_video_retention_withdraw(p_limit integer DEFAULT 100) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s willflow_video_private.retention_settings; cutoff timestamptz; n integer := 0; v willflow_video_private.versions;
BEGIN
  PERFORM willflow_video_private.service_check();
  PERFORM pg_advisory_xact_lock(742019,1);
  SELECT * INTO s FROM willflow_video_private.retention_settings WHERE singleton;
  IF NOT FOUND OR NOT s.enabled THEN RETURN 0; END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid limit'; END IF;
  cutoff := clock_timestamp() - make_interval(days => s.retention_days);
  FOR v IN
    SELECT x.* FROM willflow_video_private.versions x
    WHERE x.state IN ('persisted','ready')
      AND EXISTS (SELECT 1 FROM willflow_video_private.approvals a JOIN willflow_video_private.versions av ON av.id=a.version_id
                  WHERE av.workspace_id=x.workspace_id AND av.project_id=x.project_id AND av.task_id IS NOT DISTINCT FROM x.task_id
                    AND a.approved_at < cutoff)
      AND NOT EXISTS (SELECT 1 FROM willflow_video_private.approvals a JOIN willflow_video_private.versions av ON av.id=a.version_id
                  WHERE av.workspace_id=x.workspace_id AND av.project_id=x.project_id AND av.task_id IS NOT DISTINCT FROM x.task_id
                    AND a.approved_at >= cutoff)
    ORDER BY x.created_at, x.id
    LIMIT p_limit
    FOR UPDATE OF x
  LOOP
    INSERT INTO willflow_video_private.assets(provider,key,version_id,reason) VALUES('r2',v.object_key,v.id,'retention_after_approval') ON CONFLICT DO NOTHING;
    IF v.stream_uid IS NOT NULL THEN
      INSERT INTO willflow_video_private.assets(provider,key,version_id,reason) VALUES('stream',v.stream_uid,v.id,'retention_after_approval') ON CONFLICT DO NOTHING;
    END IF;
    UPDATE willflow_video_private.versions SET state='withdrawn' WHERE id=v.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- 2) Objetos por apagar no fornecedor (só os desta política).
CREATE OR REPLACE FUNCTION public.private_video_retention_pending(p_limit integer DEFAULT 100) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM willflow_video_private.service_check();
  IF NOT EXISTS (SELECT 1 FROM willflow_video_private.retention_settings WHERE singleton AND enabled) THEN RETURN '[]'::jsonb; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('provider',provider,'key',key,'version_id',version_id) ORDER BY version_id, provider)
    FROM (SELECT * FROM willflow_video_private.assets
          WHERE reason='retention_after_approval' AND deleted_at IS NULL
          ORDER BY attempts, version_id LIMIT least(greatest(coalesce(p_limit,100),1),500)) q),'[]'::jsonb);
END $$;

-- 3) Resultado do fornecedor: só marca apagado com ok=true; falha conta tentativa.
CREATE OR REPLACE FUNCTION public.private_video_retention_result(p_provider text,p_key text,p_ok boolean,p_error text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM willflow_video_private.service_check();
  UPDATE willflow_video_private.assets
     SET deleted_at = CASE WHEN p_ok THEN clock_timestamp() ELSE deleted_at END,
         attempts = attempts + 1,
         last_error = CASE WHEN p_ok THEN NULL ELSE left(p_error,300) END
   WHERE provider=p_provider AND key=p_key AND reason='retention_after_approval' AND deleted_at IS NULL;
  RETURN FOUND;
END $$;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT oid::regprocedure signature FROM pg_proc WHERE pronamespace='public'::regnamespace
    AND proname IN ('private_video_retention_preview','private_video_retention_withdraw','private_video_retention_pending','private_video_retention_result') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
-- Ativação (passo separado, depois da aprovação):
--   INSERT INTO willflow_video_private.retention_settings(singleton,enabled) VALUES (true,true)
--   ON CONFLICT (singleton) DO UPDATE SET enabled=true;