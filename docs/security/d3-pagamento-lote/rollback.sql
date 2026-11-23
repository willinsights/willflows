-- Remove a RPC. Os pagamentos já feitos por ela ficam (são pagamentos reais).
-- O frontend anterior deve ser reposto antes, porque o novo depende desta função.
DROP FUNCTION IF EXISTS public.pay_team_batch(uuid, uuid[], numeric, text);
