
# Plano: Ativar Reordenação de Colunas no Kanban

## Resumo
Adicionar a funcionalidade de arrastar e soltar (drag-and-drop) para reordenar colunas no Kanban, mantendo a coluna final "Entregue" sempre fixa na última posição.

## O Que Já Existe
A função `reorderColumns` já está implementada no `useKanban` e inclui:
- Validação para impedir mover a coluna final
- Validação para impedir mover colunas para depois da coluna final
- Atualização otimista da UI
- Persistência das novas posições na base de dados

## Alterações Necessárias

### 1. KanbanBoard.tsx
- Adicionar contexto de drag-and-drop para colunas (separado do de projetos)
- Usar `@dnd-kit/sortable` para tornar as colunas arrastáveis
- Distinguir entre arrastar projetos e arrastar colunas
- Chamar `reorderColumns` quando uma coluna é movida

### 2. KanbanColumn.tsx
- Tornar a coluna arrastável usando `useSortable`
- Adicionar handle de arrasto no cabeçalho da coluna
- Desativar arrasto para colunas finais (`is_final`)
- Adicionar feedback visual durante o arrasto

## Detalhes Técnicos

### Estratégia de Implementação
```text
+------------------+     +------------------+     +------------------+
|   Coluna A       |     |   Coluna B       |     |   Entregue      |
|   (arrastável)   | <-> |   (arrastável)   |     |   (FIXA)        |
+------------------+     +------------------+     +------------------+
```

### Modificações no KanbanBoard.tsx
1. Importar `horizontalListSortingStrategy` e `SortableContext`
2. Envolver as colunas num `SortableContext` horizontal
3. Criar handler `handleColumnDragEnd` que:
   - Identifica se o item arrastado é coluna ou projeto
   - Chama `reorderColumns(sourceIndex, destIndex)` para colunas
4. Adicionar `DragOverlay` para colunas

### Modificações no KanbanColumn.tsx
1. Usar `useSortable` em vez de apenas `useDroppable`
2. Adicionar prop `isDraggable` baseada em `!column.is_final`
3. Aplicar transforms do sortable ao container
4. Adicionar ícone de arrasto (GripVertical) no cabeçalho
5. Cursor `grab/grabbing` para feedback visual

### Distinção entre Projetos e Colunas
- IDs de colunas: prefixados com `column-` ou verificados contra lista de column IDs
- IDs de projetos: UUIDs existentes
- No `handleDragEnd`, verificar se `active.id` corresponde a coluna ou projeto

## Resultado Esperado
- Colunas podem ser arrastadas horizontalmente
- Coluna "Entregue" permanece sempre na última posição
- Arrastar uma coluna para depois de "Entregue" é bloqueado com toast
- Projetos continuam a ser arrastados entre colunas normalmente
- Feedback visual durante o arrasto de colunas
