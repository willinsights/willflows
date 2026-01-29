
# Plano: Modulo Avancado de Producao e Aprovacao de Videos

## Resumo Executivo

Este modulo transforma o WillFlow numa plataforma completa de producao e aprovacao de videos, exclusiva para o plano Studio. Inclui upload de versoes, comentarios por timestamp, aprovacao formal do cliente, gestao de storage por workspace, e monetizacao via Stripe.

---

## Fase 1: Fundacao de Dados e Storage

### 1.1 Novas Tabelas de Base de Dados

**Tabela: `video_versions`** (versoes de video por tarefa)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| task_id | uuid | FK para tasks |
| workspace_id | uuid | FK para workspaces |
| project_id | uuid | FK para projects |
| version_number | integer | V1, V2, V3... |
| file_path | text | Caminho no storage |
| file_name | text | Nome original do ficheiro |
| file_size_bytes | bigint | Tamanho em bytes (para contagem de storage) |
| duration_seconds | integer | Duracao do video |
| mime_type | text | Tipo do ficheiro |
| thumbnail_path | text | Thumbnail gerado |
| uploaded_by | uuid | Quem fez upload |
| created_at | timestamp | Data de upload |

**Tabela: `video_comments`** (comentarios por timestamp)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| video_version_id | uuid | FK para video_versions |
| task_id | uuid | FK para tasks |
| workspace_id | uuid | FK para workspaces |
| timestamp_seconds | decimal | Momento exato do comentario |
| body | text | Texto do comentario |
| status | text | 'open', 'resolved' |
| is_client_comment | boolean | Se e do cliente externo |
| client_name | text | Nome do cliente (se externo) |
| author_id | uuid | Autor interno (se nao cliente) |
| parent_id | uuid | Para respostas |
| resolved_by | uuid | Quem resolveu |
| resolved_at | timestamp | Quando resolveu |
| created_at | timestamp | Data de criacao |

**Tabela: `video_approvals`** (historico de aprovacoes)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| task_id | uuid | FK para tasks |
| video_version_id | uuid | Versao aprovada |
| approved_by_client | boolean | Se foi o cliente |
| client_name | text | Nome do cliente |
| approved_by_user_id | uuid | Membro interno |
| approved_at | timestamp | Data/hora da aprovacao |
| notes | text | Observacoes |

**Tabela: `video_approval_tokens`** (links unicos para clientes)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| task_id | uuid | FK para tasks |
| token | text | Token seguro unico |
| token_hash | text | Hash para lookup |
| client_email | text | Email do cliente (opcional) |
| client_name | text | Nome do cliente |
| expires_at | timestamp | Expiracao automatica |
| is_active | boolean | Se o link esta ativo |
| created_by | uuid | Quem criou o link |
| created_at | timestamp | Data de criacao |

**Tabela: `workspace_storage`** (controlo de storage por workspace)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| workspace_id | uuid | FK para workspaces |
| storage_used_bytes | bigint | Bytes usados |
| storage_limit_bytes | bigint | Limite total |
| base_storage_bytes | bigint | Storage do plano (10GB Studio) |
| extra_storage_bytes | bigint | Storage extra comprado |
| stripe_addon_subscription_id | text | ID da subscription do addon |
| addon_tier | text | '50gb', '100gb', '250gb' ou null |
| last_calculated_at | timestamp | Ultima atualizacao |

**Tabela: `video_retention_queue`** (fila de limpeza automatica)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| task_id | uuid | FK para tasks |
| workspace_id | uuid | FK para workspaces |
| retention_days | integer | Dias a manter |
| scheduled_deletion_at | timestamp | Data agendada |
| status | text | 'pending', 'notified', 'deleted', 'cancelled' |
| notified_at | timestamp | Quando o admin foi notificado |

### 1.2 Storage Bucket

Criar bucket `video-versions`:
- Privado (acesso via signed URLs)
- Limite de tamanho por ficheiro: 5GB
- Tipos permitidos: video/mp4, video/quicktime, video/webm

---

## Fase 2: Feature Gating (Plano Studio)

### 2.1 Atualizar `src/lib/plans.ts`

Adicionar nova feature key `videoApproval`:

```typescript
// Adicionar a FEATURES em plans.ts
{ key: 'videoApproval', name: 'Aprovacao de Video', value: true, included: true, category: 'core' }
// Apenas no plano Studio - nao incluir em Starter/Pro
```

### 2.2 Atualizar `src/hooks/usePlanFeatures.ts`

Adicionar `videoApproval` ao tipo FeatureKey e descricoes.

### 2.3 Componente `VideoApprovalFeatureGate`

Wrapper que mostra FeatureTeaser para planos Starter/Pro.

---

## Fase 3: Integracao na Tarefa

### 3.1 Modificar `TaskModal.tsx`

Adicionar nova aba "Producao de Video" que mostra:
- Timeline/estrutura do video (reutilizar video_structures existente)
- Upload de versoes
- Player de video
- Comentarios por timestamp
- Botao de aprovacao

### 3.2 Novos Componentes

**`src/components/video-production/VideoProductionTab.tsx`**
- Componente principal da aba

**`src/components/video-production/VideoVersionUpload.tsx`**
- Drag-and-drop para upload
- Progresso de upload
- Validacao de formato e tamanho
- Verificacao de limite de storage

**`src/components/video-production/VideoVersionsList.tsx`**
- Lista de versoes (V1, V2...)
- Toggle A/B entre versoes
- Data, autor, tamanho

**`src/components/video-production/VideoPlayer.tsx`**
- Player nativo HTML5
- Controlos customizados
- Marcadores de comentarios na timeline do player
- Botao "Comentar aqui" que pausa e abre modal

**`src/components/video-production/TimestampComments.tsx`**
- Lista de comentarios
- Filtro por status (abertos/resolvidos)
- Click num comentario salta para o timestamp no player
- Respostas em thread

**`src/components/video-production/CommentInputModal.tsx`**
- Modal para adicionar comentario
- Mostra o timestamp atual
- Opcao de converter em subtarefa

**`src/components/video-production/ApprovalButton.tsx`**
- Botao de aprovacao formal
- Confirmacao com assinatura simples
- Registo de quem aprovou e quando

**`src/components/video-production/ApprovalShareLink.tsx`**
- Gerar link unico para cliente
- Mostrar link existente
- Opcao de expirar/regenerar

---

## Fase 4: Pagina Publica de Aprovacao

### 4.1 Nova Rota `/video-approval/:token`

**`src/pages/public/VideoApproval.tsx`**

Pagina publica (sem login) que permite:
- Ver todas as versoes
- Alternar entre versoes (toggle A/B)
- Comentar por timestamp
- Aprovar formalmente

Elementos:
- Header com nome do projeto/tarefa
- Dropdown de versoes
- Player de video fullwidth
- Lista de comentarios (cliente pode adicionar)
- Estrutura de referencia (se existir)
- Botao "Aprovar" proeminente

### 4.2 RPC Seguro para Acesso Publico

Criar funcao `get_video_approval_by_token` que:
- Valida o token
- Retorna dados da tarefa, versoes e comentarios
- Nao expoe dados sensíveis

---

## Fase 5: Gestao de Storage

### 5.1 Hook `useWorkspaceStorage.ts`

```typescript
interface WorkspaceStorage {
  usedBytes: number;
  limitBytes: number;
  usedGB: number;
  limitGB: number;
  percentUsed: number;
  isFull: boolean;
  isNearLimit: boolean; // >80%
  addonTier: string | null;
  canUpload: (fileSizeBytes: number) => boolean;
}
```

### 5.2 Componente `StorageUsageBar.tsx`

Barra visual com:
- Uso atual vs limite
- Cor conforme nivel (verde/amarelo/vermelho)
- Botao "Adicionar armazenamento"

### 5.3 Componente `StorageManagementCard.tsx`

Para pagina de Configuracoes/Planos:
- Uso detalhado
- Top 5 projetos que mais consomem
- Botao para limpar videos antigos
- Upgrade de storage

---

## Fase 6: Stripe - Storage Add-ons

### 6.1 Criar Produtos no Stripe

3 produtos de storage extra:
- +50 GB: 9 EUR/mes
- +100 GB: 15 EUR/mes
- +250 GB: 29 EUR/mes

### 6.2 Edge Function `create-storage-addon-checkout`

Cria sessao de checkout para addon de storage:
- Apenas para workspaces no plano Studio
- Modo subscription
- Metadata com workspace_id e tier

### 6.3 Atualizar `stripe-webhook`

Processar eventos de addon:
- `checkout.session.completed`: ativar storage extra
- `customer.subscription.updated`: ajustar tier
- `customer.subscription.deleted`: remover storage extra

### 6.4 Edge Function `cancel-storage-addon`

Cancela o addon de storage extra.

---

## Fase 7: Retencao e Limpeza Automatica

### 7.1 Trigger de Retencao

Quando tarefa muda para 'Aprovado' ou 'Concluido':
- Inserir registo em `video_retention_queue`
- Prazo configuravel (default 14 dias)

### 7.2 Edge Function `cleanup-expired-videos` (Cron)

Executar diariamente:
1. Buscar videos com `scheduled_deletion_at <= now()`
2. Para cada:
   - Apagar ficheiros do storage
   - Atualizar `workspace_storage.storage_used_bytes`
   - Invalidar tokens de aprovacao
   - Manter historico textual
3. Notificar admin 3 dias antes

### 7.3 Notificacao de Expiracao

Edge Function `notify-video-expiration`:
- Email ao admin do workspace
- Push notification
- Lista de videos que serao apagados

---

## Fase 8: Seguranca

### 8.1 RLS Policies

**video_versions**:
- SELECT: Membros do workspace
- INSERT: Roles admin, editor (se plano Studio)
- DELETE: Admin ou criador

**video_comments**:
- SELECT: Membros do workspace OU cliente com token valido
- INSERT: Membros OU cliente com token
- UPDATE status: Membros do workspace

**video_approval_tokens**:
- SELECT: Admin do workspace OU detentor do token
- INSERT: Admin
- UPDATE: Admin

### 8.2 Signed URLs para Videos

Todos os acessos a ficheiros via signed URLs:
- Expiracao curta (1 hora)
- Validacao de token em pagina publica

### 8.3 Auditoria

Log de todas as acoes:
- Upload de versao
- Comentario
- Aprovacao
- Geracao de link

---

## Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/components/video-production/VideoProductionTab.tsx` | Tab principal |
| `src/components/video-production/VideoVersionUpload.tsx` | Upload com drag-drop |
| `src/components/video-production/VideoVersionsList.tsx` | Lista de versoes |
| `src/components/video-production/VideoPlayer.tsx` | Player customizado |
| `src/components/video-production/TimestampComments.tsx` | Comentarios por tempo |
| `src/components/video-production/CommentInputModal.tsx` | Modal de comentario |
| `src/components/video-production/ApprovalButton.tsx` | Botao de aprovar |
| `src/components/video-production/ApprovalShareLink.tsx` | Gerar/gerir link |
| `src/components/video-production/StorageUsageBar.tsx` | Barra de storage |
| `src/components/video-production/StorageManagementCard.tsx` | Card de gestao |
| `src/components/video-production/VersionCompare.tsx` | Comparacao A/B |
| `src/hooks/useVideoVersions.ts` | CRUD de versoes |
| `src/hooks/useVideoComments.ts` | CRUD de comentarios |
| `src/hooks/useVideoApproval.ts` | Logica de aprovacao |
| `src/hooks/useWorkspaceStorage.ts` | Gestao de storage |
| `src/hooks/usePublicVideoApproval.ts` | Acesso publico |
| `src/pages/public/VideoApproval.tsx` | Pagina publica |
| `supabase/functions/create-storage-addon-checkout/index.ts` | Checkout addon |
| `supabase/functions/cleanup-expired-videos/index.ts` | Limpeza cron |
| `supabase/functions/notify-video-expiration/index.ts` | Notificacoes |

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/lib/plans.ts` | Adicionar feature 'videoApproval' |
| `src/hooks/usePlanFeatures.ts` | Nova FeatureKey |
| `src/components/tasks/TaskModal.tsx` | Adicionar aba 'Producao' |
| `src/App.tsx` | Nova rota publica /video-approval/:token |
| `supabase/functions/stripe-webhook/index.ts` | Processar addons |
| `src/pages/app/Planos.tsx` | Secao de storage addons |
| `src/pages/app/Configuracoes.tsx` | Gestao de storage |

---

## Diagrama de Fluxo

```text
CRIACAO DO VIDEO
================

Editor recebe tarefa
        |
        v
Cria/edita estrutura de video (Timeline)
        |
        v
Faz upload da V1
        |
        v
Gera link de aprovacao para cliente
        |
        v
Cliente acede ao link (sem login)
        |
        v
Cliente ve video, comenta por timestamp
        |
        v
Comentarios aparecem na tarefa (realtime)
        |
        v
Editor faz correcoes, sobe V2
        |
        v
Cliente alterna entre V1/V2
        |
        v
Cliente aprova V2
        |
        v
Tarefa muda para "Aprovado"
        |
        v
Timer de retencao inicia (14 dias)
        |
        v
Admin notificado 3 dias antes
        |
        v
Videos apagados, storage libertado
```

---

## Ordem de Implementacao

**Sprint 1 - Base (3-4 dias)**
1. Migracao: tabelas + bucket + RLS
2. Feature gating no plano Studio
3. Hook useWorkspaceStorage

**Sprint 2 - Upload e Player (2-3 dias)**
4. Componentes de upload e lista de versoes
5. VideoPlayer com timeline
6. Integracao na TaskModal

**Sprint 3 - Comentarios (2 dias)**
7. Sistema de comentarios por timestamp
8. Threads de resposta
9. Marcacao resolved

**Sprint 4 - Aprovacao (2 dias)**
10. Link publico e pagina de aprovacao
11. Fluxo de aprovacao formal
12. Integracao com status da tarefa

**Sprint 5 - Storage e Billing (2 dias)**
13. Stripe addons de storage
14. Webhook updates
15. UI de gestao de storage

**Sprint 6 - Retencao (1-2 dias)**
16. Sistema de retencao
17. Cron de limpeza
18. Notificacoes

---

## Consideracoes Importantes

1. **Limite de 5GB por ficheiro**: Videos 4K podem ultrapassar, considerar compressao server-side futura

2. **Thumbnails**: Gerar automaticamente via edge function ou aceitar upload manual inicial

3. **Streaming vs Download**: Usar video HTML5 nativo com signed URLs (sem HLS/DASH inicialmente)

4. **Mobile**: Player responsivo, interface de comentarios adaptada

5. **Offline**: Nao suportado - requere conexao para ver videos

6. **Comparacao lado-a-lado**: Fase futura - toggle A/B e implementado agora
