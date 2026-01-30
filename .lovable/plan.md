

## Correção: Vídeo Não Aparece Após Processamento

### Causa Raiz Identificada

O componente `VideoProductionTabContent` chama o hook sem passar o `projectId`:

```typescript
// Linha 59 - FALTA projectId!
const { versions, ... } = useVideoVersions(taskId, workspaceId);
```

Quando `taskId` é `null` (projeto sem tarefas), o hook verifica:

```typescript
if (!taskId && !projectId) return;  // Não busca versões!
```

Como `projectId` é `undefined`, a query nunca é executada.

---

### Verificação na Base de Dados

O vídeo está corretamente guardado:
- **ID**: `487372a9-95d7-415c-8002-e547449e48c1`
- **Ficheiro**: CAIMAN - SAFARI NOTURNO.mp4
- **Versão**: 3
- **Status**: `ready`
- **project_id**: `e398da1f-2b71-4cdd-95c0-a61de8343a8c`
- **task_id**: `NULL` (correto - não há tarefa)

---

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/video-production/VideoProductionTab.tsx` | Passar `projectId` ao hook |

---

### Alteração (Linha 59)

**Antes:**
```typescript
const { versions, loading, deleteVersion, getSignedUrl, isProcessing, refetch } = 
  useVideoVersions(taskId, workspaceId);
```

**Depois:**
```typescript
const { versions, loading, deleteVersion, getSignedUrl, isProcessing, refetch } = 
  useVideoVersions(taskId, workspaceId, projectId);
```

---

### Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│  Projeto sem tarefas (taskId = null)                            │
│        ↓                                                        │
│  useVideoVersions(null, workspaceId, projectId)                 │
│        ↓                                                        │
│  Hook verifica: !taskId && !projectId → FALSE (projectId existe)│
│        ↓                                                        │
│  Query: SELECT * FROM video_versions WHERE project_id = ?       │
│        ↓                                                        │
│  ✅ Versões aparecem na UI                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Resultado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Projeto sem tarefas | ❌ Lista vazia | ✅ Versões aparecem |
| Projeto com tarefa selecionada | ✅ Funciona | ✅ Funciona |

