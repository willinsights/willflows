

## Importar Projetos no Kanban (CSV/Texto)

### O que muda
O botao "Importar" aparece no header de cada Kanban (Captacao e Edicao), ao lado do botao "+ Novo". Permite criar multiplos projetos de uma vez a partir de texto colado ou ficheiro CSV.

### Fluxo do utilizador

```text
[Kanban Header] --> [Clica "Importar"] --> [Modal abre]
                                              |
                              [Cola texto ou upload CSV]
                                              |
                              [Pre-visualizacao em tabela]
                                              |
                         [Selecionar/editar] --> [Importar]
```

1. No Kanban, clica no botao "Importar" (ao lado de "+ Novo")
2. Modal abre com duas opcoes: colar texto ou upload CSV
3. Pre-visualizacao com tabela editavel
4. Seleciona quais projetos importar
5. Projetos sao criados na primeira coluna do Kanban atual

### Formato de entrada

**Texto simples (um projeto por linha):**
```
Casamento Ana e Pedro
Video Corporativo Empresa X
Sessao Recem-Nascido Maria
```

**CSV com headers:**
```
nome,cliente,prioridade,tipo,data_captacao,data_entrega,cidade,notas
Casamento Ana,Ana Silva,alta,projeto_completo,2026-03-15,2026-04-15,Lisboa,Cerimonia + festa
Video Corp,Empresa X,media,projeto_edicao,,,Porto,
```

### Campos suportados no CSV
- `nome` / `name` (obrigatorio)
- `cliente` / `client` (match por nome existente)
- `prioridade` / `priority` (baixa/media/alta/urgente)
- `tipo` / `type` / `item_type` (projeto_captacao/projeto_edicao/projeto_completo/reuniao)
- `data_captacao` / `shoot_date`
- `data_entrega` / `delivery_date`
- `cidade` / `city`
- `notas` / `notes`
- `codigo` / `project_code`
- `valor` / `agreed_value`

### Validacao e duplicados
- Nome obrigatorio (linhas sem nome sao ignoradas)
- Detecao de duplicados por nome dentro do workspace
- Match de clientes por nome (case-insensitive) contra clientes existentes
- Prioridade default: "media"
- Tipo default: "projeto_completo"
- Limite: 50 projetos por importacao

### Ficheiros a criar/alterar

| Ficheiro | Acao |
|----------|------|
| `src/components/projects/ImportProjectsModal.tsx` | **Criar** -- modal de importacao de projetos (CSV/texto) |
| `src/components/kanban/KanbanBoard.tsx` | **Alterar** -- adicionar botao "Importar" no header ao lado de "+ Novo" |
| `src/components/projects/ProjectChecklistTab.tsx` | **Alterar** -- remover botao de importar tarefas (estava no local errado) |

### Detalhes tecnicos

**ImportProjectsModal.tsx:**
- Props: `open`, `onOpenChange`, `phase` (captacao/edicao), `onSuccess`
- Dois modos: textarea para colar texto, ou input file para CSV
- Parser inteligente: detecta se tem headers CSV (presenca de virgulas + header row) ou texto simples
- Mapeamento automatico de colunas PT/EN
- Match de clientes por nome contra lista existente (useClients hook)
- Pre-visualizacao em tabela com checkbox por linha, campos editaveis inline (nome, cliente, prioridade, tipo)
- Badge "Duplicado" amarelo quando nome ja existe no workspace
- Insercao batch via useProjects ou supabase.from('projects').insert()
- Projetos criados com `current_phase` = phase do Kanban, coluna = primeira coluna nao-final
- workspace_id e created_by obtidos do contexto

**KanbanBoard.tsx:**
- Novo botao `Upload` com icone ao lado do "+ Novo"
- Abre ImportProjectsModal passando phase e callback onSuccess = refresh
- Estilo compacto, consistente com o botao Novo existente
