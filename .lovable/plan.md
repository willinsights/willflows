

## Importacao Inteligente de Tarefas com IA

### Conceito
O utilizador cola texto livre (briefing de cliente, notas de reuniao, email, etc.) e a IA analisa o conteudo, extraindo automaticamente tarefas estruturadas com titulo, descricao, fase, prioridade e sub-itens de checklist.

### Fluxo do utilizador

```text
[Colar texto livre] --> [IA processa] --> [Pre-visualizacao com tarefas extraidas]
                                              |
                                    [Editar/selecionar] --> [Importar]
```

1. Abre o modal "Importar Tarefas" no ProjectChecklistTab
2. Cola texto livre (ex: "Precisamos gravar a entrevista com o CEO na sexta, depois editar o video com correcao de cor e adicionar legendas")
3. Clica "Analisar com IA"
4. A IA devolve tarefas estruturadas em tabela de pre-visualizacao
5. O utilizador pode editar, remover ou adicionar tarefas antes de confirmar
6. Clica "Importar" para criar tudo no projeto

### Ficheiros a criar/alterar

| Ficheiro | Acao |
|----------|------|
| `supabase/functions/ai-parse-tasks/index.ts` | Criar -- edge function que usa Lovable AI (Gemini) para extrair tarefas de texto livre |
| `src/components/tasks/ImportTasksModal.tsx` | Criar -- modal com textarea, botao IA, pre-visualizacao e importacao |
| `src/components/projects/ProjectChecklistTab.tsx` | Alterar -- adicionar botao "Importar Tarefas" |
| `supabase/config.toml` | Alterar -- registar nova edge function |

### Detalhes tecnicos

**Edge Function `ai-parse-tasks`:**
- Usa Lovable AI Gateway (`LOVABLE_API_KEY` ja configurado) com modelo `google/gemini-3-flash-preview`
- Recebe `{ text: string, currentPhase: string }` no body
- Usa tool calling para obter output estruturado com schema:
  - `tasks[]`: titulo, descricao, fase (captacao/edicao), prioridade (baixa/media/alta/urgente), checklist_items[]
- Prompt de sistema contextualizado para producao audiovisual (captacao = filmagem/gravacao, edicao = pos-producao)
- Autenticacao obrigatoria (valida JWT)
- Tratamento de erros 429/402 com mensagens claras

**ImportTasksModal.tsx:**
- Dois modos: "Texto com IA" (default) e "CSV manual" (fallback)
- No modo IA: textarea grande + botao "Analisar com IA" com loading
- Pre-visualizacao em tabela editavel: titulo, descricao, fase, prioridade, sub-itens
- Cada tarefa tem checkbox para selecao
- Campos editaveis inline antes de importar
- Detecao de duplicados por titulo contra tarefas existentes do projeto
- Importacao batch: insere tarefas na tabela `tasks` e sub-itens em `task_checklists`
- Limite de 50 tarefas por importacao
- Fase default: usa `currentPhase` do projeto

**ProjectChecklistTab.tsx:**
- Novo botao "Importar" com icone Upload ao lado dos botoes existentes em cada PhaseChecklistSection
- Abre o ImportTasksModal passando projectId, workspaceId, currentPhase e tarefas existentes

