# Candidatos defensivos S02 e S09

## Escopo
Preparar arquivos candidatos, reversão específica e testes isolados. Não aplicar SQL em produção, publicar frontend, implantar funções ou modificar dados reais. Não incluir vídeos, S01 ou S-DELIV neste lote.

## Mapeamento confirmado
- Registro atual não chama `increment_promo_code_usage`: S01 já mantém promoções indisponíveis e concede os sete dias normais. Preservar esse comportamento, sem reativar benefícios promocionais.
- Criação de workspace ocorre pela função `create_workspace_with_admin`, que calcula plano/status/trial no servidor; criação da assinatura de teste ocorre pelo gatilho `create_trial_subscription`.
- Webhook Stripe, reconciliação, consulta de assinatura e manutenção autorizada usam clientes de serviço. Preservar esses caminhos sem confiar em metadados editáveis de usuário.
- Configurações gerais atualizam nome, moeda, país, fuso e IVA; onboarding atualiza exclusivamente seus próprios campos. Preservar ambos.
- Administração de trial e bloqueio de workspace atualmente escreve diretamente pelo navegador. Adaptar esses chamadores para operações restritas no servidor, autenticadas pelo cadastro protegido de administradores do sistema.

## Candidatos
1. Guardar definições, privilégios de tabela/coluna, políticas e funções relevantes do catálogo anterior, sem registros pessoais; produzir reversão que restaure apenas objetos deste lote.
2. S02: restringir escrita direta de `workspaces` aos campos de configuração permitidos, protegendo `subscription_plan`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, `trial_ends_at` e campos de identidade/controle não configuráveis. Não alterar defaults, datas existentes ou preços.
3. Inventariar também limites/benefícios de `workspace_storage` e `user_subscriptions`, preservando suas políticas de escrita exclusivas do serviço; não conceder novos acessos de cliente.
4. Preservar criação interna por funções privilegiadas e gatilhos existentes. Não usar `current_user`, papel de workspace ou valores de cliente como autorização privilegiada.
5. Para extensão/conversão de trial e bloqueio/desbloqueio, preparar operação administrativa restrita, com decisões e datas calculadas no servidor e auditoria na mesma transação. Alterar apenas os chamadores necessários.
6. S09: manter assinatura/retorno de `increment_promo_code_usage(text)`, adicionar guarda de contexto de serviço e retirar EXECUTE de PUBLIC/anon/authenticated. Como não há chamador de consumo atual, não criar nem ativar novo fluxo promocional.

## Validação
- Análise estática dos campos protegidos, privilégios, funções privilegiadas e chamadores.
- PostgreSQL local separado com esquema mínimo fiel aos objetos afetados e dados fictícios: registro/trial de sete dias, criação de workspace, edição de nome/configuração, onboarding, atualização de cobrança pelo serviço, administração autorizada e consumo pelo serviço.
- Testes de chamadores com dependências simuladas e rede bloqueada; nenhuma exploração de vulnerabilidades ou conta alheia.
- Conferir compilação automática se houver alterações frontend; não executar build manualmente, conforme as regras do ambiente.
- Reportar limites de equivalência do esquema local, arquivos, testes, hash/revisão disponível e ações ainda não aplicadas.

## Detalhes técnicos
- SQL candidato transacional em `docs/security/s02-s09/`, fora de `drizzle/migrations` e `supabase/migrations`, sem alterar seus históricos/journals.
- Privilégios por coluna preservam configuração geral, enquanto funções SECURITY DEFINER inventariadas e clientes de serviço mantêm operações internas. Revisar ACL de PUBLIC e papéis herdados antes de fechar o candidato.
- Chamadores preparados no editor dependem de futura aplicação autorizada do SQL; esse requisito será explícito no relatório e nenhum frontend será publicado agora.
