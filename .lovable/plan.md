

## Correções na Página de Aprovação de Vídeo

### Problema 1: Timecode perde precisão nos comentários
**Causa identificada:** O código usa `Math.floor(commentTimestamp)` ao guardar comentários, removendo os centésimos de segundo.

**Localizações no código:**
- Linha 353: `timestamp_seconds: Math.floor(commentTimestamp)` (optimistic update)
- Linha 369: `const savedTimestamp = Math.floor(commentTimestamp)` (envio para API)

**Resultado atual:**
- Player: `00:00:24:09` (correto)
- Comentários: `00:00:24:00` (incorreto - perdeu `:09`)

---

### Problema 2: Campo de nome sem descrição clara
**Causa identificada:** O campo Input do nome mostra apenas `placeholder="O seu nome"` sem label/descrição.

**Resultado atual:** Aparece um input com "teste" (nome guardado) sem contexto claro do que é.

---

### Ficheiros a Modificar

| Ficheiro | Alterações |
|----------|-----------|
| `src/pages/public/VideoApproval.tsx` | 2 correções |

---

### Alteração 1: Manter precisão do timestamp

**Linha 353 - Alterar de:**
```typescript
timestamp_seconds: Math.floor(commentTimestamp),
```

**Para:**
```typescript
timestamp_seconds: commentTimestamp,
```

**Linha 369 - Alterar de:**
```typescript
const savedTimestamp = Math.floor(commentTimestamp);
```

**Para:**
```typescript
const savedTimestamp = commentTimestamp;
```

---

### Alteração 2: Adicionar label ao campo de nome

**Linhas 857-864 - Alterar de:**
```tsx
{/* Name input and submit button */}
<div className="flex items-center gap-3">
  <Input
    placeholder="O seu nome"
    value={clientName}
    onChange={(e) => setClientName(e.target.value)}
    className="h-9 max-w-[200px]"
  />
```

**Para:**
```tsx
{/* Name input and submit button */}
<div className="flex items-center gap-3">
  <div className="flex flex-col gap-1">
    <Label htmlFor="client-name-input" className="text-xs text-muted-foreground">
      O seu nome
    </Label>
    <Input
      id="client-name-input"
      placeholder="Ex: João Silva"
      value={clientName}
      onChange={(e) => setClientName(e.target.value)}
      className="h-9 w-[200px]"
    />
  </div>
```

---

### Resultado Esperado

| Problema | Antes | Depois |
|----------|-------|--------|
| Timecode comentários | `00:00:24:00` | `00:00:24:09` |
| Campo nome | Input sem contexto | Label "O seu nome" + placeholder "Ex: João Silva" |

O timecode fica idêntico entre o player e os comentários, mantendo a precisão dos centésimos de segundo.

