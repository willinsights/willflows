

# Plano: Corrigir Classificação de Utilizadores no Painel Admin

## Problemas Identificados

### 1. Dados Inconsistentes na Base de Dados

6 utilizadores criaram conta com sucesso mas o convite beta não foi marcado como usado:

| Email | Nome | Workspaces | Conta Criada | Convite `used_at` |
|-------|------|------------|--------------|-------------------|
| info.savioleandro@gmail.com | Savio Macedo | 2 | ✅ 30/01 | ❌ null |
| contato@silascoelho.com.br | Silas Coelho | 1 | ✅ 24/01 | ❌ null |
| geral@impulso.pt | impulso | 1 | ✅ 24/01 | ❌ null |
| contact@fernandobraz.com | Fernando Braz | 1 | ✅ 23/01 | ❌ null |
| rafaela.impulso@gmail.com | Rafaela Nunes | 2 | ✅ 22/01 | ❌ null |
| thyagovideo@gmail.com | Thyago Nascimento | 1 | ✅ 22/01 | ❌ null |

### 2. Lógica de Filtragem Limitada

O código actual filtra por `used_at`:
```typescript
const pendingInvites = invites.filter(inv => !inv.used_at);
```

Mas não verifica se o email já existe na tabela `profiles`.

### 3. Erro de React Ref

O `AlertDialog` dentro de uma `TableCell` gera warning porque não suporta refs correctamente.

---

## Solução

### Parte 1: Correcção de Dados (Migração SQL)

Actualizar os 6 convites para marcar como usados:

```sql
UPDATE beta_invite_tokens bit
SET 
  used_at = p.created_at,
  used_by = p.id
FROM profiles p
WHERE LOWER(bit.email) = LOWER(p.email)
  AND bit.used_at IS NULL;
```

### Parte 2: Lógica Inteligente no Frontend

Modificar `BetaInvitesSection.tsx` para cruzar dados com `profiles`:

**1. Buscar perfis existentes (adicionar query):**

```typescript
// Dentro de fetchData()
const { data: profileEmails } = await supabase
  .from('profiles')
  .select('email');

const existingEmails = new Set(
  (profileEmails || []).map(p => p.email?.toLowerCase())
);

setExistingProfileEmails(existingEmails);
```

**2. Filtrar correctamente:**

```typescript
// Pendentes: Convite NÃO usado E email NÃO tem conta
const pendingInvites = invites.filter(inv => 
  !inv.used_at && 
  (!inv.email || !existingProfileEmails.has(inv.email.toLowerCase()))
);

// Registados: Convite usado OU email já tem conta
const registeredInvites = invites.filter(inv => 
  inv.used_at || 
  (inv.email && existingProfileEmails.has(inv.email.toLowerCase()))
);
```

### Parte 3: Corrigir Warning React Ref

O `AlertDialog` dentro de `map()` pode causar problemas de ref. Extrair para componente separado:

```tsx
// Novo componente: DeleteInviteButton
const DeleteInviteButton = ({ inviteId, onDelete }: { inviteId: string; onDelete: (id: string) => void }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {/* ... */}
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

---

## Ficheiros a Modificar

| Tipo | Ficheiro | Alteração |
|------|----------|-----------|
| **SQL** | Migração | Corrigir dados dos 6 utilizadores |
| **Frontend** | `BetaInvitesSection.tsx` | Lógica de filtragem + corrigir ref |

---

## Secção Técnica Detalhada

### Migração SQL

```sql
-- Corrigir convites beta que não foram marcados como usados
UPDATE beta_invite_tokens bit
SET 
  used_at = p.created_at,
  used_by = p.id
FROM profiles p
WHERE LOWER(bit.email) = LOWER(p.email)
  AND bit.used_at IS NULL;
```

### Alterações em `BetaInvitesSection.tsx`

**1. Novo state (linha ~95):**
```typescript
const [existingProfileEmails, setExistingProfileEmails] = useState<Set<string>>(new Set());
```

**2. Buscar emails existentes no fetchData (linha ~114):**
```typescript
const fetchData = async () => {
  setLoading(true);
  try {
    const [invitesResult, waitlistResult, profilesResult] = await Promise.all([
      supabase.from('beta_invite_tokens').select('*').order('created_at', { ascending: false }),
      supabase.from('beta_waitlist').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('email') // NOVO
    ]);

    // ... existing error handling ...

    // NOVO: Criar set de emails existentes
    const emailSet = new Set(
      (profilesResult.data || [])
        .map(p => p.email?.toLowerCase())
        .filter(Boolean) as string[]
    );
    setExistingProfileEmails(emailSet);

    setInvites(invitesResult.data || []);
    setWaitlist(waitlistResult.data || []);
  } catch (error: any) {
    // ... existing error handling ...
  } finally {
    setLoading(false);
  }
};
```

**3. Filtros inteligentes (linhas 375-378):**
```typescript
// Pendentes: Não criaram conta (usado_at null E email não existe em profiles)
const pendingInvites = invites.filter(inv => 
  !inv.used_at && 
  (!inv.email || !existingProfileEmails.has(inv.email.toLowerCase()))
);

// Registados: Criaram conta (used_at existe OU email existe em profiles)
const registeredInvites = invites.filter(inv => 
  inv.used_at || 
  (inv.email && existingProfileEmails.has(inv.email.toLowerCase()))
);
```

**4. Componente DeleteInviteButton (extrair para evitar ref warning):**
```tsx
// Antes do return principal, adicionar componente local:
const DeleteInviteButton = ({ inviteId }: { inviteId: string }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Eliminar convite?</AlertDialogTitle>
        <AlertDialogDescription>
          Esta ação não pode ser desfeita. O link de convite deixará de funcionar.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={() => deleteInvite(inviteId)}>
          Eliminar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
```

E substituir o AlertDialog inline por:
```tsx
<DeleteInviteButton inviteId={invite.id} />
```

---

## Resultado Esperado

**Antes:**
```
Pendentes (14)  ← Inclui utilizadores que JÁ criaram conta
Registados (0)  ← Vazio porque used_at está null
```

**Depois:**
```
Pendentes (8)   ← Apenas quem realmente não criou conta
Registados (6)  ← Utilizadores com conta criada (detectados por email)
```

