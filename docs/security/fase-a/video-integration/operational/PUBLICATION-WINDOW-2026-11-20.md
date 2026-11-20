# Janela real autorizada — 20/11 13:31 UTC

## Tolerância aplicada

O titular autorizou falha/reenvio de uploads transitórios. Não foi exigido zero uploads, timestamp global ou confirmação de término do suporte para os proteger. Essa tolerância não cobre eliminação de media consolidada, projetos, comentários, aprovações, revogação indevida dos links ou ajuste cego de quotas. Não se declarou WillFlow 2.0 completo.

## Operações reais nesta sessão

- A ferramenta de dados gerida executou como `postgres` uma única abertura privada de pausa, após validação de propriedade do schema/tabela e sem sobrescrever estado coordenado/frozen ou janela já ativa. Inseriu apenas `pause_until=2026-11-20 13:42:33.249434+00`. Limite de dez minutos; timeout já suportado pelo handler; não usou a API de pausa de todo o backend.
- A pausa funcional instrumentada recusa **novas emissões e novas admissões de cleanup**. Processamento permanece aberto; não congela escritas de clientes nem toca horários. É estado real consultável, mas não cancela efeitos externos já aceites por revisões anteriores. Não se invocou limpeza para demonstrar a pausa.
- Integrados os ajustes visuais já validados de `frontend/pages/VideoApproval.tsx` no caminho ativo `src/pages/public/VideoApproval.tsx`: cabeçalho/actions móveis, nome/comentário e metadata sem cortes. Diff apenas de classes, sem novo endpoint, assinatura, quota ou contrato de playback. Preservadas as alterações pós-observação de segurança, financeiro e carregamento. Commit publicável `a56f1383`.
- 25 regressões passaram e build automático OK. Navegador anónimo local a 390x844/1280x1800: vídeo MP4 sintético avançou 0,119/0,129 s, overflow falso, troca para v2, um comentário, uma aprovação lida após reload; zero runtime errors. Backend interceptado exclusivamente fictício, sem escrita produtiva e sem alegação de persistência Cloud ou HLS assinado novo.
- Scan básico atual sem findings; não faz análise profunda. Os dois avisos profundos anteriores de destinatários de email administrativo permanecem abertos, sem alteração/ignore. Alguns metadados de scan continuam stale; não chamar o projeto limpo.
- Publicação única solicitada pela ferramenta gerida, alvo `https://willflow.app`; o aceite apenas agenda, não prova conclusão. Não implantadas outras Edge Functions nesta sessão.
- Encerramento privado executado antes das 13:35:06 UTC: `pause_until=NULL,frozen=false,coordinated=false`, como postgres e só para o prazo exato desta sessão. Leitura posterior confirma admission_paused=false, unfinished=0 e grants vigentes=0. Esses zeros não são usados como prova de ausência de chamadas antigas. Serviço aberto sem esperar o timeout. Não houve segunda tentativa de cutover.

## Etapa que não se aplicou e efeito sobre dados existentes

Não aplicada a migração contabilística/coordenada, nem reconciliado o contador: o contraexemplo de `coexistence/legacy-external.test.ts` envolve uma **versão já persistida**, não só upload em trânsito. Cleanup anterior seleciona por task, apaga R2 e Stream antes do UPDATE SQL, ignora o erro da BD e desativa o token. Aceitar falha de upload não autoriza esse efeito sobre media consolidada e links existentes. Pausa da nova admissão não cancela uma eliminação externa anterior.

O passo concreto bloqueado é projetar novas identidades e alterar contabilidade/lifecycle na mesma superfície ainda lida por deleters anteriores, sem isolamento privado integral ou fence externo contra pedidos já aceites. `generation-fence.sql` protege associações/quota, não restaura um ficheiro eliminado. Não foi removida essa proteção para forçar a migração. Mantidos dados, quotas, grants/execuções reais, schedules, job12 e credenciais intactos; nenhuma reconciliação baseada na amostra antiga. A alternativa privada consta de `coexistence/RESULT.md`, sem nova espera por dados do gateway.

## Estado público verificado depois do deploy

- GET único do domínio às 13:35:54 UTC: HTTP 200, SHA servido `a56f1383c144d7764ff3de49736c62184c27dd93`.
- Chromium anónimo no domínio servido, mobile/desktop: currentTime 0,118/0,128 s; sem overflow; seleção da versão 2, comentário e aprovação confirmados pela fixture e lidos após reload; zero runtime errors. APIs/media interceptados isoladamente no navegador: isto verifica o frontend publicado, não persistência produtiva ou um novo rollout do runtime PR2. Nenhum link secreto ou vídeo de cliente foi usado.
- Pausa encerrada explicitamente, estado não coordenado e não congelado. Frontend independente publicado; migração/handlers de vídeo integral não aplicados. Documentação posterior não foi republicada e não é confundida com o SHA servido.
- O proprietário pode alterar o nome do endereço Lovable ou a visibilidade nas definições de publicação. Recomenda-se nova análise profunda de segurança antes de partilha ampla; o scan básico desta sessão não substitui os dois avisos profundos pendentes.