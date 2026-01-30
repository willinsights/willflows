

## Correção: Gerar Link de Aprovação sem Tarefa

### Problema Identificado

Quando um projeto não tem tarefas (`taskId = null`), o botão "Gerar link de aprovação" não executa porque:

1. O hook `useVideoApproval` verifica `if (!taskId)` e não executa as funções
2. A função `generateToken` falha com `throw new Error('Missing required data')` quando `taskId` é `null`
3. O componente `ApprovalShareLink` não recebe `projectId`

A tabela `video_approval_tokens` já suporta `project_id` (nullable), então só precisamos atualizar o código para usar este campo.

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useVideoApproval.ts` | Suportar `projectId` como alternativa a `taskId` |
| `src/components/video-production/ApprovalShareLink.tsx` | Aceitar e passar `projectId` |
| `src/components/video-production/VideoProductionTab.tsx` | Passar `projectId` ao `ApprovalShareLink` |

---

### Alteração 1: Hook `useVideoApproval`

**Interface atualizada:**
```typescript
export function useVideoApproval(taskId: string | null, projectId?: string | null)
```

**Funções atualizadas:**

```typescript
const fetchToken = useCallback(async () => {
  // Aceitar taskId OU projectId
  if (!taskId && !projectId) return;

  try {
    let query = supabase
      .from('video_approval_tokens')
      .select('*')
      .eq('is_active', true);

    if (taskId) {
      query = query.eq('task_id', taskId);
    } else if (projectId) {
      query = query.is('task_id', null).eq('project_id', projectId);
    }

    const { data, error } = await query.maybeSingle();
    // ...
  }
}, [taskId, projectId]);

const generateToken = async (workspaceId: string, ...) => {
  // Validar: precisa de taskId OU projectId
  if ((!taskId && !projectId) || !user) {
    throw new Error('Missing required data');
  }

  // Desativar tokens existentes
  let deactivateQuery = supabase
    .from('video_approval_tokens')
    .update({ is_active: false });

  if (taskId) {
    deactivateQuery = deactivateQuery.eq('task_id', taskId);
  } else if (projectId) {
    deactivateQuery = deactivateQuery.is('task_id', null).eq('project_id', projectId);
  }

  await deactivateQuery;

  // Criar novo token
  const { data, error } = await supabase
    .from('video_approval_tokens')
    .insert({
      task_id: taskId || null,
      project_id: projectId || null,  // Novo campo
      workspace_id: workspaceId,
      // ... resto dos campos
    })
    .select()
    .single();
  // ...
};
```

---

### Alteração 2: Componente `ApprovalShareLink`

**Interface atualizada:**
```typescript
interface ApprovalShareLinkProps {
  taskId: string | null;  // Agora aceita null
  workspaceId: string;
  projectId: string;      // Novo campo obrigatório
  className?: string;
}

export function ApprovalShareLink({ taskId, workspaceId, projectId, className }) {
  // Passar projectId ao hook
  const { token, generateToken, revokeToken, getApprovalUrl } = 
    useVideoApproval(taskId, projectId);
  // ...
}
```

---

### Alteração 3: Componente `VideoProductionTab`

```typescript
<ApprovalShareLink
  taskId={taskId}
  workspaceId={workspaceId}
  projectId={projectId}  // Adicionar esta prop
/>
```

---

### Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│  Projeto SEM tarefa                                             │
│        ↓                                                        │
│  ApprovalShareLink(taskId=null, projectId="xxx")                │
│        ↓                                                        │
│  useVideoApproval(null, "xxx") → usa projectId                  │
│        ↓                                                        │
│  generateToken() → INSERT com project_id="xxx", task_id=NULL    │
│        ↓                                                        │
│  ✅ Link gerado com sucesso                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

### Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Projeto com tarefa | ✅ Funciona | ✅ Funciona |
| Projeto sem tarefa | ❌ Não executa | ✅ Usa projectId |

