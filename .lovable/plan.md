

# Plano: Activar Google Meet e Remover Google Drive

## Contexto

O Google Meet **já funciona** -- a edge function `create-google-meet` é chamada ao criar eventos e comunicações com reunião. O que está desactualizado é a UI que ainda mostra "Em breve" em vários sítios, e o Google Drive foi adicionado por engano.

## Alterações

### 1. `src/components/account/AccountIntegrationsTab.tsx`
- Remover Google Drive da lista de integrações
- Adicionar Google Meet como integração disponível (com ícone Video)
- Adicionar `'google-meet': 'googleMeet'` ao mapeamento `integrationToFeature`

### 2. `src/pages/Integrations.tsx` (página pública)
- Remover Google Drive da lista `integrations` (integrações disponíveis)
- Mover Google Meet de `comingSoon` para `integrations` (disponível)
- Adicionar features e benefícios do Meet (links automáticos, integração com calendário, etc.)

### 3. `src/pages/app/Configuracoes.tsx` (configurações da app)
- Remover o card de Google Meet com badge "Em breve" e `opacity-60`
- Substituir por um card activo mostrando que o Meet está disponível (sem opacity, sem badge "Em breve")

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/account/AccountIntegrationsTab.tsx` | Remover Drive, adicionar Meet |
| `src/pages/Integrations.tsx` | Mover Meet para disponível, remover Drive |
| `src/pages/app/Configuracoes.tsx` | Activar card do Meet |

## Resultado

- Google Meet aparece como integração activa em todas as páginas
- Google Drive é removido
- O funcionamento interno (edge function, hooks) não muda -- já está tudo a funcionar
