
# Plano: Separar Utilizadores por Estado no Painel Admin

## Contexto Actual

A página `/admin/users` organiza a gestão de utilizadores em 4 abas:
1. **Utilizadores** - Lista geral de todos os perfis
2. **Workspaces** - Gestão de workspaces
3. **Aquisição** - Convites beta e waitlist (aba `BetaInvitesSection`)
4. **Limpeza** - Ferramentas de manutenção

O problema é que dentro de **Aquisição** (`BetaInvitesSection`), a separação entre "Convites Plataforma" e "Lista de Espera" não mostra claramente quem **recebeu convite mas ainda não criou conta** (pendentes verdadeiros).

### Dados Actuais
- **14 convites** enviados que ainda não foram usados (pessoas que não criaram conta)
- **0 entradas** na waitlist
- **24 utilizadores** com workspace activo

---

## Solução Proposta

### 1. Renomear e Reorganizar a Aba de Aquisição

**Antes:**
```
Convites Plataforma (14) | Lista de Espera (0)
```

**Depois:**
```
Pendentes (14) | Registados (0) | Waitlist (0)
```

### 2. Nova Estrutura de Abas Internas

| Tab | Descrição | Dados |
|-----|-----------|-------|
| **Pendentes** | Pessoas que receberam convite mas não criaram conta | `beta_invite_tokens` onde `used_by IS NULL` |
| **Registados** | Pessoas que usaram o convite e criaram conta | `beta_invite_tokens` onde `used_by IS NOT NULL` |
| **Waitlist** | Lista de espera para convite | `beta_waitlist` (manter existente) |

---

## Ficheiros a Modificar

### Frontend (1 ficheiro)

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/admin/users-management/BetaInvitesSection.tsx` | Reorganizar tabs e adicionar funcionalidade de reenvio |

---

## Secção Tecnica

### Alteracoes em `BetaInvitesSection.tsx`

**1. Renomear variaveis e separar estados (linhas 357-359):**

```typescript
// Antes
const activeInvites = invites.filter(inv => !inv.used_at && (!inv.expires_at || new Date(inv.expires_at) > new Date()));
const usedInvites = invites.filter(inv => inv.used_at);
const pendingWaitlist = waitlist.filter(w => !w.invited_at);

// Depois
const pendingInvites = invites.filter(inv => !inv.used_at); // Todos que não criaram conta (inclui expirados)
const registeredInvites = invites.filter(inv => inv.used_at); // Criaram conta
const pendingWaitlist = waitlist.filter(w => !w.invited_at);
```

**2. Actualizar estatisticas (linhas 458-491):**

Mudar cards de:
- "Convites Ativos" para "Pendentes"
- "Convites Usados" para "Registados"
- Manter "Waitlist Pendente" e "Total Waitlist"

**3. Actualizar Tabs (linhas 494-503):**

```tsx
<TabsList>
  <TabsTrigger value="pending">
    <Clock className="h-4 w-4 mr-2" />
    Pendentes ({pendingInvites.length})
  </TabsTrigger>
  <TabsTrigger value="registered">
    <UserCheck className="h-4 w-4 mr-2" />
    Registados ({registeredInvites.length})
  </TabsTrigger>
  <TabsTrigger value="waitlist">
    <Users className="h-4 w-4 mr-2" />
    Waitlist ({waitlist.length})
  </TabsTrigger>
</TabsList>
```

**4. Tab "Pendentes" - Nova tabela com accoes:**

```tsx
<TabsContent value="pending">
  <Card>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">Convites Pendentes</CardTitle>
        {pendingInvites.length > 0 && (
          <Button size="sm" onClick={resendAllPending} disabled={resendingAll}>
            <Send className="h-4 w-4 mr-2" />
            Reenviar Todos
          </Button>
        )}
      </div>
    </CardHeader>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Enviado em</TableHead>
          <TableHead>Expira em</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Accoes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pendingInvites.map((invite) => {
          const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date();
          return (
            <TableRow key={invite.id}>
              <TableCell className="font-medium">{invite.email}</TableCell>
              <TableCell>{format(new Date(invite.created_at), 'dd/MM/yy')}</TableCell>
              <TableCell>{invite.expires_at ? format(new Date(invite.expires_at), 'dd/MM/yy') : '-'}</TableCell>
              <TableCell>
                <Badge variant={isExpired ? 'destructive' : 'outline'}>
                  {isExpired ? 'Expirado' : 'Activo'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => resendInviteEmail(invite)}
                  disabled={sendingEmail === invite.id}
                >
                  {sendingEmail === invite.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </Card>
</TabsContent>
```

**5. Funcao para reenviar todos os pendentes:**

```typescript
const resendAllPending = async () => {
  setResendingAll(true);
  let successCount = 0;

  for (const invite of pendingInvites.filter(i => i.email)) {
    try {
      await resendInviteEmail(invite);
      successCount++;
    } catch (error) {
      console.error(`Failed to resend to ${invite.email}:`, error);
    }
  }

  setResendingAll(false);
  toast({
    title: 'Convites reenviados',
    description: `${successCount} emails enviados.`,
  });
};
```

---

## Resultado Visual

```text
┌─────────────────────────────────────────────────────────────┐
│  Aquisicao de Novos Utilizadores                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 14       │ │ 0        │ │ 0        │ │ 0        │       │
│  │ Pendentes│ │Registados│ │ Waitlist │ │ Total WL │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│  [Pendentes (14)]  [Registados (0)]  [Waitlist (0)]        │
├─────────────────────────────────────────────────────────────┤
│                                   [Reenviar Todos]          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Email              │ Enviado │ Expira │Estado│ Accao │  │
│  ├────────────────────┼─────────┼────────┼──────┼───────┤  │
│  │ user@email.com     │ 22/01   │ 21/02  │Activo│  ↻    │  │
│  │ outro@email.com    │ 21/01   │ 20/02  │Expirado│ ↻   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Resumo

| Alteracao | Descricao |
|-----------|-----------|
| Renomear "Convites Plataforma" | Para "Pendentes" |
| Separar "Usados" | Nova tab "Registados" |
| Manter Waitlist | Sem alteracao |
| Adicionar "Reenviar Todos" | Botao para reenviar convites em massa |
| Mostrar estado | Badge "Activo" ou "Expirado" por convite |
| Accao individual | Botao reenviar por linha |
