
Objetivo
- Fazer o card “Top 10 Colaboradores” aparecer corretamente na página /app/relatorios quando existem projetos finalizados, mesmo que ainda não recebidos.
- Corrigir a causa raiz do “Nenhum dado de colaboradores disponível” quando há dados reais.

Diagnóstico (baseado no que vi no código + logs/rede)
- O card é alimentado pelo useEffect `fetchCollaborators` em `src/pages/app/Relatorios.tsx`.
- Esse effect faz um select em `project_team` com um “join embutido” para `profiles`:
  - `profiles:user_id (full_name, avatar_url)`
- A requisição está falhando com HTTP 400 e erro:
  - “Could not find a relationship between 'project_team' and 'user_id' in the schema cache”
- No schema tipado (`src/integrations/supabase/types.ts`), a tabela `project_team` não tem relacionamento (FK) do `user_id` para `profiles.id`, então o backend não consegue montar o join automático.
- Resultado: `teamData` vem null/undefined, o código cai no empty state e mostra “Nenhum dado…”.
- Importante: conferi se há `user_id` “órfão” em `project_team` (sem perfil correspondente) e está tudo OK (0 faltantes). Isso significa que adicionar a FK deve ser seguro.

Estratégia de correção (duas camadas, para ficar robusto)
1) Corrigir a causa raiz no backend (recomendado)
- Criar a Foreign Key `project_team.user_id -> profiles.id` (com `ON DELETE SET NULL`).
- Benefícios:
  - O join `profiles:user_id(...)` passa a funcionar.
  - Outros pontos do app que usam o mesmo padrão de join ficam consistentes.
- Risco/mitigação:
  - Se existissem `user_id` sem profile, a migration falharia. Já validamos que não existem.

2) Melhorar o front para lidar com erro e não “sumir” silenciosamente
- Hoje o `fetchCollaborators` não trata `error` da query; apenas checa `teamData`.
- Vou:
  - Capturar e tratar erro de forma explícita (log + UI).
  - Adicionar um estado simples de loading/erro no card:
    - Loading enquanto busca.
    - Mensagem “Falha ao carregar colaboradores” se houver erro (em vez de “Nenhum dado…”).
  - Opcional: fallback automático (se o join ainda falhar por qualquer motivo): fazer 2 queries (project_team e depois profiles via `.in('id', userIds)`), igual ao padrão usado em outras partes do código (ex.: ChatContextPanel). Isso garante que o ranking funciona mesmo se, por algum motivo, o join não estiver disponível.

Plano de implementação (passo a passo)
A) Backend (migração)
- Criar uma migration com:
  1. `ALTER TABLE public.project_team ADD CONSTRAINT project_team_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;`
  2. (Opcional, recomendado) `CREATE INDEX IF NOT EXISTS project_team_user_id_idx ON public.project_team(user_id);`
- Verificação pós-migração:
  - Recarregar /app/relatorios e confirmar que a requisição do card deixa de retornar 400.

B) Frontend (Relatorios.tsx)
- Ajustar o `fetchCollaborators` para:
  - Verificar `error` retornado pelo backend e setar um estado `collaboratorsError`.
  - Exibir um estado de “carregando” e/ou mensagem de erro no CardContent.
  - (Fallback robusto) Se a query com join falhar:
    1. Buscar `project_team` sem join (campos básicos).
    2. Extrair `userIds` e buscar `profiles` em separado.
    3. Montar o map `userId -> profile` e continuar o mesmo agregador já existente.
- Manter exatamente a regra que você pediu:
  - Contar somente projetos `is_delivered = true` (finalizados), independentemente de estarem pagos ou pendentes.

C) Testes rápidos (manual)
- Na página /app/relatorios:
  1. Confirmar que “Top 10 Colaboradores” mostra nomes/valores.
  2. Conferir se “Top 10 Clientes” continua ok (para garantir que não houve regressão no layout).
  3. Validar que, se não houver `payment_amount` em alguns registros, eles entram como 0 (como já acontece).
- Verificar no console do navegador:
  - Se a requisição a `project_team?select=...profiles:user_id(...)` passou a retornar 200.
  - Se não há mais erro 400/PGRST200 relacionado ao relacionamento.

Critérios de sucesso
- O card “Top 10 Colaboradores” deixa de mostrar “Nenhum dado…” quando há projetos finalizados com entradas em `project_team`.
- A requisição do ranking não falha mais por ausência de relacionamento.
- Se houver qualquer falha de rede/permissão, o usuário vê uma mensagem clara (não um empty state enganoso).

Notas técnicas
- A ausência de FK em `project_team.user_id` é a causa direta do erro de join (o backend precisa do relacionamento para o select aninhado).
- Como o `user_id` é nullable e existe `is_external/external_name`, o `ON DELETE SET NULL` é adequado para não quebrar registros históricos caso um perfil seja removido/desativado.
