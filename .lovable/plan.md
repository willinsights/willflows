

# Plano: Data de Entrega Retroactiva para Projectos

## Objectivo
Permitir que ao concluir um projecto, o utilizador possa escolher uma data de entrega diferente do dia actual. Isto é essencial para que os ganhos sejam atribuídos ao mês correcto nos relatórios financeiros.

---

## Contexto do Problema

Actualmente, quando um projecto é entregue:
- A função `deliver_project` define `delivered_at = now()` automaticamente
- Não existe opção para escolher uma data retroactiva
- Os relatórios agrupam receitas pelo campo `delivered_at`

No teu caso, projectos concluídos hoje (2 de Fevereiro) ficariam nos ganhos de Fevereiro, quando deveriam contar para Janeiro.

---

## Solução Proposta

Adicionar um campo opcional de "Data de Entrega" no fluxo de conclusão de projectos.

---

## Alterações Necessárias

### 1. Modificar RPC `deliver_project`

Adicionar parâmetro opcional `p_delivered_at`:

```sql
CREATE OR REPLACE FUNCTION deliver_project(
  p_project_id uuid,
  p_phase text,
  p_target_column_id uuid,
  p_delivered_at timestamptz DEFAULT now()  -- NOVO
)
```

Usar o parâmetro em vez de `now()`:

```sql
SET delivered_at = COALESCE(p_delivered_at, now())
```

### 2. Actualizar Modal de Entrega no Kanban

No `useKanban.ts`, adicionar um modal de confirmação com DatePicker opcional antes de chamar a RPC.

### 3. Actualizar Modal de Detalhes do Projecto

No `ProjectDetailsModal.tsx`, adicionar DatePicker no fluxo de conclusão.

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| Nova migração SQL | Adicionar parâmetro `p_delivered_at` à RPC |
| `src/hooks/useKanban.ts` | Modal de confirmação com DatePicker |
| `src/components/projects/ProjectDetailsModal.tsx` | DatePicker no botão Concluir |
| `src/components/kanban/KanbanBoard.tsx` | Passar callback de confirmação |

---

## Secção Técnica

### Migração SQL

```sql
CREATE OR REPLACE FUNCTION public.deliver_project(
  p_project_id uuid,
  p_phase text,
  p_target_column_id uuid,
  p_delivered_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_can_deliver jsonb;
  v_item_type text;
  v_actual_delivered_at timestamptz;
BEGIN
  v_actual_delivered_at := COALESCE(p_delivered_at, now());
  
  v_can_deliver := public.can_deliver_project(p_project_id, p_phase);
  
  IF NOT (v_can_deliver->>'can_deliver')::boolean THEN
    RETURN v_can_deliver;
  END IF;
  
  SELECT COALESCE(item_type, 'projeto_completo')
  INTO v_item_type
  FROM projects
  WHERE id = p_project_id;
  
  IF p_phase = 'captacao' THEN
    UPDATE projects
    SET captacao_column_id = p_target_column_id,
        is_delivered = true,
        delivered_at = v_actual_delivered_at,
        updated_at = now()
    WHERE id = p_project_id;
  ELSE
    UPDATE projects
    SET edicao_column_id = p_target_column_id,
        is_delivered = true,
        delivered_at = v_actual_delivered_at,
        updated_at = now()
    WHERE id = p_project_id;
  END IF;
  
  RETURN jsonb_build_object(
    'can_deliver', true,
    'reason', null,
    'pending_tasks', 0,
    'pending_checklists', 0
  );
END;
$$;
```

### Novo Componente: DeliverConfirmDialog

```tsx
interface DeliverConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  onConfirm: (deliveredAt: Date) => void;
}

export function DeliverConfirmDialog({
  open,
  onOpenChange,
  projectName,
  onConfirm,
}: DeliverConfirmDialogProps) {
  const [deliveredAt, setDeliveredAt] = useState<Date>(new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir Projecto</DialogTitle>
          <DialogDescription>
            Confirmar entrega de "{projectName}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Data de Entrega</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(deliveredAt, "dd/MM/yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={deliveredAt}
                  onSelect={(date) => date && setDeliveredAt(date)}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground mt-1">
              Esta data será usada para os relatórios financeiros
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(deliveredAt)}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirmar Entrega
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Chamada RPC Actualizada

```typescript
// useKanban.ts - ao entregar projecto
const { data, error } = await supabase.rpc('deliver_project', {
  p_project_id: projectId,
  p_phase: phase,
  p_target_column_id: targetColumnId,
  p_delivered_at: deliveredAt.toISOString(), // Nova propriedade
});
```

---

## Fluxo de UX

1. Utilizador arrasta projecto para coluna final OU clica em "Concluir"
2. Abre modal de confirmação com:
   - Nome do projecto
   - DatePicker com data de hoje pré-seleccionada
   - Texto explicativo sobre relatórios
3. Utilizador pode alterar a data para uma retroactiva
4. Ao confirmar, projecto é entregue com a data escolhida

---

## Resumo de Alterações

| Ficheiro | Linhas | Tipo |
|----------|--------|------|
| Nova migração SQL | ~40 | Novo |
| `src/components/kanban/DeliverConfirmDialog.tsx` | ~100 | Novo |
| `src/hooks/useKanban.ts` | +30 linhas | Modificar |
| `src/components/projects/ProjectDetailsModal.tsx` | +20 linhas | Modificar |

