
# Corrigir eventos a sair fora do card

## Problema
O card "Proximos Compromissos" tem altura fixa `h-[280px]` mas nao tem overflow scroll no conteudo. Quando ha muitos eventos, eles saem fora do card.

Alem disso, a screenshot mostra que os eventos ainda aparecem com "00:00" — isto indica que a correcao anterior pode nao estar a ser aplicada correctamente (possivelmente o campo `allDay` nao esta a ser passado ou os dados nao estao actualizados).

## Alteracoes

### 1. `src/components/dashboard/UpcomingEventsCard.tsx`
- Adicionar `overflow-y-auto` ao `CardContent` ou ao container dos eventos
- Limitar a area scrollavel para caber dentro do `h-[280px]` do card
- Alterar para algo como `max-h-[200px] overflow-y-auto` no div que contem os eventos

### 2. Verificar passagem do campo `allDay`
- Confirmar que o hook que fornece os eventos esta a passar correctamente o campo `allDay` para que a logica "Dia inteiro" funcione

## Detalhe Tecnico

No `UpcomingEventsCard.tsx`, envolver a lista de eventos num container com scroll:

```typescript
<div className="space-y-2 max-h-[195px] overflow-y-auto pr-1">
  {events.map((event) => { ... })}
</div>
```

Isto garante que mesmo com 5+ eventos, o conteudo fica contido dentro do card com scroll suave.

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/dashboard/UpcomingEventsCard.tsx` | Adicionar overflow scroll ao container de eventos |
