
# Plano: Corrigir Erros na Página de Pagamentos para Colaboradores

## Problema Identificado

Um utilizador com role `freelancer` (com label customizado "Gestores 🖥️") está a ver o erro "Algo correu mal" ao aceder à página de **Pagamentos**. 

O erro nos logs do Postgres mostra:
```
invalid input value for enum app_role: "gestor"
```

### Causa Raiz

O erro ocorre porque o **cache do localStorage** pode estar corrompido ou desatualizado, contendo "gestor" (parte do label personalizado) em vez do role real "freelancer". Quando este valor é usado em queries à tabela `workspace_role_permissions`, o enum rejeita o valor.

Adicionalmente, há verificações **hardcoded** no código que comparam roles diretamente em vez de usar o sistema de permissões dinâmicas.

---

## Ficheiros com Problemas

### 1. `src/hooks/useProjects.ts` (Linha 31)
```typescript
// PROBLEMA: Verificação hardcoded
const isCollaborator = membership?.role !== 'admin';
```

Deveria usar `hasPermission('visibility.all_projects')` do sistema dinâmico.

### 2. `src/contexts/WorkspaceContext.tsx` (Linha 576)
```typescript
// PROBLEMA: Verificação hardcoded
const canEdit = isAdmin || membership?.role === 'editor' || membership?.role === 'captacao';
```

### 3. `src/hooks/useConversations.ts` (Linha 73)
```typescript
// PROBLEMA: Verificação hardcoded
const isUserRestricted = !['admin', 'editor', 'captacao'].includes(membership?.role || '');
```

### 4. Cache Corrompido
O utilizador pode ter uma entrada no localStorage com um role inválido que causa o erro.

---

## Solução

### Parte 1: Adicionar Validação de Role no WorkspaceContext

Garantir que o role vindo do cache é um valor válido do enum antes de usar:

```typescript
// src/contexts/WorkspaceContext.tsx

const VALID_ROLES = ['admin', 'editor', 'captacao', 'freelancer', 'visualizador'] as const;

function isValidRole(role: unknown): role is WorkspaceMember['role'] {
  return typeof role === 'string' && VALID_ROLES.includes(role as any);
}

// No cache loading
if (cached && cached.membership && isValidRole(cached.membership.role)) {
  // ... usar cache
} else {
  // Cache inválido - limpar e fazer refetch
  clearCachedWorkspace();
}
```

### Parte 2: Sincronizar useProjects com Permissões Dinâmicas

```typescript
// src/hooks/useProjects.ts
import { useFinancialPermissions } from '@/hooks/useFinancialPermissions';

export function useProjects() {
  const { canViewAllProjects, isLoading: permissionsLoading } = useFinancialPermissions();
  
  // Usar permissão dinâmica em vez de hardcoded
  const isCollaborator = !canViewAllProjects;
  
  // Esperar que permissões carreguem
  const fetchProjects = useCallback(async () => {
    if (!currentWorkspace?.id || fetchError || permissionsLoading) return;
    // ...
  }, [currentWorkspace?.id, fetchError, permissionsLoading, canViewAllProjects, userId]);
}
```

### Parte 3: Limpeza Automática de Cache Corrompido

Adicionar uma verificação no `WorkspaceContext` para detetar e limpar cache com roles inválidos:

```typescript
// Em getInitialStateFromCache()
function getInitialStateFromCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as CachedWorkspaceData;
      
      // VALIDAR role antes de usar cache
      if (data.workspace && data.membership && isValidRole(data.membership.role)) {
        return {
          workspace: data.workspace,
          membership: data.membership,
          // ...
        };
      } else {
        // Cache inválido - limpar
        localStorage.removeItem(CACHE_KEY);
      }
    }
  } catch {
    // Limpar cache corrompido
    localStorage.removeItem(CACHE_KEY);
  }
  // ... retornar valores default
}
```

### Parte 4: Tratamento de Erro Gracioso na Página de Pagamentos

Em vez de deixar o ErrorBoundary apanhar o erro, tratar erros específicos de permissões:

```typescript
// src/pages/app/Pagamentos.tsx

// Se isLoading está true por mais de 10 segundos, mostrar mensagem
const [loadingTimeout, setLoadingTimeout] = useState(false);

useEffect(() => {
  if (loading || permissionsLoading) {
    const timer = setTimeout(() => setLoadingTimeout(true), 10000);
    return () => clearTimeout(timer);
  }
  setLoadingTimeout(false);
}, [loading, permissionsLoading]);

if (loadingTimeout) {
  return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">
        A carregar permissões... Se este erro persistir, tente fazer logout e login novamente.
      </p>
      <Button onClick={() => window.location.reload()}>Recarregar</Button>
    </div>
  );
}
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/contexts/WorkspaceContext.tsx` | Adicionar validação de role no cache |
| `src/hooks/useProjects.ts` | Usar permissões dinâmicas |
| `src/pages/app/Pagamentos.tsx` | Adicionar tratamento de timeout |

---

## Impacto

| Problema | Antes | Depois |
|----------|-------|--------|
| Cache com role inválido | Erro "gestor" no enum | Cache limpo automaticamente |
| Verificações hardcoded | Roles fixos no código | Usa permissões dinâmicas |
| Loading infinito | ErrorBoundary genérico | Mensagem de recuperação |

---

## Secção Técnica

### Porque o erro acontece

1. **Labels personalizados**: O admin renomeou "Freelancer" para "Gestores 🖥️"
2. **Cache bug potencial**: Em algum momento, o label pode ter sido guardado no cache em vez do role real
3. **Query RLS**: Quando o `useRolePermissions` faz query com role "gestor", o Postgres rejeita porque não é um valor válido do enum

### Validação de Roles

Os únicos valores válidos são:
- `admin`
- `editor`
- `captacao`
- `freelancer`
- `visualizador`

Qualquer outro valor (incluindo labels customizados como "Gestores", "Gestor", etc.) não deve ser aceite.

### Ação Imediata para o Utilizador

Enquanto o fix não é implementado, o utilizador pode:
1. Abrir DevTools (F12)
2. Ir a Application → Local Storage
3. Limpar entrada `willflow_workspace_cache`
4. Fazer refresh da página
