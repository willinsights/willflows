
# Plano: Ocultar Entregas de Projetos Já Concluídos no Calendário

## Problema Identificado

O calendário está a mostrar a **data de entrega prevista** (`delivery_date`) de um projeto que já foi entregue há vários dias. O problema é que:

1. **O campo `delivery_date`** representa a data **planeada/prevista** para entrega
2. **O campo `is_delivered`** marca se o projeto foi realmente entregue
3. **O calendário não verifica** se o projeto já foi entregue antes de mostrar a data de entrega

Resultado: Um projeto entregue há dias continua a aparecer no calendário como se a entrega fosse hoje.

---

## Solução

Filtrar projectos entregues das exibições de "Entrega" no calendário, mantendo apenas:
- Captações de projetos não entregues
- Entregas de projetos **ainda não entregues**

---

## Alterações Necessárias

### 1. Modificar `src/pages/app/Calendario.tsx`

Na construção dos `calendarItems` (linhas 98-164), adicionar verificação de `is_delivered` antes de incluir itens de entrega:

```text
┌─────────────────────────────────────────────────────────┐
│  ANTES (linha 120-131)                                  │
├─────────────────────────────────────────────────────────┤
│  if (project.delivery_date) {                           │
│    items.push({                                         │
│      id: `delivery-${project.id}`,                      │
│      ...                                                │
│    });                                                  │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│  DEPOIS                                                 │
├─────────────────────────────────────────────────────────┤
│  // Só mostrar entrega se o projeto NÃO foi entregue   │
│  if (project.delivery_date && !project.is_delivered) { │
│    items.push({                                         │
│      id: `delivery-${project.id}`,                      │
│      ...                                                │
│    });                                                  │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

### 2. (Opcional) Aplicar mesma lógica às Captações

Dependendo do comportamento desejado, captações de projetos entregues também podem ser ocultadas:

```typescript
// Opção A: Manter captações mesmo após entrega (histórico)
if (project.shoot_date) { ... }

// Opção B: Ocultar captações de projetos entregues
if (project.shoot_date && !project.is_delivered) { ... }
```

**Recomendação**: Manter captações visíveis como histórico, ocultar apenas entregas pendentes.

---

## Impacto

| Área | Mudança |
|------|---------|
| Calendário Mensal | Entregas de projetos entregues deixam de aparecer |
| Calendário Semanal | Idem |
| Calendário Diário | Idem |
| Google Calendar Sync | Sem alteração necessária (já filtra `is_delivered = false`) |

---

## Detalhes Técnicos

### Ficheiro a Modificar
- `src/pages/app/Calendario.tsx` (linha ~120)

### Lógica
```typescript
// Linha 120-131: Adicionar verificação is_delivered
if (project.delivery_date && !project.is_delivered) {
  items.push({
    id: `delivery-${project.id}`,
    projectId: project.id,
    title: project.name,
    date: parseISO(project.delivery_date),
    type: 'delivery',
    projectType: project.type,
    clientName: project.clients?.name,
    isGoogleImport: false,
  });
}
```

### Teste Esperado
1. Projetos entregues não mostram "Entrega" no calendário
2. Projectos com `is_delivered = true` e `delivery_date` no passado são ignorados
3. Projectos ainda não entregues continuam a mostrar a data de entrega prevista
