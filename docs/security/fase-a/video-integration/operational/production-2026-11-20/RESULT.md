# Primeira fase real — observação em produção

Autorização expressa do titular: 20/11/2026, mensagem das 13:09 UTC. Esta fase não abre uma janela de manutenção.

## Executado

- Hash de maintenance.sql auditado conferido antes da operação.
- Executor normal gerido aplicou `drizzle/migrations/0010_video_observation_private_control.sql` no banco do projeto (não num draft). O gestor controla a transação, por isso BEGIN/COMMIT do candidato foram omitidos na submissão. Corpo funcional preservado; comentários não operacionais omitidos. Acrescentadas duas validações DO: current_user=postgres e CREATE mínimo antes de criar objetos; ownership do schema/tabelas/funções no fim. Qualquer divergência abortaria a mesma transação.
- Leitura posterior confirmou schema e três tabelas propriedade de postgres, RLS ativo, sem USAGE de service_role no schema. RPCs públicos de instrumentação: EXECUTE só service_role; controlos initialize/pause/freeze/resume/activate_coordinated sem EXECUTE para anon/authenticated/service_role. Todas as funções têm search_path=public. Ambos os fences BEFORE STATEMENT habilitados.
- Não foi chamado initialize nem introduzida linha de estado: migration API só recebe DDL. O singleton ausente é o modo de observação aberto auditado, não freeze nem pausa. A capacidade do executor owner ficou demonstrada na transação; eventual initialize deve usar a operação privada autorizada, não conceder novas permissões. Sem alterações ao seed (não contém estas tabelas).
- Copiados exatamente os cinco bridges auditados para os entrypoints ativos e uma dependência dedicada `_shared/execution-control.ts`; dependências contexto/ticket/timing-safe conferidas idênticas às atuais. Autenticação legada do cleanup preservada, sem desbloquear novos mecanismos de autorização. Fontes anteriores do checkout arquivadas em rollback/; não são uma exportação certificada de todos os isolates antigos.
- Implantação seletiva dos cinco nomes aceite. OPTIONS ganhou apenas marcadores públicos não sensíveis de observação e hash do candidato auditado, para distinguir resposta da nova fonte.

## Fonte submetida por função (bundle + settings, ferramenta de implantação)

| Função | SHA-256 submetido |
|---|---|
| r2-upload-url | 5db815b90c0c97dc5d8cdc1823c2ef6d98044eaccf1958d9121f2d79a0694d10 |
| stream-process-video | 3498a4a6640fb8c0abfcff137703bcb46afa8f439d02f5a0240f77db463bdc71 |
| stream-get-status | ebf650d6a006c851f26a9c4ecea139c1ff343cdfd4afe615965de69c2dca3c14 |
| stream-update-video | a8140b432eaa95ad0bdf3c491f1df3c1ef88c2984e1c4a952dcdd5e7ed2c7fbb |
| cleanup-expired-videos | 086e8d38fef10ab5abde765de2049652a7a8087db7c9a2bd62f5e3cdb1c3454f |

`sources.json` distingue hash da fonte anterior, candidato e entrypoint com marcador. Não confundir esses hashes com um identificador/limite de vida de revisão emitido pelo gateway.

## Verificação real sem efeitos

Às 13:12:17 UTC, as cinco chamadas OPTIONS públicas devolveram HTTP 200, X-WillFlow-Observation-Version=1 e hash coincidente com a fonte candidata de cada função. Cinco POST sem qualquer credencial e com corpo vazio devolveram 401 antes de efeitos. Nenhuma limpeza autenticada foi invocada. A ferramenta de chamadas rejeitou OPTIONS como método não suportado; a verificação efetiva usou HTTP direto sem credenciais.

Leitura posterior: state_rows=0, pause_active=false, frozen=false, coordinated=false; execuções=0 e grants=0 nesse instante. Isto significa ausência de tráfego instrumentado registado até à leitura, NÃO demonstra autenticação de chamadas legítimas, drenagem nem ausência de chamadas antigas em voo. Não foram repetidos testes isolados, visuais ou inventário já aprovados. Build automático OK. `https://willflow.app` HTTP 200; nenhum publish de frontend solicitado e nenhum novo frontend alegado como publicado.

## Bloqueio preciso para a janela

O controlo SQL e as fontes de observação já chegaram a produção. A sessão read-only continua sem permissão para manipular controlos privados (correto); a migração confirmou que o executor gerido é legitimamente postgres. Falta evidência do gateway sobre todas as revisões antigas ainda capazes de efeitos: último timestamp de admissão/retirada, garantia de não admissão posterior, limite real de duração e confirmação de conclusão de pedidos HTTP e efeitos externos já iniciados. Um OPTIONS da nova revisão não prova que a antiga desapareceu. O ledger não cobre pedidos/grants anteriores à instrumentação.

Canal autêntico confirmado pela documentação oficial: **https://lovable.dev/support** ([política oficial](https://docs.lovable.dev/introduction/support-policy#contact-support)); em Enterprise também `+` junto ao chat → Help & support → Contact support. A equipa da plataforma precisa de fornecer, para estes cinco nomes, timestamps de última admissão das revisões anteriores e confirmação de conclusão/limites de pedidos em voo. Enviar apenas referência interna do projeto através do próprio produto, nomes das funções, hashes públicos acima e intervalo de implantação; não enviar tokens, segredos, links de aprovação ou conteúdo/dados de clientes. Nenhum contacto a terceiros foi iniciado nesta sessão.

## Sequência seguinte e reversão

Sem prova de gateway/equivalente, NÃO iniciar pause/freeze. Após obtê-la, aplicar o runbook: horizonte T_old+TTL_max+60s (7200s salvo cobertura legada exclusivamente 3600s comprovada), conclusão HTTP/provider adicional, zero execuções incertas/pendentes e grants por vencer; janela com resume/timeout viável; só então freeze e inventário individual ATUALIZADO no lock NOWAIT, reconciliação exacta, pacote contabilístico coordenado atómico e publicação seletiva com verificação. Não foi feita reconciliação porque o inventário anterior não certifica a futura janela.

Reversão desta observação: reimplantar individualmente a fonte anterior guardada de cada handler com as dependências originais idênticas, sem tocar cron ou segredos. Manter schema/ledgers/fences enquanto houver evidência registada; não apagar tabelas/claims. Em observação sem pausa estes fences não recusam escritas. Antes da contabilidade, pause futura pode ser revertida por resume owner-only ou timeout; depois de coordenada, não restaurar cleanup incompatível. Nenhum rollback foi executado.

**Estado final: observação instalada; admissão aberta; nenhuma janela de pausa em curso; contabilidade, quota, dados, calendários e frontend deste lote não alterados.**