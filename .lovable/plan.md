

# Plano: Corrigir Vazamento de Eventos Privados no Calendário

## Problema Identificado

Os eventos do Google Calendar pessoal sincronizados pelo admin (`is_private: true`) estão a aparecer para **todos** os colaboradores do workspace no calendário.

### Causa Raiz

1. **Políticas RLS Conflituantes:**
   - `"Members can view calendar events"` → `is_workspace_member(...)` (sem filtro de privacidade)
   - `"Users can view calendar events in their workspace"` → Filtra correctamente `(is_private = false) OR (created_by = auth.uid())`
   
   PostgreSQL combina políticas PERMISSIVE com OR, então a mais permissiva vence.

2. **Hook `useCalendarEvents.ts` sem filtragem frontend:**
   ```typescript
   // Linha 38-42 - Busca TODOS os eventos do workspace
   const { data, error } = await supabase
     .from('calendar_events')
     .select('*, projects(name, client_id)')
     .eq('workspace_id', currentWorkspace.id)  // Sem filtro is_private!
   ```

---

## Solução

### Parte 1: Corrigir Política RLS (Primária)

Remover a política permissiva redundante e manter apenas a que respeita privacidade.

```sql
-- Remover política permissiva
DROP POLICY IF EXISTS "Members can view calendar events" ON calendar_events;

-- A política "Users can view calendar events in their workspace" já existe e é correcta:
-- qual: ((is_private = false) OR (created_by = auth.uid()))
```

### Parte 2: Adicionar Filtragem no Frontend (Defesa em Profundidade)

Mesmo com RLS correcta, adicionar filtragem no hook `useCalendarEvents.ts` como camada extra de segurança.

```typescript
// src/hooks/useCalendarEvents.ts - linha 30-52
const fetchEvents = useCallback(async () => {
  if (!currentWorkspace?.id || fetchError) return;
  if (isFetchingRef.current) return;

  try {
    isFetchingRef.current = true;
    setLoading(true);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*, projects(name, client_id)')
      .eq('workspace_id', currentWorkspace.id)
      .order('start_at', { ascending: true });

    if (error) throw error;
    
    // Filter events based on privacy:
    // - Public events (is_private = false): visible to all
    // - Private events (is_private = true): only visible to creator
    const filteredData = (data || []).filter(event => {
      if (!event.is_private) return true;  // Public event
      return event.created_by === user?.id;  // Private: only creator sees
    });
    
    setEvents(filteredData);
    lastFetchedWorkspaceIdRef.current = currentWorkspace.id;
  } catch (error) {
    logger.error('Error fetching calendar events:', error);
  } finally {
    isFetchingRef.current = false;
    setLoading(false);
  }
}, [currentWorkspace?.id, fetchError]);
```

### Parte 3: Actualizar Realtime Handler

Também aplicar filtragem no handler de realtime:

```typescript
// Linha 81-94 - INSERT handler
if (payload.eventType === 'INSERT') {
  const { data: { user } } = await supabase.auth.getUser();
  
  supabase
    .from('calendar_events')
    .select('*, projects(name, client_id)')
    .eq('id', payload.new.id)
    .single()
    .then(({ data }) => {
      if (data) {
        // Check privacy before adding
        const canView = !data.is_private || data.created_by === user?.id;
        if (canView) {
          setEvents(prev => [...prev, data].sort((a, b) => 
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
          ));
        }
      }
    });
}
```

---

## Resumo das Alterações

| Ficheiro/Recurso | Alteração |
|------------------|-----------|
| RLS `calendar_events` | Remover política "Members can view calendar events" |
| `useCalendarEvents.ts` | Adicionar filtro `is_private` + `created_by` |
| `useCalendarEvents.ts` | Filtrar eventos no handler realtime |

---

## Regras de Visibilidade Final

| Tipo de Evento | Quem Vê |
|----------------|---------|
| Evento público (`is_private = false`) | Todos os membros do workspace |
| Evento Google pessoal (`is_private = true`) | Apenas o utilizador que sincronizou |
| Captações de projecto | Todos (via tabela `projects`) |

---

## Impacto

- Os eventos do calendário pessoal do Google sincronizados pelo admin deixarão de aparecer para colaboradores
- Eventos criados manualmente no WillFlow (reuniões, etc.) continuam visíveis para todos
- A correcção é imediata após aplicar a migração RLS

