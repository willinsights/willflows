

## Correções na Secção de Comentários de Produção de Vídeo

### Problema 1: Título "Comentários" Duplicado

Na imagem enviada, vê-se:
- "Comentários" no `CardTitle` do `VideoProductionTab.tsx` (linha 243)
- "Comentários" novamente no header do `TimestampComments.tsx` (linha 64)

**Solução**: Remover o header interno do `TimestampComments` já que o Card pai já tem o título.

---

### Problema 2: Falta Forma de Responder a Comentários

O hook `useVideoComments` já suporta respostas via `parentId`, mas não há UI para a equipa responder.

**Solução**: Adicionar botão "Responder" e campo de input em cada comentário.

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/video-production/TimestampComments.tsx` | Remover header duplicado + Adicionar UI de resposta |

---

### Alterações no TimestampComments.tsx

**1. Remover header duplicado (linhas 60-97)**

Transformar de header completo com filtros para apenas os filtros (sem o título "Comentários" redundante):

```tsx
// Antes: Header com ícone, título E filtros
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <MessageSquare className="h-4 w-4 text-muted-foreground" />
    <span className="font-medium">Comentários</span>  {/* REMOVER */}
    <Badge>...</Badge>  {/* REMOVER - já redundante */}
  </div>
  <div className="flex gap-1">...</div> {/* Manter filtros */}
</div>

// Depois: Apenas filtros
<div className="flex items-center justify-end gap-1">
  {/* Apenas botões de filtro */}
</div>
```

**2. Adicionar funcionalidade de resposta no CommentCard**

```tsx
// Props adicionais
interface CommentCardProps {
  comment: VideoComment;
  onSeekTo?: (timestampSeconds: number) => void;
  onResolve: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onReply: (body: string) => void;  // NOVO
}

// Estado para resposta
const [showReplyInput, setShowReplyInput] = useState(false);
const [replyText, setReplyText] = useState('');
const [submittingReply, setSubmittingReply] = useState(false);

// Botão de responder (junto aos outros botões de ação)
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowReplyInput(!showReplyInput)}
  className="h-7 text-xs"
>
  <Reply className="h-3 w-3 mr-1" />
  Responder
</Button>

// Campo de input para resposta (após o corpo do comentário)
{showReplyInput && (
  <div className="mt-2 flex gap-2">
    <Textarea
      value={replyText}
      onChange={(e) => setReplyText(e.target.value)}
      placeholder="Escrever resposta..."
      rows={2}
      className="text-sm"
    />
    <div className="flex flex-col gap-1">
      <Button
        size="sm"
        onClick={handleSubmitReply}
        disabled={!replyText.trim() || submittingReply}
      >
        Enviar
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setShowReplyInput(false);
          setReplyText('');
        }}
      >
        Cancelar
      </Button>
    </div>
  </div>
)}
```

**3. Atualizar TimestampComments para passar função de reply**

```tsx
// No componente TimestampComments, adicionar handler
const handleReply = async (parentId: string, body: string) => {
  if (!selectedVersionId) return;
  
  await addComment({
    videoVersionId: selectedVersionId,
    taskId,
    workspaceId,
    timestampSeconds: 0, // Respostas não têm timestamp próprio
    body,
    parentId,
  });
};

// Passar ao CommentCard
<CommentCard
  key={comment.id}
  comment={comment}
  onSeekTo={onSeekTo}
  onResolve={() => resolveComment(comment.id)}
  onReopen={() => reopenComment(comment.id)}
  onDelete={() => deleteComment(comment.id)}
  onReply={(body) => handleReply(comment.id, body)}  // NOVO
/>
```

---

### Resultado Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📹 Comentários (Card Title - já existe no pai)                   │
├─────────────────────────────────────────────────────────────────┤
│                                    [Todos] [●1] [✓0]  ← Filtros │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⏱ 00:00:45:56  U Membro da equipa         [Responder][...]  │ │
│ │                                                             │ │
│ │ ultima imagem acabar em tela totalmente preta               │ │
│ │                                                             │ │
│ │ [Campo de resposta - aparece ao clicar em Responder]        │ │
│ │ ┌───────────────────────────────────┐ ┌────────┐            │ │
│ │ │ Escrever resposta...              │ │ Enviar │            │ │
│ │ └───────────────────────────────────┘ │Cancelar│            │ │
│ │                                       └────────┘            │ │
│ │ ├─ Respostas aparecem aqui                                  │ │
│ │ │  └─ Equipa: Corrigido na v2!                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

### Dependências Técnicas

- O hook `useVideoComments` já suporta `parentId` para criar respostas
- As respostas já são organizadas automaticamente pelo hook (`replies` array)
- Só é necessário adicionar a UI para acionar esta funcionalidade

