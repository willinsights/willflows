

## Limpeza de Eventos Duplicados e Correção do Sync

### Problema Identificado

A sincronização do Google Calendar estava a importar o mesmo evento repetidamente a cada ciclo, criando duplicados. O evento "teeste" tem **15 cópias** com emojis acumulados (ex: "📌 📌 📌 📌 📌 📅 teeste"). O mesmo aconteceu com outros eventos como "reuniao teste" e "BARBEARIA DOM CLUB".

A causa raiz: a importacao do Google Calendar nao verificava correctamente se o evento ja existia na base de dados, criando um novo registo em vez de atualizar o existente.

### Plano

**1. Limpar duplicados da base de dados**
- Executar uma migração SQL que mantém apenas o evento original (mais antigo) de cada grupo de duplicados
- Apagar todos os duplicados com títulos que contenham emojis empilhados
- Corrigir os títulos dos eventos originais removendo os emojis acumulados

**2. Corrigir a lógica de importação no edge function**
- Na função `google-calendar-sync`, melhorar a detecção de duplicados durante a importação do Google
- Usar o `google_event_id` como chave única para evitar reimportações
- Fazer UPSERT em vez de INSERT na importação, garantindo que eventos existentes são atualizados e não duplicados

**3. Redeployar a função corrigida**

### Secção Técnica

**SQL de limpeza** - Identifica duplicados pelo `google_event_id` e mantém apenas o registo mais antigo de cada grupo. Remove emojis acumulados dos títulos restantes.

**Edge function** - O ficheiro `supabase/functions/google-calendar-sync/index.ts` será atualizado na secção de importação (onde eventos do Google sao inseridos na BD) para:
- Verificar por `google_event_id` antes de inserir
- Usar `.upsert()` com `onConflict: 'google_event_id'` ou verificação manual prévia
- Limpar emojis do título antes de guardar

