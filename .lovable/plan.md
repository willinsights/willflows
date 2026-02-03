

# Plano: Corrigir Carregamento de Feedback no Painel Super Admin

## Problema Identificado

O hook `useFeedbackAdmin` **não verifica se o utilizador é Super Admin** antes de executar a query à base de dados. Isto resulta em:

1. A query é executada antes da sessão estar validada
2. As políticas RLS bloqueiam o acesso porque `is_system_admin()` retorna `false` (sem sessão válida)
3. O resultado é uma lista vazia de feedbacks

## Comparação com Solução Funcional

O hook `useAdminAudit` funciona correctamente porque:

```typescript
// useAdminAudit.ts - Linha 22 e 40
const { isSuperAdmin } = useSuperAdmin();

const { data: auditLogs = [], isLoading } = useQuery({
  queryKey: ['admin-audit-logs'],
  queryFn: async () => { ... },
  enabled: isSuperAdmin,  // ← Query só corre quando confirmado
});
```

O hook `useFeedbackAdmin` **não tem esta verificação**:

```typescript
// useFeedbackAdmin.ts - Sem verificação
const { data: feedback = [], isLoading, refetch } = useQuery({
  queryKey: ['admin-feedback', filters],
  queryFn: async () => { ... },
  // ← Falta: enabled: isSuperAdmin
});
```

## Solução

Adicionar a verificação de Super Admin ao hook `useFeedbackAdmin`:

### Alterações no ficheiro `src/hooks/useFeedbackAdmin.ts`

```typescript
// Adicionar import
import { useSuperAdmin } from './useSuperAdmin';

// Usar o hook dentro do componente
export function useFeedbackAdmin() {
  const { isSuperAdmin } = useSuperAdmin();  // ← Adicionar
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // ... resto do código
  
  const { data: feedback = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-feedback', filters],
    queryFn: async () => {
      // ... query existente
    },
    enabled: isSuperAdmin,  // ← Adicionar esta linha
  });
  
  // ... resto do código
}
```

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Super Admin acede a /admin/system → Suporte | ❌ Lista vazia | ✅ Mostra feedbacks |
| Query sem sessão válida | Executa e falha silenciosamente | Aguarda autenticação |
| Refetch após login | ❌ Continua vazio | ✅ Carrega dados |

## Ficheiros a Modificar

1. **`src/hooks/useFeedbackAdmin.ts`**:
   - Importar `useSuperAdmin`
   - Adicionar `enabled: isSuperAdmin` ao `useQuery`

## Secção Técnica

### Alteração Completa

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSuperAdmin } from './useSuperAdmin';  // ← NOVO

// ... tipos existentes ...

export function useFeedbackAdmin() {
  const { isSuperAdmin } = useSuperAdmin();  // ← NOVO
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FeedbackFilters>({
    type: 'all',
    status: 'all',
  });

  const { data: feedback = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-feedback', filters],
    queryFn: async () => {
      let query = supabase
        .from('feedback')
        .select(`
          *,
          profiles:user_id (email, full_name),
          workspaces:workspace_id (name)
        `)
        .order('created_at', { ascending: false });

      // ... filtros existentes ...

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((item: any) => ({
        ...item,
        user_email: item.profiles?.email,
        user_name: item.profiles?.full_name,
        workspace_name: item.workspaces?.name,
      })) as Feedback[];
    },
    enabled: isSuperAdmin,  // ← NOVO
  });

  // ... resto do código inalterado ...
}
```

### Comportamento do `enabled`

- `enabled: false` → Query não é executada
- `enabled: true` → Query é executada
- Quando `isSuperAdmin` muda de `false` para `true` (após validação), a query corre automaticamente

