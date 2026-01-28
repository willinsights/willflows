
# Plano: Incluir "Receita de Clientes (Preço Projeto)" no Export da Previsão

## Problema Identificado

O export no tab "Previsão" da página de Pagamentos **não inclui os dados de Receita de Clientes (Preço Projeto)**. 

### Análise Técnica

A UI mostra dois tipos de dados na Previsão mensal:
1. **Receita de Clientes (Preço Projeto)** - dados de `monthProjectRevenue` (projetos com `agreed_value`)
2. **Outros Movimentos** - dados de `monthPayments` (tabela payments)

Contudo, o `previsaoExportData` (linhas 282-292) apenas mapeia `monthPayments`:

```text
previsaoExportData = monthPayments.map(...)  // ← Falta monthProjectRevenue!
```

Resultado: ao exportar CSV/PDF na Previsão, os projetos com "Preço Cliente" são ignorados.

---

## Solução Proposta

Combinar `monthProjectRevenue` + `monthPayments` num único array de export, distinguindo-os pelo campo `tipo`:

### Alteração no ficheiro `src/pages/app/Pagamentos.tsx`

Modificar o `previsaoExportData` (linhas 282-292) para incluir ambas as fontes de dados:

```text
const previsaoExportData = useMemo(() => {
  // 1. Project Revenue (Receita de Clientes)
  const revenueData = monthProjectRevenue.map(project => ({
    id: project.project_code || project.id.slice(0, 8).toUpperCase(),
    projeto: project.name,
    contraparte: project.clients?.name || 'Cliente',
    tipo: 'Receita Cliente',
    vencimento: project.client_payment_due_date 
      ? format(new Date(project.client_payment_due_date), 'dd/MM/yyyy', { locale: pt })
      : project.delivery_date
        ? format(new Date(project.delivery_date), 'dd/MM/yyyy', { locale: pt })
        : '-',
    status: statusLabels[project.client_payment_status || 'pendente'],
    valor: `+${formatCurrency(project.agreed_value || 0)}`,
  }));

  // 2. Other Payments
  const paymentsData = monthPayments.map(payment => ({
    id: payment.id.slice(0, 8).toUpperCase(),
    projeto: payment.description || payment.projects?.name || 'Pagamento',
    contraparte: payment.clients?.name || payment.freelancer_name || 'N/A',
    tipo: payment.is_receivable ? 'Outro Recebimento' : 'Pagamento',
    vencimento: payment.due_date 
      ? format(new Date(payment.due_date), 'dd/MM/yyyy', { locale: pt })
      : '-',
    status: statusLabels[payment.status] || payment.status,
    valor: `${payment.is_receivable ? '+' : '-'}${formatCurrency(payment.amount)}`,
  }));

  // Combinar ambos os arrays
  return [...revenueData, ...paymentsData];
}, [monthProjectRevenue, monthPayments, formatCurrency]);
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Export só mostra "Outros Movimentos" | Export inclui todos os dados visíveis na UI |
| "Receita de Clientes" não aparecia | Projetos com Preço Cliente são listados |
| Resumo do mês incompleto | Export alinhado com os totais apresentados |

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/app/Pagamentos.tsx` | Atualizar `previsaoExportData` para combinar `monthProjectRevenue` + `monthPayments` |

---

## Detalhes de Implementação

1. **Campo `tipo` adicionado**: Permite distinguir entre "Receita Cliente", "Outro Recebimento" e "Pagamento" no export
2. **Campo `id` incluído**: Código do projeto ou ID parcial para referência
3. **Ordem dos dados**: Receitas de projetos primeiro, depois outros movimentos
4. **Formatação consistente**: Valores positivos com `+`, negativos com `-`
5. **Dependências atualizadas**: `useMemo` agora também observa `monthProjectRevenue`

Esta alteração garante que o export PDF/Excel da Previsão reflete exatamente o que o utilizador vê na interface.
