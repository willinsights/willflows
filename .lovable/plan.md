

## Correção: Upload de Vídeo Sem Criar Tarefa

### Abordagem Simplificada

Em vez de criar uma tarefa automática no checklist, vamos usar o `projectId` diretamente quando não há tarefa selecionada. A coluna `task_id` na tabela `video_versions` **já é nullable**, então só precisamos ajustar o código.

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/stream-process-video/index.ts` | Tornar `taskId` opcional |
| `supabase/functions/r2-upload-url/index.ts` | Tornar `taskId` opcional |
| `src/components/projects/ProjectDetailsSheet.tsx` | Passar `null` em vez de `project.id` |
| `src/components/projects/ProjectDetailsModal.tsx` | Mesma correção |
| `src/hooks/useVideoVersions.ts` | Ajustar interface para `taskId` opcional |
| `src/components/video-production/VideoVersionUpload.tsx` | Aceitar `taskId` como opcional |
| `src/components/video-production/VideoProductionTab.tsx` | Aceitar `taskId` como opcional |

---

### Alteração 1: Edge Function `stream-process-video`

**Linha 113 - Alterar validação:**
```typescript
// Antes: taskId era obrigatório
if (!key || !taskId || !workspaceId || !fileName || !fileSize) {

// Depois: taskId é opcional
if (!key || !workspaceId || !projectId || !fileName || !fileSize) {
```

**Linha 120-126 - Alterar query de versões:**
```typescript
// Antes: buscava por task_id
.eq("task_id", taskId)

// Depois: busca por project_id quando não há task_id
if (taskId) {
  query = query.eq("task_id", taskId);
} else {
  query = query.is("task_id", null).eq("project_id", projectId);
}
```

**Linha 139 - Usar null quando não há taskId:**
```typescript
task_id: taskId || null,
```

---

### Alteração 2: Edge Function `r2-upload-url`

Mesma lógica - tornar `taskId` opcional na validação.

---

### Alteração 3: Componentes React

**`ProjectDetailsSheet.tsx` (linha 683):**
```typescript
// Antes: usava project.id como fallback (causava FK error)
taskId={selectedVideoTaskId || project.id}

// Depois: passa null quando não há tarefa
taskId={selectedVideoTaskId || null}
```

**`VideoProductionTab.tsx` - Ajustar interface:**
```typescript
interface VideoProductionTabProps {
  taskId: string | null;  // Agora aceita null
  workspaceId: string;
  projectId: string;
}
```

**`VideoVersionUpload.tsx` - Ajustar interface:**
```typescript
interface VideoVersionUploadProps {
  taskId: string | null;  // Agora aceita null
  workspaceId: string;
  projectId: string;
}
```

---

### Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│  Projeto sem tarefas                                            │
│        ↓                                                        │
│  taskId = null                                                  │
│        ↓                                                        │
│  Edge function recebe: { taskId: null, projectId: "xxx" }       │
│        ↓                                                        │
│  INSERT em video_versions: task_id = NULL, project_id = "xxx"   │
│        ↓                                                        │
│  ✅ Sucesso! Versões agrupadas por projeto                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Vantagens desta Abordagem

| Aspeto | Benefício |
|--------|-----------|
| Sem tarefas fantasma | Checklist permanece limpo |
| Dados consistentes | Versões ligadas ao projeto, não a tarefa inexistente |
| Código simples | Apenas ajustes de tipos, sem lógica complexa |
| Já suportado | A coluna `task_id` já é nullable no banco |

---

### Comportamento Final

| Cenário | Resultado |
|---------|-----------|
| Projeto COM tarefa selecionada | `task_id` = ID da tarefa |
| Projeto SEM tarefa | `task_id` = NULL, agrupa por `project_id` |

