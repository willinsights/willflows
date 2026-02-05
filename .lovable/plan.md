
# Corrigir Google Meet: "The specified time range is empty"

## Problema Encontrado

Ao criar um evento com Meet, os logs mostram este erro do Google Calendar API:

```
"The specified time range is empty."
```

Isto significa que a data/hora de fim e igual ou anterior a data de inicio. O Google rejeita o pedido e o Meet nao e criado.

## Causa

1. **Frontend**: O `CreateEventModal` permite seleccionar uma hora de fim igual ou anterior a hora de inicio (ex: inicio 09:00, fim 09:00). Nao ha validacao.
2. **Backend**: O edge function `create-google-meet` nao valida se `endDate > startDate` antes de chamar o Google API. Se receber timestamps invalidos, passa-os directamente.

## Correcoes

### 1. `src/components/calendar/CreateEventModal.tsx`
- Adicionar validacao no `handleSubmit`: se `endTime <= startTime` (e nao for dia inteiro), ajustar automaticamente o `endTime` para startTime + 1 hora
- Alternativa visual: ao mudar o `startTime`, ajustar automaticamente o `endTime` para 1h depois se ficar invalido

### 2. `supabase/functions/create-google-meet/index.ts`
- Adicionar validacao de seguranca: se `endDate <= startDate`, forcar `endDate = startDate + 1 hora`
- Isto protege contra qualquer caso edge que passe pelo frontend

### 3. `src/hooks/useCalendarEvents.ts`
- Antes de chamar o edge function, validar e corrigir os timestamps se necessario

## Detalhes Tecnicos

**CreateEventModal.tsx** - No `handleSubmit`, antes de submeter:
```
if (!allDay && endTime <= startTime) {
  // Auto-corrigir: end = start + 1h
}
```

**create-google-meet/index.ts** - Linha ~238:
```
// Garantir que endDate > startDate
if (endDate.getTime() <= startDate.getTime()) {
  endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
}
```

**useCalendarEvents.ts** - Antes da chamada fetch (~linha 189):
```
// Corrigir end_at se invalido
const endAt = validation.data.end_at && new Date(validation.data.end_at) > new Date(validation.data.start_at)
  ? validation.data.end_at
  : new Date(new Date(validation.data.start_at).getTime() + 3600000).toISOString();
```

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/calendar/CreateEventModal.tsx` | Validacao de hora fim > hora inicio |
| `supabase/functions/create-google-meet/index.ts` | Validacao de seguranca no backend |
| `src/hooks/useCalendarEvents.ts` | Corrigir timestamps antes de chamar edge function |

## Resultado

- O Google Meet e sempre criado com sucesso quando o utilizador activa a opcao
- Timestamps invalidos sao corrigidos automaticamente em 3 niveis (UI, hook, edge function)
