# Coexistência de revisões — 20/11/2026

## Resultado e produção

**Não é segura a viragem integral in-place do pacote atual.** A falha é reproduzível com o código real antigo, não depende de logs silenciosos nem de timestamps do gateway. Não aplicar isoladamente estes candidatos.

- Às 13:26 UTC os cinco endpoints de observação responderam OPTIONS 200, `X-WillFlow-Observation-Version: 1` e os mesmos marcadores de fonte de c3504bc0. Isto identifica a revisão que respondeu, NÃO prova exclusividade global, retirada ou dependências exportadas. Nenhum POST/HEAD autenticado nem limpeza foi invocado.
- Desde c3504bc0, HEAD é 5143ae93: 0011/verificação do email de convite, configuração de confirmação de email e `execute-automations` com Studio verificado no servidor (implantação registada no relatório selected-2026-11-20). Não há alteração de src/frontend nem dos cinco handlers/dependência de observação nesse diff. Não reverter estas correções.
- Histórico gerido consistente até 0011, sem findings de histórico. Consulta agregada do controlo: 0 state, executions, unfinished e grants vigentes. Admissão aberta; **não há janela em curso**. Estes zeros não contabilizam revisões anteriores à instrumentação.
- Logs recomendados por função: os cinco handlers devolvem apenas shutdown 13:15:38; leitores `get-video-approval-data`, `submit-video-feedback`, `r2-download-url`, `stream-sign-playback`, Google e executor de automações sem logs retornados. Worker mostra arranques/ticks 13:15 e 13:20; não foram invocados nem se inferiu HTTP 200. Não mudámos job12.
- `https://willflow.app`: HTTP 200, marcador servido `c3504bc09cdf5c856d74a3e447e3d47b03faa0ce`. Não foi publicado outro frontend. As melhorias financeiras/carregamento/vídeo já servidas mantêm-se; não há etiqueta nova de release completa.

## Implementado exclusivamente no candidato

| Ficheiro | Proteção e alcance |
|---|---|
| accounting-expand.sql | Mesmo lock transacional e delta por OLD/NEW; chamadas adicionais de add_workspace_storage não alteram o uso; UPDATE absoluto legado aceita sem sobrescrever bytes autoritativos. Baseline divergente ainda aborta. Identidades R2/Stream não-cascading, sem acesso anon/authenticated; key/UID não podem migrar para outro ID/workspace nem INSERT ressuscitar identidade apagada. |
| upload-expand.sql | Variante de 01-upload com marcador transacional por operação em persist/finish/recover, depois das mesmas validações de serviço/contexto/membership/claim. Retém reservas, outbox, ID/número e contratos de quota. Não muda limites, preços, GB ou «Ilimitados». |
| generation-fence.sql | Alterações de chave/tamanho/autor/UID de uma versão gerida exigem marcador correspondente à operação, workspace, autor, chave e tamanho. Um UPDATE legado tardio sem marcador é rejeitado; toda a tentativa e identidade temporária revertem. Não é fence de eliminação externa, status/lifecycle nem tokens. |
| namespace.ts | Protótipo de namespace `__willflow_v2/<workspace>/<operation>/input.mp4`, identidade exata multi-tenant. NÃO integrado no emissor: os leitores antigos workspace-first rejeitariam essas chaves. Não fingir compatibilidade pela simples mudança de prefixo. |

SQL fora do journal; `assemble_expand.py` verifica `EXPAND-SHA256SUMS` e monta accounting/upload/02-total-quota/generation-fence numa transação, sem ativar coordinated nem criar pausa. Não montado pelo assembler produtivo. A extensão exige avaliação dos escritores de metadata/status/lifecycle e dos emissores/leitores; não é um pacote completo de produção. Marcador local nunca é uma credencial e não atravessa pedidos PostgREST. Registos de identidade retidos não são uma prova de existência física.

## Novas provas, sem repetir canário visual/inventário

- **13 grupos PostgreSQL** via socket Unix privado, sem env de produção: falha tardia da transação restaura schema/RPC; RMW atrasado e RPCs repetidos preservam 34 bytes; oito soft deletes concorrentes + dois hard deletes debitam 14 uma vez e deixam 20; INSERT repetido de key removida é rejeitado; oito INSERTs tardios acrescentam 24 (=44); quota 1000 recusa INSERT e reverte identidade; ACLs; reprodução da sobrescrita de UID antes do fence; RPCs reais persistem/confirmam uma geração de 7 bytes (=51), rejeitam duas confirmações tardias e chave/tamanho legados sem alterar bytes; substituição controlada 7→9 preserva ID, mantém referência anterior held e soma 53; INSERT legado não consome uma reserva de 947 e persistência confirma o total de 1000; montagem completa com hashes reverte quatro peças na falha final e aplica em BD privada nova; cascade conserva identidades.
- **2 Vitest**: namespace multi-tenant e contraexemplo com entrypoint real de cleanup anterior à observação, compilado em memória. Só clientes/HTTP/S3 fictícios; nenhuma saída real. O cleanup seleciona uma versão pelo task, elimina o novo key R2 e UID Stream, recebe erro do UPDATE na BD, continua, desativa token e retorna **200**. Mesmo o novo prefixo é apagado porque o handler usa a chave lida, não filtra namespace.
- **25 regressões** financeiras, player, erro de upload e substituição passaram. Última compilação automática: build OK. Nenhum teste visual, MP4, restauro, canário real ou inventário 54/54 foi repetido.

## Por que o in-place não passa

1. SQL pode impedir RMW, duplicação de quota e ligação de resultados a gerações supersedidas. Não pode desfazer DELETE R2/Stream aceite ANTES de escrever na BD.
2. Prefixo UUID ou etiqueta Stream não é controlo de acesso: o cleanup antigo obtém key/UID nas próprias tabelas e usa a credencial existente. O snapshot frozen privado não protege o UID de reprodução publicado nessa linha; uma outbox posterior pode guardar apenas uma referência já morta.
3. Uma revisão antiga pode desativar o token pelo task mesmo quando se rejeita a atualização da versão. O fence de geração não garante sozinho preservação do link. Marcação de lifecycle/metadata pode ainda executar em caminhos não cobertos.
4. Rejeitar INSERT duplicado evita duplicação, mas não promete que todo o cliente antigo recebe sucesso. Novos retries confirmados usam os RPCs idempotentes; um INSERT bruto legado pode receber conflito.

## Alternativa concreta faseada — sem prova global do gateway

1. **Manter o que está público:** financeiro/carregamento e frontend atual, 0010 e segurança posterior. Alterações só de apresentação, que não mudem o contrato v1 nem escritores de quota, são publicáveis independentemente. Não há diff novo de frontend a publicar nesta sessão. Não publicar playback signed-only em separado de emissor, signer, leitores e renovação de URLs.
2. **Expansão contabilística:** fechar compatibilidade de todos os escritores e montar baseline/fingerprint individual ATUAL sob os mesmos locks NOWAIT; qualquer divergência/falha reverte toda a transação, sem pausar clientes. A migração apenas de contabilidade não deve ligar `coordinated` nem normalizar um contador com base na amostra anterior. O guard não aumenta capacidade nem repara ficheiros físicos.
3. **Isolar a geração canónica antes de novas emissões:** armazenar operações/novas chaves/UIDs num registo privado separado, sem projetar estas identidades em video_versions acessível ao cleanup antigo. Conservar nessa tabela a projeção histórica. Os leitores novos devem derivar identidade e autorização da geração privada + token/membership vigente; os caminhos antigos de retenção/revogação exigem ponte transacional compatível, não um token permanentemente ativo. Só um novo namespace na mesma linha não serve. Primeiro ensaio com fixtures e leitores novos, incluindo revogação real/autorizada, late status/delete, cascatas e todos os ramos de cleanup.
4. **Alternativa de fornecedor:** em vez de sidecar, só aceitar uma política verificada no fornecedor que impeça credenciais/revisões antigas de apagar as novas identidades, cobrindo pedidos já aceites. Bucket/prefixo/labels sem ACL comprovada não passam; o token Stream não deve ser presumido restrito por etiqueta. Não rodámos credenciais nem comprámos recursos.
5. **Canário e publicação:** depois de provar isolamento + lifecycle, ensaio autorizado fictício no runtime novo, seguido de frontend compatível e readback de aprovação/quotas. Contract pode ficar adiado indefinidamente mantendo a projeção histórica; nunca obter autorização para destruição por silêncio de logs. Antes de uso novo, rollback transacional; após uso, preservar ledger/outbox/IDs e recuperar forward. Nunca voltar a uma revisão destrutiva para rollback.

**Operação que ainda impede a migração integral:** tornar novas identidades de media e lifecycle visíveis aos seletores/autorização destrutivos antigos, sem isolamento privado completo ou fence do fornecedor que inclua eliminações já aceites. Não é falta de cron.alter_job, de autorização do titular ou de timestamp de suporte. O sidecar/lifecycle ainda não foi implementado/testado end-to-end; nenhum instrumento desta sessão cancela retroativamente um DELETE externo aceite. Não iniciar pausa para resolver isto dentro de uma janela sem saída.

## O que esta sessão executou

Leituras agregadas/histórico/logs, cinco OPTIONS públicos, GET do domínio, alterações candidatas e documentação, testes fictícios/regressões. **Nenhuma migração aplicada, implantação, publicação, pausa, alteração de schedules/segredos, reconciliação do contador, mensagem ou eliminação externa.** WillFlow 2.0 não declarado concluído.