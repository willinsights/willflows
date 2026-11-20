# WillFlow 2.0 — Plano de implantação controlada (18/11/2026)

> **Estado: BLOQUEADO PARA PRODUÇÃO.** Este documento é um plano operacional, não uma autorização nem um script de implantação. Nunca colar comandos de pausa/alteração de contas na base real sem validação de pré-condições.

> Atualização 20/11 13:26 UTC: a observação 0010 e os cinco bridges já estão em produção; 0011/autorização Studio foram posteriores. O suporte não fornece metadados globais de drenagem: não os solicitar novamente nem inferir drenagem de silêncio. A sequência alternativa vigente e os contraexemplos de coexistência estão em `coexistence/RESULT.md`; o roteiro de janela abaixo não deve ser executado enquanto a proteção externa não estiver demonstrada.

## Vídeos de aprovação

Em 19/11/2026, o proprietário confirmou que os originais estão arquivados fora do WillFlow e da Cloudflare. O vídeo carregado serve para aprovação e pode ser reenviado a partir do original. Em caso de perda de uma cópia, a recuperação prevista é a substituição do ficheiro, preservando a identidade da versão, o link de revisão, os comentários e o estado de aprovação. Esta decisão não autoriza apagar conteúdos nem reiniciar quotas.

## Infraestrutura que se mantém

- Aplicação e base de dados: **Lovable Cloud**, sem criar outro projeto Supabase.
- Código: GitHub `willinsights/willflows`.
- Correção do contrato total aplicada no banco real, `storage_limit_bytes` já inclui base + extras, PR #3 integrado.
- Ações de recálculo da interface corrigidas no PR #4: atualização read-only de cache em vez de sobrescrever o contador; integração no `main` confirmada, implantação Lovable solicitada e sem resposta final de conclusão.
- A integração completa de vídeo/quotas continua *apenas* neste PR #2, **sem merge nem migração real**.

## Inventário de crons em 18/11/2026 (consultas SELECT apenas)

| jobid | Nome registado | Cadência real | Ativo | Execuções SQL últimas 24h |
|---|---|---|---|---|
| 6 | `cleanup-expired-videos-daily` | `0 * * * *` (de hora a hora) | sim | 24 sucedidas |
| 11 | `stripe-reconcile-daily` | `15 3 * * *` | sim | 1 sucedida |
| 12 | `webhook-retry-worker-every-minute` | `*/5 * * * *` (de 5 em 5 min) | sim | 288 sucedidas |
| 29 | `process-automation-jobs-every-minute` | `*/2 * * * *` (de 2 em 2 min) | sim | 720 sucedidas |

Total: 10 jobs registados, 9 ativos. **O sucesso de pg_cron prova o despacho SQL, NÃO o fim de pedidos HTTP assíncronos.** Não há prova de inexistência de chamadas externas em voo, nem instrução para pausar Stripe, notificações ou pagamentos.

## Baseline de armazenamento que NÃO se deve corrigir automaticamente

Consulta de agregados em produção: 19 workspaces; 1 contador divergente; no workspace divergente existem cerca de **16,6 GB contabilizados em linhas de vídeo ativas** e cerca de **262,6 GB associados a versões soft-deleted**, com **54 versões ativas e 1632 marcadas como eliminadas** no momento da amostra. O contador de uso registado era cerca de 89,7 GB. Estes valores flutuam e **não representam inventário físico R2/Stream**.

- O hook ativo antigo de `recalculate` somava todas as linhas, incluindo soft-deleted, e podia sobrescrever `storage_used_bytes`. O PR #4 remove este caminho manual; não resolve a divergência anterior.
- Outros escritores antigos ainda existem (`stream-process-video`, `cleanup-expired-videos`, callback do hook e trigger `trg_sync_storage_video_versions`); eliminar escritores antes de instalar o substituto transacional causa perda de contabilidade.
- O candidato `00-accounting.sql` recusa aplicar-se quando existem contadores divergentes. **Não retirar essa verificação e não aplicar um valor por diferença cega.**

## Portões de liberação

1. **Reconciliação de quota.** Investigar o contador divergente e confrontar as referências relevantes com o fornecedor quando necessário. A recuperação dos originais não exige um catálogo integral da conta Cloudflare. A publicação do fluxo de vídeo exige verificar o funcionamento de R2 e Stream com um ficheiro de teste.
2. **Backup e recuperação.** O GitHub conserva o código e as migrações. Verificar separadamente o ponto de recuperação dos dados de produção no Lovable Cloud e ensaiar o restauro em destino isolado. Incluir os registos de projetos, clientes, faturação e aprovações.
3. **Provider smoke test isolado**: criar um objeto fictício na conta/bucket de teste (não clientes), experimentar `CopyObject` com `x-amz-copy-source-if-match`, `cf-copy-destination-if-none-match: *`, testar 412 por origem alterada e destino existente, e garantir HEAD do snapshot antes de chamar Stream. R2 destination condition está em beta; sem prova de suporte efetivo, STOP.
4. **Stream**: usar `POST /stream/copy` com `input`, `meta.name=operationId` e procurar `GET /stream?video_name=<ID>`; testar zero, um, dois, resposta incerta e substituição obsoleta. Proibir resend após incerteza.
5. **Coerência**: validar o conjunto final de scripts SQL, ACL/RLS, fonte de quota, migração de todos os escritores, hook e handlers, teste real com sessão fictícia e preservação de números/comentários no replacement.
6. **Convivência/drenagem verificável**: não depender de timestamp global, término por revisão ou limite que o suporte declarou indisponíveis. Exigir isolamento dos novos objetos e do lifecycle face a leitores/deleters antigos, ou fence externo comprovado que cubra pedidos já aceites. Só então considerar pausa funcional do job6 e grants instrumentados, sem mudar a cadência; ver `coexistence/RESULT.md`. Nem cron.run_details, nem ledger vazio, nem logs silenciosos provam a retirada de chamadas não instrumentadas.
7. **Sequência**: baseline estável verificado → pacote SQL atómico → health checks e grants → deploy individual dos handlers com bridge legada → frontend canário → teste fictício não destrutivo → observação de quota e estado Stream → retomar job 6, conservando o mesmo schedule se continuar suportado.
8. **Abort/rollback**: antes da primeira operação durável pode executar-se `rollback-all-empty.sql` apenas se a verificação provar ledger e outbox vazios; depois da primeira operação, reverter por recuperação progressiva, guardando claims/IDs, sem voltar a lançar cópias duplicadas. Limpeza, cobranças, notificações e fila push continuam fora deste lote.

## Escopo para outros agentes ou revisores independentes

- **Revisor A — SQL e segurança**: verificar transações, funções SECURITY DEFINER, grants, isolamento por workspace e reconciliação; entregar apenas diff ou testes isolados.
- **Revisor B — R2/Stream**: comparar código do runtime com a documentação Cloudflare e executar canário autorizado em conta de teste; não listar, alterar nem apagar objetos de clientes.
- **Revisor C — frontend e legados**: ensaiar v1/v2, separadores antigos, upload incerto, cancelamento e preservação de comentários/versões.
- **Orquestração**: reunir as três provas no PR #2 e rever o resultado do GitHub Actions; nenhum agente tem autorização automática para executar operações destrutivas ou implantar o pacote total.

Não há ligação a Cloudflare neste ChatGPT; o projeto Lovable possui zero conectores personalizados. Sem acesso físico do fornecedor e confirmação de restore isolado, o estado continua **NO-GO**.

## Pacote SQL da candidata

O comando `python3 assemble_candidate.py`, executado nesta pasta, escreve o SQL na saída padrão. Verifica os hashes dos três ficheiros e agrupa a contabilidade, as operações de upload e a quota final numa transação. O ensaio em PostgreSQL descartável inclui uma falha no final da terceira etapa e verifica que as tabelas e os triggers das etapas anteriores são revertidos. A reconciliação do contador divergente e a validação do restauro continua a preceder qualquer aplicação no ambiente real.
