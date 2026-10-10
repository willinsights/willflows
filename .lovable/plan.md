# Ordenação dos cards no Kanban de Captação

## Objetivo

Mudar a ordenação dos cards dentro das colunas **apenas no Kanban de Captação** (`phase = 'captacao'`). O Kanban de Edição fica exatamente como está.

## Estado atual (verificado)

- A ordenação acontece no cliente, em `src/hooks/kanban/useKanbanData.ts` (linhas 81–89): prioridade alta/urgente primeiro, depois `delivery_date` ascendente. Empates ficam com ordem arbitrária.
- A RPC `get_kanban_board` devolve **todas** as colunas de `projects` via `to_jsonb(fp.*)` — confirmado na definição da função. Os campos `shoot_date` (date) e `shoot_start_time` (time) existem na tabela `projects` e **já vêm no payload**. Não é preciso alterar a RPC nem a base de dados.

## Nova regra (só Captação)

1. Grupo de prioridade mantém-se: alta/urgente em cima, restantes depois.
2. Dentro de cada grupo: `shoot_date` ascendente, depois `shoot_start_time` ascendente. Cards sem data ou sem hora vão para o fim do grupo.
3. Desempate final: `delivery_date` ascendente, depois `name` (ordem determinística).

## Ficheiros a alterar

**Apenas 1 ficheiro:** `src/hooks/kanban/useKanbanData.ts`

- No `sort` dos projetos de cada coluna, escolher o comparador consoante a fase:
  - `phase === 'captacao'` → novo comparador (regra acima).
  - `phase === 'edicao'` → comparador atual, inalterado (mesma lógica, copiada tal qual).
- O hook já recebe `phase` como argumento, por isso a ramificação é local e simples.

Nada mais é tocado: drag & drop, virtualização, realtime, `KanbanCard`, RPC, base de dados — tudo intacto.

## Detalhes técnicos

- Comparador de Captação (pseudo-código):

```text
se urgente(a) != urgente(b)        → urgentes primeiro
se shoot_date(a) != shoot_date(b)  → data mais cedo primeiro; nulls no fim
se shoot_start_time diferente      → hora mais cedo primeiro; nulls no fim
se delivery_date diferente         → data mais cedo primeiro; nulls no fim
senão                              → name.localeCompare (pt)
```

- `shoot_start_time` vem como string `"HH:MM:SS"` no JSON — comparação de strings funciona para ordenação.
- A função de ordenação passa a depender de `phase`, que já está no escopo do hook.

## Riscos

- **Baixo.** A mudança é só de apresentação (ordem visual); não altera dados nem posições guardadas.
- Cards de Captação sem `shoot_date` passam a aparecer no fim do seu grupo de prioridade — é o comportamento pedido, mas muda a ordem atual de alguns cards.
- A ordenação aplica-se no carregamento/refresh; o drag & drop manual continua a funcionar como hoje (o realtime reordena no refresh seguinte, comportamento já existente).

## Validação

- Typecheck do projeto.
- Teste visual no preview: abrir Captação e confirmar a nova ordem; abrir Edição e confirmar que nada mudou.
