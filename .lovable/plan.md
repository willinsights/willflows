

# Plano: Próximos Compromissos com Visibilidade Diferenciada

## Objetivo

Modificar o widget "Próximos Compromissos" no Dashboard para:
1. **Captações de projetos** → Visíveis para **todos** os membros do workspace
2. **Eventos pessoais Google** → Visíveis apenas para o **próprio utilizador** que sincronizou
3. **Eventos do workspace (reuniões, etc.)** → Visíveis apenas para **admins**

---

## Regras de Visibilidade

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PRÓXIMOS COMPROMISSOS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Admin:                                                        │
│   ├── ✓ Captações do workspace (todos os projetos)             │
│   ├── ✓ Eventos públicos do workspace (reuniões, etc.)         │
│   └── ✓ Eventos privados do seu Google (só os seus)            │
│                                                                 │
│   Colaborador (edicao, captacao, gestao, visualizacao):         │
│   ├── ✓ Captações do workspace (projetos que participa)         │
│   ├── ✗ Eventos públicos do workspace (NÃO vê)                 │
│   └── ✓ Eventos privados do seu Google (só os seus)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alterações Necessárias

### Ficheiro: `src/hooks/useDashboardMetrics.ts`

#### 1. Importar hooks de permissões

O hook já importa `useAuth`, precisamos usar o `user.id` para filtrar eventos.

#### 2. Expandir lógica de eventos (linhas 487-513)

```typescript
// Fetch UPCOMING EVENTS (next 7 days) - com lógica de visibilidade
const todayStart = startOfDay(now);
const nextWeekDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

// Verificar se é admin
const isAdmin = membership?.role === 'admin';

// 1. Buscar eventos do calendário
// A RLS já filtra: eventos públicos do workspace OU eventos privados criados pelo utilizador
let eventsQuery = supabase
  .from('calendar_events')
  .select('id, title, start_at, end_at, location, event_type, project_id, description, video_call_url, all_day, is_private, created_by, projects(name)')
  .eq('workspace_id', currentWorkspace.id)
  .gte('start_at', todayStart.toISOString())
  .lte('start_at', nextWeekDate.toISOString())
  .order('start_at', { ascending: true })
  .limit(10);

const { data: eventsData } = await eventsQuery;

// Filtrar eventos conforme permissões:
// - Eventos privados (Google pessoal): só o criador vê
// - Eventos públicos (workspace): só admin vê
const filteredEvents = eventsData?.filter(event => {
  // Evento privado: só o criador vê (RLS já garante, mas confirmamos)
  if (event.is_private) {
    return event.created_by === user?.id;
  }
  // Evento público do workspace: só admin vê
  return isAdmin;
}) || [];

// 2. Buscar captações de projetos não entregues (visível para todos)
const { data: shootsData } = await supabase
  .from('projects')
  .select('id, name, shoot_date, shoot_start_time, clients(name)')
  .eq('workspace_id', currentWorkspace.id)
  .eq('is_delivered', false)
  .gte('shoot_date', format(todayStart, 'yyyy-MM-dd'))
  .lte('shoot_date', format(nextWeekDate, 'yyyy-MM-dd'))
  .order('shoot_date', { ascending: true })
  .limit(10);

// 3. Combinar eventos do calendário filtrados + captações
const calendarEvents: UpcomingEvent[] = filteredEvents.map(e => ({
  id: e.id,
  title: e.title,
  startAt: new Date(e.start_at),
  endAt: e.end_at ? new Date(e.end_at) : null,
  location: e.location,
  eventType: e.event_type,
  projectName: (e.projects as any)?.name,
  description: e.description,
  videoCallUrl: e.video_call_url,
  allDay: e.all_day,
}));

const shootEvents: UpcomingEvent[] = shootsData?.map(p => ({
  id: `shoot-${p.id}`,
  title: p.name,
  startAt: new Date(`${p.shoot_date}T${p.shoot_start_time || '09:00:00'}`),
  endAt: null,
  location: null,
  eventType: 'sessao',
  projectName: p.name,
  description: `Captação: ${(p.clients as any)?.name || 'Sem cliente'}`,
  videoCallUrl: null,
  allDay: !p.shoot_start_time,
})) || [];

// Combinar, ordenar por data, limitar a 5
const allEvents = [...calendarEvents, ...shootEvents]
  .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
  .slice(0, 5);

setUpcomingEvents(allEvents);
```

---

## Resumo das Regras

| Tipo de Evento | is_private | Admin Vê | Colaborador Vê |
|----------------|------------|----------|----------------|
| Captação (projeto) | N/A | ✓ | ✓ (todos) |
| Evento público workspace | false | ✓ | ✗ |
| Evento Google pessoal | true | ✓ (só os seus) | ✓ (só os seus) |

---

## Impacto

| Componente | Alteração |
|------------|-----------|
| `useDashboardMetrics.ts` | Lógica de filtragem expandida |
| `UpcomingEventsCard.tsx` | Sem alteração |
| `MobileUpcomingEvents.tsx` | Sem alteração |
| Dashboard | Mostra diferentes eventos conforme permissões |

---

## Testes Esperados

1. **Admin** vê captações + reuniões do workspace + seus eventos Google
2. **Colaborador** vê captações + apenas seus eventos Google pessoais
3. **Eventos públicos** (reuniões criadas no WillFlow) não aparecem para colaboradores
4. **Ordenação** cronológica correta
5. **Limite de 5** eventos mantido

