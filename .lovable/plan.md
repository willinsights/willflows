

## Limpar Todos os Uploads e Versões de Vídeo

### O que vai ser feito

1. **Marcar todas as versões como eliminadas na base de dados**
   - Atualizar `is_deleted = true` e `deleted_at = NOW()` para todos os registos em `video_versions`
   - Isto remove imediatamente da interface

2. **Atualizar o armazenamento do workspace**
   - Subtrair os bytes utilizados de `workspace_storage` para cada versão eliminada

3. **Limpeza física (R2 + Cloudflare Stream)**
   - Os ficheiros no R2 e os vídeos no Cloudflare Stream serão removidos pelo cron job existente ou podem ser forçados manualmente através de uma Edge Function dedicada

### Alternativa: Eliminação física imediata
Se quiseres também eliminar imediatamente os ficheiros do R2 e do Cloudflare Stream (não apenas marcar como eliminados), posso criar uma Edge Function de limpeza que:
- Apaga os objectos do bucket R2
- Remove os vídeos do Cloudflare Stream via API
- Depois elimina os registos da base de dados

### Ficheiros/Tabelas afectados
- **Tabela**: `video_versions` — 9 registos serão marcados como eliminados (ou removidos)
- **Tabela**: `workspace_storage` — atualizar `storage_used_bytes`
- **R2**: 9 objectos a eliminar
- **Cloudflare Stream**: 6 vídeos com `cloudflare_stream_uid` a eliminar

### Passos técnicos
```sql
-- 1. Marcar todas as versões como eliminadas
UPDATE video_versions 
SET is_deleted = true, deleted_at = NOW() 
WHERE is_deleted = false;

-- 2. Reset do storage (opcional, se quisermos zerar)
UPDATE workspace_storage 
SET storage_used_bytes = 0, last_calculated_at = NOW();
```

### Notas
- Esta operação é **irreversível** após a limpeza física
- Os vídeos deixarão de aparecer imediatamente na UI
- A limpeza do R2/Stream pode ser feita via cron existente ou forçada

