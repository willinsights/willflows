# Corrigir erro "String must contain at most 50 character(s)" ao criar projeto

## Problema

Ao criar o projeto "Argolida Chroniches" com o ID `GR-ARG-2026-EXP-001_ArgolidaChronic...`, o guardar falha com um toast vermelho "Dados inválidos — String must contain at most 50 character(s)".

Causa confirmada: o campo **ID do Projeto** (`project_code`) tem um limite de 50 caracteres na validação do frontend (`src/lib/validation-schemas.ts`), enquanto a coluna na base de dados é `text` (sem limite). O ID escrito ultrapassa 50 caracteres, por isso é bloqueado apenas pela validação da app.

## O que vou fazer

1. Aumentar o limite do ID do Projeto de 50 para 100 caracteres (a base de dados aceita sem alterações).
2. Validar o campo no próprio formulário de criação/edição, para o erro aparecer por baixo do campo ("ID demasiado longo (máx. 100 caracteres)") em vez de um toast vermelho genérico em inglês.
3. Traduzir/melhorar a mensagem de erro genérica para português, indicando o campo em causa.

## Detalhes técnicos

- `src/lib/validation-schemas.ts`: `project_code: z.string().max(100, 'ID do projeto muito longo (máx. 100 caracteres)')`.
- `src/components/projects/CreateProjectModal.tsx`: acrescentar `.max(100, ...)` ao `project_code` no schema local do formulário e mostrar `formState.errors.project_code` junto ao input.
- Sem migração de base de dados — a coluna já é `text`.
