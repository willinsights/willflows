
# Plano: Adicionar Cliente a Todos os Relatórios de Pagamentos

## Objectivo
Garantir que todos os relatórios de pagamentos (Colaboradores e Custos Extras) incluam a coluna "Cliente" para identificar para qual cliente foi executado o projecto/tarefa.

---

## Análise Actual

| Componente | Tem Cliente? | Exporta Cliente? |
|------------|--------------|------------------|
| ClientPaymentsControl | ✅ Sim | ✅ Sim |
| ProjectRevenueControl | ✅ Sim | ✅ Sim |
| FreelancerPaymentsControl | ❌ Não | ❌ Não |
| ExtraCostsPaymentsControl | ❌ Não | ❌ Não |

---

## Alterações Necessárias

### 1. FreelancerPaymentsControl

**Interface do projecto expandida:**
```typescript
interface Project {
  id: string;
  name: string;
  project_code?: string | null;
  client_id?: string | null;  // NOVO
}
```

**Adicionar prop de clients:**
```typescript
interface FreelancerPaymentsControlProps {
  // ...existentes
  clients?: { id: string; name: string }[];  // NOVO
}
```

**Adicionar função para obter nome do cliente:**
```typescript
const getClientName = (projectId: string) => {
  const project = projects.find(p => p.id === projectId);
  if (!project?.client_id || !clients) return '-';
  const client = clients.find(c => c.id === project.client_id);
  return client?.name || '-';
};
```

**Adicionar coluna à tabela e ao exportData:**
- Nova coluna "Cliente" entre "Projeto" e "Colaborador"
- Campo `cliente` no exportData

### 2. ExtraCostsPaymentsControl

**Interface expandida:**
```typescript
export interface ProjectCustoExtra {
  id: string;
  name: string;
  project_code?: string | null;
  custos_extras: number | null;
  custos_extras_payment_status: string | null;
  client_id?: string | null;  // NOVO
  clients?: { name: string } | null;  // NOVO
}
```

**Adicionar coluna à tabela e ao exportData:**
- Nova coluna "Cliente" entre "Projeto" e "Status"
- Campo `cliente` no exportData

### 3. Pagamentos.tsx

**Actualizar queries de custos extras:**
```typescript
// Incluir client_id e clients(name) na query
.select('id, name, project_code, custos_extras, custos_extras_payment_status, client_id, clients(name)')
```

**Passar clients ao FreelancerPaymentsControl:**
```tsx
<FreelancerPaymentsControl
  // ...props existentes
  clients={clientsList}  // NOVO
/>
```

### 4. PaymentExportButtons

**Adicionar coluna "Cliente" aos labels de cada tipo:**
```typescript
freelancers: {
  id: 'Código',
  projeto: 'Projeto',
  cliente: 'Cliente',  // NOVO
  contraparte: 'Colaborador',
  // ...
},
custos: {
  id: 'Código',
  projeto: 'Projeto',
  cliente: 'Cliente',  // NOVO
  status: 'Status',
  valor: 'Custo Extra',
},
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/payments/FreelancerPaymentsControl.tsx` | Adicionar coluna Cliente na tabela e export |
| `src/components/payments/ExtraCostsPaymentsControl.tsx` | Adicionar coluna Cliente na tabela e export |
| `src/components/payments/PaymentExportButtons.tsx` | Adicionar label "Cliente" aos tipos freelancers e custos |
| `src/pages/app/Pagamentos.tsx` | Actualizar queries e passar clients aos componentes |

---

## Secção Técnica

### FreelancerPaymentsControl.tsx

```typescript
// Nova interface Project
interface Project {
  id: string;
  name: string;
  project_code?: string | null;
  client_id?: string | null;
}

// Nova interface Client
interface Client {
  id: string;
  name: string;
}

// Props expandidas
interface FreelancerPaymentsControlProps {
  teamPayments: ProjectTeamPayment[];
  projects: Project[];
  members: Member[];
  clients?: Client[];  // NOVO
  onStatusChange: (teamId: string, newStatus: string) => Promise<void>;
  formatCurrency: (value: number) => string;
  workspaceName?: string;
  filterByUserId?: string | null;
}

// Nova função
const getClientName = (projectId: string) => {
  const project = projects.find(p => p.id === projectId);
  if (!project?.client_id || !clients) return '-';
  const client = clients.find(c => c.id === project.client_id);
  return client?.name || '-';
};

// Export data actualizado
const exportData = useMemo(() => {
  return filteredPayments.map(tp => ({
    id: getProjectCode(tp.project_id),
    projeto: getProjectName(tp.project_id),
    cliente: getClientName(tp.project_id),  // NOVO
    contraparte: getMemberName(tp.user_id),
    fase: tp.phase === 'captacao' ? 'Captação' : 'Edição',
    status: statusLabels[tp.payment_status] || tp.payment_status,
    valor: formatCurrency(tp.payment_amount || 0),
  }));
}, [filteredPayments, formatCurrency, projects, clients]);

// Nova coluna na tabela
<TableHead className="min-w-[120px]">Cliente</TableHead>

// Nova célula
<TableCell>{getClientName(tp.project_id)}</TableCell>
```

### ExtraCostsPaymentsControl.tsx

```typescript
// Interface expandida
export interface ProjectCustoExtra {
  id: string;
  name: string;
  project_code?: string | null;
  custos_extras: number | null;
  custos_extras_payment_status: string | null;
  client_id?: string | null;
  clients?: { name: string } | null;
}

// Export data actualizado
const exportData = useMemo(() => {
  return filteredCosts.map(cost => ({
    id: cost.project_code || cost.id.slice(0, 8).toUpperCase(),
    projeto: cost.name,
    cliente: cost.clients?.name || '-',  // NOVO
    status: statusLabels[cost.custos_extras_payment_status || 'pendente'],
    valor: formatCurrency(cost.custos_extras || 0),
  }));
}, [filteredCosts, formatCurrency]);

// Nova coluna na tabela
<TableHead className="min-w-[120px]">Cliente</TableHead>

// Nova célula
<TableCell>{cost.clients?.name || '-'}</TableCell>
```

### Pagamentos.tsx - Queries Actualizadas

```typescript
// Query de custos extras (linha ~99)
const { data: costsData } = await supabase
  .from('projects')
  .select('id, name, project_code, custos_extras, custos_extras_payment_status, client_id, clients(name)')
  .eq('workspace_id', currentWorkspace.id)
  .gt('custos_extras', 0)
  .in('custos_extras_payment_status', ['pendente', 'vencido', null]);

// Query de ALL custos extras (linha ~109)  
const { data: allCostsData } = await supabase
  .from('projects')
  .select('id, name, project_code, custos_extras, custos_extras_payment_status, client_id, clients(name)')
  .eq('workspace_id', currentWorkspace.id)
  .gt('custos_extras', 0);
```

### PaymentExportButtons.tsx - Labels

```typescript
const columnLabelsMap: Record<string, Record<string, string>> = {
  // ... clients mantém-se igual
  freelancers: {
    id: 'Código',
    projeto: 'Projeto',
    cliente: 'Cliente',  // NOVO
    contraparte: 'Colaborador',
    fase: 'Fase',
    vencimento: 'Data Vencimento',
    status: 'Status Pagamento',
    valor: 'Valor a Pagar',
    iban: 'IBAN',
    banco: 'Banco',
  },
  custos: {
    id: 'Código',
    projeto: 'Projeto',
    cliente: 'Cliente',  // NOVO
    status: 'Status',
    valor: 'Custo Extra',
  },
  // ... outros mantêm-se
};
```

---

## Resultado Esperado

Após as alterações:
- ✅ Tabela de Pagamentos Colaboradores mostra coluna "Cliente"
- ✅ Tabela de Custos Extras mostra coluna "Cliente"
- ✅ Export Excel inclui coluna "Cliente" em ambos os relatórios
- ✅ Export PDF inclui coluna "Cliente" em ambos os relatórios

---

## Resumo de Alterações

| Ficheiro | Linhas | Tipo |
|----------|--------|------|
| `src/components/payments/FreelancerPaymentsControl.tsx` | +25 linhas | Modificar |
| `src/components/payments/ExtraCostsPaymentsControl.tsx` | +10 linhas | Modificar |
| `src/components/payments/PaymentExportButtons.tsx` | +2 linhas | Modificar |
| `src/pages/app/Pagamentos.tsx` | +5 linhas | Modificar |
