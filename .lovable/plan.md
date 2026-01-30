
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

### Sprint 0 — Hotfix e Riscos Críticos
**Esforço: BAIXO (1-2 dias)**

1. Corrigir `plans.ts` (mediaHub, financialReports no Starter)
2. Adicionar RLS policies a `video_versions`
3. Remover `SuperAdmin.tsx`
4. Atualizar security finding (blog_posts como intencional)
5. Corrigir erros `system_admins` nos logs

### Sprint 1 — Refatoração Base + Segurança
**Esforço: MÉDIO (3-5 dias)**

1. Criar função RPC `can_access_feature()` server-side
2. Adicionar `SET search_path = public` a todas as funções
3. Reorganizar rotas /admin no App.tsx
4. Implementar rate limiting em endpoints sensíveis
5. Adicionar testes unitários para `usePlanFeatures`

### Sprint 2 — Super Admin + Analytics
**Esforço: MÉDIO (3-5 dias)**

1. Adicionar painel de storage por workspace
2. Implementar visualização de audit logs
3. Melhorar gestão de convites (reenvio, revogação)
4. Adicionar métricas de throughput do Kanban

### Sprint 3 — SEO + Conversão + Performance
**Esforço: MÉDIO (3-5 dias)**

1. Adicionar secção de depoimentos na landing
2. Criar página comparativa de planos
3. Otimizar LCP/CLS nas imagens do hero
4. Adicionar números de prova social
5. Melhorar microcopy dos CTAs

### Sprint 4 — Escala e Observabilidade
**Esforço: ALTO (5-7 dias)**

1. Implementar índices adicionais no DB
2. Adicionar caching em relatórios pesados
3. Implementar background jobs para exports
4. Configurar alertas de storage
5. Implementar tracing end-to-end
