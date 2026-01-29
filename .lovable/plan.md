
# Plano de Implementação: Módulo de Vídeo com Cloudflare R2/Stream

## ✅ IMPLEMENTADO

### Fase 1: Edge Functions para Upload e Streaming ✅

- **`r2-upload-url`** - Gera presigned URL para upload direto ao R2
- **`stream-process-video`** - Processa vídeo no Cloudflare Stream após upload
- **`stream-get-status`** - Verifica status de transcodificação

### Fase 2: Migração de Base de Dados ✅

Colunas adicionadas à tabela `video_versions`:
- `cloudflare_stream_uid` - UID do vídeo no Stream
- `r2_key` - Chave do ficheiro no R2
- `stream_status` - Estado do processamento (pending, processing, ready, error)
- `stream_playback_url` - URL de reprodução
- `is_deleted` - Flag de eliminação lógica
- `deleted_at` - Data de eliminação

Função criada:
- `add_workspace_storage()` - RPC para actualizar storage

Trigger actualizado:
- `queue_video_retention()` - Agora usa 7 dias (em vez de 14) e suporta status 'finalizada'

### Fase 3: Hook de Upload Actualizado ✅

**`useVideoVersions.ts`**:
- Upload direto para R2 via presigned URL
- Progresso real de upload com XMLHttpRequest
- Polling para status de transcodificação
- Suporte a versões Cloudflare e legacy (Supabase Storage)

### Fase 4: Player de Vídeo Actualizado ✅

**`VideoPlayer.tsx`**:
- Suporte a Cloudflare Stream (iframe)
- Fallback para vídeo nativo (legacy)
- Estado de "A processar" durante transcodificação
- API `seekTo` mantida para comentários

### Fase 5: Cleanup Actualizado ✅

**`cleanup-expired-videos`**:
- Deleta de Cloudflare R2
- Remove do Cloudflare Stream
- Mantém metadados (comentários, aprovações)
- Suporta vídeos legacy (Supabase Storage)

---

## Próximos Passos

1. **Testar upload** de vídeo na aba Produção
2. **Verificar reprodução** após transcodificação
3. **Testar aprovação** via portal público

---

## Secrets Configurados ✅

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY`
- `CLOUDFLARE_R2_SECRET_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `CLOUDFLARE_STREAM_TOKEN`
