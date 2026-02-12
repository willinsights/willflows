

# Corrigir Projetos Finalizados de Janeiro

## Resumo

Ajustar a base de dados para que **apenas os 65 projetos do ficheiro** estejam como entregues e pagos em Janeiro, e nenhum outro.

## Situacao Atual

### Projetos do ficheiro que precisam de ajuste:
- **9 projetos com `delivered_at` em Fevereiro** precisam ser movidos para Janeiro:
  - Hotel Lince, Cooking class, Matriarca Bar, Chocopalha meet owner, Master class chef, Meet the owner chef, Matriarca prova vinho, Chocopalha visita, Walking tour gastronomico
  - Estes ja estao `pago` mas com `delivered_at` em 04-06/Fev

- **56 projetos ja em Janeiro** -- ja estao corretos (entregues e pagos em Jan), nao precisam de alteracao

### Projetos que NAO estao no ficheiro mas estao em Janeiro (a remover):
1. **Captacao Dubai** -- delivered_at: 12/Jan, pendente
2. **VIDEO 4 - B SOUZA** -- delivered_at: 20/Jan, pago (paid_at: 5/Fev)
3. **Edicao Insta** -- delivered_at: 26/Jan, pago (paid_at: 26/Jan)
4. **Ecommerce Moises** -- delivered_at: 27/Jan, pago (paid_at: 26/Jan)

## Plano de Execucao

### Passo 1: Mover 9 projetos de Fev para Jan
Atualizar `delivered_at` para `2026-01-31` (ultimo dia de Janeiro) nos 9 projetos que atualmente tem `delivered_at` em Fevereiro. Manter `client_payment_status = 'pago'` e definir `client_paid_at = '2026-01-31'`.

IDs dos 9 projetos:
- `e9d69614` (Hotel Lince)
- `bbfdfb27` (Cooking class)
- `3efbf211` (Matriarca Bar)
- `5a483d6e` (Chocopalha meet owner)
- `47876472` (Master class chef)
- `e3152749` (Meet the owner chef)
- `bc9167f4` (Matriarca prova vinho)
- `7c3c0c7a` (Chocopalha visita)
- `cb2efd68` (Walking tour)

### Passo 2: Remover 4 projetos de Janeiro
Reverter `is_delivered = false`, `delivered_at = null`, `client_payment_status = 'pendente'`, `client_paid_at = null` para os 4 projetos que nao constam no ficheiro:
- `1e686ab7` (Captacao Dubai)
- `9e4977a7` (VIDEO 4 - B SOUZA)
- `45dd7ab5` (Edicao Insta)
- `0535ab61` (Ecommerce Moises)

### Passo 3: Garantir que todos os 65 projetos estao pago em Janeiro
Verificar e atualizar os 56 projetos que ja estao em Janeiro para garantir `client_paid_at` dentro de Janeiro (muitos tem `client_paid_at: 2026-02-09`, que precisa de ser movido para Janeiro).

### Passo 4: Corrigir erro de build TypeScript
Corrigir o erro em `src/hooks/usePushNotifications.ts` onde `pushManager` nao e reconhecido no tipo `ServiceWorkerRegistration`. Solucao: adicionar cast `as any` nas 4 linhas afetadas (115, 213, 220, 316).

## Secao Tecnica

### Queries de dados (via insert tool):
```sql
-- Passo 1: Mover 9 projetos de Fev para Jan
UPDATE projects SET delivered_at = '2026-01-31 23:59:00+00', client_paid_at = '2026-01-31 23:59:00+00'
WHERE id IN ('e9d69614-...', 'bbfdfb27-...', ...);

-- Passo 2: Reverter 4 projetos
UPDATE projects SET is_delivered = false, delivered_at = null, client_payment_status = 'pendente', client_paid_at = null
WHERE id IN ('1e686ab7-...', '9e4977a7-...', '45dd7ab5-...', '0535ab61-...');

-- Passo 3: Atualizar client_paid_at dos 56 projetos de Fev para Jan
UPDATE projects SET client_paid_at = '2026-01-31 23:59:00+00'
WHERE id IN (...) AND client_paid_at >= '2026-02-01';
```

### Ficheiro de codigo:
- `src/hooks/usePushNotifications.ts` (linhas 115, 213, 220, 316): adicionar type assertion para resolver erro TS

