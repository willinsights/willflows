

## Corrigir header em falta e ajustar layout do hero

### Problema
O `<PublicHeader />` desapareceu do JSX da Landing page durante a ultima edicao. O componente esta importado mas nao esta a ser renderizado, por isso o menu de navegacao sumiu.

### Solucao

**1. Adicionar `<PublicHeader />` de volta ao Landing.tsx**

Inserir `<PublicHeader />` logo apos o fecho do `</Helmet>` e antes da section do hero (linha 310), exactamente como todas as outras paginas publicas fazem.

**2. Ajustar o layout do hero ao estilo Stripe**

Baseado na imagem de referencia (Stripe), o layout split texto-esquerda + imagem-direita ja esta correcto. Ajustes finos:

- O hero section ja tem `pt-24` que respeita o header fixo — manter
- Garantir que o titulo tem tamanho grande e impactante (estilo Stripe com titulos enormes)
- A imagem a direita pode ultrapassar ligeiramente o container (overflow visible) para dar mais impacto, como no Stripe
- Remover `overflow-hidden` da section para permitir que a imagem "sangre" para fora

### Ficheiro a alterar

- `src/pages/Landing.tsx` — adicionar `<PublicHeader />` na linha 310 e ajustar a section do hero

### Detalhe tecnico

```text
Antes:
  </Helmet>
  {/* Hero Section */}
  <section ...>

Depois:
  </Helmet>
  <PublicHeader />
  {/* Hero Section */}
  <section ...>
```

Alteracao minima — uma unica linha inserida.
