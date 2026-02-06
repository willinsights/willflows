

# Corrigir Edge Function de Aprovacao de Video

## Problema
A edge function `get-video-approval-data` nao esta deployed no servidor. Quando o link de aprovacao e acedido, retorna erro 404 porque a funcao nao existe no ambiente de producao.

O token existe e esta ativo na base de dados, mas a funcao que serve os dados nao esta disponivel.

## Solucao

A funcao precisa de ser re-deployed. Para forcar o deploy atraves do ciclo de build do Lovable, vou fazer uma alteracao minima no ficheiro da edge function (adicionar um comentario com timestamp) que vai triggerar o rebuild e deploy automatico.

## Alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/get-video-approval-data/index.ts` | Adicionar comentario para forcar redeploy |

## Detalhe Tecnico

Adicionar um comentario no topo do ficheiro para forcar o sistema de build a detectar uma alteracao e fazer o deploy:

```typescript
// Edge function: get-video-approval-data - v2
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
```

Apos o build, a funcao ficara disponivel e os links de aprovacao voltarao a funcionar.

