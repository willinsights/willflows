# docs/db — registos de alterações aplicadas em produção

Esta pasta guarda registos de alterações feitas **diretamente na base de dados de produção**, com autorização do proprietário, fora das migrações do repositório. Cada ficheiro tem a data no nome e foi extraído de produção (definições de funções e triggers tal como estão aplicadas).

## Não são migrações

- Não copiar nem mover estes ficheiros para `supabase/migrations` nem para `drizzle/migrations` sem uma decisão explícita do proprietário (ver as tarefas A2, A6 e A7 do `BACKLOG.md`). A plataforma de alojamento pode aplicar automaticamente migrações novas, e estas alterações já existem na base.
- Não executar estes ficheiros numa base de produção. A secção de alterações de dados de cada registo é só descritiva e não deve ser repetida.

## Antes de reaplicar migrações antigas

As migrações antigas do repositório têm versões anteriores de algumas funções. Antes de reaplicar ou reconstruir a base a partir delas, confirmar que não sobrepõem as definições registadas aqui. Exemplos do registo de 2026-11-21:

- `can_access_feature` (exceção do período de teste válido);
- `workspace_is_active` (tolerância de 7 dias no pagamento em atraso; teste só válido com data de fim futura);
- `create_workspace_with_admin` (um teste por conta, limite de workspaces próprios por plano, dono do workspace).

## Ficheiros

| Ficheiro | Conteúdo |
| --- | --- |
| `producao-2026-11-21.sql` | Colunas novas de conta e workspace, permissões, funções de acesso, criação e estado do workspace, triggers de bloqueio e registo das alterações de dados do dia |
