
## Detectar colunas correctamente ao colar texto

### Problema
Quando colas texto copiado de uma spreadsheet (Excel, Google Sheets), os dados vem separados por **tabs** (`\t`), nao por virgulas. O parser actual so reconhece virgulas como separador, por isso trata cada linha como um unico nome de projeto e perde toda a informacao das colunas.

### Solucao
Expandir o parser para detectar automaticamente o separador (virgula, tab, ou ponto-e-virgula) e usar o correcto.

### Alteracoes em `src/components/projects/ImportProjectsModal.tsx`

**1. Criar funcao `detectSeparator`**
- Analisa a primeira linha do texto
- Verifica se tem tabs (`\t`), ponto-e-virgulas (`;`), ou virgulas (`,`)
- Retorna o separador mais provavel baseado na frequencia

**2. Actualizar `parseCSVLine` para aceitar separador customizado**
- Adicionar parametro `separator` (default: `,`)
- Usar esse separador em vez de virgula fixa

**3. Actualizar `parseInput` para usar deteccao automatica**
- Detectar o separador antes de verificar se parece header
- Usar o separador detectado em vez de assumir virgulas
- Manter a logica existente de matching de headers (COLUMN_MAP)

### Resultado esperado
- Colar texto copiado de Excel/Sheets: detecta tabs, mapeia colunas correctamente
- Colar CSV com virgulas: continua a funcionar como antes
- Colar CSV com ponto-e-virgulas (comum em PT/BR): tambem funciona
- Texto simples (um nome por linha): continua a funcionar como fallback

### Detalhe tecnico

```text
Nova funcao detectSeparator(line):
  - conta tabs, virgulas, ponto-e-virgulas
  - retorna o que aparece mais vezes (minimo 1)
  - prioridade: tab > ponto-e-virgula > virgula

parseCSVLine(line, separator = ','):
  - usa separator em vez de ',' fixo

parseInput(text):
  - detecta separador na primeira linha
  - usa separador detectado para split de headers e valores
  - resto da logica mantem-se igual
```
