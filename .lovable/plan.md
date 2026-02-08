

## Corrigir mapeamento inteligente do CSV

### Problema actual
Com o CSV real (`amazorial_reels_2026_v2.csv`), os dados ficam mal distribuidos:
- `id` (ex: `AMAZORIAL_REELS_2026_001`) vai para o **nome** do projeto -- devia ir para **codigo**
- `titulo` (ex: "The Amazon in 50 Seconds") nao e reconhecido -- devia ser o **nome**
- `tipo_projeto` (ex: "SO EDICAO") nao e reconhecido -- devia definir o **tipo**
- Valores como `SO EDICAO`, `REELS` nao existem no mapa de tipos
- A deteccao de CSV so reconhece `nome`/`name`/`cliente`/`client` como headers validos

### O que vai mudar

**1. Corrigir COLUMN_MAP** (mapeamento de headers para campos):

| Header CSV | Antes | Depois |
|---|---|---|
| `id` | name (errado) | projectCode |
| `titulo` / `title` | nao reconhecido | name |
| `tipo_projeto` | nao reconhecido | itemType |

**2. Expandir TYPE_MAP** (valores de tipo aceites):

| Valor no CSV | Tipo atribuido |
|---|---|
| `so edicao` / `só edição` | projeto_edicao |
| `so captacao` / `só captação` | projeto_captacao |
| `reels` / `shortform` | projeto_edicao |

**3. Melhorar deteccao de CSV** -- aceitar qualquer header reconhecido pelo COLUMN_MAP (em vez de apenas `nome`/`cliente`).

### Resultado esperado

Com o CSV fornecido, cada linha sera importada assim:
- **Nome**: "The Amazon in 50 Seconds" (de `titulo`)
- **Codigo**: "AMAZORIAL_REELS_2026_001" (de `id`)
- **Cliente**: "Amazorial" (de `cliente`)
- **Tipo**: projeto_edicao (de `tipo_projeto` = "SO EDICAO")
- **Data entrega**: 2026-02-11 (de `data_entrega`)
- **Cidade**: Amazon (de `cidade`)
- **Notas**: descricao completa do reel (de `descricao`)

### Detalhe tecnico

Alteracoes apenas em `src/components/projects/ImportProjectsModal.tsx`:

- Linha 60: mudar `id: 'name'` para `id: 'projectCode'`
- Adicionar `titulo: 'name'` e `title: 'name'` ao COLUMN_MAP
- Adicionar `tipo_projeto: 'itemType'` ao COLUMN_MAP
- Adicionar ao TYPE_MAP: `so edicao`, `só edição`, `reels`, `so captacao`, `só captação`
- Linhas 185-188: mudar deteccao de CSV para verificar se pelo menos 2 headers da primeira linha existem no COLUMN_MAP (em vez de verificar nomes fixos)
