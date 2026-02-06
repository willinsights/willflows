

## Correcao: Link Google Meet nao aparece no evento

### Problema

O evento foi criado com sucesso, mas o link do Google Meet nao apareceu porque a funcao backend `create-google-meet` nao esta deployada no servidor. O pedido falhou com "Failed to fetch" (funcao retorna 404 - Not Found).

O fluxo no codigo esta correcto: o toggle "Criar Google Meet automaticamente" activa, a chamada e feita, mas como a funcao nao existe no servidor, falha silenciosamente e o evento e criado sem link.

### Plano

**1. Redeployar a funcao `create-google-meet`**
- A funcao ja existe em `supabase/functions/create-google-meet/index.ts` e o codigo esta correcto
- Basta fazer o deploy para que fique disponivel no servidor

**2. Verificar que funcoes relacionadas tambem estao deployadas**
- `google-calendar-auth` (necessaria para a conexao OAuth)
- `google-calendar-sync` (necessaria para sincronizacao)

**3. Testar o fluxo completo**
- Criar um evento com tipo "Reuniao" e toggle Meet activado
- Confirmar que o link aparece no EventDetailsModal

### Seccao Tecnica

A funcao `create-google-meet` faz:
1. Valida o JWT do utilizador
2. Verifica membership no workspace
3. Busca a conexao Google Calendar do utilizador
4. Faz refresh do token OAuth se necessario (tokens encriptados na BD)
5. Cria um evento no Google Calendar com `conferenceDataVersion=1` (Google Meet)
6. Retorna o `meetUrl` e `googleEventId`

O frontend em `useCalendarEvents.ts` recebe o `meetUrl`, guarda-o no campo `video_call_url` da tabela `calendar_events`, e o `EventDetailsModal` mostra o botao "Abrir Sala de Reuniao" quando esse campo tem valor.

Nenhuma alteracao de codigo e necessaria -- apenas o deploy da funcao.
