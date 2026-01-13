# Testes de Validação de Entrega de Projetos

## Regras de Validação

### Por item_type e fase:

| item_type | Fase | Valida Checklist? | Comportamento |
|-----------|------|-------------------|---------------|
| `reuniao` | qualquer | ❌ Não | Pode concluir sempre |
| `projeto_captacao` | captacao | ✅ Sim | Bloqueia se há pendências |
| `projeto_captacao` | edicao | N/A | Não existe nesta fase |
| `projeto_edicao` | captacao | N/A | Não existe nesta fase |
| `projeto_edicao` | edicao | ✅ Sim | Bloqueia se há pendências |
| `projeto_completo` | captacao | ❌ Não | Move para edição automaticamente |
| `projeto_completo` | edicao | ✅ Sim | Bloqueia se há pendências |

## Cenários de Teste

### 1. projeto_completo em captação → Entregue
**Passos:**
1. Abrir Kanban de Captação (`/app/captacao`)
2. Criar projeto tipo "Captação + Edição" (`projeto_completo`)
3. Adicionar tarefa com checklist (deixar incompleto)
4. Arrastar para coluna "Entregue"

**Esperado:** 
- Projeto NÃO é marcado como entregue
- Projeto move automaticamente para primeira coluna de Edição
- Toast: "Projeto transferido para Edição"

---

### 2. projeto_completo em edição com checklist pendente → Entregue
**Passos:**
1. Abrir Kanban de Edição (`/app/edicao`)
2. Encontrar projeto tipo "Captação + Edição" (vindo do teste anterior)
3. Garantir que tem checklist incompleto
4. Arrastar para coluna "Entregue"

**Esperado:**
- Projeto BLOQUEADO
- Toast: "Existem X tarefa(s) e Y item(ns) de checklist por concluir."
- Projeto permanece na coluna original

---

### 3. projeto_captacao em captação com checklist pendente → Entregue
**Passos:**
1. Abrir Kanban de Captação (`/app/captacao`)
2. Criar projeto tipo "Projeto de Captação" (`projeto_captacao`)
3. Adicionar tarefa com checklist (deixar incompleto)
4. Arrastar para coluna "Entregue"

**Esperado:**
- Projeto BLOQUEADO
- Toast de erro com contagem de pendências
- Projeto permanece na coluna original

---

### 4. reuniao → Entregue
**Passos:**
1. Abrir Kanban de Captação ou Edição
2. Criar projeto tipo "Reunião/Compromisso" (`reuniao`)
3. Adicionar tarefa com checklist (deixar incompleto)
4. Arrastar para coluna "Entregue"

**Esperado:**
- Projeto ENTREGUE com sucesso
- Toast: "Projeto entregue com sucesso!"
- Projeto move para coluna "Entregue"

---

### 5. Botão "Concluir" no Modal de Detalhes
**Passos:**
1. Abrir detalhes de projeto com checklists pendentes
2. Clicar em "Concluir"

**Esperado:**
- Se tem pendências: Modal mostra lista de itens por completar
- Se não tem: Projeto concluído

---

### 6. Botão "Reabrir" para projetos entregues
**Passos:**
1. Ir à seção "Finalizados" (`/app/finalizados`)
2. Abrir detalhes de um projeto entregue
3. Clicar em "Reabrir"

**Esperado:**
- Modal de confirmação aparece
- Após confirmar: `is_delivered` = false, `delivered_at` = null
- Projeto volta a aparecer no Kanban

---

## Verificação no Banco de Dados

### Query para verificar integridade:
```sql
-- Não deve retornar nenhum resultado se enforcement está funcionando
SELECT 
  p.id, 
  p.name, 
  p.item_type, 
  p.is_delivered, 
  p.current_phase,
  COUNT(tc.id) FILTER (WHERE tc.is_completed = false) as pending_checklists
FROM projects p
JOIN tasks t ON t.project_id = p.id AND t.phase = p.current_phase
JOIN task_checklists tc ON tc.task_id = t.id
WHERE p.is_delivered = true
  AND p.item_type != 'reuniao'
GROUP BY p.id
HAVING COUNT(tc.id) FILTER (WHERE tc.is_completed = false) > 0;
```

### Testar RPC diretamente:
```sql
-- Verificar se projeto pode ser entregue
SELECT public.can_deliver_project('PROJECT_UUID', 'edicao');

-- Resultado esperado para projeto com pendências:
-- {"can_deliver": false, "reason": "Existem X tarefa(s) e Y item(ns) de checklist por concluir.", "pending_tasks": X, "pending_checklists": Y}
```

---

## Debug: Console Logs

Os seguintes logs são emitidos para debugging:

### No Kanban (useKanban.ts):
```javascript
console.warn('[moveProject]', {
  projectId,
  targetColumnId,
  phase,
  item_type,
  is_final
});

console.warn('[deliver_project RPC result]', { data, error });
```

### No Modal (ProjectDetailsModal.tsx):
```javascript
console.warn('[handleDeliver]', {
  projectId,
  item_type,
  current_phase
});

console.warn('[deliver_project RPC result]', { data, error });
```

---

## Trigger de Proteção

O trigger `trigger_prevent_invalid_delivery` impede qualquer UPDATE que tente definir `is_delivered = true` quando há pendências, garantindo segurança mesmo se o frontend falhar:

```sql
-- Erro esperado ao tentar bypass:
-- ERROR: CHECKLIST_INCOMPLETE: Existem X tarefa(s) e Y item(ns) de checklist por concluir.
```
