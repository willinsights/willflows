## Objetivo

Garantir que os cards do Savio contam **custo de edição teórico** no lucro (ex.: Bliss Mista → 346€ − 60€ = **286€ lucro por card**), mas **sem** duplicar essa despesa como pagamento real a freelancer (Savio é mensal fixo, fora do sistema).

## Diagnóstico atual

O cálculo em `useMonthlyClosing.ts` faz hoje:

```
lucro = receita − (project_team.payment_amount)   ← Savio = 0 ✅
             − custos_extras
             − custo_captacao
             − custo_edicao                       ← Savio = 60 ✅
```

Ou seja, **para Bliss Mista do Savio já dá 346 − 0 − 60 = 286€**. A conta está matematicamente correta e alinhada com a regra escolhida ("manter custo teórico 60€ / lucro 286€"). 

Problema real → **apresentação e consistência de dados**, não fórmula:

1. Alguns cards antigos do Savio podem ter `custo_edicao` fora da tabela (ex.: 36€ em vez de 60€ para Mista, ou 0€), o que faz o lucro parecer inflado (346€ em vez de 286€).
2. Na tabela "Acertos" o Savio aparece a 0€ e cria a sensação de que "não há custo" — falta um sinal visual a explicar que o custo está no card, não no acerto.

## Plano

### 1) Auditoria de dados (read-only, para confirmar)
Rodar `read_query` para listar todos os cards Bliss Travel do Savio dos últimos 90 dias e comparar `custo_edicao` real vs. regra:
- Só curta → 10€
- Só longa → 50€
- Mista → 60€

Objetivo: identificar cards com `custo_edicao` desalinhado (ex.: 36€ herdado da regra antiga, ou 0€).

### 2) Correção pontual dos cards desalinhados
Via `insert` tool, atualizar `projects.custo_edicao` para o valor teórico correto por duração, **sem** tocar em `project_team.payment_amount` (fica 0€ para o Savio). Assim o lucro de cada card passa a mostrar 286€ / 30€ / 6€ conforme o tipo.

Também garantir Anzarya:
- Curta 10€, Longa 30€, Mista 40€ nos cards do Savio.

### 3) Ajuste visual em `ClosingByEditor.tsx` (opcional, pequeno)
Adicionar uma badge "mensal fixo" ao lado do nome quando **todas** as linhas do editor no mês têm `payment_amount = 0`. Deixa explícito que o 0€ é intencional e o custo teórico está no card. Sem alteração de lógica.

### 4) Validação
Após a correção, rodar `read_query` para confirmar por card Bliss Mista do Savio:
- `agreed_value = 346`
- `custo_edicao = 60`
- `project_team.payment_amount = 0`
- Lucro efetivo por card = 286€ ✅

## O que NÃO muda

- Fórmula de `useMonthlyClosing` — já está certa.
- `project_team` do Savio continua a 0€ (não recebe por card).
- Salário mensal do Savio continua fora do sistema (decisão do utilizador).

## Detalhes técnicos

- Escopo dos writes: apenas `UPDATE projects SET custo_edicao = X` nas linhas do Savio identificadas na auditoria.
- Sem migrações de schema.
- Alteração de UI (passo 3) é 3 linhas em `ClosingByEditor.tsx`.
