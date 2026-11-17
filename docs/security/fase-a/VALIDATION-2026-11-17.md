# WillFlow 2.0 — auditoria e validação segura da próxima fase

Data: 17/11/2026 UTC. Base verificada `a56ef2da`; árvore inicialmente limpa. Preparação apenas: nenhuma migração real, função activa, schedule, segredo, pagamento, envio ou vídeo alterado. «Ilimitados» preservado.

## Evidência por nível
| Área | Evidência | Estado / limite |
|---|---|---|
| Catálogo real | Leitura de colunas, RLS, índices e definição do trigger | RPCs/tabela candidatos ausentes; video_versions/workspace_storage com RLS; workspace_storage único por workspace. Sem dados pessoais consultados |
| Schedules reais | Listagem segura em 17/11 | Cinco activos sem metadados geridos; sem cabeçalhos/respostas HTTP. Nenhum 401/sucesso comprovado |
| Código candidato | Diff contra a56ef2da, fora de paths activos | Auth dupla preservada, limpeza pausada por defeito, quota e rollback endurecidos |
| BD fictícia | PostgreSQL 17, socket Unix privado sem TCP, ambiente de produção removido | Integração/concorrência/rollback com SQL real; não prova distribuição dos dados reais |
| Handler semanal real | Transpilado com RPCs reais na BD fictícia, email simulado, fetch bloqueado | 8 pedidos dão 1 envio fictício e estado sent; falha ambígua/persistência bloqueiam retry |
| Stripe / push | Handler real com serviços simulados, sem rede externa | Matching Stripe só lê; corrida push reproduz duplicação fictícia. Nenhum pagamento/envio real |
| Compilação | Build automático e deno check | Conferidos nos logs; não é validação de execução em produção |

## Correções preparadas nesta revisão
1. **Alta — reversão semanal insegura:** manter ledger não bastava: emissor antigo ignora-o. Rollback agora recusa qualquer histórico, inclusive sent/suppressed, não apenas incerteza. Não remove protecção após primeiro claim.
2. **Alta — limpeza pode arrancar ao corrigir auth:** interruptor fail-closed retorna 503 antes de qualquer acesso BD/storage enquanto não for `true`. Nenhum segredo/horário configurado. Activação separada obrigatória.
3. **Alta — referências de órfãos esquecidas sem credenciais:** ausência de R2/Stream agora impede limpar IDs; erro de persistência não incrementa sucesso. Recuperação futura conserva referências.
4. **Alta — quota incoerente mascarada por zero:** lock de quota antes das versões; identidade estrita por workspace; duplicados de IDs não duplicam débito; recusa tamanhos negativos, quota insuficiente/ausente. Mudanças são transaccionais. Não normaliza dados históricos.
5. **Média — leitura/preferência falhada:** leitura de workspace/resumo falha explicitamente; falta de preferência explícita não envia. Padrão de defaults em contas reais precisa de conferência antes de activar; não foi feito backfill.

## Bloqueios encontrados, não escondidos
| Severidade | Causa / evidência | Correcção mínima / aceitação |
|---|---|---|
| Alta | Trigger real de quota debita file_size mesmo no hard DELETE após is_deleted; fixture reproduz segundo débito de 20 bytes | Fase própria de trigger/escritores, com rollback específico; testar inserção, substituição, soft/hard delete e concorrência. Cleanup destrutivo NO-GO |
| Alta | Outras escritas de tamanho/trigger seguem lock de vídeo→quota; RPC quota→vídeo pode deadlock com essas escritas | Não perder dados (transacção aborta), mas exige ensaio completo de substituição/upload e política retry segura antes de activar |
| Alta | Stripe SELECT-before-INSERT sem índice único para divergência aberta (catálogo); 8 concorrentes fictícios inserem 8 | Candidato futuro de claim/uniqueness, pré-auditoria de duplicados e recuperação; não criar índice real nem deduplicar registos nesta fase |
| Alta | Push lê pending sem reserva; dois handlers reais simulados enviam duas vezes | Reserva durável por ID, resultado incerto sem reclaim automático, política de dados antigos; não activar worker/fila real |
| Alta | Cutover antigo não suportado directamente; sem prova de drenagem/versão activa | Runbook pause-drain-remove-create sequencial, só com ferramentas suportadas e autorização; caso contrário NO-GO |
| Média | Cleanup ignora erros de consultas/avisos e contagem pode reportar sucesso parcial; legado físico não totalmente coberto | Testar/propagar erros e reserva de avisos em fase dedicada; não declarar limpeza funcional |
| Média | Resumo usa métricas mensais em relatório semanal e entrega pode ficar reserved após crash | Confirmar contrato de período; reconciliação manual autorizada para incerteza, nunca reenvio automático |
| Média | Novos RPCs aceitam claims service_role e ACL service_role; direitos de utilizadores existentes preservados | ACL/RLS testados; servidor confiável continua responsável por escopo/autenticidade. Não abrir execute a utilizadores |

## Testes e reprodutibilidade
- Resultado final: **16 Vitest + 9 Deno aprovados**, **13 grupos PostgreSQL** (11 de aceitação + 2 reproduções deliberadas de bloqueios), 2 candidatos aprovados em `deno check`; build automático mais recente `build OK`. Testes de bloqueios aprovados significam que o defeito foi reproduzido, NÃO corrigido.
- `bun x vitest run --config docs/security/fase-a/vitest.config.ts`: handlers reais com fixtures, rede bloqueada. Casos: simultâneo/sequencial, ambiguidade, finalização, supressão, semana distinta, preferências, erros, pausa, referências e Stripe/push.
- `deno test --cached-only --allow-env docs/security/fase-a/tests/cleanup-auth.test.ts`: 9 casos auth gerida actual/anterior, legado, inválido/ausente. Dependências públicas pré-cacheadas; testes sem permissão de rede. Primeira tentativa falhou por cache incompleto, corrigida sem invocar serviços.
- `python3 docs/security/fase-a/tests/postgres_concurrency.py`: cluster descartável removido no finally; 8 claims, 8 deletes+incremento, batch invertido, ACL/RLS/claims ausentes, quota insuficiente, identidade cruzada, rollback vazio/histórico e colisão de nomes. Integra handler semanal com SQL real. Também reproduz bloqueios hard-delete e Stripe.
- `deno check` dos dois candidatos: aprovado. Primeira tentativa de opção cached-only não suportada foi substituída pelo comando normal de verificação, sem executar handlers.
- `git diff --check` e `SHA256SUMS`: conferir antes de implantação. Hashes não comprovam versão activa.

## Resultado
Ver `DEPLOYMENT.md`: ordem, backups, monitorização, rollback e go/no-go. Preparação verificável avançou; **WillFlow 2.0 não está concluído nem validado em produção**. Fontes activas/migrações/frontend ficaram intactos. Dados reais não auditados nesta fase; compatibilidade estrutural confirmada, compatibilidade de distribuição permanece pendente.