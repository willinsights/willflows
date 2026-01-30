

## Correção: Campo de Nome Causa Refresh a Cada Letra

### Problema Identificado
A função `fetchApprovalData` tem `clientName` como dependência do `useCallback` (linha 189). Isto causa um ciclo:

```text
┌─────────────────────────────────────────────────────────────┐
│  Utilizador escreve letra → setClientName                   │
│        ↓                                                    │
│  fetchApprovalData recriado (clientName nas dependências)   │
│        ↓                                                    │
│  useEffect detecta mudança → chama fetchApprovalData()      │
│        ↓                                                    │
│  setLoading(true) → ecrã pisca / "refresh"                  │
└─────────────────────────────────────────────────────────────┘
```

---

### Causa Raiz (Linha 189)

```typescript
}, [token, clientName]); // ← clientName NÃO deveria estar aqui
```

O `clientName` só é usado para definir o estado inicial se não existir (linhas 171-173), mas como está nas dependências, qualquer alteração ao nome recria a função e dispara um novo fetch.

---

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/public/VideoApproval.tsx` | Remover `clientName` das dependências |

---

### Alteração

**Linha 189 - Alterar de:**
```typescript
}, [token, clientName]);
```

**Para:**
```typescript
}, [token]);
```

---

### Porquê é Seguro?

O `clientName` dentro do callback (linhas 171-173) só é usado para verificar se deve definir o nome inicial do servidor:

```typescript
if (!clientName && approvalData.client_name) {
  setClientName(approvalData.client_name);
}
```

Esta lógica só precisa de correr uma vez no carregamento inicial. Usar uma referência ou simplesmente remover a dependência não afeta o comportamento pretendido porque:
1. Se já há nome local, não faz nada
2. Se não há nome, usa o do servidor

Como o fetch só corre uma vez (no mount), remover a dependência é a solução correta.

---

### Resultado Esperado

| Antes | Depois |
|-------|--------|
| Cada letra → página "pisca" / refresh | Escrita fluida sem interrupções |

