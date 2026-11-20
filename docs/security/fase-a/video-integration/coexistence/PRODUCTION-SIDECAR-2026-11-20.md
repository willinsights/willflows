# Fase canónica new-only — execução real em 20/11/2026

## Aplicado
- 0012: inventário individual renovado por handler autenticado de administrador, 54 versões ativas, 54 HEADs R2 com tamanho exato, 54 referências Stream existentes, snapshot estável e sem discrepâncias. Counter anterior 92.143.699.665 bytes; correto 16.862.211.040 bytes. Guardas na própria transação: executor/ownership, NOWAIT nas duas relações, advisory lock, counter anterior, fingerprint, contagem/soma e outras divergências. Evidência imutável e definições anteriores guardadas em video_counter_reconciliations. Resultado pós-aplicação: zero counters divergentes.
- Escritas absolutas antigas não substituem o cálculo; trigger soma original+replacement com deltas serializados. add_workspace_storage legado é idempotente após persistência. Nenhum limite/preço/extra foi alterado.
- 0013: registry privado canónico sem cascatas; objetos/capacidades/feedback não entram em video_versions nem tokens antigos. RLS ativada; schema negado inclusive a service_role e RPCs públicas restritas à service_role, todas com search_path=public. Guardas de projeção e quota combinada habilitados.
- 0014: assinatura ativa obrigatória no insert privado, também para service_role.
- private-video implantado, fonte final b37d91b9d7f9c6b92ea3fb2d374f0b7b5e27fbc353b8507cb0cafa10339f5124. CORS/no-store e Content-Type normalizados por Headers; erro observado no ensaio real de parsing da lista corrigido antes da publicação.
- Router /video-approval/:token integrado: namespace wf2_ exclusivo e fail-closed, tokens antigos continuam no leitor/get-video-approval-data original. Nenhum handler legado modificado.

## Piloto real, limitado
- Único workspace habilitado: fixture sintética; vídeo MP4 de 2.949 bytes, R2 PUT 200, cópia frozen verificada e Stream signed-only. Processamento repetido reutilizou a versão, sem duplicar quota/provider.
- 1 versão privada, 0 versões projetadas no legado, 0 bytes legados na fixture, 0 automações/notificações geradas na fixture.
- Router real no localhost com serviços produtivos: HLS carregou e avançou; comentários desktop/mobile e aprovação gravados e relidos anonimamente. Sem overflow ou erros de runtime. Links antigos ensaiados com recusa fictícia no endpoint original, sem acessar dados antigos de clientes.
- Histórico legado no read final: 1.694 versões, 948 comentários, 320 aprovações; nenhum foi eliminado pelo rollout. Fixture privada: 2 comentários e 1 aprovação.
- Tokens e URLs assinados não estão neste relatório nem no repositório; somente estado temporário privado do piloto.

## Validação do contraexemplo
- PostgreSQL descartável ensaiou os textos EXATOS das migrações 0012–0014, substituindo apenas identidade/counts/fingerprint por fixture e executor local. Falha de guarda abortou tudo. 13 grupos passaram, incluindo assinatura expirada, concorrência, quota combinada, operação idempotente, revogação, deleção de pai sem cascata e recusa de rollback populado.
- 18 Vitest passaram (upload, reader, inventário e operações reais antigas com fornecedores fictícios). Cleanup antigo nos três ramos pode apagar externamente objetos legados antes da escrita rejeitada, mas não descobre nem altera a identidade privada; revogação antiga também não alcança capacidades privadas. Não se simularam deleções contra fornecedores produtivos.
- Routing e regressões UI executados separadamente; build supervisionado OK. Deno check do runtime passou.

## Serviço e recuperação
- Sem pausa neste desenvolvimento/rollout: uploads normais continuaram abertos; nenhuma alteração de cron, cleanup, job12 ou secrets. A reconciliação segurou locks apenas durante a transação finita.
- NÃO habilitados uploads canónicos para workspaces de clientes: o piloto demonstra handler/router/feedback/provedor; interface autenticada de upload e gestão ainda não integrada. Não declarar rollout global ou WillFlow 2.0 completo.
- Recuperação segura do piloto: desabilitar somente enrollment do workspace sintético, manter reader e todas as linhas/objetos/capacidades para links persistidos. Nunca executar rollback-empty após o piloto populado; o seu guarda recusa perda de histórico. Não restaurar counter antigo divergente nem remover fences enquanto existirem versões privadas; corrigir forward sob lock e inventário.
- Migração de vídeos históricos in-place continua NÃO aplicada: exige isolamento dos objetos já conhecidos pelas revisões antigas; uma revisão já aceita pelo fornecedor pode apagar um objeto legado antes de falhar na BD. Essa operação é separada, não necessária para esta fase new-only e não autorizada como destrutiva.

## Publicação
Revisão pública e prova no domínio são registadas após o publish; esta publicação contém a integração canónica funcional, não apenas a atualização visual a56f1383.