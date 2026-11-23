-- D3 — CANDIDATO, NÃO APLICAR sem aprovação do proprietário (mexe em pagamentos).
-- Pagamento em lote atómico: ou todos os valores selecionados ficam pagos, ou nenhum.
-- O comprovativo é criado com o total calculado pela base e só é ligado aos pagos.
BEGIN;
CREATE OR REPLACE FUNCTION public.pay_team_batch(
  p_workspace_id uuid, p_ids uuid[], p_expected_total numeric, p_receipt_path text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ids uuid[];
  v_count integer;
  v_total numeric;
  v_receipt uuid;
BEGIN
  IF v_user IS NULL OR NOT public.has_workspace_permission(v_user, p_workspace_id, 'payments.manage') THEN
    RAISE EXCEPTION 'BATCH_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT array_agg(DISTINCT x) INTO v_ids FROM unnest(p_ids) x WHERE x IS NOT NULL;
  IF v_ids IS NULL OR cardinality(v_ids) NOT BETWEEN 1 AND 200 OR cardinality(v_ids) <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'BATCH_INVALID_IDS' USING ERRCODE = '22023';
  END IF;

  -- Bloqueia as linhas e valida todas antes de escrever qualquer uma.
  SELECT count(*), coalesce(sum(t.payment_amount), 0) INTO v_count, v_total
  FROM (
    SELECT pt.payment_amount FROM public.project_team pt
    JOIN public.projects p ON p.id = pt.project_id
    WHERE pt.id = ANY(v_ids)
      AND p.workspace_id = p_workspace_id
      AND p.is_delivered IS TRUE
      AND pt.payment_status IN ('pendente', 'vencido')
      AND coalesce(pt.payment_amount, 0) > 0
    FOR UPDATE OF pt
  ) t;
  IF v_count <> cardinality(v_ids) THEN
    RAISE EXCEPTION 'BATCH_ITEMS_NOT_PAYABLE' USING ERRCODE = '22023';
  END IF;
  IF p_expected_total IS NULL OR abs(v_total - p_expected_total) > 0.005 THEN
    RAISE EXCEPTION 'BATCH_TOTAL_CHANGED' USING ERRCODE = '22023';
  END IF;

  IF p_receipt_path IS NOT NULL THEN
    IF left(p_receipt_path, length(p_workspace_id::text) + 1) <> p_workspace_id::text || '/' OR p_receipt_path ~ '\.\.' THEN
      RAISE EXCEPTION 'BATCH_RECEIPT_PATH' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.payment_receipts(workspace_id, file_path, amount, created_by)
      VALUES (p_workspace_id, p_receipt_path, v_total, v_user) RETURNING id INTO v_receipt;
  END IF;

  UPDATE public.project_team
     SET payment_status = 'pago',
         paid_at = coalesce(paid_at, now()),
         receipt_id = coalesce(v_receipt, receipt_id)
   WHERE id = ANY(v_ids);

  RETURN jsonb_build_object('paid', v_count, 'total', v_total, 'receipt_id', v_receipt);
END $$;
REVOKE ALL ON FUNCTION public.pay_team_batch(uuid, uuid[], numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_team_batch(uuid, uuid[], numeric, text) TO authenticated;
COMMIT;
