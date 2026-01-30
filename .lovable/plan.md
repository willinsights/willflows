
## Melhorar Comentários ao Estilo Frame.io

### Objetivo
Transformar a experiência de comentários na página de aprovação do cliente para se assemelhar ao Frame.io, com:
- **Timecode profissional** no formato SMPTE (00:00:00)
- **Comentários inline** no vídeo (clicar para comentar diretamente na timeline)
- **Marcadores visuais** na barra de progresso
- **Lista de comentários** com navegação rápida
- **Input de comentário** integrado no player

### Alterações Planeadas

#### 1. Formato de Timecode Profissional
Atualizar a função `formatDuration` para suportar formato SMPTE:
- Formato atual: `5s`, `1m 30s`
- Novo formato: `00:00:05`, `00:01:30`

Criar nova função `formatTimecode()` em `src/lib/duration-utils.ts`:
```typescript
export function formatTimecode(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
```

#### 2. Comentários Inline no Player (VideoApproval.tsx)
Adicionar modo de comentário direto:
- Clicar na timeline para definir ponto de comentário
- Input de comentário aparece junto ao vídeo (não em modal)
- Mostrar preview do frame no momento do comentário

```text
+------------------------------------------+
|                                          |
|              [VIDEO PLAYER]              |
|                                          |
+------------------------------------------+
|  [●] 00:01:23  Input de comentário...  ▶ |
+------------------------------------------+
|  ● 00:00:45  |  ✓ 00:02:10  |  ● 00:03:22 | <- marcadores
+------------------------------------------+
```

#### 3. Marcadores de Comentário Melhorados
Na barra de progresso do vídeo:
- Marcadores coloridos (amarelo = aberto, verde = resolvido)
- Tooltip ao hover mostrando preview do comentário
- Números indicando quantidade de comentários no mesmo timestamp

#### 4. Lista de Comentários Redesenhada
Painel lateral com:
- Agrupamento por versão (se A/B comparison ativo)
- Timecode clicável em formato profissional
- Indicador de status (aberto/resolvido)
- Avatar e nome do comentador
- Timestamp relativo ("há 5 min")

#### 5. Input de Comentário Integrado
Substituir modal por input inline:
- Campo de nome (guardado em localStorage para reutilização)
- Campo de comentário com auto-expand
- Botão de enviar integrado
- Indicador visual do timecode actual

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/duration-utils.ts` | Adicionar `formatTimecode()` para formato SMPTE |
| `src/pages/public/VideoApproval.tsx` | Redesenhar secção de comentários, input inline, marcadores melhorados |
| `src/components/video-production/TimestampComments.tsx` | Atualizar formato de timecode (para consistência interna) |

### Detalhes Técnicos

#### Nova Função de Timecode
```typescript
// src/lib/duration-utils.ts
export function formatTimecode(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  // Formato compacto para vídeos curtos (< 1h)
  if (hours === 0) {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
```

#### Componente de Input Inline
- Mostra timecode actual em destaque
- Campo de nome com persistência em localStorage
- Textarea expansível para comentário
- Botão de cancelar e enviar
- Aparece quando utilizador clica na timeline ou botão de comentário

#### Marcadores na Timeline
- Círculos coloridos sobre a barra de progresso
- Tamanho proporcional (normal ou maior se múltiplos comentários)
- Hover mostra tooltip com:
  - Timecode
  - Preview do comentário (primeiras 50 chars)
  - Autor
  - Status

### Resultado Esperado
- Experiência de revisão de vídeo profissional e familiar
- Timecodes legíveis e consistentes
- Navegação rápida entre comentários
- Input de comentário fluido sem interrupções
