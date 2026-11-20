# Runtime coordenado — candidato, sem ativação

## Alterações concretas

O runtime PR2 usa agora o protocolo privado `begin/check/grant/finish` também na emissão, processamento, aborto e recuperação. A pausa recusa apenas novas emissões e limpeza; processamento/aborto/recuperação continuam a drenar. O freeze recusa todas as admissões. Cada escrita RPC, HEAD, reserva de snapshot, cópia R2 e submissão Stream verifica a execução; qualquer falha deixa uma execução incerta permanente, sem reaproveitar leases expiradas. Falha após aceitação pelo fornecedor continua sem reenvio automático; a recuperação procura a identidade persistida.

O comprovativo/PUT v2 conserva o TTL máximo de 7200 segundos. O registo privado é escrito antes da entrega e inclui 60 segundos de margem, também admitidos pelo SQL (limite 7260 segundos). Não altera TTL dos links de aprovação, preços, GB, limites ou «Ilimitados». O gateway anterior de emissão foi substituído no runtime candidato pelo controlo privado comum; o script `upload-barrier.sql` antigo NÃO faz parte desta sequência. A ausência do protocolo SQL continua a recusar o runtime coordenado; instrumentação precede funções.

`initialize()` cria apenas o singleton em observação e é owner-only/idempotente. `activate_coordinated()` exige freeze, prazo ainda válido e zero execuções/comprovativos pendentes; a mudança liberta o fence de escritas e mantém emissão pausada até resume/timeout. `assemble_coordinated.py` inclui esta mudança na MESMA transação do pacote contabilístico com verificações e reconciliação individual. Qualquer erro reverte conjuntamente estado e contabilidade. O cleanup legado permanece permanentemente recusado quando `coordinated=true`, mesmo após timeout; não existe consumidor destrutivo autorizado neste lote.

## Capacidade real do Lovable Cloud, só leitura

- A sessão de consulta é `supabase_read_only_user`, sem CREATE em public nem controlo privado; `willflow_video_control` ainda não existe. Esta sessão não pode inicializar/pausar.
- Precedente confirmado no catálogo: schema e tabela privados do canário são propriedade de `postgres`, RLS ativo, sem USAGE para service_role; RPCs do canário são propriedade de postgres. A migração versionada 0009 contém o mesmo padrão owner-only. Isto demonstra que o executor gerido já criou esse padrão no projeto, NÃO que a sessão read-only possa invocá-lo nem que a identidade futura esteja contratualmente garantida.
- As fontes oficiais documentam execução de migrações mas não a identidade PostgreSQL do executor. Antes de usar initialize/pause/freeze/resume, o operador deve comprovar `current_user=postgres` na conexão gerida autorizada. Não conceder acesso a service_role/anon/authenticated, não criar endpoint público nem mudar de role para contornar. Se não for postgres, parar; não há nova permissão proposta.
- O gateway documenta estado, última atualização, invocações e logs; NÃO fornece nesta sessão timestamp verificável da última admissão/retirada por revisão nem um limite comprovado de execução/in-flight/provider. Boot/Shutdown, OPTIONS e aceite de deploy não substituem essa prova. Nenhum valor arbitrário (ex.: 90s lease) é usado como limite do gateway.

## Prova de drenagem a obter, sem começar pausa

Solicitar ao operador da plataforma um registo por função/revisão contendo: fonte/hash antes/depois; timestamp UTC de última admissão da revisão antiga; garantia de não admissão posterior; limite real de execução HTTP; lista ou confirmação de zero chamadas anteriores ainda em voo; conclusão/certeza das cópias/ingestões externas iniciadas nessas chamadas. Abrange emissor, processador, status/settings, limpeza e restantes escritores identificados no runbook. Uma chamada antiga não instrumentada nunca é convertida artificialmente numa execução concluída.

Definir `T_old` como o maior timestamp de retirada comprovado. Horizonte mínimo de grants: `T_old + TTL_max + 60s`, TTL_max=7200s salvo prova de cobertura exclusivamente legada de 3600s. Terminação HTTP/provider é condição adicional, não consequência de expirar o grant. Recolher estado agregado privado durante observação/pausa: unfinished=0, uncertain=0, outstanding_grants=0. Leases expiradas ou erro de leitura são NO-GO, não zero. Arquivar estes resultados sem tokens/links. A prova de restauro e os ensaios visuais/inventário já verdes não foram repetidos.

## Sequência pronta, ainda NO-GO operacional

1. Confirmar executor privado owner, rollback de fontes, timestamp/limites do gateway e controlo da janela/reversão; sem estes meios NÃO pausar clientes.
2. Aplicar apenas instrumentação revista por executor autorizado; initialize em observação, sem grants adicionais; implantar bridges atuais de forma seletiva. Obter prova real de cobertura/retirada; clientes continuam abertos nesta fase.
3. Após horizonte viável e garantia de concluir/reverter a janela, pause owner-only limitada; job6 mantém identidade e calendário, handler autenticado devolve pausa sem efeitos. Processar/abortar/recuperar o que já foi emitido, não invocar cleanup para teste.
4. Com drenagem comprovada, freeze e inventário individual ATUALIZADO/fingerprint do contador; montar `assemble_coordinated.py --reconcile-counter ...`. A reconciliação continua sob lock NOWAIT e comparação exata; inventário anterior não autoriza ajuste cego.
5. Aplicar pacote atómico revisto, implantar exclusivamente runtime/front/readers compatíveis e verificar saúde não destrutiva. Se SQL falhar, freeze anterior permanece até resume/timeout. Após contabilização, recuperar para a frente sem descartar outbox/claims nem voltar ao cleanup legado.
6. Resume privado ou timeout reabre emissão/processamento compatíveis; limpeza antiga permanece bloqueada. Retomar limpeza futura requer revisão compatível e autorização específica. Nenhum schedule/segredo/permissão pública é alterado.

## Evidência isolada

37 Vitest (6 do protocolo + 31 de upload), 12 grupos PostgreSQL por socket privado, 4 testes Deno e 1 teste Python de montagem passaram. PostgreSQL inclui inicialização owner-only/idempotente, admissão aborto/recuperação durante pausa, rollback atómico e retoma sem cleanup incompatível. Percurso adicional nos handlers reais candidatos: emitir → pausar → processar com timeout → freeze recusa recuperação → permitir drenagem → recuperar UID existente sem nova cópia → retomar emissão. Sem novos pedidos reais a fornecedores. A montagem foi corrigida e verificada para adquirir locks de tabelas NOWAIT ANTES do advisory lock do controlo, evitando inversão com os escritores; falha mantém rollback atómico. Verificação Deno do runtime executada em cópia temporária com resolução npm isolada para evitar o pacote local antigo sem export `cors`.

Sem SQL real, deploy, pausa, alteração de job6, mensagens, ajuste de quota ou operações destrutivas nesta sessão. Falta prova de retirada/limite do gateway e confirmação operacional do executor owner para a janela; não falta privilégio cron.alter_job.