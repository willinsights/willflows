-- D2b — só leitura: quanto muda (linhas canceladas que hoje entram no lucro do servidor).
SELECT workspace_id, count(*) AS linhas_canceladas, sum(actual_amount) AS valor_hoje_somado_ao_custo,
       count(DISTINCT project_id) AS projetos_afetados
FROM public.project_cost_lines WHERE payment_status = 'cancelado'
GROUP BY workspace_id ORDER BY valor_hoje_somado_ao_custo DESC;
