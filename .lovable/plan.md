

## Diagnóstico

O card "Capella Sydney" não fica verde porque o vídeo foi carregado como versão **ao nível do projeto** (não associado a uma task). Encontrei **2 aprovações criadas hoje** (04:09 e 04:10) com `task_id = NULL` **e** `project_id = NULL` — o link ao projeto perde-se na inserção, então o `useKanban` não consegue marcar o card como aprovado.

### Causa raiz (em `src/hooks/useVideoApproval.ts` → `approveVideo`)
1. `ApprovalButton` chama `useVideoApproval(taskId)` sem passar `projectId`.
2. Quando `taskId` é `null` (vídeo de projeto), a função tenta resolver `project_id` apenas via tabela `tasks`, que é skipped.
3. Resultado: `INSERT` em `video_approvals` com `task_id=NULL` e `project_id=NULL`.
4. Como `useKanban` filtra `video_approvals.project_id IN (...)`, esses registos órfãos são ignorados → card nunca fica verde.

Bonus: o `isApproved` no `ApprovalButton` também não funciona corretamente para vídeos de projeto (filtra só por `task_id`), pelo que o botão pode ser clicado várias vezes criando duplicados.

## Plano de correção

### 1. `src/hooks/useVideoApproval.ts` — Resolver `project_id` a partir do `video_version_id`
Em `approveVideo` (e replicar em `approveVideoAsClient`), adicionar fallback: se ainda não resolveu o `project_id`, buscar em `video_versions` pelo `videoVersionId`.

```ts
// fallback final: ler do próprio video_version
if (!resolvedProjectId && input.videoVersionId) {
  const { data: vv } = await supabase
    .from('video_versions')
    .select('project_id, task_id')
    .eq('id', input.videoVersionId)
    .single();
  resolvedProjectId = vv?.project_id || null;
  // também aproveitar o task_id se existir
  if (!input.taskId && vv?.task_id) input.taskId = vv.task_id;
}
```

### 2. `src/hooks/useVideoApproval.ts` — Suportar fetch por `projectId`
Atualmente `fetchApprovals` só corre se houver `taskId`. Para vídeos de projeto, o `ApprovalButton` precisa que `isApproved` reflita aprovações por `project_id`. Atualizar `fetchApprovals` para que, quando não há `taskId` mas há `projectId` (passado ao hook), filtre por `project_id`.

### 3. `src/components/video-production/ApprovalButton.tsx` — Passar `projectId`
- Adicionar prop opcional `projectId?: string | null`.
- Passar `projectId` para `useVideoApproval(taskId, projectId)`.
- Atualizar `VideoProductionTab.tsx` (e qualquer outro caller relevante do Review Studio) para passar `projectId` ao botão.

### 4. Backfill dos 2 registos órfãos do Capella Sydney
Migration SQL para corrigir os `video_approvals` com `project_id NULL` cruzando com `video_versions.project_id`:

```sql
UPDATE video_approvals va
SET project_id = vv.project_id
FROM video_versions vv
WHERE va.video_version_id = vv.id
  AND va.project_id IS NULL
  AND vv.project_id IS NOT NULL;
```

(Já tinhas feito isto antes, mas novos registos órfãos foram criados — esta migration corrige os atuais e a fix do código previne novos.)

### 5. (Opcional, recomendado) Trigger de defesa em profundidade
Adicionar um BEFORE INSERT trigger em `video_approvals` que preenche automaticamente `project_id` (e `task_id` se possível) a partir de `video_versions`, garantindo que nunca mais existem registos órfãos, independentemente do cliente que faz o insert.

## Ficheiros alterados
- `src/hooks/useVideoApproval.ts` — fallback via `video_versions` + fetch por projectId
- `src/components/video-production/ApprovalButton.tsx` — aceitar e propagar `projectId`
- `src/components/video-production/VideoProductionTab.tsx` — passar `projectId` ao `ApprovalButton`
- Nova migration — backfill + (opcional) trigger preventivo

## Resultado esperado
Após o fix:
- Aprovar o "Capella Sydney" no Review Studio insere a aprovação com `project_id` correto.
- O `useKanban` deteta a aprovação e o card fica **verde com ✓** imediatamente (refresh do Kanban).
- Os 2 registos órfãos atuais ficam reconectados ao projeto, então o card já aparecerá verde mal a migration corra.

