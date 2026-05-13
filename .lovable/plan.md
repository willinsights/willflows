## Objetivo

Tornar o fluxo de aprovação de vídeo automático e contínuo:
1. Criar automaticamente o link de aprovação do cliente assim que um vídeo é carregado no Review Studio.
2. Incluir esse link em qualquer email disparado por automações (variável `{link_aprovacao}`).
3. Manter o link de aprovação ativo durante 7 dias após a aprovação (hoje o vídeo/link deixa de funcionar mais cedo); após esses 7 dias o vídeo é apagado do servidor e o link é desativado.

## Mudanças

### 1. Auto-criar link de aprovação ao carregar vídeo

Local: `supabase/functions/stream-process-video/index.ts`

Após inserir a `video_versions` row, verificar se já existe um token ativo em `video_approval_tokens` para o mesmo `task_id`/`project_id`. Se não existir, criar um novo token (sem `expires_at`, `is_active = true`, `created_by = userId`, com `client_name`/`client_email` opcionalmente herdados do cliente do projeto se conseguirmos resolver). Isto garante que cada upload tem um link partilhável sem ação manual.

UI (`ApprovalShareLink.tsx`): continua a funcionar — apenas vai encontrar o token já existente e mostrar o link diretamente, sem precisar do botão "Gerar link".

### 2. Variável `{link_aprovacao}` nos emails de automação

Local: `supabase/functions/execute-automations/index.ts`

- Antes de construir `templateVars`, procurar o token ativo de aprovação ligado ao `project_id` (e, se a automação for de tarefa, ao `task_id`).
- Adicionar `'{link_aprovacao}': 'https://willflow.app/video-approval/<token>'` ao `templateVars`. Quando não existir token, devolver string vazia.
- Atualizar o seletor de variáveis no editor de automações (`useWorkflowAutomations` / componente do editor de email) para listar a nova variável, e incluir o link por defeito nos templates de email cuja categoria seja "aprovação de vídeo".

### 3. Manter link 7 dias após aprovação

Hoje a função `queue_video_retention_on_approval` agenda eliminação para 14 dias após aprovação, e `cleanup-expired-videos` desativa o token quando apaga o vídeo. O problema relatado ("o link deixa de funcionar logo após aprovação") será corrigido garantindo:

- Migration: alterar a função `queue_video_retention_on_approval` para usar `v_retention_days := 7`.
- `get-video-approval-data`: continuar a servir o vídeo enquanto o token estiver `is_active = true` e o vídeo não estiver `is_deleted`. Confirmar que a página `ApprovedState.tsx` não esconde o player (atualmente já mostra download — adicionar reprodução do vídeo aprovado durante o período de retenção).
- `cleanup-expired-videos`: comportamento atual mantido — quando os 7 dias passam, apaga R2/Stream e desativa o token (já faz isto).

## Detalhes técnicos

**Tabelas envolvidas**
- `video_approval_tokens` (já tem `project_id`, `task_id`, `is_active`, `expires_at`).
- `video_retention_queue` (alimentada por `queue_video_retention_on_approval` e `queue_video_retention`).

**Resolução do token na automação**
```text
SELECT token FROM video_approval_tokens
WHERE is_active = true
  AND ((task_id IS NOT NULL AND task_id = :task_id)
       OR (task_id IS NULL AND project_id = :project_id))
ORDER BY created_at DESC LIMIT 1;
```

**URL base**: reutilizar `APP_URL` já existente em `execute-automations`.

**Idempotência do upload**: criar token apenas se `count(*) = 0` para o par (task/project, is_active=true), evitando múltiplos tokens ativos.

## Fora do âmbito

- Não alteramos a lógica de comentários, versões, nem o webhook do Stream.
- Não mexemos em RLS das tabelas existentes (apenas em Edge Functions com service role e numa função SQL).
- Não criamos novos templates de email — apenas disponibilizamos a variável.