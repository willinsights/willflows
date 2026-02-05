
# Plano: Alinhar Modal de Edição com Modal de Criação de Cliente

## Problema Identificado

O formulário de edição de cliente (dentro do `ClientDetailsModal`) tem campos diferentes do formulário de criação (`CreateClientModal`):

| Campo | Criar | Editar | Acção |
|-------|:-----:|:------:|-------|
| Nome * | ✅ | ✅ | Manter |
| Nome da Empresa * | ✅ | ✅ (label diferente) | Alinhar label |
| Tax ID * (NIF) | ✅ | ✅ (label "NIF/VAT") | Adicionar tooltip |
| Morada Fiscal * | ✅ | ✅ (label "Morada") | Alinhar label |
| Código Postal * | ✅ | ❌ | **Adicionar** |
| País * | ✅ | ❌ | **Adicionar** |
| Email de Faturação * | ✅ | ✅ (label diferente) | Alinhar label |
| Contacto Telefónico | ✅ | ✅ | Manter |
| Cidade | ❌ | ✅ | **Remover** |
| Notas Internas | ❌ | ✅ | Manter (útil) |

---

## Solução

### Parte 1: Actualizar Estado do Formulário de Edição

Adicionar os campos `postal_code` e `country`, remover `city`:

```typescript
const [editForm, setEditForm] = useState({
  name: '',
  email: '',
  phone: '',
  company: '',
  nif: '',
  address: '',
  postal_code: '',  // Novo
  country: '',      // Novo
  notes: '',
});
```

### Parte 2: Sincronizar com Dados do Cliente

Actualizar o `useEffect` para incluir os novos campos:

```typescript
useEffect(() => {
  if (client) {
    setEditForm({
      name: client.name || '',
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      nif: client.nif || '',
      address: client.address || '',
      postal_code: client.postal_code || '',  // Novo
      country: client.country || '',          // Novo
      notes: client.notes || '',
    });
  }
}, [client]);
```

### Parte 3: Actualizar Interface do Cliente

Expandir o type `Client` para incluir os campos:

```typescript
interface Client {
  id: string;
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;  // Novo
  country?: string | null;      // Novo
  nif?: string | null;
  notes?: string | null;
  created_at: string;
}
```

### Parte 4: Redesenhar Formulário de Edição

Reorganizar campos para seguir a mesma ordem e labels do formulário de criação:

```
┌─────────────────────────────────────────┐
│ Nome *                                  │
├─────────────────────────────────────────┤
│ Nome da Empresa *                       │
├─────────────────────────────────────────┤
│ Tax ID * [?] (tooltip igual ao criar)   │
├─────────────────────────────────────────┤
│ Morada Fiscal *                         │
├───────────────────┬─────────────────────┤
│ Código Postal *   │ País *              │
├───────────────────┴─────────────────────┤
│ Email de Faturação *                    │
├─────────────────────────────────────────┤
│ Contacto Telefónico                     │
├─────────────────────────────────────────┤
│ Notas Internas (apenas no editar)       │
└─────────────────────────────────────────┘
```

### Parte 5: Actualizar Função de Guardar

Incluir os novos campos no update:

```typescript
const handleSaveEdit = async () => {
  if (!client || !onClientUpdate) return;
  
  setSavingEdit(true);
  const result = await onClientUpdate(client.id, {
    name: editForm.name.trim(),
    email: editForm.email.trim() || null,
    phone: editForm.phone.trim() || null,
    company: editForm.company.trim() || null,
    nif: editForm.nif.trim() || null,
    address: editForm.address.trim() || null,
    postal_code: editForm.postal_code.trim() || null,  // Novo
    country: editForm.country.trim() || null,          // Novo
    notes: editForm.notes.trim() || null,
  });
  // ...
};
```

---

## Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/clients/ClientDetailsModal.tsx` | Actualizar interface, estado, useEffect, formulário e função de guardar |

---

## Resultado Esperado

O formulário de edição terá os mesmos campos obrigatórios que o formulário de criação:
- Nome
- Nome da Empresa  
- Tax ID (com tooltip explicativo)
- Morada Fiscal
- Código Postal
- País
- Email de Faturação
- Contacto Telefónico
- Notas Internas (mantido apenas em edição como campo extra)

---

## Impacto

- Consistência entre criação e edição de clientes
- Utilizadores podem editar todos os campos que definiram na criação
- Dados fiscais completos (postal_code e country) editáveis
