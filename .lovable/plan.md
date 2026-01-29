
# Análise Detalhada: Módulo de Upload e Aprovação de Vídeo

## Resumo Executivo

Após uma análise exaustiva do código e base de dados, identifiquei **6 problemas críticos** e **3 melhorias importantes** que afetam o funcionamento do módulo de produção de vídeo.

---

## Problemas Críticos Identificados

### 🔴 1. Portal Público Sem Acesso a Dados (BLOQUEADOR)

**Localização:** `src/pages/public/VideoApproval.tsx`

**Problema:** A página pública de aprovação (`/video-approval/:token`) tenta aceder a tabelas protegidas por RLS usando o cliente Supabase sem autenticação. As políticas RLS exigem `is_workspace_member(auth.uid(), workspace_id)`, mas visitantes não estão autenticados.

**Tabelas afetadas:**
- `video_approval_tokens` - Não tem política para acesso público
- `video_versions` - Não tem política para acesso público  
- `video_comments` - Não tem política para acesso público via token
- `video_approvals` - Não tem política para INSERT público via token
- `tasks` e `projects` (joined) - Sem acesso público

**Resultado:** Clientes veem "Link Inválido" mesmo com token válido.

**Solução:** Criar uma Edge Function `get-video-approval-data` que:
1. Valida o token
2. Usa service role para buscar dados
3. Gera signed URLs para os vídeos
4. Retorna todos os dados necessários

---

### 🔴 2. Storage Bucket Privado Sem Política para Tokens

**Localização:** Storage bucket `video-versions`

**Problema:** O bucket está configurado como `public: false`, e a política de SELECT exige que o utilizador seja membro do workspace:

```sql
SELECT ... WHERE is_workspace_member(auth.uid(), vv.workspace_id)
```

**Resultado:** Clientes não conseguem reproduzir vídeos no portal público.

**Solução:** A Edge Function deve gerar signed URLs com prazo curto (15-30 min) para os vídeos, contornando a necessidade de políticas públicas no storage.

---

### 🔴 3. Inserção de Comentários/Aprovações Públicos Falha

**Localização:** `src/pages/public/VideoApproval.tsx` linhas 290-350

**Problema:** O código tenta inserir `video_comments` e `video_approvals` diretamente, mas as políticas RLS exigem:
- Para comentários: `author_id = auth.uid()` (mas cliente é anónimo)
- Para aprovações: `is_workspace_member(auth.uid(), workspace_id)`

**Resultado:** Clientes não conseguem comentar nem aprovar vídeos.

**Solução:** Criar Edge Function `submit-video-feedback` que:
1. Valida o token
2. Usa service role para inserir comentários/aprovações
3. Marca como `is_client_comment = true`

---

### 🟡 4. Token Hash Não Gerado

**Localização:** Tabela `video_approval_tokens`

**Problema:** O campo `token_hash` está `NULL` para tokens existentes. Se houver trigger para hash (como em workspace_invitations), não está a funcionar para video_approval_tokens.

```sql
-- Resultado da query:
-- token_hash: <nil> para todos os tokens
```

**Impacto:** Menor se a validação usar token directo, mas é uma inconsistência de segurança.

**Solução:** Verificar se existe trigger para hash e corrigir, ou remover coluna se não for usada.

---

### 🟡 5. Inconsistência task_id vs project_id

**Localização:** Múltiplos ficheiros

**Problema:** O módulo foi inicialmente desenhado para tarefas (`task_id`), mas há uma transição para projectos (`project_id`). Alguns registos têm `task_id = NULL`:

```sql
-- Dados existentes:
-- Alguns video_versions com task_id: NULL, project_id: preenchido
-- Alguns video_approval_tokens com task_id: NULL, project_id: preenchido
```

**Componentes afectados:**
- `VideoProductionTab` recebe `taskId` mas alguns vídeos estão ao nível do projecto
- `useVideoVersions` filtra por `task_id`
- `VideoApproval.tsx` (público) assume sempre `task_id`

**Solução:** Unificar o modelo para suportar ambos os cenários:
1. Permitir filtrar por `project_id` quando `task_id` é null
2. Actualizar queries para usar `COALESCE`

---

### 🟡 6. Warnings do Linter de Segurança

**Localização:** Base de dados

**Problemas identificados:**
1. **Function Search Path Mutable** - Funções sem `search_path` definido
2. **RLS Policy Always True** (x3) - Políticas com `USING (true)` em operações sensíveis

**Impacto:** Potenciais vulnerabilidades de segurança.

**Solução:** Auditar e corrigir as políticas identificadas.

---

## Melhorias Recomendadas

### 📊 1. Progresso de Upload Mais Preciso

**Localização:** `useVideoVersions.ts` linha 113

**Problema:** O progresso de upload salta de 0% para 70% quando o ficheiro termina. Supabase JS SDK não expõe progresso de upload nativo.

**Melhoria:** Implementar upload chunked ou usar XMLHttpRequest para progresso real.

---

### 📊 2. Comparação A/B no Portal Público

**Localização:** `src/pages/public/VideoApproval.tsx`

**Estado:** O botão "Comparar" existe mas o segundo player não está implementado (linhas 458-467 apenas toggle, sem render do segundo vídeo).

**Melhoria:** Completar a funcionalidade de side-by-side comparison.

---

### 📊 3. Sincronização Player ↔ Comentários

**Localização:** `VideoProductionTab.tsx` linha 106

**Problema:** A função `handleSeekToTimestamp` está vazia - não passa a referência do player para os comentários.

```typescript
const handleSeekToTimestamp = useCallback((timestamp: number) => {
  // This would need a ref to the video player
  // For now, we can pass it down
}, []);
```

**Melhoria:** Implementar `useImperativeHandle` no `VideoPlayer` para expor método `seekTo`.

---

## Plano de Correção Técnica

### Fase 1: Edge Functions para Acesso Público (Crítico)

#### 1.1 Criar `supabase/functions/get-video-approval-data/index.ts`

```typescript
// Endpoint: GET /get-video-approval-data?token=xxx
// 1. Valida token na tabela video_approval_tokens
// 2. Verifica expiração
// 3. Busca versões, comentários, aprovações
// 4. Gera signed URLs para cada vídeo
// 5. Retorna dados agregados
```

#### 1.2 Criar `supabase/functions/submit-video-feedback/index.ts`

```typescript
// Endpoint: POST /submit-video-feedback
// Body: { token, type: 'comment'|'approval', data: {...} }
// 1. Valida token
// 2. Insere comentário ou aprovação com is_client_comment = true
// 3. Retorna sucesso
```

#### 1.3 Actualizar `src/pages/public/VideoApproval.tsx`

- Substituir queries directas por chamadas às edge functions
- Usar signed URLs retornadas pela API
- Submeter feedback via edge function

---

### Fase 2: Correcções de Dados e Consistência

#### 2.1 Suportar project_id quando task_id é null

**Ficheiros:**
- `useVideoVersions.ts` - Adicionar fallback para project_id
- `useVideoApproval.ts` - Adicionar fallback para project_id
- `useVideoComments.ts` - Actualizar queries

#### 2.2 Limpar token_hash

**SQL Migration:**
```sql
-- Se não for usado, remover coluna ou deixar como está
-- Se for usado, criar trigger similar ao de workspace_invitations
```

---

### Fase 3: Melhorias de UX

#### 3.1 Implementar seekTo no VideoPlayer

```typescript
// VideoPlayer.tsx
useImperativeHandle(ref, () => ({
  seekTo: (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }
}));
```

#### 3.2 Conectar TimestampComments ao Player

```typescript
// VideoProductionTab.tsx
const videoPlayerRef = useRef<{ seekTo: (time: number) => void }>(null);

<VideoPlayer ref={videoPlayerRef} ... />
<TimestampComments onSeekTo={(t) => videoPlayerRef.current?.seekTo(t)} />
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/get-video-approval-data/index.ts` | **CRIAR** - Edge function para dados públicos |
| `supabase/functions/submit-video-feedback/index.ts` | **CRIAR** - Edge function para feedback |
| `src/pages/public/VideoApproval.tsx` | Usar edge functions em vez de queries directas |
| `src/hooks/useVideoVersions.ts` | Suportar filtro por project_id |
| `src/hooks/useVideoApproval.ts` | Suportar filtro por project_id |
| `src/components/video-production/VideoPlayer.tsx` | Expor ref com seekTo |
| `src/components/video-production/VideoProductionTab.tsx` | Conectar player aos comentários |
| `supabase/config.toml` | Registar novas edge functions |

---

## Prioridade de Implementação

1. **CRÍTICO** - Edge functions + actualização VideoApproval.tsx (corrige bloqueador)
2. **ALTO** - Suporte project_id nos hooks (dados existentes)
3. **MÉDIO** - SeekTo nos comentários (UX)
4. **BAIXO** - Comparação A/B, progresso upload

---

## Validação Após Implementação

1. Abrir link público de aprovação - deve mostrar vídeo e permitir reprodução
2. Adicionar comentário como cliente - deve aparecer na lista
3. Aprovar vídeo como cliente - deve mostrar estado "Aprovado"
4. Clicar em timestamp de comentário - player deve saltar para o momento
5. Upload de novo vídeo - deve aparecer na lista de versões
