
# Plano: Página de Gestão de Trials no Admin

## Objectivo
Criar uma nova aba/secção no painel de administração dedicada exclusivamente à gestão de workspaces em período de trial, com visão clara de quando expiram e ferramentas para extensão/conversão.

---

## Localização Proposta

A melhor localização é dentro da página **Admin Billing** (`/admin/billing`) como uma nova sub-aba:

```text
Billing
├── Assinaturas
├── Pagamentos
├── Dunning
├── Trials ← NOVA
├── Webhooks
└── Reset
```

**Alternativa considerada**: Nova aba "Trials" na navegação principal - rejeitada por fragmentar a gestão de billing.

---

## Funcionalidades

### 1. Visão Geral (Cards de Resumo)
| Card | Descrição |
|------|-----------|
| Total em Trial | Contagem de workspaces com `subscription_status = 'trialing'` |
| Expiram em 7 dias | Trials que terminam nos próximos 7 dias |
| Expiram Hoje | Trials que terminam hoje |
| Expirados | Trials já expirados mas não convertidos |

### 2. Tabela de Workspaces em Trial
| Coluna | Dados |
|--------|-------|
| Workspace | Nome + slug |
| Owner | Nome + email do admin |
| Plano | Badge com plano (Starter/Pro/Studio) |
| Dias Restantes | Dias até expiração (negativo se expirado) |
| Expira em | Data de expiração formatada |
| Actividade | Última actividade registada |
| Acções | Menu com opções |

### 3. Ordenação e Filtros
- Ordenação por data de expiração (mais urgentes primeiro)
- Filtro: Próximos 7 dias / Próximos 14 dias / Expirados / Todos
- Pesquisa por nome/email

### 4. Acções Disponíveis
- **Ver detalhes**: Abre drawer com informações completas
- **Extender trial**: Adiciona X dias ao trial (com motivo obrigatório)
- **Converter para pago**: Muda status para 'active' (simula conversão manual)
- **Enviar email**: Link para contactar o owner (abre email client)

---

## Ficheiros a Criar/Modificar

| Ficheiro | Acção |
|----------|-------|
| `src/components/admin/TrialsManagementTab.tsx` | **Novo** - Componente principal |
| `src/hooks/useAdminTrials.ts` | **Novo** - Hook para dados e acções de trials |
| `src/components/admin/BillingTab.tsx` | **Modificar** - Adicionar nova aba "Trials" |

---

## Secção Técnica

### Novo Hook: `useAdminTrials.ts`

```typescript
interface TrialWorkspace {
  id: string;
  name: string;
  slug: string;
  owner: { email: string; full_name: string | null } | null;
  subscription_plan: string;
  trial_ends_at: string;
  created_at: string;
  days_remaining: number;
  is_expired: boolean;
  members_count: number;
  projects_count: number;
  last_activity_at: string | null;
}

interface TrialStats {
  totalTrialing: number;
  expiringIn7Days: number;
  expiringToday: number;
  expired: number;
}

// Funções
- fetchTrialWorkspaces(): Busca workspaces com status 'trialing'
- extendTrial(workspaceId, days, reason): Actualiza trial_ends_at
- convertToActive(workspaceId): Muda status para 'active'
```

### Lógica de Cálculo de Dias

```typescript
const calculateDaysRemaining = (trialEndsAt: string): number => {
  const end = new Date(trialEndsAt);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};
```

### Query Principal

```sql
SELECT w.*, 
       EXTRACT(DAY FROM (trial_ends_at - NOW())) as days_remaining
FROM workspaces w
WHERE subscription_status = 'trialing'
ORDER BY trial_ends_at ASC
```

### Extender Trial (Mutation)

```typescript
// Adiciona dias ao trial
const newEndDate = new Date(workspace.trial_ends_at);
newEndDate.setDate(newEndDate.getDate() + days);

await supabase
  .from('workspaces')
  .update({ trial_ends_at: newEndDate.toISOString() })
  .eq('id', workspaceId);

// Log de auditoria
await logAction({
  action: 'extend_trial',
  targetType: 'workspace',
  targetId: workspaceId,
  details: { days_added: days, reason }
});
```

### UI: Cards de Resumo

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <Card>
    <CardContent className="pt-4">
      <p className="text-2xl font-bold">{stats.totalTrialing}</p>
      <p className="text-xs text-muted-foreground">Total em Trial</p>
    </CardContent>
  </Card>
  <Card className="border-amber-500/30">
    <CardContent className="pt-4">
      <p className="text-2xl font-bold text-amber-500">{stats.expiringIn7Days}</p>
      <p className="text-xs text-muted-foreground">Expiram em 7 dias</p>
    </CardContent>
  </Card>
  {/* ... */}
</div>
```

### UI: Badge de Urgência

```tsx
const getUrgencyBadge = (daysRemaining: number) => {
  if (daysRemaining < 0) {
    return <Badge variant="destructive">Expirado há {Math.abs(daysRemaining)}d</Badge>;
  }
  if (daysRemaining === 0) {
    return <Badge variant="destructive">Expira Hoje</Badge>;
  }
  if (daysRemaining <= 3) {
    return <Badge variant="outline" className="text-red-500">{daysRemaining}d</Badge>;
  }
  if (daysRemaining <= 7) {
    return <Badge variant="outline" className="text-amber-500">{daysRemaining}d</Badge>;
  }
  return <Badge variant="secondary">{daysRemaining}d</Badge>;
};
```

### Modal de Extensão de Trial

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Extender Trial</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <Select value={days} onValueChange={setDays}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar dias" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">+7 dias</SelectItem>
          <SelectItem value="14">+14 dias</SelectItem>
          <SelectItem value="30">+30 dias</SelectItem>
        </SelectContent>
      </Select>
      <Textarea 
        placeholder="Motivo da extensão (obrigatório)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </div>
    <DialogFooter>
      <Button onClick={handleExtend} disabled={!reason}>
        Extender
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Modificação em BillingTab.tsx

Adicionar nova aba entre "Dunning" e "Webhooks":

```tsx
<TabsTrigger value="trials" className="gap-2">
  <Clock className="h-4 w-4" />
  Trials
</TabsTrigger>

// ...

<TabsContent value="trials">
  <TrialsManagementTab />
</TabsContent>
```

---

## Resumo de Alterações

| Ficheiro | Linhas Afectadas | Tipo |
|----------|------------------|------|
| `src/hooks/useAdminTrials.ts` | ~150 linhas | Novo |
| `src/components/admin/TrialsManagementTab.tsx` | ~350 linhas | Novo |
| `src/components/admin/BillingTab.tsx` | +10 linhas (import + tab) | Modificar |

---

## Auditoria

Todas as acções serão registadas no `admin_audit_log`:
- `extend_trial`: Quando trial é extendido
- `convert_trial`: Quando trial é convertido manualmente para activo
