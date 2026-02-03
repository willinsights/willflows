
# Plano: Previsão de Ganhos para Colaboradores no Dashboard

## Objectivo

Adicionar ao Dashboard dos colaboradores (Editor, Captação, Freelancer) uma secção de **"Previsão de Ganhos"** com navegação por mês, semelhante à "Previsão Financeira" dos administradores. Os valores apresentados serão apenas os pagamentos atribuídos ao colaborador nos projectos.

---

## O Que Vai Ser Apresentado

| Card | Descrição |
|------|-----------|
| **A Receber** | Soma de `payment_amount` pendentes do mês |
| **Já Recebido** | Soma de `payment_amount` com status "pago" do mês |
| **Total Previsto** | Total de pagamentos do mês (pendentes + pagos) |

O mês do projecto é determinado pela `delivery_date`, com fallback para `shoot_date`.

---

## Ficheiros a Criar

### 1. `src/hooks/useCollaboratorForecast.ts`

Hook que calcula a previsão financeira filtrada para o colaborador actual:

```text
useCollaboratorForecast(selectedMonth: Date)
  ├── Buscar project_team onde user_id = utilizador actual
  ├── Incluir dados do projecto (delivery_date, shoot_date, is_delivered)
  ├── Agrupar por mês (lógica anchor date igual ao admin)
  ├── Incluir rollover (projectos atrasados não entregues)
  └── Retornar: pendingAmount, paidAmount, totalAmount, projectCount
```

### 2. `src/components/dashboard/CollaboratorForecastCards.tsx`

Componente visual com:
- Header "Meus Ganhos Previstos"
- MonthPicker (reutilizar o existente)
- 3 cards: A Receber, Recebido, Total

---

## Ficheiros a Modificar

### 3. `src/pages/app/Dashboard.tsx`

Adicionar a secção de previsão para colaboradores:

```text
// Onde actualmente está:
{!isCollaborator && canViewAllFinancials && (
  <FinancialForecastCards />
)}

// Adicionar abaixo:
{isCollaborator && canViewOwnFinancials && (
  <CollaboratorForecastCards />
)}
```

### 4. `src/components/mobile/MobileCollaboratorForecast.tsx` (novo)

Versão mobile da previsão para colaboradores, semelhante ao `MobileFinancialSummary` mas com dados do colaborador.

### 5. `src/pages/app/Dashboard.tsx` (mobile)

Adicionar versão mobile para colaboradores na secção condicional.

---

## Secção Técnica

### Hook: useCollaboratorForecast

```typescript
export function useCollaboratorForecast(selectedMonth: Date) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  
  useEffect(() => {
    // Buscar pagamentos do project_team para o utilizador actual
    const { data: teamPayments } = await supabase
      .from('project_team')
      .select(`
        id, payment_amount, payment_status, phase,
        projects!inner(delivery_date, shoot_date, is_delivered, workspace_id)
      `)
      .eq('user_id', user.id)
      .eq('projects.workspace_id', currentWorkspace.id);
    
    // Filtrar por mês (anchor date = delivery_date || shoot_date)
    // Incluir rollover de meses anteriores (is_delivered = false)
    // Calcular totais por status
  }, [selectedMonth, user?.id, currentWorkspace?.id]);
}
```

### Componente Visual

```typescript
export function CollaboratorForecastCards() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const { pendingAmount, paidAmount, totalAmount, projectCount, loading } = 
    useCollaboratorForecast(selectedMonth);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3>Meus Ganhos Previstos</h3>
        <MonthPicker selectedMonth={selectedMonth} ... />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {/* Card A Receber */}
        {/* Card Recebido */}
        {/* Card Total */}
      </div>
    </div>
  );
}
```

---

## Lógica de Agrupamento por Mês

Para cada pagamento do colaborador:

1. **Anchor Date**: `project.delivery_date` || `project.shoot_date`
2. **Inclusão no mês**:
   - Se anchor date está no mês seleccionado → incluir
   - Se anchor date é anterior E `is_delivered = false` → rollover (incluir)
3. **Cálculo**:
   - `pendingAmount`: suma onde `payment_status != 'pago'`
   - `paidAmount`: suma onde `payment_status = 'pago'`
   - `totalAmount`: soma total

---

## Integração com Privacy Mode

Todos os valores respeitam o `useHideValues` hook:

```typescript
<span className={cn("font-bold", hideValues && "blur-md select-none")}>
  {formatCurrency(value)}
</span>
```

---

## Estimativa de Alterações

| Ficheiro | Tipo | Complexidade |
|----------|------|--------------|
| `useCollaboratorForecast.ts` | Novo | Média |
| `CollaboratorForecastCards.tsx` | Novo | Média |
| `MobileCollaboratorForecast.tsx` | Novo | Baixa |
| `Dashboard.tsx` | Modificar | Baixa |

---

## Resultado Final

**Antes (Colaborador):**
- Vê apenas "Meus Ganhos (mês)" com valor actual

**Depois (Colaborador):**
- Vê "Meus Ganhos Previstos" com navegação por mês
- Cards: A Receber, Já Recebido, Total Previsto
- Rollover de projectos atrasados
- Privacy mode funcional
