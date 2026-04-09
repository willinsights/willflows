

# Marcar Pagamentos de Equipa da Rafaela como Pagos

## Situação Atual

- **Receita (Cliente)**: Já está tudo "pago" — nenhuma alteração necessária
- **Custo de Equipa (Colaborador)**: 9 pagamentos ainda "pendente", total **€360**

| Projeto | Valor |
|---|---|
| 24 Hours: From Request to Proposal | €20 |
| 014 - Walkingtour + almoço em modena | €60 |
| Caminhos Niemeyer | €60 |
| How Sicily Experts Are Made | €20 |
| Jeep Tour | €60 |
| Northern Italy in 30 Seconds | €30 |
| Tour de Grafites + visita à Galeria e Oficina de Xilogravura | €60 |
| Tour em Feira acompanhado de Chef | €30 |
| Why Sicily Is Europe's Best-Kept Secret | €20 |

## Ação

Executar uma migração SQL para atualizar os 9 registos na tabela `project_team`:

```sql
UPDATE project_team
SET payment_status = 'pago'
WHERE id IN (
  '3719e117-155f-45f6-b457-11e24ea833fd',
  '1ae16dba-2740-4142-821d-81a3b24fe9fd',
  '7883d037-581a-427f-b4db-22e6ae580592',
  '1c021b82-1611-416b-a80c-197c97d06f74',
  'd62eb20c-ec83-4ce4-a6fc-260b63974566',
  '0b78cefd-1239-4b83-b455-9d650d923dce',
  '46854e66-0dd2-4838-b0da-0b31b22b4f06',
  'bd581b1f-abdb-41b2-809a-1650a27d24dd',
  '4ab10947-34f7-4e25-8663-41a588d8627f'
);
```

O trigger `handle_project_team_paid_at` define `paid_at = now()` automaticamente.

## Impacto

- 9 pagamentos → status "pago"
- €360 movidos de "pendente" para "pago"
- Receitas do cliente: já estão pagas, sem alteração
- Zero alterações de código — apenas dados

## Ficheiros

Nenhum ficheiro alterado.

