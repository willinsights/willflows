

# Plano: Visibilidade de Compromissos Baseada em Participação

## Objetivo

Refinar as regras de visibilidade do widget "Próximos Compromissos" para:
1. **Captações** → Só aparecem se o utilizador está na equipa do projeto na fase "captacao"
2. **Tarefas** → Só aparecem se o utilizador está assignado à tarefa
3. **Admin** → Vê tudo, mesmo sem estar adicionado como responsável

---

## Regras de Visibilidade Atualizadas

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PRÓXIMOS COMPROMISSOS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Admin:                                                        │
│   ├── ✓ Todas as captações do workspace                        │
│   ├── ✓ Eventos públicos do workspace (reuniões)               │
│   ├── ✓ Eventos privados do seu Google                         │
│   └── ✓ Todas as tarefas com due_date                          │
│                                                                 │
│   Colaborador (edicao, captacao, gestao, visualizacao):         │
│   ├── ✓ Captações onde sou responsável (phase='captacao')      │
│   ├── ✗ Eventos públicos do workspace (NÃO vê)                 │
│   ├── ✓ Eventos privados do seu Google                         │
│   └── ✓ Tarefas onde estou assignado (task_assignees)          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### Ficheiro: `src/hooks/useDashboardMetrics.ts`

#### 1. Buscar membros de equipa do utilizador atual

Antes de filtrar captações, buscar em que projectos e fases o utilizador está:

```typescript
// Fetch user's project team memberships (for non-admins)
let userCaptacaoProjectIds: string[] = [];
if (!isAdmin && user?.id) {
  const { data: teamData } = await supabase
    .from('project_team')
    .select('project_id')
    .eq('user_id', user.id)
    .eq('phase', 'captacao');
  
  userCaptacaoProjectIds = teamData?.map(t => t.project_id) || [];
}
```

#### 2. Filtrar captações baseado em participação

```typescript
// Fetch project shoots
const { data: shootsData } = await supabase
  .from('projects')
  .select('id, name, shoot_date, shoot_start_time, clients(name)')
  .eq('workspace_id', currentWorkspace.id)
  .eq('is_delivered', false)
  .gte('shoot_date', format(todayStart, 'yyyy-MM-dd'))
  .lte('shoot_date', format(nextWeekDate, 'yyyy-MM-dd'))
  .order('shoot_date', { ascending: true })
  .limit(10);

// Filter shoots: Admin sees all, collaborators only see their assigned captures
const filteredShoots = isAdmin 
  ? shootsData || []
  : (shootsData || []).filter(p => userCaptacaoProjectIds.includes(p.id));
```

#### 3. Adicionar tarefas com due_date nos próximos 7 dias

```typescript
// Fetch tasks with due_date in next 7 days
const { data: tasksData } = await supabase
  .from('tasks')
  .select(`
    id, title, due_date, due_time, project_id, is_completed,
    projects(name),
    task_assignees(user_id)
  `)
  .eq('workspace_id', currentWorkspace.id)
  .eq('is_completed', false)
  .gte('due_date', format(todayStart, 'yyyy-MM-dd'))
  .lte('due_date', format(nextWeekDate, 'yyyy-MM-dd'))
  .order('due_date', { ascending: true })
  .limit(15);

// Filter tasks: Admin sees all, collaborators only see assigned tasks
const filteredTasks = isAdmin
  ? tasksData || []
  : (tasksData || []).filter(task => 
      (task.task_assignees as any[])?.some(a => a.user_id === user?.id)
    );
```

#### 4. Converter tarefas para UpcomingEvent

```typescript
const taskEvents: UpcomingEvent[] = filteredTasks.map(t => ({
  id: `task-${t.id}`,
  title: t.title,
  startAt: new Date(`${t.due_date}T${t.due_time || '09:00:00'}`),
  endAt: null,
  location: null,
  eventType: 'deadline',
  projectName: (t.projects as any)?.name,
  description: 'Tarefa',
  videoCallUrl: null,
  allDay: !t.due_time,
}));
```

#### 5. Combinar tudo ordenado

```typescript
// Combine all events, sort by date, limit to 5
const allEvents = [...calendarEvents, ...shootEvents, ...taskEvents]
  .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
  .slice(0, 5);

setUpcomingEvents(allEvents);
```

---

## Resumo das Regras Finais

| Tipo | Condição para Colaborador | Admin |
|------|---------------------------|-------|
| Captação | Está em `project_team` com `phase='captacao'` | Vê todas |
| Tarefa | Está em `task_assignees` para a tarefa | Vê todas |
| Evento Workspace | Não vê | Vê todas |
| Evento Google Pessoal | Só os seus (`created_by`) | Só os seus |

---

## Impacto

| Componente | Alteração |
|------------|-----------|
| `useDashboardMetrics.ts` | Nova lógica de filtragem + tarefas |
| `UpcomingEventsCard.tsx` | Sem alteração (já suporta `eventType: 'deadline'`) |
| `MobileUpcomingEvents.tsx` | Sem alteração |

---

## Testes Esperados

1. **Colaborador de captação** vê apenas captações dos projectos onde está assignado com `phase='captacao'`
2. **Colaborador** vê apenas tarefas onde está em `task_assignees`
3. **Admin** vê todas as captações e tarefas do workspace
4. **Eventos Google pessoais** continuam visíveis apenas para o proprietário
5. **Ordenação cronológica** correcta com todos os tipos de compromissos

