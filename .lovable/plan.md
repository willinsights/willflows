
## Plano de Correção: Editor vê dados financeiros globais na página de Pagamentos

### Problema Identificado

O utilizador `willdesign7@gmail.com` (editor) consegue ver os valores financeiros globais na página de Pagamentos, mesmo com a permissão "Ver Financeiro Global" (`dashboard.view_global_financials`) **desativada**.

**Causa raiz**: A página de Pagamentos usa `isCollaborator` para decidir entre a vista completa ou simplificada, mas essa variável é calculada com base em `canViewAllProjects`, e **não** em `canViewAllFinancials`.

Configuração atual do Editor:
- `visibility.all_projects` = **true** (pode ver todos os projetos)
- `dashboard.view_global_financials` = **false** (NÃO deve ver valores globais)

Como `canViewAllProjects = true`, então `isCollaborator = false`, e o editor vê a vista de admin com todos os valores financeiros do workspace.

### Correção Necessária

#### Ficheiro: `src/pages/app/Pagamentos.tsx`

A condição para mostrar a vista simplificada vs completa deve usar `canViewAllFinancials` e não `isCollaborator`:

**Antes (linha 489):**
```typescript
{isCollaborator ? (
  // Collaborator-specific: show only their payments from project_team
  <FreelancerPaymentsControl ... />
) : (
  // Shows full view
)}
```

**Depois:**
```typescript
{!canViewAllFinancials ? (
  // Restricted view: show only user's own payments
  <FreelancerPaymentsControl ... />
) : (
  // Admin/Full view: shows all workspace financials
)}
```

Também precisamos:
1. Adicionar `isLoading` do hook `useFinancialPermissions` 
2. Aguardar que as permissões carreguem antes de mostrar conteúdo
3. Garantir que a verificação dos tabs também use `canViewAllFinancials`

### Áreas Afetadas

| Linha | Alteração |
|-------|-----------|
| 64 | Adicionar `isLoading: permissionsLoading` do hook |
| 385-391 | Aguardar `permissionsLoading` antes de mostrar conteúdo |
| 472 | Label do tab (usar `!canViewAllFinancials` em vez de `isCollaborator`) |
| 489 | Condição principal (usar `!canViewAllFinancials` em vez de `isCollaborator`) |

### Detalhes Técnicos

```typescript
// Linha 64 - adicionar permissionsLoading
const { canViewAllFinancials, canViewOwnFinancials, userId, userRole, isCollaborator, isLoading: permissionsLoading } = useFinancialPermissions();

// Linha 385 - aguardar permissões
if (loading || permissionsLoading) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// Linha 472 - label do tab
<TabsTrigger value="previsao">
  {!canViewAllFinancials ? 'Meus Pagamentos' : 'Previsão'}
</TabsTrigger>

// Linha 489 - condição principal
{!canViewAllFinancials ? (
  <FreelancerPaymentsControl
    teamPayments={typedTeamPayments}
    onStatusChange={handleFreelancerStatusChange}
    formatCurrency={formatCurrency}
    members={membersList}
    projects={projectsList}
    filterByUserId={userId}
  />
) : (
  // Vista completa com dados do workspace
)}
```

### Impacto

- **Baixo risco**: Apenas altera a lógica de verificação de permissões
- **Ficheiros afetados**: 1 ficheiro (`src/pages/app/Pagamentos.tsx`)
- **Sem alterações de base de dados**: O problema é puramente frontend
- **Resultado esperado**: 
  - Editor com `canViewAllFinancials = false` verá apenas "Meus Pagamentos"
  - Editor com `canViewAllFinancials = true` verá toda a informação financeira

### Verificação

Após a correção, confirmar:
1. O editor `willdesign7@gmail.com` vê apenas "Meus Pagamentos" (os seus próprios pagamentos)
2. Quando a permissão "Ver Financeiro Global" é ativada, o editor pode ver todos os valores
3. Admin continua a ver tudo normalmente
4. Outros roles funcionam conforme as suas permissões
