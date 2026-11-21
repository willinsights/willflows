# Estado do orquestrador — WillFlow 2.0

Atualizado pelo orquestrador no fim de cada execução. Não guardar aqui segredos nem dados de clientes (repositório público).

## Estado atual

- Última atualização: 21/11/2026, cerca das 17:45 UTC
- HEAD do `main`: `851cf58` (merge do #42). Os PRs #28 a #42 estão integrados. Único PR aberto: #5, rascunho antigo.
- Publicado: o site e as funções de faturação usados no ensaio de compra de 21/11 (webhook, checkout e portal), segundo o orquestrador; a revisão exata publicada não foi confirmada nesta execução. Integrar PRs que mexem em `supabase/functions` não publica as funções: o deploy tem de ser pedido na plataforma de alojamento.
- Produção: alterações diretas de 21/11 na base registadas em `docs/db/producao-2026-11-21.sql` (não são migrações; ver `docs/db/README.md`).
- Serviço de pagamentos: destino de webhook criado e segredo de assinatura configurado a 21/11; portal com troca entre os três planos; Studio a 42 €, preços antigos arquivados.
- Execuções: 1, conduzida à mão na sessão de preparação, mais o trabalho de 21/11 (`docs/agents/relatorios/2026-11-21.md`). O comando `/orquestrar` ainda não foi executado.

## PRs abertos, por integrar

Nenhum dos agentes. F10 (segunda subscrição por sessões paralelas) está em curso, ainda sem PR.

## Próximos passos

1. F10: impedir a segunda subscrição por sessões de pagamento em paralelo.
2. F7: ensaio completo de compra (precisa do proprietário: pagamento real).
3. F8 e F9: verificação de subscrição com confirmação do dono do cliente; armazenamento adicional por dono (funções do servidor, precisam de aprovação).
4. S19 e S20: renovação dos endereços de vídeo; arranque com falha de rede.
5. S21: rever os commits diretos de 21/11 ainda por rever.
6. A6, depois A7: escolher a fonte única de migrações e trazer para lá o registo de 21/11.

## Próximas tarefas elegíveis (sem aprovação)

A6, B1, B2c, D2a, D4, F1b, F1c, F1e, F10, F13, S7, S8, S9, S12, S16, S19, S20, S21

## Decisões em aberto do proprietário

- Proteção do `main`: a sessão não tem permissão para a configurar. Exigir PR pode afetar a sincronização do Lovable, que escreve no `main`; por confirmar. Mínimo seguro: bloquear force push e eliminação.
- A3: política da limpeza legada de vídeos.
- D1: ciclo de pagamento por defeito e se os colaboradores veem o preço ao cliente.
- D3: autorizar alterações ao pagamento em lote.
- C2: número da versão na substituição de vídeo.
- F1: Finalizados continua como tabela à parte ou é unificado com o Kanban.
- Dar acesso aos logs das funções (desbloqueia A1d).
- S18: validação de sessão no vídeo privado.
- F7: ensaio de compra com valor real.

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
| 21/11/2026 | — | S13 | Integrado | #28 |
| 21/11/2026 | — | S15, F2–F6, F11, F12, criar workspace (#34), botões de voltar (#32) | Integrados pelo proprietário | #30 a #42 |
| 21/11/2026 | — | Faturação | Webhook configurado; ensaio de compra com desconto total e cancelamento correto | — |
| 21/11/2026 | — | Base de dados | Alterações diretas em produção registadas | este PR |
