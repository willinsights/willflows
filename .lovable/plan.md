## Objetivo

Mostrar um ícone no card do Kanban sempre que o projeto tiver **comentários de vídeo ainda por resolver** (status `open` na tabela `video_comments`), com a contagem ao lado — semelhante ao indicador de chat já existente.

## Como funciona

- Fonte de dados: `video_comments` filtrada por `workspace_id` + `status = 'open'`.
- Critério: comentário "não revisto" = `status = 'open'` (visível para toda a equipa; desaparece quando alguém resolve).
- Granularidade: agrupado por `project_id` (apenas comentários ligados a um projeto contam).

## Implementação (frontend apenas)

1. **Novo hook** `src/hooks/useOpenVideoCommentsByProject.ts`
   - React Query com `queryKey: ['kanban-open-video-comments', workspaceId]`.
   - Uma única `SELECT project_id FROM video_comments WHERE workspace_id = ? AND status = 'open' AND project_id IS NOT NULL`.
   - Reduz para `Map<projectId, count>` no cliente.
   - Subscrição realtime ao canal `video_comments` filtrado por workspace, com debounce de invalidação.
   - `staleTime: 30s`.

2. **Novo componente** `src/components/kanban/KanbanVideoCommentsIndicator.tsx`
   - Recebe `projectId`.
   - Usa o hook acima e lê `map.get(projectId) ?? 0`.
   - Se `count === 0` → não renderiza nada.
   - Renderiza ícone `MessageSquareText` (lucide) em cor `text-amber-500` (para diferenciar do ícone de chat existente que usa `text-primary`) com um badge pequeno mostrando a contagem (formato igual ao `KanbanChatIndicator`: pílula circular `9+` quando > 9).
   - Tooltip: "X comentário(s) de vídeo por resolver".
   - `memo` igual ao `KanbanChatIndicator`.

3. **`src/components/kanban/KanbanCard.tsx`**
   - Importar `KanbanVideoCommentsIndicator`.
   - Inserir no cluster de ícones do header (mesmo bloco onde já vivem `KanbanTimerIndicator` e `KanbanChatIndicator`), antes do `KanbanChatIndicator`.
   - Sem alteração da assinatura/props do card e sem mudar o `memo` comparator (componente filho mantém o seu próprio estado).

## Fora de escopo

- Sem migrations nem alterações no RPC `get_kanban_board` (mantemos a estratégia de hook por workspace, idêntica ao chat).
- Sem mudanças na lógica de aprovação/resolução de comentários — apenas leitura.
- Sem alteração na regra financeira nem na entrega de projetos.

## Notas técnicas

- O hook é instanciado uma vez por card mas o React Query deduplica pela `queryKey` → uma única query por workspace.
- Realtime: `postgres_changes` em `video_comments` filtrado por `workspace_id=eq.<id>`, eventos `INSERT/UPDATE/DELETE`, invalida a query.
- `status` é o único critério (`open` vs `resolved`), conforme constraint da tabela.
