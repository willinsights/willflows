

# Plano: Marcar Integrações como Feitas e Remover Frame.io

## Resumo

Duas alterações principais:
1. **Google Calendar e Google Drive** passam de "Em breve" para integração disponível/conectável
2. **Frame.io** é removido de todas as páginas e referências visíveis ao utilizador (já substituído pela funcionalidade nativa de Aprovação de Vídeo)

---

## Alterações por Ficheiro

### 1. `src/components/account/AccountIntegrationsTab.tsx` (modal da conta)

- Remover Frame.io da lista `integrations`
- Remover `'frameio'` do mapeamento `integrationToFeature`
- Google Calendar: `comingSoon: false`
- Google Drive: `comingSoon: false`

### 2. `src/pages/Integrations.tsx` (pagina publica /integracoes)

- Remover Frame.io da lista `comingSoon`
- Adicionar Google Drive a lista `integrations` (integrações disponíveis), ao lado do Google Calendar
- Actualizar meta tags SEO para remover menção a Frame.io no title e description

### 3. `src/pages/app/Configuracoes.tsx` (configurações da app, linhas 1094-1113)

- Remover o card de Frame.io da secção de integrações

### 4. `src/pages/About.tsx` (roadmap, linha 85)

- Remover "Integração Frame.io" do roadmap Q1 2026

### 5. `src/hooks/usePlanFeatures.ts`

- Remover `'frameio'` do tipo `FeatureKey`
- Remover a descrição de `frameio` do mapeamento de features

### 6. `supabase/functions/send-friend-invite/index.ts` (email de convite)

- Remover a linha que menciona Frame.io na lista de integrações do email HTML

### 7. `src/pages/app/Media.tsx`

- Remover o filtro/tab "Frame.io" da lista de sources de media
- Remover as cores associadas a `frameio`

### 8. `src/lib/__tests__/plans.test.ts`

- Remover o teste "Studio: frameio should be TRUE"

---

## Ficheiros que NAO sao alterados

- `src/pages/features/VideoApproval.tsx` -- Mantém as menções a "Alternativa ao Frame.io" porque é posicionamento de marketing (comparação com concorrente), não uma integração
- `src/integrations/supabase/types.ts` -- Não editável (auto-gerado). A coluna `frameio_project_id` na base de dados fica sem uso mas não causa problemas
- `src/lib/validation-schemas.ts` -- O campo `frameio_project_id` fica no schema de validação como optional/nullable, sem impacto

## Resultado

- Google Calendar e Google Drive aparecem como integracões activas (com botão "Conectar")
- Frame.io desaparece de todas as páginas visíveis ao utilizador
- A página de Video Approval mantém a referência como posicionamento competitivo
