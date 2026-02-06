

## Adicionar botao de Eliminar no modal de detalhes do evento

### Alteracao

Adicionar um botao "Eliminar" no `EventDetailsModal`, ao lado dos botoes "Editar" e "Fechar", com confirmacao antes de apagar.

### Detalhes

- Adicionar uma prop `onDelete` ao `EventDetailsModal` (similar ao `onEdit`)
- Adicionar um botao vermelho "Eliminar" com icone de lixo (Trash2)
- Usar um `AlertDialog` para pedir confirmacao antes de eliminar
- Nao mostrar o botao em eventos importados do Google (`isGoogleImport`)
- Passar a funcao `deleteEvent` do hook `useCalendarEvents` como `onDelete` na pagina do Calendario

### Ficheiros a alterar

1. **`src/components/calendar/EventDetailsModal.tsx`**
   - Adicionar prop `onDelete?: (eventId: string) => void`
   - Adicionar botao "Eliminar" com `AlertDialog` de confirmacao
   - Importar `Trash2` do lucide-react e componentes do AlertDialog

2. **`src/pages/app/Calendario.tsx`** (ou onde o modal e usado)
   - Passar `onDelete={deleteEvent}` ao `EventDetailsModal`

