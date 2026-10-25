# Plano seguro de correção da auditoria de segurança

## Escopo e autorização
Esta proposta não implementa correções. Nenhum código, dado, política, função, configuração, dependência ou serviço será alterado nesta etapa; apenas este plano é registrado.

A aprovação deste plano não autoriza alterações em produção. Cada etapa terá seu escopo, evidências, testes e procedimento de reversão apresentados antes de uma autorização explícita para execução. Não corrigir achados fora deste escopo.

## 1. Preservar evidências e corrigir a autorização privilegiada
- Preservar as definições atuais das funções, políticas e permissões, versões e resultados da auditoria, com data e acesso restrito. Não copiar valores secretos para relatórios.
- Inventariar todos os usos diretos e indiretos de `public.is_service_role()`: políticas, funções, gatilhos e operações automáticas. A revisão deve incluir as dependências da base ativa, não apenas as migrações do repositório.
- Substituir a identificação baseada em `current_user` por validação confiável do contexto autenticado da requisição. Identidade do proprietário de uma função `SECURITY DEFINER` nunca deve conceder autorização ao chamador.
- Revisar todas as políticas dependentes, privilégios `EXECUTE` e caminhos administrativos; preservar apenas acessos efetivamente necessários. Verificar administradores do sistema, administradores de workspace e convites, sem remover contas ou acessos automaticamente.
- Manter `SET search_path = public` nas funções privilegiadas e validação de administrador do sistema no servidor.
- Critério de saída: visitante, colaborador e administrador de workspace não conseguem executar operações reservadas ao serviço ou ao administrador do sistema; os serviços legítimos continuam funcionando.

## 2. Proteger plano/trial, vídeos e destinos de login
- Impedir alterações de plano, limites, cobrança e trial por administradores de workspace através de escritas diretas ou caminhos alternativos. Manter as atualizações legítimas de cobrança pelos serviços autorizados.
- Preservar datas de trial existentes e a regra de sete dias somente para contas novas. Não criar ou modificar produtos/preços de cobrança.
- Validar no servidor a associação entre workspace, projeto, versão e aprovação em uploads, downloads e operações de vídeo; testar tentativas entre dois workspaces.
- Trocar aceitação ampla de subdomínios por uma lista explícita de origens e caminhos de retorno autorizados, com validação de estado e do destino final. Manter o fluxo de login e integração Google legítimos.
- Critério de saída: manipulação de plano/trial, associação cruzada de vídeos e redirecionamento para destino não autorizado são rejeitados.

## 3. Restringir emails, comentários e revelação de tokens
- Definir chamadores autorizados, modelos, destinatários, limites e proteção contra repetição no envio de emails, preservando notificações e automações legítimas.
- Autorizar gerenciamento de comentários por identidade autenticada ou mecanismo público de aprovação validado, nunca apenas pelo nome informado.
- Inventariar todos os caminhos de revelação de tokens e registrar cada revelação autorizada em `admin_audit_log`, sem armazenar o token nos logs.
- Preservar proteção por coluna dos tokens em texto simples; manter operações de criptografia/decodificação OAuth restritas ao serviço autorizado.
- Critério de saída: envio arbitrário, remoção de comentário de outra pessoa e revelação sem autorização/auditoria são bloqueados.

## 4. Atualizar dependências em pequenos grupos
- Repetir a análise sobre o lockfile efetivamente utilizado e verificar versões instaladas, avisos oficiais, versões corrigidas e compatibilidade. Os números da auditoria anterior não substituem essa verificação atual.
- Separar atualizações por grupo: segurança/sanitização, acesso a serviços, interface e ferramentas. Aplicar um grupo por vez; não fixar versões nesta proposta sem consultar sua disponibilidade e compatibilidade.
- Definir uma única fonte operacional de lockfile, regenerá-la com o gerenciador escolhido e confirmar instalação reproduzível. Não editar lockfiles manualmente nem usar sobrescritas sem verificar dependências transitivas.
- Executar testes pertinentes e nova análise de dependências após cada grupo; registrar achados remanescentes, sem marcá-los como corrigidos antes da validação.

## 5. Testar em ambiente realmente isolado
O preview atual e a aplicação publicada compartilham a mesma base. Portanto, testar no preview atual não constitui isolamento.

Antes de qualquer execução, verificar se um ambiente separado oferece também base, armazenamento, filas, funções e credenciais isolados. Se essa separação não estiver disponível, interromper a implementação e apresentar a limitação; não simular isolamento usando dados reais.

- Usar dados sintéticos, dois workspaces e contas próprias para visitante, colaborador, administrador de workspace e administrador do sistema.
- Usar destinatários de email controlados, cobrança em modo de teste e vídeos de teste. Não disparar emails, cobranças ou limpeza de vídeos de produção.
- Testar permissões com chamadas diretas além da interface: esconder um botão não demonstra proteção.
- Adicionar testes pequenos por regra de autorização, incluindo resultados permitidos e negados, mantendo-os no projeto.

### Matriz de validação
| Fluxo | Verificação obrigatória |
| --- | --- |
| Login e Google | Login legítimo, sessão, retorno correto e rejeição de destinos não autorizados |
| Uploads | Envio autorizado e rejeição de associação a outro workspace/projeto |
| Aprovação e comentários | Link válido, token inválido/expirado e gerenciamento autorizado de comentários |
| Downloads | Arquivo correto e bloqueio de acesso cruzado ou não autorizado |
| Emails | Entrega a destinatário controlado, bloqueio de abuso e ausência de duplicação |
| Cobrança/trial | Fluxo de teste legítimo e bloqueio de alteração direta de plano/trial |
| Tarefas automáticas | Execução legítima, autenticação, repetição segura e falhas registradas |
| Tokens administrativos | Revelação autorizada auditada e rejeição para os demais perfis |

## 6. Aplicação por etapas e reversão
- Antes de cada etapa, confirmar backup disponível, possibilidade de restauração e procedimento testado no ambiente isolado. Exportar definições não substitui backup completo.
- Preparar alterações pequenas e compatíveis com a versão publicada, sem apagar dados ou modificar esquemas geridos pela plataforma.
- Apresentar resultados dos testes, riscos residuais e diferenças propostas; aguardar autorização explícita para essa etapa em produção.
- Aplicar em ordem: autorização privilegiada → plano/trial e vídeos/login → emails/comentários/tokens → dependências. Validar os fluxos afetados e observar falhas antes de seguir.
- Reverter a alteração específica se houver regressão; não restaurar automaticamente uma autorização vulnerável. Se a reversão reabrir a falha crítica, restringir temporariamente o caminho afetado e preparar uma correção segura.
- Restauração completa de dados exige autorização separada e avaliação de escritas posteriores ao backup, para evitar perda de trabalho.

## Alcance técnico previsto
Lista inicial, sujeita ao inventário das definições ativas antes de implementar:
- Base: `public.is_service_role()`, políticas e funções dependentes; controles de plano/trial em `workspaces` e assinaturas; autorização de vídeos/comentários; funções de revelação e auditoria de tokens. Novas alterações SQL seriam aplicadas por migração, sem reescrever migrações históricas.
- Funções: `supabase/functions/app-email/index.ts`, `delete-video-comment/index.ts`, `get-video-approval-data/index.ts`, `video-download-url/index.ts`, `google-oauth/index.ts`, `google-calendar-auth/index.ts`; funções de upload e demais chamadores que o inventário demonstrar afetados.
- Cobrança: revisar `check-subscription/index.ts` e `create-checkout/index.ts` apenas para fechar caminhos demonstradamente afetados, sem alterar preços.
- Dependências: `package.json` e lockfile operacional; lockfiles adicionais só seriam reconciliados mediante decisão explícita e verificada.
- Testes: aproveitar a infraestrutura existente e acrescentar verificações de autorização e regressão dos fluxos afetados.

## Riscos e limites
- A correção da função privilegiada pode expor dependências que hoje funcionam por autorização excessiva; por isso o inventário de todos os chamadores vem antes da alteração.
- Restringir destinos de login, envio de emails ou revelação de tokens pode interromper fluxos legítimos não inventariados.
- Atualizações de dependências podem mudar comportamento de navegação, exportação ou vídeo; cada grupo exige testes específicos.
- Não há ainda confirmação de ambiente isolado, backup restaurável ou testes realizados nesta etapa. A aprovação do plano não é uma declaração de segurança nem autorização de publicação.