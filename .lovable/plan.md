
## Campo de Competencia Mensal + Ajustes Financeiros

### Resumo

Adicionar um campo `competence_month` (formato `YYYY-MM`) na tabela `projects` para permitir o fecho mensal por competencia, independentemente da data real de entrega (`delivered_at`). Todos os filtros financeiros, dashboards, relatorios e exportacoes passam a usar este campo como referencia principal para agrupamento mensal.

---

### 1. Migracao de Base de Dados

Adicionar coluna `competence_month` (tipo `text`, nullable) a tabela `projects`:

```sql
ALTER TABLE projects ADD COLUMN competence_month text;
```

- Formato esperado: `YYYY-MM` (ex: `2026-01`)
- Quando `NULL`, o sistema usa o mes de `delivered_at` como fallback
- Sem restricoes de formato na BD (validacao feita no frontend)

Atualizar os 3 projetos de competencia Janeiro que foram entregues em 02/02:

```sql
UPDATE projects SET competence_month = '2026-01'
WHERE project_code IN ('PT-LIS-2026-EXP-004-COPY', 'PT-LIS-2026-EXP-004', 'PT-PDO-2026-EXP-001');
```

---

### 2. Funcao Helper: Obter Mes Efetivo

Criar uma funcao reutilizavel que retorna o mes efetivo de um projeto:

```typescript
function getEffectiveMonth(project): Date | null {
  if (project.competence_month) {
    return parseISO(project.competence_month + '-01');
  }
  if (project.delivered_at) {
    return startOfMonth(parseISO(project.delivered_at));
  }
  return null;
}
```

Esta funcao sera usada em **todos** os locais que atualmente filtram por `delivered_at` para agrupamento mensal.

---

### 3. Ficheiros a Alterar

#### 3.1 `src/lib/finance/types.ts`
- Adicionar `competence_month: string | null` ao tipo `FinancialProject`

#### 3.2 `src/lib/finance/financialEngine.ts`
- Alterar `getRealizadoMetrics`: usar `competence_month` (com fallback para `delivered_at`) em vez de apenas `delivered_at`
- Alterar `getMonthlySummary`: idem para contagem de "entregues" por mes

#### 3.3 `src/hooks/useFinancialEngine.ts`
- Adicionar `competence_month` a query de selecao de projetos

#### 3.4 `src/hooks/useDashboardMetrics.ts`
- Em todos os filtros por mes (entregues, receita, custos, lucro, monthlyData), substituir `delivered_at` por logica de mes efetivo (`competence_month || delivered_at`)
- Adicionar `competence_month` ao `.select()`

#### 3.5 `src/pages/app/Finalizados.tsx`
- Adicionar coluna "Competencia" na tabela (dropdown editavel com mes/ano)
- Nos exports Excel e PDF, incluir coluna "Competencia"
- Filtro por data passa a considerar `competence_month` quando definido

#### 3.6 `src/pages/app/Relatorios.tsx`
- `monthlyData` useMemo: usar mes efetivo em vez de `delivered_at` para agrupar projetos por mes
- Exports: incluir coluna de competencia

#### 3.7 `src/pages/app/Pagamentos.tsx`
- Filtros de data para receita/custos: usar mes efetivo

#### 3.8 `src/components/payments/FreelancerPaymentsControl.tsx`
- Filtro de data: usar mes efetivo quando disponivel

---

### 4. UI para Editar Competencia

Na pagina **Finalizados**, cada linha tera um campo editavel de competencia:

- Apresentado como badge clicavel (ex: "jan 2026")
- Ao clicar, abre um pequeno popover/select com meses disponiveis (ultimos 12 meses)
- Ao alterar, faz `UPDATE projects SET competence_month = 'YYYY-MM' WHERE id = ?`
- Se o utilizador limpar, volta a `NULL` (usa `delivered_at` como default)
- A tabela mostra ambas as colunas: "Data de Entrega" (real) e "Competencia" (editavel)

---

### 5. Diarias de Estudio

Para o item "4 Diarias Edicao Estudio Janeiro" (800 EUR, custo 0, lucro 800):

- Este item ja existe como projeto na base de dados
- Basta garantir que tem `competence_month = '2026-01'` e esta marcado como entregue
- Se nao estiver, sera atualizado na migracao de dados

Verificar se este projeto precisa de ajuste:

```sql
UPDATE projects SET competence_month = '2026-01'
WHERE name LIKE '%Diarias%Estudio%Janeiro%';
```

---

### 6. Logica de Fallback (Regra de Ouro)

Em todo o sistema, a regra sera:

```
mesEfetivo = competence_month ? parse(competence_month) : mesOf(delivered_at)
```

Isto garante retrocompatibilidade total: projetos sem `competence_month` continuam a funcionar exatamente como antes.

---

### 7. Validacao de Aceitacao

Apos implementacao, Janeiro 2026 devera incluir:
- Os 59+ projetos ja entregues em Janeiro
- Os 3 projetos reclassificados (PT-LIS-2026-EXP-004-COPY, PT-LIS-2026-EXP-004, PT-PDO-2026-EXP-001)
- As diarias de estudio (se aplicavel)
- Lucro total de Janeiro: **4.408,00 EUR**

---

### Detalhes Tecnicos

**Total de ficheiros a modificar:** 8 ficheiros + 1 migracao SQL

**Impacto:** Baixo risco - campo opcional com fallback, sem alteracao de dados existentes. Apenas 3-4 projetos terao o campo preenchido inicialmente.

**Ordem de implementacao:**
1. Migracao BD (adicionar coluna)
2. Atualizar tipos TypeScript
3. Atualizar financialEngine.ts (logica central)
4. Atualizar hooks (useFinancialEngine, useDashboardMetrics)
5. Atualizar paginas (Finalizados com UI editavel, Relatorios, Pagamentos)
6. Atualizar dados dos 3 projetos + diarias
7. Testar que Janeiro = 4.408 EUR de lucro
