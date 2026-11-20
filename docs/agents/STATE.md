# Estado do orquestrador — WillFlow 2.0

Atualizado pelo orquestrador no fim de cada execução. Não guardar aqui segredos nem dados de clientes (repositório público).

## Estado atual

- Última atualização: 20/11/2026, cerca das 22:00 UTC
- HEAD do `main`: `62e8ae4`. Os PRs #18, #19, #20 e #21 estão integrados e publicados.
- Execuções: 1, conduzida à mão na sessão de preparação. O comando `/orquestrar` ainda não foi executado.

## PRs abertos, por integrar

| PR | Tarefa | CI | Revisor | Nota |
| --- | --- | --- | --- | --- |
| #23 | S4 | verde | PASS com reservas, corrigidas | Segunda versão não voltou ao revisor; por verificar num browser |
| #24 | S5 | não cobre estas funções | FAIL à primeira, corrigido | Integrar implanta duas funções; testar uma notificação depois |

O PR #22 foi fechado sem integrar: a mesma alteração entrou pelo commit 91556ee.

## Próximas tarefas elegíveis (sem aprovação)

A6, B1, B2c, D2a, D4, F1b, F1c, F1e, S7, S8, S9

## Decisões em aberto do proprietário

- Proteção do `main`: a sessão não tem permissão para a configurar. Exigir PR pode afetar a sincronização do Lovable, que escreve no `main`; por confirmar. Mínimo seguro: bloquear force push e eliminação.
- A3: política da limpeza legada de vídeos.
- D1: ciclo de pagamento por defeito e se os colaboradores veem o preço ao cliente.
- D3: autorizar alterações ao pagamento em lote.
- C2: número da versão na substituição de vídeo.
- F1: Finalizados continua como tabela à parte ou é unificado com o Kanban.
- Dar acesso aos logs das funções (desbloqueia A1d).

## Coordenação com o agente do Lovable

A 20/11 o agente do Lovable aplicou correções de segurança diretamente no `main` e na base, ao mesmo tempo que os agentes deste backlog, sem PR, CI nem revisão. O resultado ficou coerente, mas houve trabalho duplicado. Regra: antes de usar a correção automática do Lovable, registar aqui o que vai ser corrigido, e não correr as duas vias sobre o mesmo ponto.

## Limitações conhecidas do ambiente dos agentes

- A sessão remota não instala dependências: tipos, build e testes só correm no CI do GitHub.
- Não existe ambiente de teste da base de dados (depende de A2).
- Os agentes partilham um único clone: trabalho de escrita corre em série.

## Diário

| Data | Execução | Tarefa | Resultado | PR |
| --- | --- | --- | --- | --- |
| 20/11/2026 | Auditoria manual | — | Backlog criado | #17 (integrado) |
| 20/11/2026 | 1 | B2, D1d, F1d | Relatórios em `docs/agents/relatorios/2026-11-20.md` | — |
| 20/11/2026 | 1 | A5 | Explicada em agregado, falta por versão | — |
| 20/11/2026 | 1 | B2a | PR aberto, CI verde, revisor PASS | #18 |
| 20/11/2026 | 1 | B2b | PR aberto, CI falhou em mocks de teste, corrigido, CI verde, revisor PASS | #19 |
| 20/11/2026 | 1 | F1a | PR aberto, CI verde, revisor PASS | #20 |
| 20/11/2026 | 1 | #18, #19, #20, #21 | Integrados pelo proprietário; CI do `main` verde; publicados | — |
| 20/11/2026 | 1 | S1, S2, S3 | Aplicados em produção (parte pelos agentes, parte pelo Lovable) e confirmados pelo proprietário | — |
| 20/11/2026 | 1 | S4 | PR aberto, CI verde, corrigido após revisão | #23 |
| 20/11/2026 | 1 | S5 | PR aberto, corrigido após revisão, função verificada por execução | #24 |
