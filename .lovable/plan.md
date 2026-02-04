# Plano: Corrigir Erros de Reprodução e Download de Vídeo

## ✅ CONCLUÍDO

As correções foram implementadas com sucesso.

---

## Problemas Resolvidos

### 1. ✅ Erro de Vídeo (Código 4) ao Pausar e Voltar Atrás

**Solução implementada:**
- Adicionado tracking de seek (`seekDetectedRef`, `lastSeekPositionRef`)
- Quando erro ocorre após seek, reinicializa HLS diretamente (sem tentar `recoverMediaError`)
- Flag resetada no evento `playing` para evitar falsos positivos

### 2. ✅ Erro de Download (Toast Vermelho)

**Solução implementada:**
- Mensagem informativa "Download em preparação" quando `download_url` é null
- Já não mostra erro vermelho quando o download ainda está a ser processado

---

## Ficheiros Modificados

1. `src/components/video-production/VideoPlayer.tsx` - Recuperação inteligente após seek
2. `src/hooks/useVideoDownload.ts` - Mensagens informativas em vez de erro
