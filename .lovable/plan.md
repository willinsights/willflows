
# Plano: Otimizar Carregamento do Super Admin Panel

## Problema Identificado

Os dados do Super Admin demoram a aparecer devido a **múltiplas chamadas duplicadas e sequenciais** ao sistema:

### Causas Raiz

1. **RPC `is_system_admin` chamada múltiplas vezes**
   - Nos network logs: **4+ chamadas RPC** duplicadas no mesmo momento
   - `useAdminSession.ts` chama o RPC (linha 46, 97, 134)
   - `useSuperAdmin.ts` chama o RPC separadamente (linha 30)
   - Cada hook de admin (`useAdminUsers`, `useFeedbackAdmin`, etc.) usa `useSuperAdmin`, causando mais chamadas

2. **Queries sequenciais no `useAdminUsers`** (linhas 54-154)
   - Faz **6 queries sequenciais** ao invés de paralelas:
     1. profiles
     2. user_subscriptions
     3. workspace_members
     4. projects
     5. tasks
     6. Processamento local

3. **Sem cache do status de super admin**
   - Cada componente que usa `useSuperAdmin()` dispara nova chamada RPC
   - Não há persistência do resultado entre componentes

4. **Fast-path não aproveitado para email conhecido**
   - `useAdminSession.ts` NÃO usa o fast-path (linha 46 chama RPC diretamente)
   - Apenas `useSuperAdmin.ts` tem o fast-path implementado

---

## Solução

### 1. Centralizar verificação de Super Admin com React Query

Converter `useSuperAdmin` para usar React Query com cache longo, evitando chamadas duplicadas:

**Ficheiro:** `src/hooks/useSuperAdmin.ts`

```tsx
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const SUPER_ADMIN_EMAILS = ['geral@willflow.app'];

export function useSuperAdmin() {
  const { user } = useAuth();
  
  const { data: isSuperAdmin = false, isLoading: loading } = useQuery({
    queryKey: ['super-admin-status', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      // Fast-path for known system admins
      const email = (user.email || '').toLowerCase();
      if (email && SUPER_ADMIN_EMAILS.includes(email)) {
        return true;
      }
      
      const { data, error } = await supabase.rpc('is_system_admin');
      if (error) {
        console.error('Error checking super admin status:', error);
        return false;
      }
      return data === true;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 30, // 30 minutos
    gcTime: 1000 * 60 * 60, // 1 hora
  });

  return { isSuperAdmin, loading };
}
```

### 2. Adicionar fast-path ao `useAdminSession`

**Ficheiro:** `src/hooks/useAdminSession.ts`

Adicionar verificação de email ANTES de chamar RPC:

```tsx
const SUPER_ADMIN_EMAILS = ['geral@willflow.app'];

const checkSession = async () => {
  // ... existing code ...
  
  // Fast-path para emails conhecidos
  const email = (session.user.email || '').toLowerCase();
  if (SUPER_ADMIN_EMAILS.includes(email)) {
    if (mounted) {
      setState({
        user: session.user,
        session,
        isSuperAdmin: true,
        loading: false,
        error: null,
      });
    }
    return;
  }
  
  // Só chama RPC se não for fast-path
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_system_admin');
  // ... rest ...
};
```

### 3. Paralelizar queries no `useAdminUsers`

**Ficheiro:** `src/hooks/useAdminUsers.ts`

Usar `Promise.all` para executar queries em paralelo:

```tsx
queryFn: async (): Promise<AdminUser[]> => {
  // Query principal de profiles
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Apply filters...
  const { data: profiles, error } = await query.limit(200);
  if (error) throw error;
  if (!profiles) return [];

  const userIds = profiles.map(p => p.id);
  
  // Executar queries em PARALELO
  const [
    { data: subscriptions },
    { data: memberships },
  ] = await Promise.all([
    supabase.from('user_subscriptions').select('*').in('user_id', userIds),
    supabase.from('workspace_members')
      .select(`user_id, role, workspace:workspaces(id, name)`)
      .in('user_id', userIds)
      .eq('is_active', true),
  ]);
  
  // Build workspace map...
  const allWorkspaceIds = [...new Set(...)];
  
  // Queries de stats também em paralelo
  const [
    { data: projectsByWorkspace },
    { data: tasksByWorkspace },
  ] = await Promise.all([
    allWorkspaceIds.length > 0 
      ? supabase.from('projects').select('workspace_id').in('workspace_id', allWorkspaceIds)
      : Promise.resolve({ data: [] }),
    allWorkspaceIds.length > 0
      ? supabase.from('tasks').select('workspace_id').in('workspace_id', allWorkspaceIds)
      : Promise.resolve({ data: [] }),
  ]);
  
  // ... rest of processing
},
```

### 4. Adicionar loading state mais rápido

**Ficheiro:** `src/pages/admin/AdminLayout.tsx`

Usar o estado `loading` do `useAdminSession` de forma mais inteligente, mostrando skeleton apenas por tempo mínimo:

```tsx
// Mostrar conteúdo imediatamente se já temos dados em cache
const showContent = user && isSuperAdmin;
const showLoading = loading && !showContent;
```

---

## Impacto Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Chamadas RPC `is_system_admin` | 4+ | 1 |
| Tempo de carregamento usuarios | ~3-4s | ~1-1.5s |
| Queries paralelas | 0% | 100% |
| Cache de super admin | 0 | 30 min |

---

## Ficheiros a Modificar

1. `src/hooks/useSuperAdmin.ts` - Converter para React Query
2. `src/hooks/useAdminSession.ts` - Adicionar fast-path
3. `src/hooks/useAdminUsers.ts` - Paralelizar queries
4. `src/pages/admin/AdminLayout.tsx` - Otimizar loading state

---

## Secção Técnica

### Diagrama de Fluxo Atual

```text
User acessa /admin/users
    │
    ├── AdminLayout monta
    │   └── useAdminSession()
    │       └── RPC is_system_admin #1
    │
    ├── AdminUsers monta
    │   └── UsersListSection monta
    │       └── useAdminUsers(filters)
    │           └── useSuperAdmin()
    │               └── RPC is_system_admin #2
    │           └── Query profiles (sequencial)
    │           └── Query subscriptions (sequencial)
    │           └── Query members (sequencial)
    │           └── Query projects (sequencial)
    │           └── Query tasks (sequencial)
    │
    └── Outros hooks admin
        └── useSuperAdmin()
            └── RPC is_system_admin #3, #4...
```

### Diagrama de Fluxo Otimizado

```text
User acessa /admin/users
    │
    ├── AdminLayout monta
    │   └── useAdminSession()
    │       └── Fast-path: email = geral@willflow.app ✓
    │           (Nenhum RPC necessário!)
    │
    ├── AdminUsers monta
    │   └── UsersListSection monta
    │       └── useAdminUsers(filters)
    │           └── useSuperAdmin()
    │               └── Cache React Query ✓
    │           └── Promise.all([
    │                 profiles,
    │                 subscriptions,
    │                 members
    │               ])
    │           └── Promise.all([projects, tasks])
    │
    └── Outros hooks admin
        └── useSuperAdmin() → Cache ✓
```

### Riscos

1. **Cache stale**: Se permissões de admin mudarem, pode demorar 30min para refletir
   - Mitigação: Adicionar botão "Refresh" manual ou reduzir staleTime

2. **Email hardcoded**: Se admin mudar, precisa atualizar código
   - Já é o comportamento atual, aceitar como trade-off de performance

