
## Plano de Correção: Editor não consegue visualizar projetos

### Problema Identificado

O utilizador `willdesign7@gmail.com` (com role `editor` no workspace "In-Sights") não consegue ver os projetos, mesmo com a permissão `visibility.all_projects` ativada pelo admin.

**Causa raiz**: Existe um bug de timing no hook `useKanban.ts`:

1. Quando a página carrega, o hook `useFinancialPermissions` começa a carregar as permissões
2. Enquanto as permissões carregam, `canViewAllProjects` é `false` (valor por defeito)
3. O `useKanban` inicia a busca de dados **imediatamente**, usando `isCollaborator = true`
4. Isto filtra os projetos para mostrar apenas os atribuídos ao utilizador
5. Quando as permissões finalmente carregam e `canViewAllProjects` se torna `true`, **a busca NÃO é re-executada** porque `isCollaborator` não está nas dependências do `fetchColumnsData`

O mesmo problema pode afetar `useFilteredProjects.ts` e outras áreas que usam `useFinancialPermissions`.

---

### Correções Necessárias

#### 1. Corrigir `useKanban.ts`

**Ficheiro**: `src/hooks/useKanban.ts`

Alterações:
- Adicionar `isCollaborator` e `userId` ao array de dependências de `fetchColumnsData`
- Adicionar verificação para aguardar que as permissões terminem de carregar antes de buscar dados
- Re-executar a busca quando `isCollaborator` muda

```text
Linha 69: Adicionar permissionsLoading ao hook
Linha 318: Adicionar isCollaborator, userId ao array de dependências
Linha 350-358: Aguardar permissionsLoading = false antes de fetch
```

#### 2. Corrigir `useFilteredProjects.ts`

**Ficheiro**: `src/hooks/useFilteredProjects.ts`

Alterações semelhantes para garantir consistência:
- Aguardar que as permissões carreguem antes de buscar dados
- Re-buscar quando as permissões mudam

---

### Detalhes Técnicos

**Antes (código problemático):**
```typescript
// useKanban.ts - linha 350-358
useEffect(() => {
  const fetchKey = `${currentWorkspace?.id}-${phase}`;
  if (currentWorkspace?.id && fetchKey !== lastFetchedKeyRef.current && !fetchError) {
    fetchColumns();
  }
}, [currentWorkspace?.id, phase, fetchError, fetchColumns]);
```

**Depois (código corrigido):**
```typescript
useEffect(() => {
  const fetchKey = `${currentWorkspace?.id}-${phase}-${isCollaborator}`;
  // Aguardar permissões carregarem antes de fetch
  if (permissionsLoading) return;
  
  if (currentWorkspace?.id && fetchKey !== lastFetchedKeyRef.current && !fetchError) {
    fetchColumns();
  } else if (!currentWorkspace) {
    setLoading(false);
  }
}, [currentWorkspace?.id, phase, fetchError, fetchColumns, permissionsLoading, isCollaborator]);
```

E no `fetchColumnsData`:
```typescript
}, [currentWorkspace?.id, phase, fetchError, toast, isCollaborator, userId]);
```

---

### Verificação Adicional

Após a correção, confirmar:
1. O editor pode ver todos os projetos quando `visibility.all_projects` está ativo
2. Quando a permissão é desativada, o editor vê apenas projetos onde está na equipa
3. Outros roles (freelancer, visualizador) continuam a funcionar corretamente
4. Não há re-fetches excessivos ou loops infinitos

---

### Impacto

- **Baixo risco**: Apenas altera a lógica de timing, não a lógica de permissões
- **Ficheiros afetados**: 2 ficheiros (`useKanban.ts`, `useFilteredProjects.ts`)
- **Sem alterações de base de dados**: O problema é puramente frontend
