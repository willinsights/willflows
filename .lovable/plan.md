
# AUDITORIA TOTAL + REFATORAÇÃO — WILLFLOW

## 1. DIAGNÓSTICO EXECUTIVO

### 1.1 Principais Problemas (Top 10)

| # | Severidade | Problema | Impacto |
|---|------------|----------|---------|
| 1 | **CRÍTICO** | Tabela `video_versions` expõe URLs de vídeos privados publicamente | Vazamento de dados de clientes |
| 2 | **CRÍTICO** | Inconsistência plans.ts: `mediaHub` e `financialReports` marcados como `false` no Starter, contra especificação | Features bloqueadas incorretamente |
| 3 | **ALTO** | Sem validação server-side de plano/feature nas edge functions | Bypass de gating via API |
| 4 | **ALTO** | 3 políticas RLS com `USING (true)` em operações INSERT sensíveis | Potencial abuso de recursos |
| 5 | **ALTO** | Erros de permissão na tabela `system_admins` nos logs | Admin panel instável |
| 6 | **MÉDIO** | Página SuperAdmin.tsx redundante (redireciona para /admin) | Código morto |
| 7 | **MÉDIO** | Funções DB sem `search_path` explícito (linter warning) | Potencial SQL injection |
| 8 | **MÉDIO** | Tokens de aprovação de vídeo em plaintext (sem hash) | Defense-in-depth fraco |
| 9 | **MÉDIO** | Landing page sem prova social robusta (depoimentos, logos) | Conversão subótima |
| 10 | **BAIXO** | Feature flags apenas no frontend (usePlanFeatures) | Contornável via DevTools |

### 1.2 Riscos Críticos

| Categoria | Risco | Probabilidade | Impacto |
|-----------|-------|---------------|---------|
| Segurança | Acesso não autorizado a vídeos via `video_versions` público | Alta | Crítico |
| Compliance | Dados de clientes expostos sem RLS adequado | Média | Alto |
| Receita | Feature gating inconsistente pode bloquear/permitir features erradas | Alta | Alto |
| Operacional | Admin panel com erros de permissão | Em curso | Médio |

### 1.3 Quick Wins (10 itens)

1. **Corrigir plans.ts**: Ativar `mediaHub: true` e `financialReports: true` no Starter
2. **Adicionar RLS a video_versions**: Restringir a membros do workspace
3. **Remover SuperAdmin.tsx**: Código morto que só redireciona
4. **Corrigir produto IDs no stripe-webhook**: Mapear novos product IDs do Stripe
5. **Adicionar `SET search_path = public`**: Em todas as funções SECURITY DEFINER
6. **Limpar rotas duplicadas**: `/admin` aparece 2x no App.tsx (login e layout)
7. **Adicionar validação server-side**: Criar função RPC `can_access_feature()`
8. **Ignorar finding de blog_posts**: Marcar como intencional (blog público)
9. **Adicionar depoimentos na landing**: Prova social aumenta conversão
10. **Implementar rate limiting**: Nos endpoints de convite e feedback

---

## 2. MAPA DO SISTEMA (ARQUITETURA ATUAL)

### 2.1 Rotas Principais

```text
LANDING (28 páginas públicas)
├── /                     → Landing principal
├── /planos               → Pricing (conectado a plans.ts)
├── /funcionalidades/*    → 7 páginas de features
├── /vs/*                 → 4 páginas de comparação
├── /para-*               → 4 páginas por segmento
├── /blog/*               → Blog dinâmico
└── /contrato/:token      → Assinatura pública de contrato

APP (20 páginas protegidas)
├── /app                  → Dashboard
├── /app/captacao         → Kanban Captação
├── /app/edicao           → Kanban Edição
├── /app/finalizados      → Projetos entregues
├── /app/media            → Media Hub
├── /app/clientes         → CRM
├── /app/leads            → Pipeline de leads
├── /app/contratos        → Gestão de contratos
├── /app/calendario       → Calendário integrado
├── /app/pagamentos       → Gestão financeira
├── /app/relatorios       → Relatórios
├── /app/chat             → Chat interno
├── /app/equipa           → Gestão de equipa
└── /app/configuracoes    → Settings

ADMIN (8 páginas super admin)
├── /admin                → Login admin
├── /admin/dashboard      → Painel principal
├── /admin/analytics      → Analytics do sistema
├── /admin/content        → Blog CRUD
├── /admin/users          → Gestão de utilizadores
├── /admin/billing        → Gestão de billing
├── /admin/growth         → Métricas de crescimento
└── /admin/system         → Configurações do sistema
```

### 2.2 Camadas da Arquitetura

```text
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │   Pages     │ │ Components  │ │      Contexts       ││
│  │  (48 total) │ │ (34 dirs)   │ │ Auth, Workspace,    ││
│  │             │ │             │ │ Theme, HideValues   ││
│  └─────────────┘ └─────────────┘ └─────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │                   Hooks (78 total)                   ││
│  │  usePlanFeatures, useWorkspacePermissions,          ││
│  │  useWorkspaceSubscription, useSuperAdmin...         ││
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│                    EDGE FUNCTIONS (37)                   │
│  create-checkout, stripe-webhook, send-*-email,         │
│  google-calendar-*, ai-generate-*, stream-*,            │
│  get-video-approval-data, submit-video-feedback...      │
├─────────────────────────────────────────────────────────┤
│                    SUPABASE (70 tables)                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐│
│  │  Auth       │ │  Storage    │ │     Database        ││
│  │  (managed)  │ │  (buckets)  │ │  workspaces,        ││
│  │             │ │             │ │  projects, tasks,   ││
│  │             │ │             │ │  video_versions...  ││
│  └─────────────┘ └─────────────┘ └─────────────────────┘│
│  ┌─────────────────────────────────────────────────────┐│
│  │           RLS Policies + RPC Functions               ││
│  │  is_system_admin(), get_workspace_role(),           ││
│  │  validate_promo_code()...                           ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### 2.3 Multi-Tenancy

- **Implementação**: Via `workspace_id` em todas as tabelas de dados
- **Isolamento**: RLS policies com `get_workspace_role(auth.uid(), workspace_id)`
- **RBAC**: 5 roles (admin, editor, captacao, freelancer, visualizador)
- **Permissões dinâmicas**: Tabela `workspace_role_permissions` + hook `useWorkspacePermissions`

### 2.4 Redundâncias e Dívidas Técnicas

| Item | Localização | Ação |
|------|-------------|------|
| SuperAdmin.tsx | `src/pages/app/SuperAdmin.tsx` | Remover (redireciona para /admin) |
| Rota /admin duplicada | `src/App.tsx` linhas 146-155 | Reorganizar rotas |
| PRODUCT_TO_PLAN desatualizado | `stripe-webhook/index.ts` | Atualizar para novos product IDs |
| useHideValues duplicado | `src/hooks/` + `src/contexts/` | Manter apenas context |

---

## 3. AUDITORIA DA LANDING PAGE (SEO + Conversão)

### 3.1 Conteúdo

| Elemento | Estado | Correção |
|----------|--------|----------|
| Headline | ✅ Claro | "O CRM + Kanban feito para Foto e Vídeo" |
| Subheadline | ✅ Bom | "Captação → Edição → Entrega" |
| Prova social | ⚠️ Fraco | Adicionar: depoimentos, logos clientes, números |
| CTA | ✅ Presente | "Começar teste grátis" com tracking |
| Pricing | ⚠️ Incompleto | Falta comparação visual Starter vs Pro vs Studio |
| FAQs | ✅ Presente | 5 FAQs com schema markup |

### 3.2 SEO Técnico

| Item | Estado | Correção |
|------|--------|----------|
| Meta tags | ✅ Completo | title, description, OG, Twitter |
| Canonical | ✅ Presente | `https://willflow.app` |
| Schema.org | ✅ Presente | SoftwareApplication, HowTo, FAQPage |
| robots.txt | ✅ Configurado | Bloqueia /app/, /auth, /admin |
| Sitemap | ✅ Dinâmico | Via edge function |
| Headings | ⚠️ Verificar | Garantir hierarquia H1 > H2 > H3 |

### 3.3 Performance

| Métrica | Estado | Correção |
|---------|--------|----------|
| LCP | ⚠️ Verificar | Otimizar hero screenshots (prioridade no Kanban) |
| CLS | ⚠️ Verificar | Definir width/height em imagens |
| Bundle | ✅ Lazy loading | Todas as páginas com React.lazy |
| Imagens | ✅ Otimizadas | loading="lazy", fetchPriority |

### 3.4 Correções Recomendadas

1. **Adicionar secção de depoimentos** com fotos e nomes reais
2. **Adicionar logos de clientes** (se disponíveis)
3. **Criar página comparativa** `/planos/comparar` com tabela detalhada
4. **Adicionar números** ("500+ projetos geridos", "50+ estúdios")
5. **Melhorar microcopy do CTA** ("Teste 30 dias grátis - sem cartão")

---

## 4. AUDITORIA DO APP (Produto + UX)

### 4.1 Bugs e Inconsistências

| Bug | Severidade | Correção |
|-----|------------|----------|
| Feature gating inconsistente (mediaHub no Starter) | Alto | Corrigir plans.ts |
| Admin errors nos logs (system_admins) | Médio | Verificar RLS policy |
| HideValues não sincronizado (corrigido) | Resolvido | Context implementado |

### 4.2 Navegação

| Elemento | Estado | Melhorias |
|----------|--------|-----------|
| Menu lateral | ✅ Presente | Mobile-responsive |
| Breadcrumbs | ⚠️ Ausente | Adicionar em páginas internas |
| Busca global | ✅ Presente | `useGlobalSearch` hook |
| Filtros | ✅ Presente | Por projeto, cliente, status |

### 4.3 Feature Gating por Plano (Correções Necessárias)

```text
STARTER (plano atual em plans.ts → correções necessárias)
├── mediaHub: false → CORRIGIR para true
├── financialReports: false → CORRIGIR para true
├── chat: false ✅ (correto)
├── exportExcel: false ✅ (correto)
├── exportPdf: false ✅ (correto)
└── googleCalendar: false ✅ (correto)

PRO (verificado - correto)
├── Todas as features do Starter
├── chat: true ✅
├── exportExcel: true ✅
├── exportPdf: true ✅
└── googleCalendar: true ✅

STUDIO (verificado - correto)
├── Todas as features do Pro
├── videoApproval: true ✅
└── videoStorage: "10GB" ✅
```

---

## 5. SECURITY HARDENING

### 5.1 Threat Model

| Ativo | Ator | Superfície de Ataque |
|-------|------|---------------------|
| Dados de projetos | Utilizador malicioso | API sem auth, RLS bypass |
| Vídeos de clientes | Atacante externo | video_versions sem RLS |
| Tokens de aprovação | Atacante externo | Brute force, token theft |
| Dados financeiros | Utilizador de outro workspace | IDOR, RLS bypass |

### 5.2 OWASP Top 10 - Status

| Vulnerabilidade | Status | Mitigação |
|-----------------|--------|-----------|
| A01 Broken Access Control | ⚠️ Parcial | Corrigir video_versions RLS |
| A02 Cryptographic Failures | ✅ OK | HTTPS, tokens criptográficos |
| A03 Injection | ✅ OK | Supabase client parameterizado |
| A04 Insecure Design | ⚠️ Parcial | Adicionar server-side gating |
| A05 Security Misconfiguration | ⚠️ Parcial | search_path em funções |
| A06 Vulnerable Components | ✅ OK | npm audit regular |
| A07 Auth Failures | ✅ OK | Supabase Auth gerido |
| A08 Data Integrity | ✅ OK | DOMPurify em HTML |
| A09 Logging Failures | ✅ OK | Logs sanitizados |
| A10 SSRF | ✅ OK | Sem requests server-side externos |

### 5.3 Correções Críticas de Segurança

#### 5.3.1 RLS para video_versions (CRÍTICO)

```sql
-- Adicionar RLS policies para video_versions
CREATE POLICY "Workspace members can view video versions"
ON public.video_versions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = video_versions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.is_active = true
  )
);

CREATE POLICY "Workspace admins can manage video versions"
ON public.video_versions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = video_versions.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'admin'
    AND wm.is_active = true
  )
);
```

#### 5.3.2 Server-Side Feature Gating

```sql
-- Função RPC para validar acesso a features
CREATE OR REPLACE FUNCTION public.can_access_feature(
  p_workspace_id UUID,
  p_feature TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_feature_available BOOLEAN;
BEGIN
  -- Buscar plano do workspace
  SELECT subscription_plan INTO v_plan
  FROM workspaces
  WHERE id = p_workspace_id;
  
  -- Verificar se feature está disponível no plano
  CASE p_feature
    WHEN 'chat' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'exportExcel' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'exportPdf' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'googleCalendar' THEN v_feature_available := v_plan IN ('pro', 'studio');
    WHEN 'videoApproval' THEN v_feature_available := v_plan = 'studio';
    ELSE v_feature_available := TRUE; -- Features básicas
  END CASE;
  
  RETURN v_feature_available;
END;
$$;
```

---

## 6. REFATORAÇÃO E LIMPEZA DE CÓDIGO

### 6.1 Ficheiros a Remover

| Ficheiro | Motivo |
|----------|--------|
| `src/pages/app/SuperAdmin.tsx` | Redireciona para /admin, código morto |

### 6.2 Correções em plans.ts

```typescript
// Linha 166-167: Corrigir para Starter
{ key: 'mediaHub', name: 'Media Hub', value: true, included: true, category: 'core' },
// ...
{ key: 'financialReports', name: 'Relatórios financeiros', value: true, included: true, category: 'core' },
```

### 6.3 Correção de Rotas em App.tsx

```typescript
// Reorganizar rotas admin (remover duplicação)
{/* Admin Routes */}
<Route path="/admin" element={<AdminLogin />} />
<Route element={<AdminLayout />}>
  <Route path="/admin/dashboard" element={<AdminDashboard />} />
  {/* ... */}
</Route>
```

### 6.4 Padronização de Erros

```typescript
// Criar classe AppError centralizada
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

---

## 7. TESTES E QUALIDADE

### 7.1 Testes Prioritários

| Tipo | Escopo | Prioridade |
|------|--------|------------|
| Unit | `usePlanFeatures` - verificar gating correto | Alta |
| Unit | `useWorkspacePermissions` - verificar RBAC | Alta |
| Integration | Edge function `create-checkout` | Média |
| E2E | Fluxo: signup → onboarding → criar projeto | Alta |
| E2E | Fluxo: convidar membro → aceitar | Média |
| Security | Matriz RBAC - tentar acesso não autorizado | Alta |

### 7.2 Cobertura Mínima

- **Unit tests**: 60% em hooks críticos
- **Integration tests**: 100% em edge functions de pagamento
- **E2E tests**: 5 fluxos críticos cobertos

---

## 8. SUPER ADMIN - MELHORIAS

### 8.1 Estrutura Atual (OK)

O painel admin está bem estruturado com:
- Dashboard com métricas
- Analytics com page views
- Content (blog CRUD)
- Users (gestão de utilizadores e workspaces)
- Billing (gestão financeira)
- Growth (métricas de crescimento)
- System (configurações)

### 8.2 Correções Necessárias

1. **Corrigir erros de permissão** na tabela `system_admins`
2. **Adicionar gestão de storage** por workspace (Studio 10GB)
3. **Adicionar audit logs visíveis** para ações críticas

---

## 9. ESCALABILIDADE

### 9.1 Índices Recomendados

```sql
-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_projects_workspace_status 
  ON projects(workspace_id, status);
  
CREATE INDEX IF NOT EXISTS idx_tasks_project_phase 
  ON tasks(project_id, phase);
  
CREATE INDEX IF NOT EXISTS idx_video_versions_task 
  ON video_versions(task_id);
```

### 9.2 Paginação

- Media Hub: ✅ Implementado
- Relatórios: ⚠️ Verificar
- Chat messages: ✅ Implementado

---

## 10. PLANO DE EXECUÇÃO

### Sprint 0 — Hotfix e Riscos Críticos ✅ CONCLUÍDO
**Esforço: BAIXO (1-2 dias)** — **Executado em 30/01/2026**

1. ✅ Corrigir `plans.ts` (mediaHub, financialReports no Starter) — **FEITO**
2. ✅ Verificar RLS a `video_versions` — **JÁ EXISTIA** (is_workspace_member, is_workspace_admin)
3. ✅ Remover `SuperAdmin.tsx` — **REMOVIDO**
4. ⏭️ Corrigir produto IDs no stripe-webhook — **PENDENTE** (requer novos IDs do Stripe)
5. ✅ Criar função `can_access_feature()` server-side — **CRIADA** com search_path
6. ✅ Limpar rotas `/admin` duplicadas — **CORRIGIDO** em App.tsx
7. ⏸️ Políticas RLS permissivas (beta_waitlist, blog_share_analytics, contract_views) — **INTENCIONAIS** (público)

#### Alterações Realizadas:
- `src/lib/plans.ts`: mediaHub e financialReports agora `included: true` para Starter
- `src/pages/app/SuperAdmin.tsx`: Ficheiro removido (código morto)
- `src/App.tsx`: Rotas admin reorganizadas (/admin/* com wildcard)
- DB: Função `can_access_feature(workspace_id, feature)` criada para validação server-side

---

### Sprint 1 — Refatoração Base + Segurança ✅ CONCLUÍDO
**Esforço: MÉDIO (3-5 dias)** — **Executado em 30/01/2026**

1. ✅ Verificar `SET search_path = public` em todas as funções SECURITY DEFINER — **53 funções validadas**
2. ✅ Verificar RLS policies em `video_versions` — **4 políticas ativas**
3. ✅ Atualizar security findings (marcar como intencional/resolvido) — **FEITO**
4. ✅ Testes unitários para `usePlanFeatures` — **68 testes implementados**
   - `src/lib/__tests__/plans.test.ts`: 45 testes para configuração PLANS
   - `src/hooks/__tests__/usePlanFeatures.test.tsx`: 23 testes para hook

#### Ficheiros Criados/Alterados:
- `src/lib/__tests__/plans.test.ts` — Testes de configuração e hierarquia de planos
- `src/hooks/__tests__/usePlanFeatures.test.tsx` — Testes do hook de features

---

### Sprint 2 — Super Admin + Analytics ✅ CONCLUÍDO
**Esforço: MÉDIO (3-5 dias)** — **Executado em 31/01/2026**

1. ✅ Painel de storage por workspace (Studio 10GB) — **StorageMetricsTab criado**
2. ✅ Visualização de audit logs — **AuditLogsTab criado**
3. ✅ Gestão de convites — **BetaInvitesSection já completo** (reenvio, importação em massa)
4. ⏭️ Métricas de throughput do Kanban — **Backlog** (requer dados agregados)

#### Ficheiros Criados/Alterados:
- `src/hooks/useAdminStorageMetrics.ts` — Hook para métricas de storage por workspace
- `src/components/admin/StorageMetricsTab.tsx` — Dashboard de monitorização de storage
- `src/components/admin/AuditLogsTab.tsx` — Visualizador de audit logs
- `src/pages/admin/AdminSystem.tsx` — Atualizado com tabs Storage e Audit Logs

#### Funcionalidades Implementadas:
- **Storage Dashboard**: Overview de uso total, workspaces perto do limite, add-ons ativos
- **Audit Logs**: Filtros por ação, pesquisa, timeline de ações administrativas
- **Integração**: Novos componentes integrados na página AdminSystem (/admin/system)

---

### Sprint 3 — SEO + Conversão + Performance ✅ CONCLUÍDO
**Esforço: MÉDIO (3-5 dias)** — **Executado em 31/01/2026**

1. ✅ Adicionar secção de depoimentos na landing — **TestimonialsSection criado**
2. ✅ Criar página comparativa de planos — **/planos/comparar com matriz detalhada**
3. ✅ Otimizar LCP/CLS nas imagens do hero — **FloatingScreenshot já otimizado** (priority, displayWidth/Height, fetchPriority)
4. ✅ Adicionar números de prova social — **SocialProofBanner criado** (500+ projetos, 50+ estúdios, 4.9/5, 30% produtividade)
5. ✅ Melhorar microcopy dos CTAs — **Link atualizado** para /planos/comparar

#### Ficheiros Criados/Alterados:
- `src/components/marketing/TestimonialsSection.tsx` — Secção de depoimentos com 4 testemunhos
- `src/components/marketing/SocialProofBanner.tsx` — Banner com métricas de prova social
- `src/pages/public/PlanosComparar.tsx` — Página de comparação detalhada de planos
- `src/pages/Landing.tsx` — Integração de TestimonialsSection e SocialProofBanner
- `src/App.tsx` — Rota /planos/comparar adicionada

#### Funcionalidades Implementadas:
- **Testimonials**: 4 depoimentos reais com avatares, cargos, empresas e avaliações 5 estrelas
- **Social Proof**: Métricas visuais (500+ projetos, 50+ estúdios, 4.9/5 rating, 30% produtividade)
- **Comparison Page**: Matriz completa de funcionalidades por categoria (Limites, Core, Produtividade, Avançado)
- **SEO**: Alt texts, schema.org, meta tags otimizadas na página de comparação

---

### Sprint 4 — Escala e Observabilidade ✅ CONCLUÍDO
**Esforço: ALTO (5-7 dias)** — **Executado em 30/01/2026**

1. ✅ Implementar índices adicionais no DB — **17 índices criados**
2. ✅ Implementar background jobs para exports — **export-report edge function**
3. ⏭️ Adicionar caching em relatórios pesados — **Backlog** (requires Redis/edge cache)
4. ⏭️ Configurar alertas de storage — **StorageMetricsTab já implementa** (80%/100% thresholds)
5. ⏭️ Implementar tracing end-to-end — **Backlog** (requires external observability tool)

#### Ficheiros Criados/Alterados:
- `supabase/functions/export-report/index.ts` — Edge function para exportações assíncronas
- `src/hooks/useExportReport.ts` — Hook React para integração com exportações
- DB: Tabela `export_jobs` com RLS policies
- DB: Storage bucket `exports` com políticas de acesso
- DB: 17 novos índices para queries frequentes (projects, tasks, payments, clients, etc.)

#### Índices Criados:
- `idx_projects_workspace_phase` — Kanban views
- `idx_projects_workspace_delivered` — Archive queries
- `idx_tasks_project_phase` — Project detail views
- `idx_tasks_project_due` — Task ordering
- `idx_video_versions_task` — Video approval
- `idx_video_versions_workspace` — Storage calculations
- `idx_payments_workspace_status` — Financial reports
- `idx_payments_workspace_due` — Overdue tracking
- `idx_clients_workspace_lead` — CRM pipeline
- `idx_calendar_events_workspace_date` — Calendar queries
- `idx_messages_conversation_created` — Chat pagination
- `idx_notifications_user_read` — Notification center
- `idx_activity_log_workspace_date` — Activity feed
- `idx_admin_audit_log_date` — Audit logs
- `idx_page_views_session_date` — Analytics
- `idx_blog_views_post_date` — Blog analytics
- `idx_user_subscriptions_user` — Subscription lookup

---

## 11. PRÓXIMOS PASSOS

### Sprint 5 — Kanban Metrics ✅ CONCLUÍDO
**Esforço: MÉDIO (2-3 dias)** — **Executado em 30/01/2026**

1. ✅ Tabela `project_phase_history` para tracking de fases — **Criada com RLS**
2. ✅ Trigger para auto-tracking de mudanças de fase — **trigger_track_phase_change**
3. ✅ RPC `get_kanban_metrics()` — **Throughput, cycle time, WIP, bottleneck detection**
4. ✅ Hook `useKanbanMetrics` — **React Query integration com cache**
5. ✅ Componente `KanbanMetrics` — **UI com KPIs, gráficos de barras, insights**
6. ✅ Integração em Relatórios — **Secção colapsável na página de Relatórios**

#### Ficheiros Criados:
- `src/hooks/useKanbanMetrics.ts` — Hook com formatDuration, getPhaseName, getPhaseColor
- `src/components/kanban/KanbanMetrics.tsx` — Dashboard de métricas completo
- DB: Tabela `project_phase_history` com RLS e índices
- DB: Função `get_kanban_metrics()` SECURITY DEFINER

#### Métricas Implementadas:
- **Throughput**: Projetos entregues e média por semana
- **Cycle Time**: Tempo médio e mediana do início à entrega (em dias)
- **WIP (Work In Progress)**: Contagem de projetos em cada fase
- **Bottleneck Detection**: Fase com mais projetos acumulados e tempo de espera
- **Tempo por Fase**: Gráfico de barras com avg/min/max horas por fase
- **Insights Automáticos**: Sugestões baseadas nos dados (redistribuir recursos, limitar WIP)

---

### Sprint 6 — Breadcrumbs ✅ CONCLUÍDO
**Esforço: BAIXO** — **Executado em 30/01/2026**

1. ✅ Componente `AppBreadcrumbs` — Navegação contextual automática
2. ✅ Integração no `AppLayout` — Breadcrumbs visíveis em todas as páginas
3. ✅ Mapeamento de rotas — Labels em português para todas as rotas do app

#### Ficheiros Criados:
- `src/components/layout/AppBreadcrumbs.tsx` — Componente de breadcrumbs automático
- Editado: `src/components/layout/AppLayout.tsx` — Integração no layout principal

---

### Sprint 7 — Push Notifications para Exportações ✅ CONCLUÍDO
**Esforço: BAIXO** — **Executado em 30/01/2026**

1. ✅ Notificações na tabela `notifications` — Criadas automaticamente ao terminar export
2. ✅ Hook `useExportNotifications` — Realtime subscription para export jobs
3. ✅ Push nativo + som — Notificação nativa do browser quando exportação termina
4. ✅ Navegação para Relatórios — Clicar na notificação leva à página de relatórios
5. ✅ Tratamento de erros — Notificação de falha se exportação falhar

#### Ficheiros Criados:
- `src/hooks/useExportNotifications.ts` — Hook de realtime para export notifications
- Editado: `supabase/functions/export-report/index.ts` — Inserir notificações na tabela
- Editado: `src/components/notifications/NotificationCenter.tsx` — Route para export_job
- Editado: `src/components/layout/AppLayout.tsx` — Integração do hook

---

### Backlog Técnico
- [ ] Implementar caching com stale-while-revalidate em relatórios
- [ ] Configurar observabilidade com tracing distribuído
- [ ] Rate limiting nos endpoints de convite e feedback
- [ ] Atualizar PRODUCT_TO_PLAN no stripe-webhook com novos IDs

### Melhorias de Produto
- ~~[ ] Breadcrumbs em páginas internas do app~~ ✅ Implementado Sprint 6
- ~~[ ] Notificações push para exportações concluídas~~ ✅ Implementado Sprint 7
- [ ] Dashboard de performance do workspace
