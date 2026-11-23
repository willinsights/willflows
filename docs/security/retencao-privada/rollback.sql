-- Reversão do candidato. Desliga primeiro; não repõe versões já retiradas
-- (os objetos podem já ter sido apagados no fornecedor).
BEGIN;
UPDATE willflow_video_private.retention_settings SET enabled=false WHERE singleton;
DROP FUNCTION IF EXISTS public.private_video_retention_withdraw(integer);
DROP FUNCTION IF EXISTS public.private_video_retention_pending(integer);
DROP FUNCTION IF EXISTS public.private_video_retention_result(text,text,boolean,text);
-- As colunas de assets e a tabela de definições ficam (evidência do que foi apagado).
COMMIT;
