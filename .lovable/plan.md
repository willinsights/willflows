

# Corrigir "Failed to fetch" no portal de aprovacao

## Problema
As edge functions `submit-video-feedback` e `delete-video-comment` nao estao deployed. O portal de aprovacao consegue carregar os dados (porque o `get-video-approval-data` ja foi re-deployed), mas qualquer accao (submeter comentario, apagar comentario, aprovar) falha com "Failed to fetch".

## Solucao
Forcar o redeploy das duas funcoes adicionando um comentario no topo de cada ficheiro, tal como fizemos com `get-video-approval-data`.

## Alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/submit-video-feedback/index.ts` | Adicionar comentario `// v2` no topo para forcar redeploy |
| `supabase/functions/delete-video-comment/index.ts` | Adicionar comentario `// v2` no topo para forcar redeploy |

Apos o build, as funcoes ficarao disponveis e as accoes no portal de aprovacao (comentarios, aprovacao) voltarao a funcionar.
