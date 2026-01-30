
## Adicionar Milissegundos ao Timecode

### Alteração Solicitada
Atualizar o formato do timecode de `HH:MM:SS` para `HH:MM:SS.ms` (com milissegundos).

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/duration-utils.ts` | Adicionar milissegundos ao formato |

### Código Atual (linha 11-18)
```typescript
export function formatTimecode(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
```

### Novo Código
```typescript
export function formatTimecode(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100); // Centésimos de segundo (2 dígitos)
  
  // Formato completo HH:MM:SS.ms
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
```

### Exemplos de Resultado

| Segundos | Antes | Depois |
|----------|-------|--------|
| 0 | `00:00:00` | `00:00:00.00` |
| 5.5 | `00:00:05` | `00:00:05.50` |
| 90.25 | `00:01:30` | `00:01:30.25` |
| 3665.75 | `01:01:05` | `01:01:05.75` |

### Nota Técnica
Uso 2 dígitos para milissegundos (centésimos) pois:
- É o padrão profissional de vídeo (frames a 25/30fps ≈ centésimos)
- Mantém o timecode compacto e legível
- `00:01:30.50` em vez de `00:01:30.500`

Se preferir 3 dígitos (milissegundos completos), basta alterar `* 100` para `* 1000` e `padStart(2, '0')` para `padStart(3, '0')`.
