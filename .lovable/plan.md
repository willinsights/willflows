
## Correções na Página de Aprovação de Vídeo

### Problema 1: Título do Cabeçalho
**Atual:** Mostra `{data.task.title}` (ex: "Checklist Checklist Edição")
**Pretendido:** Mostrar "Studio Review" como título fixo

### Problema 2: Formato do Timecode
**Atual:** `00:00:15 / 00:00:48` (sem milissegundos)
**Causa:** O código usa `Math.floor()` antes de chamar `formatTimecode`, removendo a precisão decimal
**Pretendido:** `00:00:15.00 / 00:00:48.00` (com centésimos)

### Problema 3: Legenda de Retenção
**Atual:** Sem informação sobre política de retenção
**Pretendido:** Adicionar nota informativa sobre os 7 dias de retenção após conclusão da tarefa

---

### Ficheiro a Modificar

| Ficheiro | Alterações |
|----------|-----------|
| `src/pages/public/VideoApproval.tsx` | 3 correções |

---

### Alteração 1: Título "Studio Review"

**Linhas 564-567 - Alterar de:**
```tsx
<div>
  <h1 className="font-semibold">{data.task.title}</h1>
  <p className="text-sm text-muted-foreground">{data.task.project_name}</p>
</div>
```

**Para:**
```tsx
<div>
  <h1 className="font-semibold">Studio Review</h1>
  <p className="text-sm text-muted-foreground">{data.task.project_name}</p>
</div>
```

---

### Alteração 2: Timecode com Milissegundos

**Linha 789 - Alterar de:**
```tsx
{formatTimecode(Math.floor(currentTime))} / {formatTimecode(Math.floor(duration))}
```

**Para:**
```tsx
{formatTimecode(currentTime)} / {formatTimecode(duration)}
```

**Linha 810 - Alterar de:**
```tsx
{formatTimecode(Math.floor(commentTimestamp))}
```

**Para:**
```tsx
{formatTimecode(commentTimestamp)}
```

---

### Alteração 3: Legenda de Retenção (7 dias)

**Após linha 875 (após "Enviado {date}")**, adicionar:
```tsx
{/* Retention policy notice */}
<div className="text-center text-xs text-muted-foreground mt-4 pb-2">
  <p>Os vídeos são mantidos durante 7 dias após a tarefa ser concluída</p>
</div>
```

---

### Resultado Esperado

| Elemento | Antes | Depois |
|----------|-------|--------|
| Título | Checklist Checklist Edição | Studio Review |
| Timecode atual | 00:00:15 | 00:00:15.50 |
| Timecode total | 00:00:48 | 00:00:48.00 |
| Legenda retenção | (não existe) | "Os vídeos são mantidos durante 7 dias..." |
