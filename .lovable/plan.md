# Onboarding Wizard — Plano

Implementação em 2 fases para guiar novos workspaces, com migração leve, hook central e UI integrada no Dashboard.

## 1. Migration SQL

Adicionar à tabela `workspaces`:
- `onboarding_completed boolean not null default false`
- `onboarding_business_type text` (`freelancer` | `studio` | `agency`)
- `onboarding_completed_at timestamptz`

Adicionar a `user_preferences`:
- `onboarding_dismissed_at timestamptz` (por user+workspace; usar coluna nova; existe já preferências por user — guardar como JSON `onboarding_dismissed: { [workspaceId]: ISODate }` para evitar mais colunas)

Backfill: para workspaces existentes com ≥1 projecto, marcar `onboarding_completed = true` para não mostrar a utilizadores antigos.

RPC `apply_onboarding_preset(p_workspace_id uuid, p_business_type text)`:
- SECURITY DEFINER, `SET search_path = public`
- Valida que `auth.uid()` é admin do workspace via `workspace_members`
- Insere defaults em `workspace_role_permissions` (apenas se ainda não existem para esse role)
- Cria colunas padrão em `kanban_columns` apenas se o workspace ainda não tem nenhuma
- Actualiza `workspaces.onboarding_business_type`, `onboarding_completed = true`, `onboarding_completed_at = now()`

Presets:
- Freelancer: roles `admin`; 4 colunas (`A fazer`, `Em edição`, `Revisão`, `Entregue`)
- Estúdio: roles `admin`, `edicao`, `captacao`; 5 colunas (+ `Aprovação cliente`)
- Agência: todos os 5 roles; 6 colunas (+ `Em produção`)

## 2. Hook `useOnboardingStatus`

`src/hooks/useOnboardingStatus.ts` — single React Query hook que devolve:
```
{
  shouldShowModal: boolean,         // !completed && isAdmin
  shouldShowChecklist: boolean,     // completed && !dismissed && isAdmin && progress<5
  shouldShowCongrats: boolean,      // progress===5 && !dismissed && within 3 days
  progress: { done: number, total: 5, items: ChecklistItem[] },
  dismiss(): Promise<void>,
  completeOnboarding(type): Promise<void>,
}
```
Queries em paralelo (counts head:true) para `workspace_members`, `clients`, `projects`, e um count de projects movidos (`column_id` ≠ primeira coluna do workspace via `kanban_columns` order_index=0).

## 3. UI

`src/components/onboarding/WelcomeWizard.tsx` — Dialog com 2 passos (framer-motion `AnimatePresence`, padrão de forwardRef já usado no projecto). Passo 1 três cards seleccionáveis; passo 2 resumo do preset escolhido + botão "Começar" que chama RPC `apply_onboarding_preset`.

`src/components/onboarding/OnboardingChecklist.tsx` — Card com Progress, lista dos 5 itens (Check/Circle), botão "→ Fazer agora" por item navegando para `/app/equipa`, `/app/clientes`, `/app/captacao`, `/app/edicao`. Quando progress=5, render banner de parabéns com botão "Dispensar".

Montar ambos em `src/pages/app/Dashboard.tsx` (topo do conteúdo, antes dos widgets actuais). Sem alterar outros widgets.

## 4. Detalhes

- Modal só aparece se `!loading && shouldShowModal`.
- Checklist só para admins (`useCurrentWorkspace().isAdmin`).
- Sem breaking changes: backfill garante que workspaces antigos não vêem o modal.
- Persistência do dismiss usa `user_preferences.preferences` JSON (já existe, evita migração extra para essa parte).

## Ficheiros novos/alterados

- Migration (nova)
- `src/hooks/useOnboardingStatus.ts` (novo)
- `src/components/onboarding/WelcomeWizard.tsx` (novo)
- `src/components/onboarding/OnboardingChecklist.tsx` (novo)
- `src/pages/app/Dashboard.tsx` (montar componentes)
