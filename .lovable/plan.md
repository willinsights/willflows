
## Corrigir filtro de datas nos relatorios de pagamentos

### Problemas encontrados

1. **FreelancerPaymentsControl**: O filtro de datas e completamente ignorado -- so filtra por membro e status, nunca por `dateFrom`/`dateTo`
2. **ExtraCostsPaymentsControl**: O filtro de datas tambem e ignorado -- so filtra por status
3. **ClientPaymentsControl**: O filtro `dateTo` nao inclui o dia inteiro -- um pagamento com vencimento no dia seleccionado pode ser excluido porque `new Date('2026-02-09') > new Date('2026-02-09')` e `false` mas horas podem causar exclusao
4. **ProjectRevenueControl**: Mesmo problema do `dateTo` que o ClientPaymentsControl

### Solucao

**1. FreelancerPaymentsControl (src/components/payments/FreelancerPaymentsControl.tsx)**
- Adicionar filtro de datas no `filteredPayments` usando a `delivery_date` do projecto associado (via lookup na lista de `projects`)
- Expandir a interface `Project` para incluir `delivery_date`
- Logica: comparar `dateFrom`/`dateTo` com a `delivery_date` do projecto

**2. ExtraCostsPaymentsControl (src/components/payments/ExtraCostsPaymentsControl.tsx)**
- Adicionar campo `delivery_date` a interface `ProjectCustoExtra`
- Adicionar filtro de datas no `filteredCosts` usando `delivery_date`
- Activar `showDateFilter={true}` no componente PaymentFilters

**3. ClientPaymentsControl (src/components/payments/ClientPaymentsControl.tsx)**
- Corrigir comparacao `dateTo`: definir hora para 23:59:59 para incluir o dia completo

**4. ProjectRevenueControl (src/components/payments/ProjectRevenueControl.tsx)**
- Mesma correccao do `dateTo` para incluir o dia completo

### Detalhe tecnico

```text
Correccao dateTo (ClientPayments e ProjectRevenue):
  const endOfDay = new Date(filters.dateTo);
  endOfDay.setHours(23, 59, 59, 999);
  if (new Date(dateValue) > endOfDay) return false;

FreelancerPaymentsControl - adicionar ao filteredPayments:
  if (filters.dateFrom || filters.dateTo) {
    const project = projects.find(p => p.id === tp.project_id);
    const dateValue = project?.delivery_date;
    if (dateValue) {
      if (filters.dateFrom && new Date(dateValue) < filters.dateFrom) return false;
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (new Date(dateValue) > endOfDay) return false;
      }
    }
  }

ExtraCostsPaymentsControl - adicionar ao filteredCosts:
  if (filters.dateFrom || filters.dateTo) {
    const dateValue = cost.delivery_date;
    if (dateValue) {
      if (filters.dateFrom && new Date(dateValue) < filters.dateFrom) return false;
      if (filters.dateTo) { ... mesmo padrao ... }
    }
  }
  + showDateFilter={true} no PaymentFilters
```

### Ficheiros a alterar
- `src/components/payments/FreelancerPaymentsControl.tsx`
- `src/components/payments/ExtraCostsPaymentsControl.tsx`
- `src/components/payments/ClientPaymentsControl.tsx`
- `src/components/payments/ProjectRevenueControl.tsx`
