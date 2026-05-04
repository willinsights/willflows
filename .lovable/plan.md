## Fechar STV TEASER 40 SEG

Encontrei o projeto: **STV TEASER 40 SEG** (era "SVT" na lista — está como "STV" no sistema).

- Projeto: `5500fdb4-8b59-4ae6-8e7d-fdb5a05e9f28` — já está entregue (`is_delivered = true`)
- Pagamento Christian: `61d76495-9cfd-4e2c-a8a1-76a0c8a1039e` — 50,00 €, pendente
- Cliente: ainda `pendente` no recebimento

## Ações

1. `project_team` → marcar pagamento do Christian como `pago` + `paid_at = now()`
2. `projects` → marcar `client_payment_status = 'pago'` + `client_paid_at = now()`

Depois disso, a lista do Christian fica 100% fechada (10/10).
