

# Filtrar Pagamentos de Colaboradores a partir de 3 de Março

## Problema

Atualmente, o componente de Pagamentos Colaboradores (Custos) carrega **todos** os pagamentos do workspace sem filtro de data por defeito. O filtro de data existente usa `delivery_date`/`delivered_at` do projeto, mas muitos projetos não têm essas datas preenchidas, o que exclui registos válidos.

O utilizador quer ver apenas dados a partir de 3 de março (data a partir da qual os dados de pagamento são relevantes).

## Dados atuais (desde 3 de março)

| Colaborador | Projetos | Total | Pendente | Pago |
|---|---|---|---|---|
| Christian Coelho | 60 | €2.760 | €2.760 | €0 |
| Morais | 96 | €4.620 | €2.290 | €2.330 |
| Rafaela Nunes | 64 | €2.540 | €1.900 | €640 |
| Lucas Almeida | 1 | €250 | €250 | €0 |
| Savio Macedo | 15 | €1.476,57 | €176,67 | €1.299,90 |
| Luke Cavalcante | 7 | €1.050 | €0 | €1.050 |
| **TOTAL** | **243** | **€12.696,57** | **€7.376,67** | **€5.319,90** |

## Solução

### 1. Definir data padrão de 3 de março nos filtros

No `FreelancerPaymentsControl`, alterar o estado inicial dos filtros para `dateFrom: new Date('2025-03-03')`.

### 2. Filtrar por `created_at` do projeto (não `delivery_date`)

O filtro de data no componente atualmente filtra por `delivery_date`/`delivered_at`. Muitos projetos em curso não têm essas datas. Alterar para filtrar por `created_at` do projeto, que é sempre preenchido.

### 3. Incluir `created_at` na lista de projetos passada ao componente

O `Custos.tsx` mapeia os projetos mas não inclui `created_at`. Adicionar esse campo.

## Ficheiros a alterar

| Ficheiro | Alteração |
|---|---|
| `src/components/payments/FreelancerPaymentsControl.tsx` | Default `dateFrom` para 3 de março; filtro de data usar `created_at` |
| `src/pages/app/financeiro/Custos.tsx` | Incluir `created_at` no mapeamento de projetos |

## Impacto

- Ao abrir a página de Custos, só aparecem pagamentos de projetos criados a partir de 3/Mar
- O utilizador pode alterar ou limpar o filtro de data como antes
- Nenhuma alteração na base de dados

