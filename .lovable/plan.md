
# Corrigir UI dos Proximos Compromissos

## Problema
Os eventos mostram "Hoje - 00:00" quando nao tem hora especifica. A hora "00:00" nao e informativa e polui a interface.

## Alteracoes

### 1. `src/components/dashboard/UpcomingEventsCard.tsx` (linhas 142-154)
- Adicionar logica para verificar se o evento e `allDay` ou tem hora `00:00`
- Se sim, mostrar badge "Dia inteiro" em vez de "- 00:00"
- Se nao, mostrar a hora normalmente

### 2. `src/components/mobile/MobileUpcomingEvents.tsx` (linhas 155-170)
- Mesma logica aplicada ao componente mobile

## Detalhe Tecnico

Substituir o bloco de hora em ambos os ficheiros:

**Antes:**
```typescript
<span>•</span>
<span>{format(event.startAt, 'HH:mm')}</span>
```

**Depois:**
```typescript
{(() => {
  const time = format(event.startAt, 'HH:mm');
  const isAllDay = event.allDay || time === '00:00';
  return isAllDay ? (
    <span className="text-muted-foreground">Dia inteiro</span>
  ) : (
    <>
      <span>•</span>
      <span>{time}</span>
    </>
  );
})()}
```

Isto remove o separador "." quando e dia inteiro, mostrando apenas "Hoje Dia inteiro" em vez de "Hoje - 00:00".

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/dashboard/UpcomingEventsCard.tsx` | Tratar hora 00:00 como "Dia inteiro" |
| `src/components/mobile/MobileUpcomingEvents.tsx` | Mesma logica no mobile |
