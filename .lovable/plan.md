
## Alterações Solicitadas

### 1. Timecode Completo (HH:MM:SS)

Atualizar a função `formatTimecode` em `src/lib/duration-utils.ts` para **sempre** mostrar o formato completo com horas, minutos e segundos:

**Antes:** `01:30` (para 90 segundos)
**Depois:** `00:01:30` (sempre com horas)

**Ficheiro:** `src/lib/duration-utils.ts`

```typescript
export function formatTimecode(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  // Sempre formato completo HH:MM:SS
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
```

---

### 2. Corrigir Texto "Versões" Duplicado

A imagem mostra "Versões" aparecendo duas vezes:
- Uma vez no `CardTitle` do `VideoProductionTab.tsx` (linha 265)
- Outra vez no header interno do `VideoVersionsList.tsx` (linha 84)

**Solução:** Remover o header interno do `VideoVersionsList.tsx` já que o Card pai já tem o título.

**Ficheiro:** `src/components/video-production/VideoVersionsList.tsx`

```text
Antes (linhas 82-86):
┌────────────────────────────────┐
│ <span>Versões</span> <Badge>1</Badge> │  ← REMOVER
├────────────────────────────────┤
│ V1 - nome_do_video.mp4         │
└────────────────────────────────┘

Depois:
┌────────────────────────────────┐
│ V1 - nome_do_video.mp4         │
└────────────────────────────────┘
```

---

### 3. Remover Requisito de Tarefa para Vídeo

Atualmente, a aba de Produção exige que exista pelo menos uma tarefa no projeto. O utilizador quer poder adicionar vídeos sem precisar de criar tarefas/checklists primeiro.

**Solução:** 
- Criar uma tarefa automaticamente quando não existir nenhuma
- Ou permitir upload diretamente associado ao projeto

**Ficheiros:**
- `src/components/projects/ProjectDetailsSheet.tsx`
- `src/components/projects/ProjectDetailsModal.tsx`

**Lógica atual (linhas 681-686):**
```typescript
} : tasks.length === 0 ? (
  <div className="rounded-lg border...">
    <p>Para usar a Produção, crie pelo menos uma tarefa neste projeto.</p>
  </div>
)
```

**Nova lógica:**
```typescript
// Se não existem tarefas, criar uma automaticamente
useEffect(() => {
  if (tasks.length === 0 && !creatingDefaultTask) {
    createDefaultTask();
  }
}, [tasks]);

const createDefaultTask = async () => {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: project.id,
      workspace_id: project.workspace_id,
      title: 'Produção de Vídeo',
      phase: 'edicao',
      position: 0,
    })
    .select()
    .single();
  
  if (data) {
    setTasks([data]);
    setSelectedVideoTaskId(data.id);
  }
};
```

---

### 4. Renomear "Checklist Captação/Edição" para "WillFlow Review"

**Ficheiro:** `src/components/projects/ProjectChecklistTab.tsx`

**Alterações:**
- Linha 537: `"Checklist Captação"` → `"WillFlow Review Captação"`
- Linha 553: `"Checklist Edição"` → `"WillFlow Review Edição"`

Também atualizar a tarefa criada automaticamente (linha 236):
- `Checklist ${phaseLabel}` → mantém o nome da fase

---

### Resumo dos Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/duration-utils.ts` | Formato timecode sempre HH:MM:SS |
| `src/components/video-production/VideoVersionsList.tsx` | Remover header "Versões" duplicado |
| `src/components/projects/ProjectDetailsSheet.tsx` | Auto-criar tarefa para vídeo |
| `src/components/projects/ProjectDetailsModal.tsx` | Auto-criar tarefa para vídeo |
| `src/components/projects/ProjectChecklistTab.tsx` | Renomear para "WillFlow Review" |
