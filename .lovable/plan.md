## Bug: `ownerProfit` do fecho mensal ignora `custo_captacao` e `custo_edicao`

O `useMonthlyClosing` só soma `project_team` + `custos_extras`, ficando desalinhado com o `financialEngine` (`getProjectCost` = captacao + edicao + extras + cost_lines).

## Alterações

**Ficheiro único: `src/hooks/useMonthlyClosing.ts`**

1. Dentro do `useMemo`, após montar `editorRows`/`extraRows`, calcular:
   ```ts
   const captacaoCosts = deliveredThisMonth.reduce((s, p) => s + (p.custo_captacao || 0), 0);
   const edicaoCosts   = deliveredThisMonth.reduce((s, p) => s + (p.custo_edicao   || 0), 0);
   ```
2. Ajustar `totalCosts` para incluir ambos, mantendo o resto igual:
   ```ts
   const totalCosts =
     editorRows.reduce((s, r) => s + r.amount, 0) +
     extraRows.reduce((s, r) => s + r.amount, 0) +
     captacaoCosts + edicaoCosts;
   ```
   `ownerProfit = revenue - totalCosts` fica automaticamente correcto.
3. Estender a interface `MonthlyClosing` com dois campos opcionais para uso futuro:
   ```ts
   captacaoCosts: number;
   edicaoCosts: number;
   ```
   E devolvê-los no objecto final. Nenhum consumidor actual precisa de mudar (o `ClosingSummaryCards` continua a usar apenas `revenue/editorPayable/ownerProfit/alreadyPaid`).

## Fora do âmbito

- Não altero `ClosingSummaryCards` — só exponho os campos; UI adicional fica para pedido futuro.
- `useProjects` já faz `select('*, clients(name)')` na `projects`, portanto `custo_captacao`/`custo_edicao` já estão disponíveis; sem alterações à query.
- Não incluo `cost_lines_total` aqui porque não é carregado por `useProjects` (vive no `useFinancialEngine`); manter fora evita alargar o âmbito da correcção. Posso adicionar num passo seguinte se quiseres alinhamento 1:1 com o engine.

## Verificação

- `tsgo` para tipos.
- Confirmar visualmente no `/app/financeiro/fecho` que o "Lucro do dono" desce nos meses com captação/edição pagos por equipa interna.
