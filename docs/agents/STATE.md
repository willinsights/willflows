# Estado do orquestrador — WillFlow 2.0

Atualizado pelo orquestrador no fim de cada execução. Não guardar aqui segredos nem dados de clientes (repositório público).

## Estado atual

- Última atualização: 21/11/2026, cerca das 11:00 UTC
- HEAD do `main`: `2255b69`. Publicado: `e345602`. Os PRs #18 a #21 e #23 a #27 estão integrados; os dois últimos commits do `main` (dependências e canais de tempo real) ainda não estão publicados.
- Execuções: 1, conduzida à mão na sessão de preparação. O comando `/orquestrar` ainda não foi executado.

## PRs abertos, por integrar

| PR | Tarefa | CI | Revisor | Nota |
| --- | --- | --- | --- | --- |
| #28 | S13 | verde | PASS com reservas | Mencionar continua a adicionar à conversa quando o autor gere membros (decisão do proprietário) |

## Próximas tarefas elegíveis (sem aprovação)

A6, B1, B2c, D2a, D4, F1b, F1c, F1e, S7, S8, S9, S12, S16

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
| 20/11/2026 | 1 | S4, S5 | Integrados pelo proprietário | #23, #24 |
| 20/11/2026 | 1 | S8 | Sete commits do Lovable revistos: duas regressões (convite, menções) e uma regra de plano alterada sem aprovação | — |
| 20/11/2026 | 1 | S10 | Integrado e publicado | #26 |
| 20/11/2026 | 1 | S11 | Integrado e publicado; por confirmar com um convite novo | #27 |
| 20/11/2026 | 1 | S13 | PR aberto, CI verde, revisor PASS com reservas | #28 |
