# Implantação por etapas — proposta, não autorização

Base: `a56ef2da`. Nenhum passo de produção executado. Alterar caminhos activos pode implantar automaticamente: autorização e pausa comprovada devem PRECEDER a cópia de qualquer fonte. Não usar publicação global para este lote.

## 0. Pré-condições / backups — NO-GO por agora
- Confirmar catálogo imediatamente antes: nomes das três RPCs/tabela ausentes, assinatura de quota/trigger igual, unicidade de workspace_storage e ACL existentes. Parar perante divergência; SQL usa CREATE, não substitui funções existentes.
- Guardar definições/ACL/trigger específicas e inventário dos 5 schedules, sem cabeçalhos/comandos/segredos; identificar versão efectivamente activa de cada função. As fontes de rollback do editor não provam a versão em execução. Se exportação/versionamento activo não estiver disponível, NO-GO para implantação dependente de rollback exacto.
- Proprietário confirma timestamp UTC do backup diário em More → Database → Manage → Backups. Inventário não verificável pelas ferramentas disponíveis; backups só incluem BD, não vídeos/storage nem código/segredos. Sem restauração automática. Uma restauração diária perde dados posteriores e reverte schema; não é rollback normal.
- Confirmar preservação dos ficheiros pelo proprietário antes de QUALQUER activação destrutiva. Não efectuar exportação de dados reais nesta fase.
- Rever sobreposição anterior ao deploy semanal: uma execução antiga não usa ledger. Exigir pausa + drenagem antes de substituir.

## 1. SQL aditivo separado
Autorização específica para aplicar `candidate.sql` exacto identificado no SHA256SUMS, transaccionalmente e versionado pela ferramenta de migração; ferramenta gere BEGIN/COMMIT. Não alterar tabelas existentes nem dados. Conferir ACL/RLS e histórico depois, sem invocar handlers.
Pode implantar apenas ledger/RPCs semanais numa etapa própria, mas requer pacote SQL separado com novo hash aprovado; não dividir silenciosamente o ficheiro autorizado. Quota continua NO-GO até resolver o trigger histórico e validar todos os escritores.

## 2. Resumo semanal, sem overlap
Após SQL e autorização de pausa: parar somente job 9 `send-weekly-summary`, conservar `0 9 * * 1`; verificar inactivo. Pausa não cancela pedido já expedido: exigir evidência de zero execuções em curso e zero pedidos HTTP pendentes, com latência máxima documentada. Não basta esperar arbitrariamente.
Com drenagem provada, implantar apenas emissor protegido e conferir código/versão. Retomar o MESMO schedule se transporte antigo continuar válido. Monitorizar evento natural; não executar manualmente nem reenviar antigos.
Se versões/drenagem não forem verificáveis, parar. Reserva permanente impede repetição entre handlers novos, não entre antigo e novo.

## 3. Limpeza — só auth/pausa, eliminações proibidas
Job 6 `cleanup-expired-videos-daily`, expressão real `0 * * * *`, mantém frequência. Pausar e drenar sob autorização, implantar candidato com interruptor não configurado (503 antes de acesso BD/storage). Não activar `CLEANUP_DELETIONS_ENABLED=true` nesta fase. Não declarar 503 como execução funcional da limpeza.
Activação destrutiva é etapa independente: corrigir débito repetido do trigger no hard DELETE, auditar substituições/tamanhos, erros ignorados/avisos concorrentes e cobertura de remoção legado, repetir regressões e reconciliar quota sem escrever automaticamente. Resolver estes bloqueios antes de aprovar `true`.

## 4. Conversão dos cinco schedules, um de cada vez
Inventário observado: 5/prazos `0 * * * *`; 6/limpeza `0 * * * *`; 7/alertas `0 9 * * *`; 9/semanal `0 9 * * 1`; 11/Stripe `15 3 * * *`. Todos activos e sem target_kind/target_path/body. Conversão gerida automática indisponível. Não criar segundo job nem escrever SQL HTTP manual.
Alternativa concreta somente se disponível e aprovada: pausa do antigo → drenagem comprovada → remover antigo (sem apagar histórico) → confirmar ausência → criar UM schedule gerido com mesmo nome/frequência/contrato via ferramenta suportada. Há janela sem execução, deliberada; não há overlap. Se não for possível drenar/exportar contrato ou recuperar o original com segurança, NO-GO. Nenhum destes passos está autorizado nesta preparação.
Para os outros três handlers, validar primeiro idempotência concorrente e resultados de inserção; não assumir que SELECT-before-INSERT deduplica. Stripe fica fora de qualquer ensaio real.

## 5. Monitorização e critérios
GO apenas com identidade/contrato/hash confirmados, backup visto, SQL aplicado/ACL conferidas, fonte activa verificável, drenagem provada e rollback compatível. Cleanup destrutivo permanece NO-GO pelos bloqueios listados.
Observar apenas próximo evento natural autorizado: HTTP, início/fim, contagens agregadas (sem destinatários/payloads), ledger por estado, ausência de claims repetidos, falhas de finalização e quota. Para semanal: 1 claim por identidade, confirmação de `app-email`/fornecedor + sent; suppressed não conta como enviado. Entrega na caixa de correio requer confirmação do destinatário. Sem logs HTTP, não afirmar 401/sucesso.
STOP perante resposta 5xx inesperada, claims incertos, perda de referências, quota incoerente ou mudança de catálogo. Pausar schedule autorizado e preservar evidência; não limpar ledger, não retry incerto nem reparar pagamentos automaticamente.

## Reversão / recuperação
- Sem claims: desactivar/drenar handlers, retirar dependência das RPCs, aplicar rollback exacto; tabela privada fica.
- Com qualquer claim: NÃO restaurar emissor antigo; manter RPCs/ledger e handler protegido, pausar schedule para investigação. `rollback.sql` aborta atomicamente. Recuperação de `reserved`/`uncertain` exige autorização caso a caso e prova externa; não existe reclaim por TTL seguro.
- Cleanup: manter interruptor desligado; reversão de código não ressuscita ficheiros nem desfaz quota. Nunca activar fonte antiga como rollback automático de auth.
- Cutover: se o novo falhar após retirar antigo, manter ausência de schedule até restauro autorizado verificável; não criar simultaneamente antigo+novo.

## Autorizações ainda necessárias
SQL exacto/versionado; pausa/drenagem/retoma e eventual substituição por job; implantação individual com versão anterior comprovada; evidência de backups; regra do interruptor e futuro processamento destrutivo; recuperação de envio incerto. Stripe/push reais e dados antigos exigem autorização separada.