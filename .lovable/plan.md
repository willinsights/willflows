
# Ordenar Cards do Kanban por Data de Entrega

## Resumo

Alterar a logica de ordenacao dos cards nas colunas do Kanban (Captacao e Edicao) para que **todos** os projetos sejam ordenados por `delivery_date` (mais proximos no topo), mantendo projetos urgentes com prioridade.

## Alteracao

**Ficheiro**: `src/hooks/useKanban.ts` (linhas 306-323)

A logica de sort atual:
1. Urgentes primeiro
2. Entre urgentes: por `delivery_date`
3. Nao-urgentes: por `created_at`

Nova logica:
1. Urgentes primeiro
2. **Todos** ordenados por `delivery_date` (mais proximo primeiro)
3. Projetos sem `delivery_date` vao para o final

## Detalhe Tecnico

```text
Antes:
  Urgentes (por delivery_date)
  Nao-urgentes (por created_at)

Depois:
  Urgentes (por delivery_date)
  Nao-urgentes (por delivery_date, sem data no final)
```

Apenas a linha 322 muda: substituir `created_at` por `delivery_date` com fallback para `Infinity` (projetos sem data ficam no fundo).
