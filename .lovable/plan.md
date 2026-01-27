
# Relatório de Auditoria Completa: WillFlow

## A) Mapa do Sistema

### Arquitetura Geral
```text
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
├─────────────────────────────────────────────────────────────────┤
│  Landing Page (/)    │    App (/app)    │    Admin (/admin)    │
│  - Marketing         │    - Dashboard   │    - Super Admin     │
│  - SEO Pages         │    - Kanban      │    - Analytics       │
│  - Blog              │    - Chat        │    - Users           │
│  - Pricing           │    - Calendario  │    - Content         │
│  - Políticas         │    - Pagamentos  │    - Billing         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SUPABASE CLOUD (Backend)                      │
├─────────────────────────────────────────────────────────────────┤
│  Auth (Email/Google)  │  Database (60+ tables)  │  Storage      │
│  RLS Policies         │  Realtime               │  Edge Funcs   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRAÇÕES EXTERNAS                       │
├─────────────────────────────────────────────────────────────────┤
│  Stripe (Payments)   │  Resend (Email)  │  Google (Calendar)   │
└─────────────────────────────────────────────────────────────────┘
```

### Módulos Principais
| Módulo | Ficheiros Principais | Descrição |
|--------|---------------------|-----------|
| Auth | `AuthContext.tsx`, `useUserSubscription.ts` | Autenticação e gestão de sessão |
| Workspace | `WorkspaceContext.tsx`, `useWorkspace*.ts` | Multi-tenancy e memberships |
| RBAC | `useRolePermissions.ts`, `useFinancialPermissions.ts` | Controlo de permissões dinâmico |
| Kanban | `useKanban.ts`, `KanbanBoard.tsx` | Gestão visual de projetos |
| Chat | `useConversations.ts`, `ChatFeed.tsx` | Comunicação interna de equipa |
| Pagamentos | `usePayments.ts`, `Pagamentos.tsx` | Controlo financeiro |
| Stripe | `stripe-webhook/index.ts`, `create-checkout/index.ts` | Subscriptions e billing |

---

## B) Lista de Achados por Severidade

### P0 - CRÍTICO (Segurança/Dados)

#### P0.1 - Políticas RLS "Always True" em Tabelas Sensíveis
- **Evidência**: Linter do Supabase identificou 3 warnings de `RLS Policy Always True`
- **Tabelas afetadas**: 
  - `beta_invite_tokens` - INSERT/UPDATE/DELETE com `USING (true)`
  - `blog_share_analytics` - INSERT com `WITH CHECK (true)`
  - `workspace_invitations` - SELECT com `USING (true)`
- **Causa**: Políticas criadas para conveniência sem validação adequada
- **Impacto**: Qualquer utilizador autenticado pode criar/modificar tokens de convite beta; exposição pública de convites de workspace
- **Ficheiros**: `supabase/migrations/20260112183817_*.sql`, `supabase/migrations/20260109205834_*.sql`
- **Fix**: Restringir a `is_system_admin()` ou verificar ownership

#### P0.2 - Funções SQL sem `search_path` Definido
- **Evidência**: Linter identificou 3 warnings de `Function Search Path Mutable`
- **Causa**: Funções SECURITY DEFINER podem ser exploradas com search_path manipulation
- **Impacto**: Potencial privilege escalation via SQL injection em funções
- **Fix**: Adicionar `SET search_path TO 'public'` em todas as funções SECURITY DEFINER

#### P0.3 - Proteção de Senhas Vazadas Desativada
- **Evidência**: Linter warning "Leaked Password Protection Disabled"
- **Causa**: Configuração padrão do Supabase Auth
- **Impacto**: Utilizadores podem usar senhas comprometidas conhecidas
- **Fix**: Ativar `Leaked password protection` nas configurações Auth do Supabase

#### P0.4 - Emails Hardcoded em Lógica de Proteção
- **Evidência**: `src/components/admin/BillingTab.tsx:690-696`, `cleanup-users/index.ts:9-11`
- **Causa**: Lista de emails protegidos hardcoded em vez de tabela `system_admins`
- **Impacto**: Requer deploy para alterar admins protegidos; exposição de emails reais no código
- **Fix**: Migrar para consulta dinâmica de `system_admins` + flag `is_protected`

---

### P1 - BUGS IMPORTANTES

#### P1.1 - Contador de Mensagens Não-Lidas Mostra "0"
- **Evidência**: Screenshot do utilizador mostrando "0" ao lado de cada conversa
- **Causa**: Condição `conversation.unread_count && conversation.unread_count > 0` não filtra `0` quando é number
- **Ficheiro**: `src/components/chat/ChatSidebar.tsx:406-410`
- **Status**: ✅ Corrigido nesta sessão - mudou para `typeof conversation.unread_count === 'number' && conversation.unread_count > 0`

#### P1.2 - Erros RLS ao Abrir Chat de Tarefa/Projeto
- **Evidência**: Logs de Postgres mostram `"new row violates row-level security policy for table conversation_members"`
- **Causa**: Política INSERT sem suporte adequado para upsert; falta de USING clause
- **Ficheiros**: `ChatFeed.tsx`, `conversation_members` RLS policies
- **Status**: ✅ Corrigido nesta sessão - separou INSERT/UPDATE e adicionou função auxiliar

#### P1.3 - Navegação do Chat Inconsistente
- **Evidência**: TaskChatIndicator usava query string, router espera path param
- **Causa**: Inconsistência entre `/app/chat?conversationId=UUID` vs `/app/chat/:conversationId`
- **Ficheiros**: `TaskChatIndicator.tsx`, `Chat.tsx`, `ChatLayout.tsx`
- **Status**: ✅ Corrigido nesta sessão - suporta ambos os formatos

#### P1.4 - AggregateRating Inconsistente no Schema.org
- **Evidência**: 
  - `index.html:180` → `"ratingValue": "4.8", "ratingCount": "127"`
  - `Landing.tsx:252` → `"ratingValue": "5", "ratingCount": "1"`
- **Causa**: Dados duplicados e inconsistentes entre ficheiros
- **Impacto**: Google pode penalizar por dados estruturados inválidos/contraditórios
- **Fix**: Centralizar Schema.org e usar dados reais ou remover se não houver reviews verificáveis

#### P1.5 - Falta de Imagem OG
- **Evidência**: `index.html:57` referencia `/og-image.png` mas ficheiro não listado em `public/`
- **Impacto**: Partilhas em redes sociais mostram imagem quebrada ou genérica
- **Fix**: Criar `public/og-image.png` com 1200x630px

---

### P2 - UX/PERFORMANCE

#### P2.1 - Preload de Imagens Desnecessário
- **Evidência**: `index.html:82-83` preloads imagens que podem não ser usadas (se utilizador for direto para `/app`)
- **Impacto**: Atraso desnecessário no First Contentful Paint para utilizadores autenticados
- **Fix**: Mover preloads para componente `Landing.tsx` usando `<link rel="preload">` dinâmico

#### P2.2 - Google Ads Script Diferido mas Sem Consentimento
- **Evidência**: `index.html:10-24` carrega gtag.js no `load` event sem verificar consentimento
- **Causa**: Script é carregado independentemente das preferências de cookies
- **Impacto**: Potencial violação RGPD - tracking antes de consentimento
- **Ficheiro**: `index.html`, `CookieConsentBanner.tsx:53-55` (enableAnalytics vazio)
- **Fix**: Só carregar gtag.js se `hasConsent('analytics')` for true

#### P2.3 - Bundle Size - Lazy Load Incompleto
- **Evidência**: `App.tsx` tem lazy loading, mas alguns componentes pesados podem ser carregados inline
- **Ficheiros a verificar**: Charts do Recharts, motion animations em páginas críticas
- **Fix**: Auditar com `source-map-explorer` e lazy-load módulos >50KB

#### P2.4 - Kanban - Realtime com Debounce Excessivo
- **Evidência**: `useKanban.ts:341` usa debounce de 300ms + 3s de ignore após visibility change
- **Impacto**: Atrasos perceptíveis em colaboração em tempo real
- **Fix**: Reduzir debounce para 150ms ou usar optimistic updates

#### P2.5 - Cache de Workspace Pode Ficar Stale
- **Evidência**: `WorkspaceContext.tsx:79` - cache válido por 5 minutos
- **Impacto**: Mudanças de permissões podem demorar até 5 min a propagar
- **Fix**: Reduzir para 2 minutos ou invalidar via realtime

---

### P3 - MELHORIAS

#### P3.1 - Política de Privacidade - Tabela de Subprocessadores
- **Evidência**: `Privacy.tsx:107-117` tenta renderizar tabela markdown mas falha
- **Impacto**: Subprocessadores não são exibidos corretamente
- **Fix**: Criar componente `<SubprocessorTable>` com dados estruturados

#### P3.2 - Termos de Uso - Data Desatualizada?
- **Evidência**: `Terms.tsx:207` mostra "Última atualização: 17 de Janeiro de 2025"
- **Impacto**: Se houve mudanças recentes, data pode estar incorreta
- **Fix**: Automatizar data ou criar processo de revisão

#### P3.3 - SEO - Falta Sitemap Dinâmico para Blog
- **Evidência**: `public/sitemap.xml` é estático; existe edge function `sitemap/index.ts` mas não está linkado
- **Fix**: Verificar se sitemap dinâmico está a ser gerado e indexado

#### P3.4 - Falta de Rate Limiting nos Edge Functions
- **Evidência**: Nenhum rate limiting visível em `send-welcome-email`, `send-password-reset`, etc.
- **Impacto**: Vulnerável a abuse (spam de emails, esgotamento de quotas)
- **Fix**: Implementar rate limiting via Redis/KV ou verificação de IP

#### P3.5 - Inconsistência de Idioma (PT-PT vs PT-BR)
- **Evidência**: Mistura de termos - "utilizador" (PT) vs "usuário" (BR), "cancelar" vs "cancelar"
- **Ficheiros**: Vários componentes UI
- **Fix**: Definir locale padrão e criar glossário de termos

#### P3.6 - Falta de aria-labels em Ícones
- **Evidência**: Muitos ícones Lucide sem aria-label ou sr-only text
- **Impacto**: Acessibilidade reduzida para screen readers
- **Fix**: Adicionar `aria-label` ou `<span className="sr-only">`

---

## C) Plano de Correção em Sprints

### Sprint 1 - P0 (Segurança Crítica) [Estimativa: 2-3 dias]

| Task | Descrição | Ficheiros |
|------|-----------|-----------|
| 1.1 | Restringir RLS de `beta_invite_tokens` para `is_system_admin()` | Migration SQL |
| 1.2 | Adicionar validação por token em `workspace_invitations` SELECT | Migration SQL |
| 1.3 | Adicionar `SET search_path TO 'public'` em funções SECURITY DEFINER | Migration SQL |
| 1.4 | Ativar Leaked Password Protection no Supabase Auth | Config manual |
| 1.5 | Migrar emails protegidos para tabela `system_admins` | Edge functions + components |

### Sprint 2 - P1 (Bugs Importantes) [Estimativa: 2-3 dias]

| Task | Descrição | Ficheiros |
|------|-----------|-----------|
| 2.1 | Corrigir AggregateRating inconsistente | `index.html`, `Landing.tsx` |
| 2.2 | Criar `/public/og-image.png` | Asset design |
| 2.3 | Verificar e testar chat de tarefa com roles diversos | E2E tests |
| 2.4 | Validar políticas RLS de `conversation_members` | SQL + tests |

### Sprint 3 - P2/P3 (UX/Performance/Melhorias) [Estimativa: 3-5 dias]

| Task | Descrição | Ficheiros |
|------|-----------|-----------|
| 3.1 | Implementar Consent Mode v2 completo | `index.html`, `CookieConsentBanner.tsx` |
| 3.2 | Corrigir tabela de subprocessadores em Privacy | `Privacy.tsx` |
| 3.3 | Adicionar rate limiting a edge functions críticos | Edge functions |
| 3.4 | Audit de bundle size e otimização | Webpack/Vite config |
| 3.5 | Criar glossário PT-PT/PT-BR e padronizar | Componentes UI |
| 3.6 | Adicionar aria-labels a ícones | Componentes UI |

---

## D) Correções Já Implementadas Nesta Sessão

### ✅ Chat RLS Policies
- Separação de políticas INSERT e UPDATE em `conversation_members`
- Criação de função `is_project_chat_in_user_workspace()` para validação segura
- Ficheiros: Migration SQL, `ChatFeed.tsx`, `TaskChatIndicator.tsx`, `Chat.tsx`, `ChatLayout.tsx`

### ✅ Unread Count Display
- Correção da condição que mostrava "0" em vez de ocultar badge
- Ficheiro: `src/components/chat/ChatSidebar.tsx`

### ✅ Navegação de Chat
- Suporte para path params E query strings
- Ficheiros: `Chat.tsx`, `ChatLayout.tsx`, `TaskChatIndicator.tsx`

---

## E) Inconsistências de Copy/Textos Identificadas

### Terminologia Inconsistente
| Termo PT-PT | Termo PT-BR | Localização |
|-------------|-------------|-------------|
| "utilizadores" | "usuários" | Vários |
| "ficheiros" | "arquivos" | Media, Uploads |
| "guardar" | "salvar" | Botões |
| "eliminar" | "excluir" | Modais de confirmação |

### Recomendação
Criar ficheiro `src/lib/i18n.ts` com traduções centralizadas e usar `locale` do workspace (PT ou BR) para selecionar automaticamente.

---

## Checklist de Validação Manual (A Completar)

### Frontend
- [ ] Testar login/signup com emails inválidos
- [ ] Testar reset password flow completo
- [ ] Verificar todas as rotas protegidas sem auth (deve redirecionar)
- [ ] Testar Kanban drag-and-drop com diferentes roles
- [ ] Verificar filtros de permissão em Pagamentos, Leads, Clientes
- [ ] Testar export PDF/Excel em todos os planos

### Backend
- [ ] Verificar webhooks Stripe em modo test
- [ ] Testar trial expiration e bloqueio de acesso
- [ ] Verificar envio de emails (welcome, invite, reset)
- [ ] Testar Google Calendar sync

### Segurança
- [ ] Tentar aceder a workspace de outro utilizador via URL manipulation
- [ ] Verificar se RLS bloqueia acesso cross-workspace em todas as tabelas
- [ ] Testar upload de ficheiros maliciosos (SVG com script, etc.)
- [ ] Verificar headers de segurança (CSP, X-Frame-Options)

---

## Integrações Detetadas e Status

| Integração | Status | Notas |
|------------|--------|-------|
| **Stripe** | ✅ Produção | Live keys configurados, webhook ativo |
| **Resend** | ✅ Ativo | Usado para todos os emails transacionais |
| **Google Calendar** | ✅ Parcial | OAuth implementado, sync funcional |
| **Google Meet** | ✅ Funcional | Criação de meets via edge function |
| **Frame.io** | ⏳ Planeado | Feature flag para plano Studio |
| **PWA** | ✅ Ativo | Manifest e service worker configurados |
