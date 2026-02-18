
## Corrigir Responsividade dos Modais (Revisão Completa)

### Problema Identificado

A imagem mostra o modal "Criar Novo Projeto" a cortar conteúdo do lado direito — campos como "ID do Projeto", "Cliente", "Localização" ficam parcialmente visíveis. Isto acontece por 3 causas principais:

---

### Causas Raiz

**1. DialogContent sem margem lateral no mobile**
O componente base `src/components/ui/dialog.tsx` usa `w-full` e `max-w-lg`, mas não tem `mx-4` ou similar. Quando um modal usa `max-w-2xl`, em ecrãs com menos de ~700px, o modal fica mais largo que o viewport e é cortado pelo scroll do body.

**2. Grelhas de 2 colunas sem breakpoint responsivo**
Todos os `grid grid-cols-2 gap-4` dentro dos modais não colapsam para 1 coluna em mobile. Em ecrãs pequenos, cada metade fica muito estreita e o conteúdo é cortado.

**3. ScrollArea com padding fixo**
O `ScrollArea` tem `max-h-[calc(90vh-120px)]` e `pr-4` que não se adaptam ao mobile.

---

### Ficheiros a Corrigir

#### 1. `src/components/ui/dialog.tsx`
**Problema:** Sem margem lateral no mobile — modal pode sair do viewport.

**Fix:** Adicionar `mx-4 sm:mx-0` e substituir `w-full` por `w-[calc(100%-2rem)] sm:w-full` na classe base do `DialogContent`. Isto garante que todos os modais do sistema têm margem mínima de 1rem em cada lado, sem necessidade de mudar cada modal individualmente.

```tsx
// Antes:
"fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]"

// Depois:
"fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] sm:w-full max-w-lg translate-x-[-50%] translate-y-[-50%]"
```

#### 2. `src/components/projects/CreateProjectModal.tsx`
**Problemas múltiplos neste ficheiro:**

- `max-h-[90vh]` → adicionar `overflow-hidden` para conter o conteúdo
- `ScrollArea` com `max-h-[calc(90vh-120px)]` → ajustar para `max-h-[calc(90vh-160px)] sm:max-h-[calc(90vh-120px)]`
- `pr-4` → mudar para `pr-2 sm:pr-4`
- Todos os `grid grid-cols-2` → mudar para `grid grid-cols-1 sm:grid-cols-2`
- O botão de tipo de item usa `grid-cols-2` → manter em 2 colunas mas com texto menor no mobile
- Campo nested `grid grid-cols-2 gap-2` (Hora Início / Hora Fim dentro de captação) → já está correto por ser um sub-grid dentro de um slot

**Secções afetadas:**
- Linha 332: tipo de item → `grid-cols-2` (manter, mas ajustar botões)
- Linha 358: Nome do Projeto + ID → `grid-cols-1 sm:grid-cols-2`
- Linha 383: Categoria + Cliente → `grid-cols-1 sm:grid-cols-2`
- Linha 455: Prioridade + Localização → `grid-cols-1 sm:grid-cols-2`
- Linha 493: Datas → `grid-cols-1 sm:grid-cols-2`
- Linha 588: Responsáveis → `grid-cols-1 sm:grid-cols-2`
- Linha 756: Financeiro → `grid-cols-1 sm:grid-cols-2`

#### 3. `src/components/leads/CreateLeadModal.tsx`
- Linha 121: Email + Telefone → `grid-cols-1 sm:grid-cols-2`
- Linha 142: Origem + Valor Estimado → `grid-cols-1 sm:grid-cols-2`

#### 4. `src/components/clients/CreateClientModal.tsx`
- Linha 171: Código Postal + País → `grid-cols-1 sm:grid-cols-2`

#### 5. `src/components/projects/ProjectDetailsModal.tsx`
Verificar e corrigir todos os `grid-cols-2` (linhas 631, 660, 703, 768, 812, 834, 858, 1038).

---

### Estratégia de Implementação

A correção no `dialog.tsx` resolve automaticamente o corte lateral em **todos** os modais do sistema. As correções individuais nos ficheiros garantem que o conteúdo interno também colapsa corretamente em mobile.

**Regra aplicada:**
- `grid grid-cols-2` → `grid grid-cols-1 sm:grid-cols-2` (colapsa em mobile)
- `max-w-2xl` no CreateProjectModal é mantido (correto para desktop)
- `DialogContent` base recebe margem automática em mobile

---

### Detalhes Técnicos

**Breakpoints afetados:** `sm` (640px) — abaixo disso, colunas colapsam para 1.

**Impacto:** Baixo risco — apenas classes CSS. Sem lógica de negócio alterada.

**Ficheiros a modificar: 5**
1. `src/components/ui/dialog.tsx` — fix global (afeta todos os modais)
2. `src/components/projects/CreateProjectModal.tsx` — modal principal com mais campos
3. `src/components/leads/CreateLeadModal.tsx` — 2 grids
4. `src/components/clients/CreateClientModal.tsx` — 1 grid
5. `src/components/projects/ProjectDetailsModal.tsx` — múltiplos grids
