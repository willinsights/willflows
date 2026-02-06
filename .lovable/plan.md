

# Calendario como Modulo Central: Google Meet + Eventos Unificados

## Resumo

Este plano consolida o Google Meet e os eventos do calendario num unico modulo coerente. Todas as reunioes sao eventos do calendario com uma opcao de "Adicionar Google Meet". Implementa 3 pontos de entrada unificados, um campo de participantes (attendeesEmails), e melhorias no fluxo de UX pos-criacao.

---

## Estado Actual vs. Objectivo

| Funcionalidade | Estado Actual | Objectivo |
|---|---|---|
| Botao "Novo Evento" no calendario | Existe | Manter (ja OK) |
| Clique em slot vazio (grid) | Existe (week/day view) | Expandir para month view |
| Criar evento a partir de Projeto/Tarefa | Nao existe | Adicionar botao "Agendar Evento" |
| Campo attendeesEmails | Nao existe no modal (existe no edge function) | Adicionar ao modal |
| Auto-open detalhes apos criar | Nao faz | Implementar |
| Toggle "Adicionar Google Meet" default ON | Default OFF | Mudar para ON quando Google conectado |

---

## Fase 1: Schema - Adicionar coluna `attendees_emails`

Migrar a tabela `calendar_events` para incluir um campo de participantes:

```sql
ALTER TABLE calendar_events ADD COLUMN attendees_emails text[] DEFAULT '{}';
```

Sem alteracoes de RLS necessarias (as politicas existentes ja cobrem a tabela).

---

## Fase 2: CreateEventModal - Melhorias

Ficheiro: `src/components/calendar/CreateEventModal.tsx`

### 2.1 Adicionar props para contexto de projeto/tarefa

```typescript
interface CreateEventModalProps {
  // ... props existentes
  initialProjectId?: string;
  initialTaskId?: string;
  initialProjectName?: string;
}
```

### 2.2 Adicionar campo de participantes (attendeesEmails)

- Input de texto com separacao por virgula ou Enter
- Chips visuais para cada email adicionado
- Validacao basica de formato de email

### 2.3 Toggle "Adicionar Google Meet" default ON

Quando `isGoogleConnected === true` e o modal abre para um novo evento (nao edicao), definir `autoCreateMeet = true` por defeito.

### 2.4 Exibir projeto/tarefa associado

Se `initialProjectId` estiver definido, mostrar um badge informativo com o nome do projeto (read-only).

### 2.5 Passar attendeesEmails no onSubmit

O payload do `onSubmit` passa a incluir `attendees_emails` e `project_id` / `task_id`.

---

## Fase 3: useCalendarEvents - Passar attendees ao criar

Ficheiro: `src/hooks/useCalendarEvents.ts`

- O `createEvent` ja passa `attendees` ao edge function `create-google-meet` (linha 282 do edge function). Actualizar para tambem enviar os `attendees_emails` e guardar no DB.
- Guardar `attendees_emails` na insercao do evento.

---

## Fase 4: Ponto de entrada - Projeto/Tarefa

### 4.1 ProjectDetailsSheet.tsx e ProjectDetailsModal.tsx

Adicionar botao "Agendar Evento" no header ou na zona de acoes do projeto:

```tsx
<Button variant="outline" size="sm" onClick={() => {
  setShowCreateEvent(true);
}}>
  <CalendarIcon className="h-4 w-4 mr-2" />
  Agendar Evento
</Button>
```

Instanciar o `CreateEventModal` com `initialProjectId={project.id}` e `initialProjectName={project.name}`.

### 4.2 TaskModal.tsx

Adicionar um botao similar "Agendar Evento" na zona de acoes da tarefa, passando `initialTaskId` e `initialProjectId`.

---

## Fase 5: Month View - Clique em slot vazio

Ficheiro: `src/pages/app/Calendario.tsx`

Actualmente no month view, clicar num dia abre o modal de detalhes do dia. Adicionar duplo-clique ou botao "+" no hover de cada celula do mes para abrir directamente o `CreateEventModal` com a data pre-preenchida (ja parcialmente implementado via o dialog de detalhes do dia que tem botao "Adicionar Evento").

Neste caso, o fluxo actual (clicar no dia -> ver lista -> botao "Adicionar Evento") ja cobre o caso de uso. Manter como esta.

---

## Fase 6: Pos-criacao - Abrir detalhes do evento

Ficheiro: `src/pages/app/Calendario.tsx`

Apos `createEvent` retornar com sucesso:

1. Fechar o `CreateEventModal`
2. Abrir automaticamente o `EventDetailsModal` com o evento criado
3. O calendario reposiciona-se para mostrar a data do evento

```typescript
const handleCreateEvent = async (eventData, options) => {
  const result = await createEvent(eventData, options);
  if (result) {
    // Abrir detalhes do evento criado
    setSelectedEvent({
      id: result.id,
      title: result.title,
      startAt: new Date(result.start_at),
      endAt: result.end_at ? new Date(result.end_at) : null,
      location: result.location,
      eventType: result.event_type,
      description: result.description,
      videoCallUrl: result.video_call_url,
      allDay: result.all_day,
    });
    setShowEventDetails(true);
    // Navegar para a data do evento
    setCurrentDate(new Date(result.start_at));
  }
  return result;
};
```

---

## Fase 7: EventDetailsModal - Exibir participantes

Ficheiro: `src/components/calendar/EventDetailsModal.tsx`

Adicionar seccao "Participantes" que mostra os `attendees_emails` do evento (se existirem), com icones de email.

---

## Resumo de Ficheiros Alterados

| Ficheiro | Tipo de Alteracao |
|---|---|
| **Migracao SQL** | Adicionar coluna `attendees_emails` |
| `src/components/calendar/CreateEventModal.tsx` | Props de contexto, campo attendees, default Meet ON, badge de projeto |
| `src/hooks/useCalendarEvents.ts` | Guardar `attendees_emails`, passar ao edge function |
| `src/pages/app/Calendario.tsx` | Auto-abrir detalhes pos-criacao, navegar para data do evento |
| `src/components/projects/ProjectDetailsSheet.tsx` | Botao "Agendar Evento" + instancia do CreateEventModal |
| `src/components/projects/ProjectDetailsModal.tsx` | Botao "Agendar Evento" + instancia do CreateEventModal |
| `src/components/tasks/TaskModal.tsx` | Botao "Agendar Evento" + instancia do CreateEventModal |
| `src/components/calendar/EventDetailsModal.tsx` | Exibir participantes |
| `src/integrations/supabase/types.ts` | Auto-gerado apos migracao |

