

# Marcar Projetos da Rafaela como Pagos (Cliente + Colaborador)

## Situação Atual

- **41 projetos** da Rafaela entregues desde Março 2026
- Pagamento à **colaboradora**: já está "pago" em todos
- Pagamento do **cliente**: todos ainda "pendente" (€4.091 em receita)

## Ação

Executar uma migração SQL para atualizar o `client_payment_status` para `pago` e definir `client_paid_at` nos 41 projetos onde a Rafaela participou:

```sql
UPDATE projects
SET client_payment_status = 'pago',
    client_paid_at = now()
WHERE id IN (
  SELECT DISTINCT p.id
  FROM project_team pt
  JOIN projects p ON pt.project_id = p.id
  LEFT JOIN profiles prof ON pt.user_id = prof.id
  WHERE prof.full_name ILIKE '%rafaela%'
    AND p.is_delivered = true
    AND p.delivered_at >= '2026-03-01'
    AND p.client_payment_status != 'pago'
);
```

## Impacto

- 41 projetos → `client_payment_status = 'pago'`
- €4.091 movidos de "pendente" para "pago" na Receita
- Colaborador já estava pago — sem alteração necessária
- Zero alterações de código

