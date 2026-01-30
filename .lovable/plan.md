
## Caixa de Comentário Sempre Visível (Estilo Frame.io)

### Objetivo
Transformar o input de comentário para estar **sempre visível abaixo do player**, onde:
- Ao começar a escrever, o timecode atual é automaticamente capturado
- Os comentários ficam no lado **esquerdo** (layout invertido)
- O timecode fica associado ao momento em que o utilizador começou a escrever

### Alterações Planeadas

#### 1. Layout Invertido (Comentários à Esquerda)
Mudar o grid de:
```
[Player (2 colunas)]  [Comentários (1 coluna)]
```
Para:
```
[Comentários (1 coluna)]  [Player (2 colunas)]
```

#### 2. Input de Comentário Sempre Visível
Remover a lógica `isCommentMode` e manter o input sempre visível abaixo do player:
- Campo de nome (se ainda não guardado)
- Campo de comentário com placeholder "Adicione um comentário..."
- Badge de timecode que aparece quando o utilizador começa a escrever
- Botão de enviar

#### 3. Captura Automática do Timecode
Quando o utilizador começa a escrever no textarea:
- Pausa o vídeo automaticamente
- Captura o timecode atual
- Mostra o badge com o timecode junto ao input
- Se o utilizador apagar tudo, reseta o timecode

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/public/VideoApproval.tsx` | Inverter layout, input sempre visível, captura automática de timecode |

### Detalhes Técnicos

#### Nova Lógica de Captura de Timecode

```typescript
// Ao começar a escrever, captura o timecode
const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const newValue = e.target.value;
  
  // Se está a começar a escrever (de vazio para algo)
  if (!commentText && newValue) {
    // Pausa o vídeo e captura o timecode
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setCommentTimestamp(currentTime);
  }
  
  // Se apagou tudo, reseta o timecode
  if (commentText && !newValue) {
    setCommentTimestamp(0);
  }
  
  setCommentText(newValue);
};
```

#### Novo Layout do Grid

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Comentários à ESQUERDA */}
  <div className="order-2 lg:order-1 space-y-4">
    <Card>
      <CardHeader>...</CardHeader>
      <CardContent>...</CardContent>
    </Card>
  </div>
  
  {/* Player à DIREITA (2 colunas) */}
  <div className="order-1 lg:order-2 lg:col-span-2 space-y-4">
    {/* Vídeo */}
    <Card>...</Card>
    
    {/* Input SEMPRE visível */}
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {/* Timecode badge (aparece ao escrever) */}
        {commentText && (
          <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatTimecode(Math.floor(commentTimestamp))}
          </div>
        )}
        
        {/* Input area */}
        <div className="flex-1">
          <Textarea
            placeholder="Adicione um comentário..."
            value={commentText}
            onChange={handleCommentChange}
          />
          
          {/* Nome e botão enviar */}
          <div className="flex items-center justify-between mt-3">
            <Input placeholder="O seu nome" value={clientName} ... />
            <Button onClick={handleSubmitComment} disabled={!commentText.trim()}>
              <Send className="h-4 w-4 mr-1" />
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  </div>
</div>
```

### Estados Removidos
- `isCommentMode` - já não necessário pois o input está sempre visível
- `enterCommentMode()` - substituído pela lógica automática
- `cancelCommentMode()` - substituído por limpar o texto

### UX Melhorada
1. Utilizador vê o vídeo
2. Quando quer comentar, simplesmente começa a escrever
3. O vídeo pausa automaticamente e o timecode é capturado
4. Vê o badge com "00:01:23" junto ao input
5. Escreve o comentário e envia
6. Pode continuar a ver o vídeo

### Resultado Visual

```text
+--------------------+  +----------------------------------+
|                    |  |                                  |
|   COMENTÁRIOS      |  |           VIDEO PLAYER           |
|                    |  |                                  |
|  ┌────────────┐    |  +----------------------------------+
|  │00:01:23    │    |  |                                  |
|  │ "Ajustar..." │  |  |  [●] 00:01:23  Escreve aqui...   |
|  │ João • 5min│    |  |  Nome: [João Silva___]  [Enviar] |
|  └────────────┘    |  +----------------------------------+
|                    |
|  ┌────────────┐    |
|  │00:02:45    │    |
|  │ "Mudar..."  │   |
|  └────────────┘    |
+--------------------+
```
