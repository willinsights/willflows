# WillFlow 2.0 · fecho técnico do candidato de vídeo/quota (18/11/2026)

**Estado:** validação de código isolado aprovada; **NÃO autoriza merge, SQL nem implantação em produção**.

## Confirmado no GitHub Actions

- Pull Request #2: https://github.com/willinsights/willflows/pull/2
- 29 testes Vitest isolados aprovados, incluindo duas chamadas concorrentes ao mesmo upload, recuperação incerta, transferência falhada, recibo assinado obrigatório antes do PUT e validação de quota de substituição. Mais 1 teste de regressão jsdom do hook de upload aprovado no overlay.
- Manifesto SHA-256 verificado no CI.
- Build Vite com sobreposição temporária dos candidatos no runner: aprovado.
- Verificação de tipos da interface temporária com `tsc --noEmit -p tsconfig.app.json`: aprovada.
- `deno check` sobre o runtime e os handlers isolados: aprovado.
- Nada copiado para `src/` ou `supabase/functions/` no GitHub. As sobreposições são criadas **somente dentro do runner descartável** do GitHub Actions.

## Alterações desta revisão isolada

- Uma única operação ativa por ficheiro e contexto, coalescendo duas chamadas simultâneas antes de PUT / processamento.
- Retry de falha do PUT reutiliza identificador e ticket, sem gerar uma nova operação de vídeo.
- O envio com resultado incerto mantém a sua identidade e bloqueia outro ficheiro até recuperação explicitamente confirmada como `processing`.
- A interface candidata expõe `Verificar envio` e cancelamento controlado; não afirma que um vídeo foi cancelado se o backend recusar.
- Cálculo de quota total conserva `storage_limit_bytes` como **total** já incluindo o extra; rejeita créditos de substituição impossíveis e overflow de inteiros.
- Os comportamentos comerciais, limites, preços, `Ilimitados`, notificações antigas e pagamentos não foram alterados.

## Restrições restantes: sem autorização de produção

1. **Migração SQL e quotas**: `00-accounting.sql`, `01-upload.sql`, `02-total-quota.sql` ainda não constituem uma migração única comprovadamente reversível contra todos os escritores legados. Fechar `check_storage_quota`, preflight, triggers, contadores, permissões e compatibilidade de dados antigos.
2. **Imutabilidade do objeto R2**: um HEAD válido não impede que um PUT assinado altere o objeto até o fornecedor o copiar. É necessário congelar a origem ou validar versão/ETag com contrato comprovado, incluindo concorrência externa.
3. **Compatibilidade legada**: confirmar a ponte para tickets de versões anteriores e abas abertas, incluindo chaves antigas de três/cinco segmentos, `undefined`/`null` e transição sem perda de vídeos.
4. **Cloudflare Stream**: confirmar pesquisa paginada de recuperação e fencing de estados / UIDs superseded, com evidência operacional. Não assumir exatamente-uma-vez externo.
5. **Outbox e rollback**: conservar referências e claims históricos, sem consumidor destrutivo. Completar reversão conjunta dos SQL e ensaios de cascade/expiração antes de qualquer limpeza.
6. **Gates operacionais**: verificar timestamp UTC e recuperabilidade do backup, versão/hash efetivos de cada função ativa, pausa e drenagem de jobs/chamadores e janela de canário. Sem provas: STOP.
7. **Confirmação comercial**: o contrato técnico proposto é `storage_limit_bytes = total` (base + extra); preservar o mesmo número de versão e comentários ao substituir um vídeo. Não alterar sem aprovação da regra.

## Ordem segura quando as provas existirem

1. Fechar as dependências e executar ensaios isolados com dados fictícios de todos os writers, um teste UI/browser e testes multi-tenant com o pacote SQL final.
2. Apresentar exatamente o diff SQL/código, riscos, backup, SHA e reversão ao proprietário para aprovação **específica**.
3. Pausar e provar drenagem. Aplicar SQL primeiro; verificar ACL e catálogo. Só depois implantação seletiva de funções e UI, compatível com tickets antigos.
4. Validar um canário não destrutivo autorizado e monitorizar sem duplicar jobs. Ativar limpeza de ficheiros apenas mediante autorização destrutiva separada.

**Não confundir o código pronto para revisão com a versão WillFlow 2.0 operacionalmente concluída.** O lote Stripe separado permanece fora deste Pull Request.


## Progresso adicional: compatibilidade, fornecedor, migração e restauro

- **Legado:** pedidos sem `operationId` podem encontrar a operação v2 pela chave persistida e só avançar se o HMAC v2 corresponder integralmente. A ponte v1 continua a exigir comprovativo v1 válido. O SQL de emissão aceita chaves antigas de três segmentos com `undefined`, `null` ou ID do projeto, além das chaves de tarefa. Tickets adulterados são recusados.
- **Cloudflare R2:** antes de enviar ao Stream, o runtime candidato prepara uma cópia no prefixo privado `__willflow_frozen/`, usando o ETag observado no HEAD como condição na origem e condição de destino sem substituição. A referência fica na outbox `held` antes de qualquer escrita externa. Se a API não satisfizer as condições, não ocorre envio ao Stream; a operação mantém-se incerta. Esta estratégia evita que o PUT assinado do utilizador substitua a entrada de transcodificação, mas o suporte operacional da extensão de destino de R2 (beta) **não foi testado com a conta real**. Sem consumidor destrutivo nem limpeza automática.
- **Cloudflare Stream:** novas cópias guardam `meta.name=operationId` e a recuperação procura pelo `video_name` exato. Se houver ambiguidade ou resultado limitado, bloqueia novos envios até conciliação humana. Versões antigas sem esse nome exigem reconciliação operacional. Atualizadores candidatos de estado/configurações verificam novamente o UID atual antes de modificar a linha, impedindo writes de respostas obsoletas.
- **Quota:** contrato total continua a utilizar exclusivamente `storage_limit_bytes`, sem somar extras duas vezes. A migração `00-accounting.sql` passou a rejeitar, de forma transacional, qualquer baseline divergente antes de instalar o novo trigger. A função total aceita campos opcionais base/extra não preenchidos, mas rejeita valores negativos; não há novas concessões comerciais.
- **Expiração:** operações apenas emitidas, já expiradas, podem ser arquivadas manualmente por função privilegiada sem apagar objetos; o histórico e a referência ficam preservados em `held`. Não existe cron associado.
- **Reversão:** `rollback-all-empty.sql` desfaz operações/contabilidade numa transação e restaura a versão anterior do trigger, mas **só enquanto não existir histórico/outbox e sem bytes de replacement**. Depois de uso, qualquer rollback destrutivo é rejeitado; requer recuperação progressiva.
- **Backups:** o ensaio `pg_dump`/`pg_restore` em PostgreSQL descartável é evidência do procedimento, não de backup real. Sem acesso a snapshot/restauro da plataforma não há prova de que um backup verdadeiro seja recuperável.

### Verificações de produção, exclusivamente SELECT (18/11/2026)

- Base de dados Supabase ativada.
- `workspace_storage`: **19** workspaces, **1 contador divergente**, **0 limites totais ausentes**, **0 contadores negativos**.
- Colunas base+extra: **0 divisões em falta** e **0 diferenças** relativamente ao total contratual.
- Gatilho produtivo `trg_sync_storage_video_versions` atualiza só `file_size_bytes`, INSERT e DELETE; não contempla todas as alterações de `is_deleted` ou da substituição. Os novos triggers não estão instalados.

**Resultado: a migração de quotas está deliberadamente em NO-GO enquanto o único contador divergente não for conferido e reconciliado.** Nada foi alterado nesta leitura; nenhuma identificação de cliente foi exposta.

### Evidência e pré-condições de fornecedor

- R2 conditional CopyObject: https://developers.cloudflare.com/r2/api/s3/conditional-operations/
- R2 destination conditional CopyObject (beta): https://developers.cloudflare.com/r2/api/s3/extensions/
- Cloudflare Stream exact `video_name`: https://developers.cloudflare.com/api/resources/stream/methods/list/
- Código e testes estão exclusivamente no PR de revisão; antes de produção é necessário validar R2/Stream contra um ambiente de teste controlado e autorizar a eventual retenção/custo temporário das cópias congeladas.


### Verificações de continuidade da aprovação

O mesmo link continua a apresentar o comentário e a aprovação quando a nova cópia está pendente, em processamento ou em erro. Uma versão com um ficheiro legado continua a usar a assinatura do seu próprio espaço. Uma falha de leitura do histórico é comunicada ao cliente. O ensaio em PostgreSQL compara o token, a identidade e o número de versão, o comentário, a resposta, a aprovação e as datas antes e depois da substituição.

Se a confirmação da recuperação se perder, o cliente pode consultar de novo a operação. A base de dados confirma a associação atual entre versão, objeto e UID antes de aceitar o resultado guardado. O ensaio usa dados e serviços simulados.


### Reconciliação de um contador divergente

`quota-baseline.sql` devolve a contagem e a soma de versões ativas, o valor guardado, o número de tamanhos por confirmar e uma assinatura dos registos. A leitura devolve apenas contadores divergentes. Para gerar o SQL da migração com a correção precisa, passar os cinco campos revistos a `assemble_candidate.py --reconcile-counter WORKSPACE STORED ACTIVE COUNT SHA256`. O comando imprime SQL e pode ser ensaiado numa cópia isolada.

A aplicação compara novamente os valores e a assinatura depois de bloquear os escritores. Alterações entretanto ocorridas, tamanhos sem confirmação ou uma falha posterior na migração cancelam a transação inteira. Uma aplicação bem-sucedida conserva o limite contratado, regista os valores anterior e corrigido e mantém os registos dos vídeos. A execução sem argumentos continua a recusar qualquer divergência.


### Compatibilidade com escritores anteriores

Depois da migração, a alteração de uma versão atualiza o contador dentro da mesma transação. Chamadas existentes de serviços a `add_workspace_storage` continuam a receber a resposta habitual e uma repetição não volta a somar nem subtrair bytes. Tentativas de escrever diretamente um total obsoleto são recusadas. O rollback antes da primeira operação repõe a função original e os seus privilégios.
