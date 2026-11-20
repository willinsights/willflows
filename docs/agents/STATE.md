# Estado do orquestrador — WillFlow 2.0

Atualizado pelo orquestrador no fim de cada execução. Não guardar aqui segredos nem dados de clientes (repositório público).

## Estado atual

- Última atualização: 20/11/2026, cerca das 20:00 UTC
- HEAD do `main`: `7b66a36` (integração do PR #17, orquestrador e agentes)
- Execuções: 1, conduzida à mão na sessão de preparação. O comando `/orquestrar` ainda não foi executado.

## PRs abertos, por integrar

| PR | Tarefa | CI | Revisor | Nota |
| --- | --- | --- | --- | --- |
| #18 | B2a | verde | PASS | Um teste usa temporizadores reais e pode ser instável |
| #19 | B2b | verde à segunda | PASS | Reverter exige 2 commits; verificar a rentabilidade por cliente depois de integrar |
| #20 | F1a | verde | PASS | — |

Nenhum foi verificado na aplicação a correr. Ordem sugerida: #20, #18, #19. Os PRs #18 e #19 tocam ambos em `useProjects.ts`.

## Próximas tarefas elegíveis (sem aprovação)

A6, B1, B2c (depois do #19), D4, F1b, F1c, F1e, D2a (depois do #19)

## Decisões em aberto do proprietário

- Proteção do `main`: a sessão não tem permissão para a configurar. Exigir PR pode afetar a sincronização do Lovable, que escreve no `main`; por confirmar. Mínimo seguro: bloquear force push e eliminação.
- A3: política da limpeza legada de vídeos.
- D1: ciclo de pagamento por defeito e se os colaboradores veem o preço ao cliente.
- D3: autorizar alterações ao pagamento em lote.
- C2: número da versão na substituição de vídeo.
- F1: Finalizados continua como tabela à parte ou é unificado com o Kanban.
- Dar acesso aos logs das funções (desbloqueia A1d).

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
