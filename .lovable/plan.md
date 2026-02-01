

# Plano: Corrigir Formato de Timecode no Player de Produção

## Problema

O player na aba "Produção" do modal de tarefa usa `formatDuration()` que mostra segundos simples (ex: `7.516504s / 49s`), em vez do formato profissional SMPTE `HH:MM:SS:FF` (ex: `00:00:07:51`) que é usado no portal de aprovação.

| Componente | Formato Actual | Formato Esperado |
|------------|----------------|------------------|
| Modal Produção | `7.516504s / 49s` | `00:00:07:51 / 00:00:49:00` |
| Portal Cliente | `00:00:07:51` ✓ | - |

## Causa

**Linha 519 de `src/components/video-production/VideoPlayer.tsx`:**
```tsx
{formatDuration(currentTime)} / {formatDuration(duration)}
```

Está a importar `formatDuration` (linha 18) em vez de `formatTimecode`.

## Solução

### Ficheiro: `src/components/video-production/VideoPlayer.tsx`

**1. Alterar import (linha 18):**
```tsx
// Antes
import { formatDuration } from '@/lib/duration-utils';

// Depois
import { formatTimecode } from '@/lib/duration-utils';
```

**2. Alterar exibição do tempo (linha 519):**
```tsx
// Antes
{formatDuration(currentTime)} / {formatDuration(duration)}

// Depois
{formatTimecode(currentTime)} / {formatTimecode(duration)}
```

## Resultado Visual

```text
ANTES:                    DEPOIS:
7.516504s / 49s    →     00:00:07:51 / 00:00:49:00
```

Isto mantém consistência com o formato SMPTE profissional usado em todo o sistema de vídeo, conforme a memória `tech/video/timecode-padrao-smpte`.

