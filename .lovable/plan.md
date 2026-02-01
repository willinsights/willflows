
# Plano: Corrigir Ecrã de Aprovação de Vídeo

## Problemas Identificados

Da imagem fornecida:

1. **"Tarefa: Checklist Checklist Edição"** - O texto "Checklist" está duplicado e não deveria aparecer como nome da tarefa
2. **Versão aprovada não é mencionada** - O cliente devia ver qual versão foi aprovada (ex: "V2")

---

## Análise Técnica

### Problema 1: Título da Tarefa

O título "Checklist Checklist Edição" vem de dados históricos onde a tarefa foi criada com duplicação. 

**Causa raiz** (linha 236 de `ProjectChecklistTab.tsx`):
```typescript
title: `Checklist ${phaseLabel}`,  // phaseLabel já contém texto
```

Se `phaseLabel` era "Checklist Edição" (versão antiga), resultava em "Checklist Checklist Edição".

**Solução na UI**: Remover o prefixo "Checklist " se já existir no título, ou não mostrar o campo "Tarefa" quando é uma tarefa automática de checklist.

### Problema 2: Versão Aprovada

A tabela `video_approvals` já tem o campo `video_version_id`, mas:
- A Edge Function não faz JOIN para obter o `version_number`
- O frontend não recebe/mostra essa informação

---

## Alterações

### 1. Edge Function `get-video-approval-data/index.ts`

Adicionar JOIN para obter o número da versão aprovada:

```typescript
// Linha ~167: Ao buscar approval, incluir versão
const { data: approvals } = await supabase
  .from('video_approvals')
  .select('*, video_version:video_versions(version_number)')
  .eq('task_id', tokenData.task_id)  // ou project_id
  .order('approved_at', { ascending: false })
  .limit(1);

// Linha ~202: Incluir version_number na resposta
approval: approval ? {
  approved_at: approval.approved_at,
  client_name: approval.client_name,
  notes: approval.notes,
  version_number: approval.video_version?.version_number || null,
} : null,
```

### 2. Frontend `VideoApproval.tsx`

**Interface** (linha ~88):
```typescript
approval: {
  approved_at: string;
  client_name: string | null;
  notes: string | null;
  version_number: number | null;  // NOVO
} | null;
```

**Ecrã de aprovação** (linhas ~618-621):

Antes:
```tsx
<p><strong>Projeto:</strong> {data.task.project_name}</p>
<p><strong>Tarefa:</strong> {data.task.title}</p>
```

Depois:
```tsx
<p><strong>Projeto:</strong> {data.task.project_name}</p>
{/* Mostrar versão aprovada */}
{data.approval.version_number && (
  <p><strong>Versão:</strong> V{data.approval.version_number}</p>
)}
<p><strong>Aprovado em:</strong> {new Date(data.approval.approved_at).toLocaleString('pt-PT')}</p>
```

**Remover linha "Tarefa"**: O campo tarefa não é relevante para o cliente (é interno).

---

## Visual Final

```text
┌─────────────────────────────────────────────┐
│              ✓ (verde)                      │
│                                             │
│         Vídeo Aprovado!                     │
│                                             │
│   Este vídeo foi aprovado por will          │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │ Projeto: Chocopalha visita e prova  │   │
│   │          de vinho                   │   │
│   │ Versão: V2                          │   │ ← NOVO
│   │ Aprovado em: 01/02/2026, 15:43:03   │   │
│   └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/get-video-approval-data/index.ts` | JOIN com video_versions para obter version_number |
| `src/pages/public/VideoApproval.tsx` | Interface + UI sem "Tarefa" + mostrar versão |

---

## Secção Técnica

### Edge Function - Query Actualizada

```typescript
// Substituir query de approvals (linhas 101-105)
let approvalsQuery = supabase
  .from('video_approvals')
  .select('*, video_version:video_versions(version_number)')
  .order('approved_at', { ascending: false })
  .limit(1);
```

### Resposta da API

```typescript
approval: approval ? {
  approved_at: approval.approved_at,
  client_name: approval.client_name,
  notes: approval.notes,
  version_number: (approval.video_version as any)?.version_number || null,
} : null,
```

### Frontend - Ecrã Limpo

```tsx
<div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
  <p><strong>Projeto:</strong> {data.task.project_name}</p>
  {data.approval.version_number && (
    <p><strong>Versão:</strong> V{data.approval.version_number}</p>
  )}
  <p><strong>Aprovado em:</strong> {new Date(data.approval.approved_at).toLocaleString('pt-PT')}</p>
  {data.approval.notes && (
    <p className="mt-2"><strong>Notas:</strong> {data.approval.notes}</p>
  )}
</div>
```

A linha "Tarefa" é removida pois:
- É informação interna (não relevante para cliente)
- Os dados históricos têm títulos confusos ("Checklist Checklist...")
- O nome do projecto é suficiente para identificação
