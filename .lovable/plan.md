

## Corrigir contadores do Dashboard para excluir reunioes

### Problema
Os contadores "Em Captacao" e "Em Edicao" no dashboard incluem itens do tipo `reuniao` (como "Cartoes de visita In-sights" e "Site In-sights"), mas estes nao aparecem no Kanban porque sao filtrados la. Isso causa discrepancia entre o que o utilizador ve no Kanban e o que o dashboard mostra.

### Solucao
Adicionar filtro `item_type !== 'reuniao'` nos contadores de projetos ativos no hook `useDashboardMetrics.ts`, para que reunioes nao sejam contadas como projetos em captacao ou edicao.

---

### Detalhes tecnicos

**Ficheiro:** `src/hooks/useDashboardMetrics.ts`

Nas linhas 167-168, alterar os filtros para excluir reunioes:

```typescript
// Antes:
const captacao = projectsData?.filter(p => p.current_phase === 'captacao' && !p.is_delivered).length || 0;
const edicao = projectsData?.filter(p => p.current_phase === 'edicao' && !p.is_delivered).length || 0;

// Depois:
const captacao = projectsData?.filter(p => p.current_phase === 'captacao' && !p.is_delivered && p.type !== 'reuniao').length || 0;
const edicao = projectsData?.filter(p => p.current_phase === 'edicao' && !p.is_delivered && p.type !== 'reuniao').length || 0;
```

Isto alinha o dashboard com o Kanban, resultando em:
- **Em Captacao:** 0 (em vez de 2)
- **Em Edicao:** 25 (sem alteracao)
- **Entregues:** 11 (sem alteracao)

