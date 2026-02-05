

# Corrigir Google Meet: Logging + Redeployment

## Problema

O código de validação já está presente nos 3 ficheiros, mas o erro continua. Duas causas possíveis:
1. A edge function pode não ter sido re-deployed com as alterações
2. Pode haver um problema de timezone -- o frontend envia `2026-02-05T09:00:00` (sem timezone), a edge function faz `new Date(...).toISOString()` que adiciona `Z` (UTC), e o Google recebe `timeZone: 'Europe/Lisbon'` separadamente, o que pode criar conflito

## Alterações

### 1. `supabase/functions/create-google-meet/index.ts`
- Adicionar logging detalhado dos valores recebidos e enviados ao Google:
  - `startAt` e `endAt` recebidos do frontend
  - `startDate` e `endDate` após parsing
  - O body exacto enviado ao Google Calendar API
- Forçar re-deploy (qualquer alteração ao ficheiro dispara deploy automático)

### 2. Formato de timestamps para Google API
- Em vez de usar `.toISOString()` (que gera `...Z` / UTC), enviar os timestamps no formato que o frontend envia (sem `Z`), deixando o `timeZone` field controlar a interpretação
- Isto evita conflito entre o sufixo `Z` (UTC) e o `timeZone: 'Europe/Lisbon'`

**Antes:**
```
dateTime: startDate.toISOString()   // "2026-02-05T09:00:00.000Z"
timeZone: 'Europe/Lisbon'          // ignorado porque Z = UTC
```

**Depois:**
```
dateTime: startAt                   // "2026-02-05T09:00:00"  
timeZone: 'Europe/Lisbon'          // usado para interpretar a hora
```

### Ficheiros

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/functions/create-google-meet/index.ts` | Logging + corrigir formato de timestamps |

