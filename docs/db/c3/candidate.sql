-- C3 (simples) — CANDIDATO, NÃO APLICAR sem autorização específica do proprietário.
-- Decisão de 23/11: os vídeos legados podem ser descartados; comentários e aprovações
-- ficam na base. Não há migração para o registo privado.
--
-- Passo 0 (só leitura): inventário do que seria descartado.
SELECT v.workspace_id, count(*) AS versoes, sum(coalesce(v.file_size_bytes,0)+coalesce(v.replacement_file_size_bytes,0)) AS bytes,
       min(v.created_at) AS mais_antiga, max(v.created_at) AS mais_recente
FROM public.video_versions v
WHERE v.is_deleted IS NOT TRUE
  AND NOT EXISTS (SELECT 1 FROM public.video_approvals a WHERE a.video_version_id = v.id)
  AND v.created_at < now() - interval '30 days'
GROUP BY v.workspace_id ORDER BY versoes DESC;

-- Passo 1 (destrutivo depois da próxima corrida da limpeza): marca como apagadas as
-- versões legadas NÃO aprovadas com mais de 30 dias. A limpeza (passo 3 da função)
-- apaga depois os ficheiros no R2/Stream. Comentários, aprovações e a linha da versão ficam.
-- :esperado = número devolvido no passo 0 (falha fechado se mudar entretanto).
BEGIN;
SET LOCAL lock_timeout = '3s';
DO $$
DECLARE n integer; esperado integer := current_setting('c3.esperado')::integer;
BEGIN
  SELECT count(*) INTO n FROM public.video_versions v
   WHERE v.is_deleted IS NOT TRUE
     AND NOT EXISTS (SELECT 1 FROM public.video_approvals a WHERE a.video_version_id = v.id)
     AND v.created_at < now() - interval '30 days';
  IF n <> esperado THEN RAISE EXCEPTION 'C3_INVENTORY_CHANGED % <> %', n, esperado; END IF;
  UPDATE public.video_versions v SET is_deleted = true, deleted_at = now()
   WHERE v.is_deleted IS NOT TRUE
     AND NOT EXISTS (SELECT 1 FROM public.video_approvals a WHERE a.video_version_id = v.id)
     AND v.created_at < now() - interval '30 days';
END $$;
COMMIT;
-- Uso: SET c3.esperado = '<n>'; antes do BEGIN, na mesma sessão.
