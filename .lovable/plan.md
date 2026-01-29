
# Plano de Implementação: Módulo de Vídeo com Cloudflare R2/Stream

## 🔐 Pré-requisito: Configurar Secrets do Cloudflare

Antes de avançar com o código, precisas adicionar as seguintes credenciais:

| Secret | Descrição |
|--------|-----------|
| `CLOUDFLARE_ACCOUNT_ID` | ID da tua conta Cloudflare |
| `CLOUDFLARE_R2_ACCESS_KEY` | Chave de acesso do R2 |
| `CLOUDFLARE_R2_SECRET_KEY` | Chave secreta do R2 |
| `CLOUDFLARE_R2_BUCKET` | Nome do bucket (ex: `willflow-videos`) |
| `CLOUDFLARE_STREAM_TOKEN` | API Token do Cloudflare Stream |

**Onde obter:**
1. Acede a [dash.cloudflare.com](https://dash.cloudflare.com)
2. R2 → Manage R2 API Tokens → Create API Token
3. Stream → API Tokens

---

## Fase 1: Edge Functions para Upload e Streaming

### 1.1 Criar `r2-upload-url` Edge Function

Gera URL assinada para upload direto ao R2:
- Valida autenticação e workspace
- Verifica limite de storage
- Retorna presigned URL com expiração de 1h

### 1.2 Criar `stream-process-video` Edge Function

Após upload, submete ao Cloudflare Stream:
- Cria video no Stream a partir do R2
- Aguarda transcodificação
- Guarda `stream_uid` na base de dados
- Actualiza storage usado no workspace

---

## Fase 2: Migração de Base de Dados

Adicionar colunas à tabela `video_versions`:

```sql
ALTER TABLE public.video_versions 
ADD COLUMN cloudflare_stream_uid TEXT,
ADD COLUMN r2_key TEXT,
ADD COLUMN stream_status TEXT DEFAULT 'pending',
ADD COLUMN stream_playback_url TEXT;
```

---

## Fase 3: Actualizar Hook de Upload

Modificar `useVideoVersions.ts`:

1. Obter presigned URL via `r2-upload-url`
2. Upload direto ao R2 com XMLHttpRequest (progresso real)
3. Chamar `stream-process-video` após upload
4. Polling para verificar status de transcodificação

```typescript
// Novo fluxo
const uploadVersion = async ({ file }) => {
  // 1. Obter URL assinada
  const { uploadUrl, key } = await supabase.functions.invoke('r2-upload-url', {...});
  
  // 2. Upload direto ao R2 com progresso
  await uploadToR2(uploadUrl, file, setProgress);
  
  // 3. Processar no Stream
  await supabase.functions.invoke('stream-process-video', { key, ... });
};
```

---

## Fase 4: Actualizar Player de Vídeo

Duas opções para o player Cloudflare Stream:

**Opção A - Iframe (mais simples):**
```html
<iframe src="https://customer-{ACCOUNT}.cloudflarestream.com/{VIDEO_UID}/iframe" />
```

**Opção B - SDK React (mais controlo):**
```tsx
import { Stream } from '@cloudflare/stream-react';
<Stream controls src={streamUid} />
```

Manter a API `seekTo` exposta via ref para comentários.

---

## Fase 5: Corrigir Política de Retenção

**Regra actual:** 14 dias após `task.is_completed = true`
**Regra nova:** 7 dias após `task.status = 'finalizada'`

Actualizar trigger SQL:
```sql
-- Agendar apenas quando status = 'finalizada'
IF NEW.status = 'finalizada' THEN
  INSERT INTO video_retention_queue (
    scheduled_deletion_at = NOW() + INTERVAL '7 days'
  );
END IF;

-- Cancelar se tarefa reaberta
IF OLD.status = 'finalizada' AND NEW.status != 'finalizada' THEN
  UPDATE video_retention_queue SET status = 'cancelled';
END IF;
```

---

## Fase 6: Actualizar Edge Function de Cleanup

Modificar `cleanup-expired-videos`:
1. Deletar do Cloudflare R2 (em vez de Supabase Storage)
2. Invalidar vídeo no Cloudflare Stream
3. Limpar URLs mas manter metadados (comentários, aprovações)

---

## Ficheiros a Criar

| Ficheiro | Descrição |
|----------|-----------|
| `supabase/functions/r2-upload-url/index.ts` | Gerar presigned URL para R2 |
| `supabase/functions/stream-process-video/index.ts` | Submeter ao Stream |

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useVideoVersions.ts` | Novo fluxo R2 + Stream |
| `src/components/video-production/VideoPlayer.tsx` | Suporte Stream player |
| `supabase/functions/cleanup-expired-videos/index.ts` | Deletar de R2/Stream |
| `supabase/config.toml` | Registar novas functions |

---

## Próximos Passos

1. **Tu:** Configurar secrets do Cloudflare (clica no botão quando eu pedir)
2. **Eu:** Criar Edge Functions + Migração SQL
3. **Eu:** Actualizar hooks e componentes
4. **Tu:** Testar upload e reprodução
