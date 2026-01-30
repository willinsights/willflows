

## Correções: Timecode Preciso + Botão Apagar Comentários

### Problema 1: Timecode arredonda após 2 segundos

**Causa identificada:** A edge function `submit-video-feedback` (linha 120) aplica `Math.floor()`:

```typescript
timestamp_seconds: Math.floor(commentPayload.timestamp_seconds || 0),
```

**Fluxo do problema:**
1. Cliente escreve comentário → timestamp capturado com precisão (ex: 24.36s)
2. UI mostra optimistic update → `00:00:24:09` (correto)
3. Edge function guarda com `Math.floor` → 24.0s no banco de dados
4. `refreshComments()` busca dados reais → substitui por `00:00:24:00`

---

### Problema 2: Falta botão apagar comentário

**Locais afetados:**
- Página de aprovação (cliente público) → precisa de edge function
- Modal de produção (equipa autenticada) → já tem função no hook, falta UI e RLS

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/submit-video-feedback/index.ts` | Remover `Math.floor()` |
| `supabase/functions/delete-video-comment/index.ts` | **CRIAR** - Nova edge function |
| `src/pages/public/VideoApproval.tsx` | Adicionar botão e lógica de apagar |
| `src/components/video-production/TimestampComments.tsx` | Adicionar botão apagar na UI |
| Database | Adicionar política RLS para DELETE |

---

### Alteração 1: Remover arredondamento na edge function

**Ficheiro:** `supabase/functions/submit-video-feedback/index.ts`

**Linha 120 - Alterar de:**
```typescript
timestamp_seconds: Math.floor(commentPayload.timestamp_seconds || 0),
```

**Para:**
```typescript
timestamp_seconds: commentPayload.timestamp_seconds || 0,
```

---

### Alteração 2: Criar edge function para apagar comentários (cliente)

**Novo ficheiro:** `supabase/functions/delete-video-comment/index.ts`

A função irá:
- Validar token de aprovação
- Verificar que o comentário pertence a esse token/versão
- Apagar apenas comentários de cliente (`is_client_comment = true`)
- Usar service role para bypass de RLS

---

### Alteração 3: Botão apagar na página de aprovação

**Ficheiro:** `src/pages/public/VideoApproval.tsx`

Adicionar:
1. Estado para confirmar apagar
2. Função `handleDeleteComment` que chama a nova edge function
3. Botão com ícone de lixo em cada comentário do cliente

**Localização:** No card de comentário (linhas 680-721), adicionar botão Trash2 no header, visível apenas para comentários do próprio cliente.

---

### Alteração 4: Botão apagar no componente TimestampComments

**Ficheiro:** `src/components/video-production/TimestampComments.tsx`

O hook já exporta `deleteComment`. Alterações necessárias:
1. Passar `deleteComment` do hook para o `CommentCard`
2. Adicionar botão Trash2 ao lado dos botões Resolver/Reabrir
3. Adicionar confirmação antes de apagar

---

### Alteração 5: Política RLS para DELETE

**Migração SQL:**
```sql
CREATE POLICY "Members can delete video comments"
  ON video_comments
  FOR DELETE
  TO authenticated
  USING (
    is_workspace_member(auth.uid(), workspace_id)
  );
```

Isto permite que membros autenticados do workspace apaguem qualquer comentário desse workspace.

---

### Resultado Esperado

| Antes | Depois |
|-------|--------|
| Timecode: `00:00:24:09` → `00:00:24:00` após 2s | Timecode mantém precisão |
| Sem opção de apagar comentários | Botão apagar em ambas as páginas |
| Cliente não pode apagar próprios comentários | Cliente pode apagar via edge function |
| Equipa não pode apagar via UI | Equipa pode apagar com RLS |

