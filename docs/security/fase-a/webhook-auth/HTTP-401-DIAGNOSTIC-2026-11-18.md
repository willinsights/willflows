# WillFlow S01 — diagnóstico de HTTP 401 dos jobs (18 de novembro de 2026)

**Estado: problema real confirmado, autenticação ainda não corrigida em produção.**

## Evidência do Lovable Cloud / PostgreSQL (apenas SELECT, sem tokens)

Consulta agregada da tabela `net._http_response`: no intervalo entre aproximadamente **15:55 e 21:50 UTC** deste dia, registaram-se **78 respostas HTTP 401**, todas com corpo classificado como `Unauthorized`, sem timeouts ou erros de rede. Não foi lido nem reproduzido o conteúdo de cabeçalhos, tokens, parâmetros ou payloads.

- Na amostra de seis horas, existe uma falha nos minutos 05, 10, 15, ..., 55 de cada hora e **duas** no minuto 00.
- Esse padrão coincide com dois cron jobs ativos:
  - Job **12**: `webhook-retry-worker-every-minute`, cron real `*/5 * * * *`. 12 pedidos/hora provavelmente falham com 401.
  - Job **6**: `cleanup-expired-videos-daily`, cron real `0 * * * *`. Há um 401 adicional por hora no mesmo minuto.
- `cron.job_run_details` apresenta 288 `succeeded` nas últimas 24h para o job 12: o sucesso refere-se ao **despacho SQL**, não à resposta HTTP. A tabela `webhook_inbox` não tinha eventos na amostra.
- Padrão temporal é uma evidência forte, mas sem associar explicitamente o URL do pedido ao ID de resposta **não é prova absoluta** de atribuição por função.

## Incompatibilidade a verificar

- `supabase/functions/webhook-retry-worker/index.ts` (código ativo anterior à PR #1) aceita service bearer, `x-cron-secret` e autenticação cron gerida. A PR #1 corrige o tratamento de 500 vs 401 e testes, **não resolve a configuração em execução**.
- A função `cleanup-expired-videos` ativa usa `x-cron-secret` com `CRON_SECRET` ou `AUTOMATION_CRON_SECRET`.
- `supabase/config.toml` declara `verify_jwt=false` para cleanup, mas não contém uma entrada explícita para `webhook-retry-worker`. É essencial verificar a configuração efetivamente publicada no gateway da cloud.
- O job 12 contém uma referência a `Authorization`, o job 6 contém `x-cron-secret`. O SQL não demonstra que os segredos usados correspondam às variáveis das funções; os dois retornam `Unauthorized`. A falha pode estar no gateway ou no handler, ainda não comprovada.

## Plano seguro de correção

1. **Ler os metadados de execução** de ambas as funções e a configuração de JWT efetivamente implantada, sem abrir nem copiar segredos.
2. **Confirmar qual credencial gerida está disponível**, origem segura do job e correspondência de nomes, sem criar bypass de autenticação.
3. Preparar transição para um esquema único e autorizado de bearer, sem guardar tokens em texto claro nos jobs.
4. Fazer smoke test isolado de autorização: pedido sem credenciais e token errado continuam **401**; configuração interna ausente origina **500**; credencial válida devolve apenas resultado não destrutivo.
5. Para `cleanup-expired-videos`, manter **destruição desativada por defeito** até inventário físico R2 e revisão de outbox. Não usar o teste de autenticação para executar limpeza.
6. Só depois atualizar o job em janela controlada, validar respostas HTTP 200 por ciclo e auditar operações. Testar rollback do schedule e impedir jobs duplicados.

## SQL de observação (não divulga segredos)

```sql
SELECT date_trunc('hour',created) AS hora, status_code, count(*) AS ocorrencias
FROM net._http_response
WHERE created >= now()-interval '24 hours'
GROUP BY 1,2 ORDER BY 1 DESC,2;
```

**Não fazer:** eliminar a condição de autenticação do worker, ativar `verify_jwt=false` sem verificar o handler, copiar `cron.job.command` com segredos, substituir CRON_SECRET por uma string fixa, despausar limpeza ou executar cron manualmente em produção. Sem o segredo e a configuração de gateway efetiva, não há autorização técnica para considerar os 401 resolvidos.


## Sonda de autenticação da revisão

A revisão do worker responde com HTTP 204 e o cabeçalho `X-WillFlow-Worker-Probe: 1` a um HEAD autenticado. O caminho termina antes da criação do cliente de base de dados. Um POST autenticado mantém o processamento normal. Para testar no ambiente isolado, confirmar primeiro que a versão instalada inclui esta sonda. Versões anteriores podem processar a fila ao receber HEAD. Usar a credencial que o ambiente já gere e registar apenas o estado e o cabeçalho de versão.

## Confirmação no Lovable Cloud em 19 de novembro

Os logs da função identificam diretamente o POST para webhook-retry-worker com 401 às 14:05, 14:10 e 14:15 UTC. O registo das 14:15 identifica a versão 61. O job 12 apresenta um bearer literal cujo JWT declara o perfil anon e ainda não expirou. A inspeção devolveu somente o perfil e o estado de expiração. O Vault estava vazio. Mesmo quando o gateway aceita esse tipo de JWT, o handler exige uma credencial privada.

A revisão aceita também WEBHOOK_RETRY_WORKER_SECRET, um bearer exclusivo deste worker. Para ativar o job, provisionar o mesmo valor aleatório nos segredos privados da função e numa entrada privada de Vault destinada ao agendamento. O SQL do job deve resolver o valor a partir de Vault no momento da chamada. Não usar a chave de serviço para este efeito nem reutilizar o segredo de limpeza.

Confirmar que a versão com a sonda está implantada antes de enviar HEAD autenticado. Validar 204 e o cabeçalho da sonda. Só depois alterar o comando do job 12 existente, preservando a frequência, e confirmar pelo menos dois POST sucessivos com 200 nos logs deste worker. O job 6 mantém a configuração existente.
