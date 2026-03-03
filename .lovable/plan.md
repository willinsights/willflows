

## Problema: Data de entrega não respeita a data selecionada

### Diagnóstico

O projeto "Rio de Janeiro" tem `delivered_at = 2026-03-02` (2 de Março), **não** 28 de Fevereiro. Isto acontece porque o `ProjectDetailsModal.tsx` — o modal usado para concluir projectos — **não tem o diálogo de seleção de data**. Ele chama `deliver_project` sem o parâmetro `p_delivered_at`, usando o valor padrão `now()`.

O `DeliverConfirmDialog` (com o DatePicker) só existe em:
- ✅ `KanbanBoard.tsx` — ao arrastar para coluna "Entregue"
- ✅ `ProjectDetailsSheet.tsx` — botão "Concluir" no sheet

Mas **NÃO** existe em:
- ❌ `ProjectDetailsModal.tsx` — botão "Concluir" no modal → usa `now()` sempre

### Plano de Correção

#### 1. Adicionar `DeliverConfirmDialog` ao `ProjectDetailsModal.tsx`

- Importar `DeliverConfirmDialog`
- Adicionar state `showDeliverConfirmDialog`
- Modificar `handleDeliver` para apenas validar e abrir o diálogo (em vez de entregar directamente)
- Criar `confirmDeliveryWithDate` que recebe a data do diálogo e chama a RPC com `p_delivered_at: deliveredAt.toISOString()`

#### 2. Corrigir a data do projeto "Rio de Janeiro"

Executar UPDATE na BD para corrigir para 28 de Fevereiro:
```sql
UPDATE projects SET delivered_at = '2026-02-28T12:00:00Z' WHERE id = 'aefe182e-...';
```

### Ficheiros a modificar: 1
- `src/components/projects/ProjectDetailsModal.tsx` — adicionar diálogo de data de entrega

### Operação de dados: 1 UPDATE para corrigir a data do projecto específico

