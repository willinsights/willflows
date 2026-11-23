-- A1 passo 0 — só leitura. Lista os jobs que chamam funções e o resultado HTTP das últimas 24 h.
-- Não mostra cabeçalhos nem segredos.
SELECT j.jobid, j.jobname, j.schedule, j.active,
       substring(j.command FROM '/functions/v1/([a-z0-9-]+)') AS funcao,
       (j.command ~* 'x-cron-secret') AS usa_x_cron_secret,
       (j.command ~* 'authorization') AS usa_authorization,
       substring(j.command FROM 'body\s*:=\s*(''[^'']*''::jsonb)') AS body
FROM cron.job j WHERE j.command ~ '/functions/v1/' ORDER BY j.jobid;

SELECT date_trunc('hour', created) AS hora, status_code, count(*)
FROM net._http_response WHERE created >= now() - interval '24 hours'
GROUP BY 1, 2 ORDER BY 1 DESC, 2;
