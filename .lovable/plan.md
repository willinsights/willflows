

# Marcar Pagamentos Anteriores a 3 de Março como Pagos

## Ação

Executar um UPDATE na tabela `project_team` para marcar todos os 110 registos pendentes como `pago`, definindo `paid_at` automaticamente (o trigger `handle_project_team_paid_at` já trata disso).

```sql
UPDATE project_team pt
SET payment_status = 'pago'
FROM projects p
WHERE pt.project_id = p.id
  AND p.created_at < '2026-03-03'
  AND pt.payment_amount > 0
  AND (pt.payment_status != 'pago' OR pt.payment_status IS NULL);
```

## Impacto

- 110 pagamentos → status `pago`
- €4.056,67 movidos de "pendente" para "pago"
- O trigger existente define `paid_at = now()` automaticamente
- Afeta: Rafaela (39), Christian (34), Morais (33), Savio (3), Lucas (1)
- Zero alterações de código — apenas dados

## Ficheiros

Nenhum ficheiro alterado. Apenas uma operação de dados via insert tool.

