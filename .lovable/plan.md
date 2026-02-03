

# Plano: Eventos Pessoais do Google Só Visíveis ao Próprio Utilizador

## Problema Identificado

Quando um utilizador sincroniza o seu Google Calendar, os eventos pessoais importados ficam visíveis para **todos os membros do workspace**, em vez de apenas para o utilizador que fez a sincronização.

### Análise Técnica

A tabela `calendar_events` já tem a infraestrutura correcta:

| Elemento | Estado |
|----------|--------|
| Coluna `is_private` | Existe (default: `false`) |
| Coluna `created_by` | Existe (regista quem criou) |
| Política RLS | Existe: `(is_private = false) OR (created_by = auth.uid())` |

O problema está na edge function `google-calendar-sync`:

```typescript
// Linha 553-564 - O is_private NÃO é definido!
const eventData = {
  workspace_id: workspaceId,
  title: gEvent.summary || 'Evento do Google',
  description: gEvent.description || null,
  start_at: startAt,
  end_at: endAt,
  all_day: isAllDay,
  location: gEvent.location || null,
  event_type: 'event',
  google_event_id: gEvent.id,
  created_by: userId,
  // FALTA: is_private: true
};
```

## Solução

Adicionar `is_private: true` ao objecto `eventData` na importação de eventos do Google Calendar.

### Ficheiro a Modificar

**`supabase/functions/google-calendar-sync/index.ts`** - Linha 553-564

```typescript
const eventData = {
  workspace_id: workspaceId,
  title: gEvent.summary || 'Evento do Google',
  description: gEvent.description || null,
  start_at: startAt,
  end_at: endAt,
  all_day: isAllDay,
  location: gEvent.location || null,
  event_type: 'event',
  google_event_id: gEvent.id,
  created_by: userId,
  is_private: true,  // ← ADICIONAR ESTA LINHA
};
```

### Corrigir Eventos Já Importados

Para corrigir eventos já importados no passado, será necessário executar uma query de migração:

```sql
UPDATE calendar_events
SET is_private = true
WHERE google_event_id IS NOT NULL
  AND is_private = false;
```

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| User A importa evento pessoal do Google | ❌ Visível para todos no workspace | ✅ Só visível para User A |
| User B tenta ver eventos de User A | ❌ Vê todos os eventos | ✅ Não vê eventos privados |
| User A vê os seus eventos | ✅ Vê os seus eventos | ✅ Vê os seus eventos |
| Eventos de projecto (WillFlow) | ✅ Visíveis para a equipa | ✅ Visíveis para a equipa |

## Secção Técnica

### Lógica da Política RLS

A política existente já funciona correctamente:

```sql
-- Política: Users can view calendar events in their workspace
(workspace_id IN (
  SELECT workspace_id FROM workspace_members
  WHERE user_id = auth.uid() AND is_active = true
))
AND (is_private = false OR created_by = auth.uid())
```

Esta política garante que:
- Se `is_private = false` → Todos os membros do workspace podem ver
- Se `is_private = true` → Só o `created_by` pode ver

### Alteração Completa

```typescript
// supabase/functions/google-calendar-sync/index.ts
// Linha 553-564

// ANTES:
const eventData = {
  workspace_id: workspaceId,
  title: gEvent.summary || 'Evento do Google',
  description: gEvent.description || null,
  start_at: startAt,
  end_at: endAt,
  all_day: isAllDay,
  location: gEvent.location || null,
  event_type: 'event',
  google_event_id: gEvent.id,
  created_by: userId,
};

// DEPOIS:
const eventData = {
  workspace_id: workspaceId,
  title: gEvent.summary || 'Evento do Google',
  description: gEvent.description || null,
  start_at: startAt,
  end_at: endAt,
  all_day: isAllDay,
  location: gEvent.location || null,
  event_type: 'event',
  google_event_id: gEvent.id,
  created_by: userId,
  is_private: true,
};
```

### Migração para Eventos Existentes

Após a alteração do código, será executada uma migração para corrigir eventos já importados:

```sql
-- Marcar todos os eventos importados do Google como privados
UPDATE calendar_events
SET is_private = true
WHERE google_event_id IS NOT NULL
  AND is_private = false;
```

