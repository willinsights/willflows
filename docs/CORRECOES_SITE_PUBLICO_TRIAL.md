# Correções do site público e trial

## Resultado e verificações
- Novos workspaces: 7 dias; default e create_workspace_with_admin confirmados na base de dados.
- Datas dos 57 workspaces existentes preservadas: checksum antes/depois `ff2f26db1485cbab673960e704649694`.
- Configuração system_settings.trial.default_days alinhada para 7; warning_days preservado.
- Blog: função publicada com guarda fail-closed; teste HTTP retornou 200 e `{ "skipped": true }`. Flag não configurada, logo desativado. Nenhum cron ativado e nenhum post removido.
- Studio: servidor usa a quota configurada por workspace, com base de 10 GiB (10 737 418 240 bytes), mais armazenamento extra. Confirmado em check_storage_quota, triggers e r2-upload-url; os 100 GB eram a configuração divergente do frontend. Quotas personalizadas existentes não foram alteradas.
- Removidos testemunhos fictícios, números 500+ projetos/50+ estúdios/4.9/5/30% produtividade, estatísticas de Sobre (500+, 10 000+, €2M+, 99.9%) e afirmação de 100+ entrevistas; removidos AggregateRating fictícios das páginas Para-*.
- Sem alterações a preços/produtos Stripe. create-checkout não define trial_period_days.
- 56 testes passaram; JSON-LD e metadados estáticos validados. Build automático OK; não foi feita validação visual num browser.
- Site público não publicado; funções alteradas foram implantadas para aplicar a proteção do blog e o novo copy dos emails.

## Alterações por ficheiro
- `drizzle/migrations/0000_new_workspace_trial_seven_days.sql`: default de novos trials e expressão da criação de workspace para 7 dias, sem atualizar linhas existentes.
- `index.html`: metadados OG/Twitter estáticos; imagem única; remoção de hreflang; highPrice 42; Organization sem foundingDate/LinkedIn e apenas Portuguese.
- `src/pages/Landing.tsx`: remove promoção, testemunhos, números não verificados e SoftwareApplication duplicado; carrossel sem entradas repetidas; PT-PT formal, badges sem emojis e total anual cobrado.
- `src/lib/plans.ts`: Studio 10 GB e features compactas Starter sem Excel.
- `src/pages/Pricing.tsx`: trial 7 dias, recomendado em vez de mais vendido e metadados coerentes.
- `src/pages/public/PlanosComparar.tsx`: copy de trial e recomendação coerentes; preserva total anual já exibido.
- `src/pages/About.tsx`: remove estatísticas sem comprovação e atualiza metadados/copy.
- `src/pages/Features.tsx`: trial 7 dias, títulos sem emojis e imagem coerente.
- `src/pages/ParaAgencias.tsx`, `src/pages/ParaFotografos.tsx`, `src/pages/ParaProdutoras.tsx`, `src/pages/ParaVideomakers.tsx`: trial/metadados coerentes e remoção das avaliações fictícias onde existiam.
- `public/llms.txt`: 7 dias grátis · Sem cartão.
- `supabase/functions/blog-auto-generate/index.ts`: guarda antes de qualquer trabalho.
- `supabase/functions/_shared/blog-auto-generate-enabled.ts`: permite geração apenas com valor exatamente true.
- `supabase/functions/_shared/email-templates/welcome.tsx`: trial 7 dias.
- `supabase/functions/_shared/email-templates/invitation.tsx`: trial 7 dias e fim do bónus de lançamento.
- `supabase/functions/_shared/email-templates/beta-invite.tsx`: padrão de novos convites 7 dias; durações explicitamente escolhidas preservadas.
- `supabase/functions/send-transactional-email/index.ts`: assunto padrão dos novos convites 7 dias.
- `supabase/functions/stripe-webhook/index.ts`: fallback de trial 7 dias, preservando trial_end explícito do Stripe.
- `src/components/admin/ImportContactsModal.tsx`: seleção inicial 7 dias, mantendo opções de concessão manual.
- `src/hooks/useUsersSummary.ts`: padrão de novos convites 7 dias.
- `src/pages/app/BetaAdmin.tsx`: novos convites padrão 7 dias, sem alterar os existentes.
- `src/components/tour/ProductTour.tsx`: elimina copy de lançamento e promessa de 30 dias.
- `src/components/admin/BillingTab.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/components/admin/LabsTab.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/components/admin/SettingsTab.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/components/dashboard/TrialBanner.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/components/marketing/FeatureHero.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/hooks/useSystemSettings.ts`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/hooks/useWorkspaceSubscription.ts`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/CheckoutSuccess.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/Onboarding.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/Help.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/Tutorial.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/features/CRM.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/features/Calendario.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/features/Chat.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/features/Kanban.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/features/MediaHub.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/features/Pagamentos.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/features/Relatorios.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/features/Timeline.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/features/VideoApproval.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/comparisons/ComparisonsHub.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/comparisons/VsAsana.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/comparisons/VsClickUp.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/comparisons/VsTrello.tsx`: referências/defaults do trial para 7 dias; mantém datas existentes e funcionamento restante.
- `src/pages/Blog.tsx`: imagem/metadados públicos normalizados.
- `src/pages/BlogCategory.tsx`: imagem/metadados públicos normalizados.
- `src/pages/Contact.tsx`: imagem/metadados públicos normalizados.
- `src/components/marketing/TestimonialsSection.tsx`, `SocialProofBanner.tsx`, `LaunchBanner.tsx`, `LaunchBannerOptimized.tsx`: removidos.
- `src/lib/__tests__/plans.test.ts`: expectativa Studio atualizada para 10 GB.
- `src/lib/__tests__/public-site-rules.test.ts`: testes de quota, Excel Starter, anual Studio e guarda fail-closed.
- `src/hooks/__tests__/useWorkspaceSubscription.test.tsx`: fallback de 7 dias e preservação de trial existente de 30 dias.
- `src/integrations/supabase/types.ts`: regenerado automaticamente pela migração.
- `AGENTS.md`, `roadmap.md`: documentação das regras e acompanhamento.

## Preservado
Trials existentes, posts publicados, cron desativado, preços/produtos Stripe, quotas personalizadas, retenção de dados, análises de 30 dias e concessões manuais. A função administrativa reset-billing-data mantém a duração anterior, pois opera contas existentes; não foi executada.

## Como testar
1. Criar uma conta nova e confirmar prazo de 7 dias; comparar uma conta antiga para verificar a data inalterada.
2. Abrir Landing, Planos e Comparação: sem testemunhos/promoções; selecionar anual e confirmar €403/ano no Studio.
3. Conferir Starter sem Excel e Studio com 10 GB incluídos.
4. Ver o código HTML inicial: títulos/descrições OG/Twitter, imagem willflow.app, um SoftwareApplication e nenhuma tag hreflang.
5. Invocar blog-auto-generate: deve retornar skipped=true sem criar artigos.
