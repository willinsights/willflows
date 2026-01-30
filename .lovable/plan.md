

## Correção: Erro "Failed to process video" - Foreign Key Violation

### Problema Identificado

Quando o projeto não tem tarefas criadas, o código usa `project.id` como fallback para `taskId`:

```typescript
// ProjectDetailsSheet.tsx (linha 683)
taskId={selectedVideoTaskId || project.id}
```

Mas `project.id` não existe na tabela `tasks`, causando:
```
"insert or update on table \"video_versions\" violates foreign key constraint \"video_versions_task_id_fkey\""
```

---

### Fluxo do Erro

```text
┌────────────────────────────────────────────────────────────────┐
│  1. Projeto sem tarefas → selectedVideoTaskId = null           │
│        ↓                                                       │
│  2. taskId = selectedVideoTaskId || project.id                 │
│        ↓                                                       │
│  3. project.id passado como taskId ao edge function            │
│        ↓                                                       │
│  4. INSERT em video_versions com task_id = project.id          │
│        ↓                                                       │
│  5. FK constraint falha: project.id não existe em tasks        │
│        ↓                                                       │
│  6. ERRO: "Failed to process video"                            │
└────────────────────────────────────────────────────────────────┘
```

---

### Solução: Criar Tarefa Padrão Automaticamente

De acordo com a especificação do projeto, devemos criar automaticamente uma tarefa "Produção de Vídeo" quando não existir nenhuma tarefa. Esta abordagem:
- Mantém a integridade referencial da base de dados
- Não requer alterações à edge function
- Segue o padrão já definido na memória do projeto

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/projects/ProjectDetailsSheet.tsx` | Criar tarefa automática se não existir |
| `src/components/projects/ProjectDetailsModal.tsx` | Mesma correção |

---

### Alteração Principal

Adicionar um `useEffect` que cria uma tarefa "Produção de Vídeo" quando:
1. O projeto abre
2. Não há tarefas existentes
3. O utilizador tem acesso ao tab de vídeo

**Lógica:**
```typescript
// Criar tarefa de produção se não existir nenhuma
useEffect(() => {
  const ensureVideoTask = async () => {
    if (!open || tasks.length > 0 || !project?.id) return;
    
    try {
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          title: 'Produção de Vídeo',
          project_id: project.id,
          workspace_id: project.workspace_id,
          phase: project.current_phase,
          status: 'em_progresso',
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (!error && newTask) {
        setTasks([newTask]);
        setSelectedVideoTaskId(newTask.id);
      }
    } catch (error) {
      console.error('Error creating video production task:', error);
    }
  };
  
  ensureVideoTask();
}, [open, tasks.length, project?.id]);
```

---

### Comportamento Esperado Após Correção

| Cenário | Antes | Depois |
|---------|-------|--------|
| Projeto com tarefas | ✅ Funciona | ✅ Funciona |
| Projeto sem tarefas | ❌ "Failed to process video" | ✅ Cria tarefa automaticamente |

---

### Alternativa Considerada (Não Recomendada)

Poderíamos tornar `task_id` nullable na edge function e base de dados, mas isso:
- Quebraria a consistência dos dados existentes
- Complicaria queries que agrupam versões por tarefa
- Não seguiria a especificação original do projeto

A criação automática da tarefa é a solução mais limpa e alinhada com a arquitetura.

