

## Corrigir Recarregamento de Página ao Salvar Comentário

### Problema Identificado
Quando um comentário é salvo, o código chama `fetchApprovalData()` que:
1. Define `loading = true` (linha 149)
2. Isso mostra o spinner e **desmonta o player de vídeo**
3. Quando os dados chegam, o vídeo é recriado do zero
4. O utilizador perde a posição do vídeo e demora a voltar

### Solução
Criar uma função dedicada `refreshComments()` que:
- Busca **apenas os comentários** do backend
- **NÃO** altera o estado `loading`
- Mantém o player de vídeo intacto
- Preserva a posição atual do vídeo

### Alterações Técnicas

#### 1. Nova Função `refreshComments()`
```typescript
// Atualizar apenas comentários sem recarregar tudo
const refreshComments = useCallback(async () => {
  if (!token) return;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-video-approval-data?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );

    if (!response.ok) return;

    const approvalData: ApprovalData = await response.json();
    
    // Atualizar APENAS os comentários no estado
    setData(prev => prev ? { ...prev, comments: approvalData.comments } : null);
  } catch (err) {
    console.error('Error refreshing comments:', err);
  }
}, [token]);
```

#### 2. Alterar `handleSubmitComment()`
Substituir `await fetchApprovalData()` por `await refreshComments()`:

```typescript
// Antes:
await fetchApprovalData();  // ❌ Recarrega tudo

// Depois:
await refreshComments();    // ✅ Só atualiza comentários
```

#### 3. Adicionar Novo Comentário Localmente (Otimização Extra)
Para feedback ainda mais instantâneo, podemos adicionar o comentário ao estado local **antes** de chamar a API:

```typescript
const handleSubmitComment = async () => {
  // ... validações ...

  const newComment: VideoComment = {
    id: crypto.randomUUID(),
    video_version_id: selectedVersionId,
    timestamp_seconds: Math.floor(commentTimestamp),
    body: commentText.trim(),
    status: 'open',
    is_client_comment: true,
    client_name: clientName.trim(),
    created_at: new Date().toISOString(),
  };

  // Adicionar imediatamente ao estado local
  setData(prev => prev ? {
    ...prev,
    comments: [...prev.comments, newComment]
  } : null);

  // Limpar form
  setCommentText('');
  setHasStartedTyping(false);
  setCommentTimestamp(0);

  // Submeter em background
  try {
    await fetch(...);
    // Sincronizar com backend para obter ID real
    await refreshComments();
  } catch (err) {
    // Reverter em caso de erro
    setData(prev => prev ? {
      ...prev,
      comments: prev.comments.filter(c => c.id !== newComment.id)
    } : null);
    alert('Erro ao enviar comentário');
  }
};
```

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/public/VideoApproval.tsx` | Adicionar `refreshComments()`, atualizar `handleSubmitComment()` |

### Resultado Esperado
- Comentário é salvo **instantaneamente** sem delay visível
- Vídeo **não é recarregado** - mantém a posição
- Player continua funcional imediatamente após salvar
- Experiência fluida idêntica ao Frame.io

