
## Padronização do Formato de Timecode (Frame.io Style)

### Problema Identificado
O formato atual do timecode é `HH:MM:SS.ms` (com **ponto** e centésimos), mas o padrão profissional Frame.io usa `HH:MM:SS:FF` (com **dois pontos** e frames).

**Formato atual:** `00:00:22.05`  
**Formato pretendido:** `00:00:22:05`

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/duration-utils.ts` | Alterar separador de `.` para `:` |

---

### Alteração Única: formatTimecode()

**Linha 18 - Alterar de:**
```typescript
return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
```

**Para:**
```typescript
return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
```

---

### Também atualizar a documentação (linhas 5-10):

**De:**
```typescript
/**
 * Format seconds to professional SMPTE-style timecode
 * @example formatTimecode(5) => "00:05"
 * @example formatTimecode(90) => "01:30"
 * @example formatTimecode(3665) => "01:01:05"
 */
```

**Para:**
```typescript
/**
 * Format seconds to professional SMPTE-style timecode (Frame.io format)
 * @example formatTimecode(5) => "00:00:05:00"
 * @example formatTimecode(22.15) => "00:00:22:15"
 * @example formatTimecode(90.5) => "00:01:30:50"
 */
```

---

### Locais Afetados Automaticamente

Esta alteração irá corrigir automaticamente **todos os locais** que usam `formatTimecode`:

| Localização | Contexto |
|-------------|----------|
| `VideoApproval.tsx` linha 687 | Timecode nos comentários |
| `VideoApproval.tsx` linha 787 | Tooltip dos marcadores |
| `VideoApproval.tsx` linha 817 | Barra de progresso do player |
| `VideoApproval.tsx` linha 838 | Badge do comentário em edição |
| `TimestampComments.tsx` linha 158 | Lista de comentários |

---

### Resultado Esperado

| Antes | Depois |
|-------|--------|
| `00:00:22.05` | `00:00:22:05` |
| `00:01:30.50` | `00:01:30:50` |
| `01:02:33.75` | `01:02:33:75` |

O formato fica idêntico ao Frame.io: `HH:MM:SS:FF`
