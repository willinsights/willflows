# Plano: Data de Entrega Retroactiva para Projectos

## Estado: ✅ CONCLUÍDO

## Objectivo
Permitir que ao concluir um projecto, o utilizador possa escolher uma data de entrega diferente do dia actual. Isto é essencial para que os ganhos sejam atribuídos ao mês correcto nos relatórios financeiros.

---

## Alterações Implementadas

### 1. ✅ RPC `deliver_project` Actualizada
- Adicionado parâmetro opcional `p_delivered_at` (default: `now()`)
- A data escolhida pelo utilizador é agora guardada no campo `delivered_at`

### 2. ✅ Novo Componente: `DeliverConfirmDialog`
- Ficheiro: `src/components/kanban/DeliverConfirmDialog.tsx`
- Modal com DatePicker para seleccionar data de entrega retroactiva
- Data máxima limitada ao dia actual (não permite datas futuras)
- Texto explicativo sobre o impacto nos relatórios financeiros

### 3. ✅ Hook `useKanban` Actualizado
- Ficheiro: `src/hooks/useKanban.ts`
- Novo estado `pendingDelivery` para controlar o dialog de confirmação
- Nova função `confirmDelivery(deliveredAt: Date)` que chama a RPC com a data
- Fluxo modificado: validação → dialog de confirmação → entrega com data

### 4. ✅ KanbanBoard Integrado
- Ficheiro: `src/components/kanban/KanbanBoard.tsx`
- Renderiza o `DeliverConfirmDialog` quando necessário
- Conectado ao estado e callbacks do hook

### 5. ✅ ProjectDetailsSheet Actualizado
- Ficheiro: `src/components/projects/ProjectDetailsSheet.tsx`
- Botão "Concluir" agora abre o dialog de confirmação com datepicker
- Nova função `confirmDeliveryWithDate(deliveredAt: Date)`

---

## Fluxo de UX Implementado

1. Utilizador arrasta projecto para coluna final OU clica em "Concluir"
2. Sistema valida se todos os checklists estão completos
3. Se válido, abre modal de confirmação com:
   - Nome do projecto
   - DatePicker com data de hoje pré-seleccionada
   - Texto: "Esta data será usada para os relatórios financeiros"
4. Utilizador pode alterar a data para uma retroactiva (ex: 31 de Janeiro)
5. Ao confirmar, projecto é entregue com a data escolhida
6. Relatórios financeiros agrupam receita pela data seleccionada
