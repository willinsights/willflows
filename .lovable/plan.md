

# Plano: Adicionar Aprovacao de Video, Comparacao de Versoes e Timeline as Paginas de Comparacao

## Problema

As paginas de comparacao (vs Asana, ClickUp, Trello) e o hub de comparacoes nao mencionam tres funcionalidades diferenciadoras do WillFlow:

1. **Aprovacao de video com link para cliente** -- portal seguro onde clientes aprovam videos
2. **Comparacao A/B de versoes** -- reproduzir duas versoes lado a lado sincronizadas
3. **Desenho de Timeline** -- estrutura visual de segmentos para guiar a edicao

Nenhum dos concorrentes tem estas funcionalidades nativamente.

---

## Alteracoes por Ficheiro

### 1. ComparisonsHub.tsx -- Adicionar ao resumo de cada concorrente

Adicionar nas limitacoes e vantagens de cada card:

| Concorrente | Nova limitacao | Nova vantagem WillFlow |
|-------------|---------------|----------------------|
| Asana | Sem aprovacao de video | Aprovacao de video com comparacao A/B |
| ClickUp | Sem review nativo de video | Timeline de edicao + aprovacao de video |
| Trello | Sem producao de video | Aprovacao de video + comparacao de versoes |

### 2. VsAsana.tsx -- Tabela de comparacao + key differences

Adicionar 3 linhas a `comparisonData`:
- `Aprovacao de video com link para cliente` -- Asana: false, WillFlow: true
- `Comparacao A/B de versoes` -- Asana: false, WillFlow: true
- `Desenho de Timeline para edicao` -- Asana: false, WillFlow: true

Adicionar 1 card novo em `keyDifferences`:
- Icone: Film
- Titulo: "Producao de Video Integrada"
- Descricao: Mencionar aprovacao com link seguro, comparacao de versoes lado a lado e timeline de edicao. Asana nao tem nenhuma destas funcionalidades.

### 3. VsClickUp.tsx -- Tabela de comparacao + key differences

Adicionar 3 linhas a `comparisonData`:
- `Aprovacao de video com link para cliente` -- ClickUp: false, WillFlow: true
- `Comparacao A/B de versoes` -- ClickUp: false, WillFlow: true
- `Desenho de Timeline para edicao` -- ClickUp: false, WillFlow: true

Adicionar 1 card novo em `keyDifferences`:
- Icone: Film
- Titulo: "Review de Video Nativo"
- Descricao: Clientes aprovam videos via link seguro, com comparacao A/B de versoes e timeline de segmentos. ClickUp nao oferece nada disto.

### 4. VsTrello.tsx -- Tabela de comparacao + key differences

Adicionar 3 linhas a `comparisonData`:
- `Aprovacao de video com link para cliente` -- Trello: false, WillFlow: true
- `Comparacao A/B de versoes` -- Trello: false, WillFlow: true
- `Desenho de Timeline para edicao` -- Trello: false, WillFlow: true

Adicionar 1 card novo em `keyDifferences`:
- Icone: Film
- Titulo: "Producao de Video Completa"
- Descricao: Envie um link ao cliente para aprovar videos, compare versoes A/B e defina a estrutura de edicao com a Timeline. O Trello nao tem funcionalidades de video.

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/comparisons/ComparisonsHub.tsx` | Adicionar mencoes a video nas vantagens/limitacoes dos cards |
| `src/pages/comparisons/VsAsana.tsx` | +3 linhas na tabela, +1 card "key difference" |
| `src/pages/comparisons/VsClickUp.tsx` | +3 linhas na tabela, +1 card "key difference" |
| `src/pages/comparisons/VsTrello.tsx` | +3 linhas na tabela, +1 card "key difference" |

---

## Resultado

Todas as paginas de comparacao passam a destacar claramente que o WillFlow oferece:
- Aprovacao de video com link seguro para clientes (incluindo comparacao de versoes A/B)
- Desenho de Timeline para estruturar a edicao

Estas funcionalidades nao existem em nenhum dos concorrentes comparados.
