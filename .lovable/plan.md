

# Projetos na Coluna "Entregue" → Finanças Automaticamente

## Problema Identificado

Existem **10 projetos** que estão na coluna "Entregue" (is_final = true) mas têm `is_delivered = false` e `delivered_at = NULL`. Isto significa que não aparecem nos cálculos financeiros do modo REALIZADO (Dashboard, Relatórios) porque o motor financeiro filtra por `is_delivered = true`.

Projetos afetados incluem: Iconic Room (€850), Titanium (€3000), Vídeo Boutique Sintra (€6000), Sessão Fotográfica Hotel Lisboa (€5000), entre outros.

## Causa Raiz

Estes projetos foram movidos para a coluna final por um caminho que não passou pelo RPC `deliver_project` (possivelmente dados importados, migração, ou edição direta).

## Solução (2 partes)

### 1. Corrigir dados existentes (migração)

Atualizar os 10 projetos que estão na coluna final sem `is_delivered`:

```sql
UPDATE projects p
SET is_delivered = true, delivered_at = COALESCE(p.delivered_at, now())
FROM kanban_columns kc
WHERE (
  (p.current_phase = 'captacao' AND p.captacao_column_id = kc.id) OR
  (p.current_phase = 'edicao' AND p.edicao_column_id = kc.id)
)
AND kc.is_final = true
AND p.is_delivered = false;
```

### 2. Prevenir futuras inconsistências (trigger SQL)

Criar um trigger que, sempre que `captacao_column_id` ou `edicao_column_id` é atualizado para uma coluna final, automaticamente define `is_delivered = true` e `delivered_at`:

```sql
CREATE FUNCTION sync_delivery_on_final_column()
  BEFORE UPDATE ON projects
  -- Se a coluna destino é final → set is_delivered = true
  -- Se a coluna destino não é final e era final → set is_delivered = false (reopen)
```

Isto garante consistência independentemente do caminho usado (drag-and-drop, API, import, edição direta).

### 3. Ajustes no código

Nenhuma alteração no motor financeiro ou nos componentes UI — a lógica `is_delivered` já está correta. O problema era apenas dados inconsistentes e falta de trigger de proteção.

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| Nova migração SQL | UPDATE dos 10 projetos + trigger `sync_delivery_on_final_column` |

## Impacto

- Os 10 projetos passarão a aparecer imediatamente nos relatórios financeiros
- Qualquer futuro projeto movido para "Entregue" será automaticamente marcado como entregue
- Zero alterações no frontend — apenas consistência de dados

