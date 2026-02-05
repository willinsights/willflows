
# Plano: Corrigir Incoerência de Vídeos e Aba Armazenamento Padrão

## Problema Identificado

### 1. Incoerência de Vídeos na Aba "Produção"
Na aba "Produção" do projeto:
- O sistema seleciona automaticamente a **primeira tarefa** (`tasks[0].id`)
- Os vídeos são filtrados por `task_id` quando uma tarefa está selecionada
- **Problema**: Os 3 vídeos do "Park Hyatt Sydney" têm `task_id = null` (foram carregados directamente no projeto, não numa tarefa)
- **Resultado**: Mostra "Nenhuma versão carregada" apesar de existirem vídeos no projeto

### 2. Aba Padrão Incorrecta
- Actualmente a aba padrão é "Links" (`mainTab: 'links'`)
- O utilizador quer que "Armazenamento" seja a aba padrão

---

## Alterações Necessárias

### Ficheiro 1: `src/pages/app/Media.tsx`
**Alteração**: Mudar aba padrão para "storage"

```typescript
// Linha 97 - Mudar de 'links' para 'storage'
const [mainTab, setMainTab] = useState<'links' | 'storage'>('storage');
```

### Ficheiro 2: `src/hooks/useVideoVersions.ts`
**Alteração**: Quando `taskId` é fornecido mas vazio/null, dar prioridade ao `projectId`

A lógica actual:
```typescript
if (taskId) {
  query = query.eq('task_id', taskId);
} else if (projectId) {
  query = query.eq('project_id', projectId);
}
```

Esta lógica já está correcta - se `taskId` for `null`, usa `projectId`.

### Ficheiro 3: `src/components/projects/ProjectDetailsSheet.tsx`
**Alteração Principal**: Adicionar opção para ver **todos os vídeos do projeto** ou filtrar por tarefa

Opção A (Recomendada): **Não selecionar tarefa por defeito**
```typescript
// Linha 192-199 - Mudar para não seleccionar tarefa automaticamente
useEffect(() => {
  if (!open) return;
  // Não seleccionar tarefa automaticamente - mostrar todos os vídeos do projecto
  setSelectedVideoTaskId(null);
}, [open]);
```

Opção B: **Adicionar selector de tarefa com opção "Todos"**
- Adicionar um Select com opção "Todos os vídeos" + lista de tarefas
- Quando "Todos" selecionado, `taskId = null` → mostra vídeos por `project_id`

---

## Solução Proposta

Implementar **Opção A** (mais simples) com melhoria visual:

1. **Não seleccionar tarefa automaticamente** → mostra todos os vídeos do projeto
2. **Adicionar indicador opcional** de qual tarefa está associada a cada vídeo na lista

### Alterações no `ProjectDetailsSheet.tsx`:

```typescript
// Linha 192-199 - Remover auto-selecção de tarefa
useEffect(() => {
  if (!open) return;
  // Mostrar todos os vídeos do projecto por defeito
  setSelectedVideoTaskId(null);
}, [open]);
```

### Alterações no `VideoVersionsList` (se necessário):
- Mostrar o nome da tarefa associada a cada vídeo (se existir)
- Isto ajuda a identificar a que tarefa cada versão pertence

---

## Resumo das Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `Media.tsx` | `useState('links')` → `useState('storage')` |
| `ProjectDetailsSheet.tsx` | Remover auto-selecção de tarefa |
| `ProjectDetailsModal.tsx` | Mesma alteração (consistência) |

---

## Resultado Esperado

1. **Página Media** abre directamente na aba "Armazenamento"
2. **Aba Produção** mostra todos os vídeos do projecto (não filtra por tarefa)
3. **Mídias por Projeto** continua a mostrar apenas projectos que têm vídeos
4. Sem incoerência entre as abas

---

## Detalhes Técnicos

A query no `useVideoVersions` já suporta isto correctamente:
- `taskId = null` + `projectId` → `query.eq('project_id', projectId)`
- Isto retorna todos os vídeos do projecto, independentemente de terem ou não `task_id`
