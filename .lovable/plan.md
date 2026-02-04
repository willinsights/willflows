
# Plano: Corrigir Storage Manager para Mostrar Vídeos

## Problema Identificado

A aba "Armazenamento" mostra "Nenhum vídeo armazenado" porque a query está a falhar com **erro 400**:

```
column tasks_1.client_approval_status does not exist
```

### Causa Raiz
O `StorageManagerTab.tsx` está a tentar selecionar colunas que **não existem** na tabela `tasks`:
- `client_approval_status` 
- `client_approved_at`

Estas colunas existem na tabela `video_approvals`, não na tabela `tasks`.

### Dados na Base de Dados
A query direta confirmou que existem **20+ vídeos** no workspace, mas a query do frontend falha silenciosamente.

---

## Solução

Corrigir a query no `StorageManagerTab.tsx` para:
1. Remover referências às colunas inexistentes da tabela `tasks`
2. Obter o status de aprovação da tabela `video_approvals` via join

### Alterações no Ficheiro

**Ficheiro:** `src/components/storage/StorageManagerTab.tsx`

**Linhas 85-109 (Query atual com erro):**
```tsx
const { data, error } = await supabase
  .from('video_versions')
  .select(`
    id,
    version_number,
    file_name,
    file_size_bytes,
    created_at,
    cloudflare_stream_uid,
    stream_status,
    project_id,
    task_id,
    projects!project_id (
      name,
      clients (name)
    ),
    tasks!task_id (
      title,
      client_approval_status,     // ❌ NÃO EXISTE
      client_approved_at          // ❌ NÃO EXISTE
    )
  `)
```

**Query corrigida:**
```tsx
const { data, error } = await supabase
  .from('video_versions')
  .select(`
    id,
    version_number,
    file_name,
    file_size_bytes,
    created_at,
    cloudflare_stream_uid,
    stream_status,
    project_id,
    task_id,
    projects!project_id (
      name,
      clients (name)
    ),
    tasks!task_id (
      title
    ),
    video_approvals!video_version_id (
      approved_by_client,
      approved_at
    )
  `)
```

### Mapeamento dos Dados

Também será necessário atualizar o mapeamento (linhas 112-126) para usar os novos campos:

```tsx
return (data || []).map((v: any) => {
  const latestApproval = v.video_approvals?.[0]; // Primeira aprovação (mais recente)
  
  return {
    id: v.id,
    version_number: v.version_number,
    file_name: v.file_name,
    file_size_bytes: v.file_size_bytes,
    created_at: v.created_at,
    cloudflare_stream_uid: v.cloudflare_stream_uid,
    stream_status: v.stream_status,
    project_id: v.project_id,
    project_name: v.projects?.name,
    client_name: v.projects?.clients?.name,
    task_title: v.tasks?.title,
    approval_status: latestApproval?.approved_by_client ? 'approved' : null,
    approved_at: latestApproval?.approved_at,
  };
}) as VideoVersionWithProject[];
```

---

## Impacto

| Componente | Antes | Depois |
|------------|-------|--------|
| Storage Manager | Erro 400, lista vazia | Lista de vídeos por projeto |
| Breakdown por tipo | 0 KB em tudo | Valores reais |
| Status aprovação | N/A | Mostra "Aprovado" e "Expira em X dias" |

---

## Secção Técnica

### Estrutura das Tabelas

```text
video_versions
├── id
├── workspace_id
├── project_id (FK → projects)
├── task_id (FK → tasks)
├── file_size_bytes
└── ...

video_approvals  
├── video_version_id (FK → video_versions)
├── approved_by_client
├── approved_at
└── ...

tasks
├── id
├── title
└── (NÃO tem client_approval_status)
```

### Teste Após Correção
1. Navegar para `/app/media` > aba "Armazenamento"
2. Verificar que os vídeos aparecem agrupados por projeto
3. Verificar que o breakdown mostra valores corretos (ex: ~9.18 GB em Vídeos)
4. Verificar que vídeos aprovados mostram badge de status
