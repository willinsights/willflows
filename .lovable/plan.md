

# Sala de Reuniao Google Meet dentro da App

## Contexto

O Google Meet nao permite ser embutido num iframe por razoes de seguranca. Por isso, a melhor abordagem e criar uma **pagina de reuniao dedicada** dentro da app que:
- Abre o Google Meet num novo separador ao clicar
- Mostra o link da reuniao com botao de copiar para partilhar com outras pessoas
- Mostra os detalhes do evento associado

## Alteracoes

### 1. Novo componente: `src/components/calendar/MeetingRoomModal.tsx`
- Modal grande com layout dedicado a reuniao
- Botao principal "Entrar na Reuniao" (abre Meet em novo separador)
- Campo com o link Meet + botao "Copiar Link" para partilhar
- Detalhes do evento (titulo, hora, participantes)
- Indicacao visual de que o Meet abre num novo separador

### 2. Atualizar `src/components/calendar/EventDetailsModal.tsx`
- Ao clicar no link do Meet, em vez de abrir directamente num novo separador, abre o `MeetingRoomModal`
- Adicionar estado para controlar a abertura do MeetingRoomModal

### 3. Atualizar `src/components/clients/ClientDetailsModal.tsx`
- Nas comunicacoes com `meet_url`, adicionar botao de copiar link
- Usar o mesmo MeetingRoomModal ao clicar no link

## Detalhes Tecnicos

### MeetingRoomModal
```
+------------------------------------------+
|  Reuniao: "Titulo do Evento"             |
|                                          |
|  [====== Entrar na Reuniao ======]       |
|  (abre Google Meet num novo separador)   |
|                                          |
|  Link para convidar:                     |
|  [ https://meet.google.com/xxx ] [Copiar]|
|                                          |
|  Data: 5 de Fevereiro, 09:00 - 10:00    |
|  Descricao: ...                          |
+------------------------------------------+
```

- Usa `navigator.clipboard.writeText()` para copiar o link
- Toast de confirmacao "Link copiado!" ao copiar
- Botao principal grande e destacado para entrar na reuniao

### Ficheiros

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/calendar/MeetingRoomModal.tsx` | Novo componente - sala de reuniao |
| `src/components/calendar/EventDetailsModal.tsx` | Abrir MeetingRoomModal em vez de link directo |
| `src/components/clients/ClientDetailsModal.tsx` | Adicionar copiar link nas comunicacoes |

