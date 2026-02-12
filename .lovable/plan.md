

# Ajustar Lista Final de Janeiro (62 projetos + 1 novo)

## Resumo

Alinhar a base de dados com o PDF final: **62 projetos** entregues e pagos em Janeiro, **remover 3 projetos** que estavam em Janeiro mas nao constam no PDF, e **criar 1 novo projeto** para as diarias de estudio.

## Alteracoes

### 1. Remover 3 projetos de Janeiro (mover para Fevereiro)
Estes projetos foram movidos para Janeiro anteriormente mas NAO constam no PDF final:

| Projeto | ID | Acao |
|---|---|---|
| Hotel Lince | e9d69614 | Reverter delivered_at para Fevereiro |
| Master class chef cantora | 47876472 | Reverter delivered_at para Fevereiro |
| Meet the owner chef | e3152749 | Reverter delivered_at para Fevereiro |

Serao atualizados com `delivered_at = '2026-02-04'`, `client_paid_at = '2026-02-04'` (data original aproximada antes da migracao).

### 2. Criar projeto "4 Diarias Edicao Estudio Janeiro"
Novo projeto com:
- Nome: "4 Diarias Edicao Estudio Janeiro"
- Valor: 800 EUR
- Entregue e pago em Janeiro (`delivered_at` e `client_paid_at` = `2026-01-31`)
- `client_payment_status = 'pago'`
- `is_delivered = true`

### 3. Resultado final
- **62 projetos existentes** + **1 novo projeto** = **63 registos** entregues e pagos em Janeiro
- Total de lucro conforme PDF: 4.408 EUR (incluindo os 800 EUR das diarias)

## Seccao Tecnica

### Queries SQL:

```text
-- Passo 1: Mover 3 projetos para Fevereiro
UPDATE projects 
SET delivered_at = '2026-02-04 12:00:00+00', 
    client_paid_at = '2026-02-04 12:00:00+00'
WHERE id IN (
  'e9d69614-1b84-4f10-af26-1fd24383e15f',
  '47876472-b7f6-42b3-83eb-5051403a4467',
  'e3152749-d284-46fb-bd33-55a0949b0898'
);

-- Passo 2: Criar projeto diarias estudio
INSERT INTO projects (name, agreed_value, is_delivered, delivered_at, 
  client_payment_status, client_paid_at, workspace_id, created_by)
VALUES ('4 Diarias Edicao Estudio Janeiro', 800, true, 
  '2026-01-31 23:59:00+00', 'pago', '2026-01-31 23:59:00+00',
  <workspace_id>, <user_id>);
```

### Ficheiros de codigo:
Nenhuma alteracao de codigo necessaria -- apenas operacoes na base de dados.

