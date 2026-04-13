

# Card Verde para Vídeos Aprovados no Kanban

## Resumo
Quando um vídeo é aprovado no Review Studio, o card no Kanban da Edição fica com fundo verde para indicar visualmente a aprovação.

## O que muda

**1. Hook useKanban.ts** — Buscar aprovações dos projetos
- Após carregar os projetos, consultar a tabela `video_approvals` filtrando pelos `project_id`s
- Criar um Set com os IDs dos projetos que têm pelo menos uma aprovação
- Adicionar `has_approved_video: boolean` ao `ProjectWithClient`

**2. Interface ProjectWithClient** — Novo campo
- Adicionar `has_approved_video?: boolean` ao tipo

**3. KanbanCard.tsx** — Estilo verde
- Quando `project.has_approved_video === true`, aplicar classes de borda/fundo verde (ex: `border-emerald-500/60 bg-emerald-500/10`)
- Adicionar um badge ou ícone de "Aprovado" no header do card

**4. Memo comparison** — Incluir `has_approved_video` na comparação do memo para evitar re-renders desnecessários

## Detalhes Técnicos

```text
useKanban.ts:
  fetchColumnsData()
    ├── ...existing queries...
    └── NEW: SELECT DISTINCT project_id FROM video_approvals WHERE project_id IN (projectIds)
         → approvedProjectIds: Set<string>
         → project.has_approved_video = approvedProjectIds.has(project.id)

KanbanCard.tsx:
  className={cn(
    'kanban-card ...',
    project.has_approved_video && 'border-emerald-500/60 bg-emerald-500/10',
    ...
  )}
```

## Ficheiros alterados
- `src/hooks/useKanban.ts` — query + tipo + mapeamento
- `src/components/kanban/KanbanCard.tsx` — estilo verde + memo

