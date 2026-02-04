
# Plano de Correções e Melhorias - WillFlow

## Resumo Executivo

Este plano aborda 9 áreas críticas identificadas no sistema WillFlow, com foco em qualidade, UX consistente e código limpo. A implementação seguirá uma abordagem modular, minimizando riscos e permitindo testes incrementais.

---

## 1. ABA PRODUÇÃO — Badge de Versões (Ícone Deformado)

### Diagnóstico
No ficheiro `VideoVersionsList.tsx`, o badge de versão usa classes `w-8 h-8` mas não tem `aspect-ratio` nem `flex-shrink-0`, o que permite deformação em containers flexíveis.

**Código atual (linha 102-114):**
```tsx
<div className={cn(
  "flex items-center justify-center rounded-full w-8 h-8 text-sm font-bold",
  // ...
)}>
  V{version.version_number}
</div>
```

### Solução
```tsx
<div className={cn(
  "flex items-center justify-center rounded-full",
  "w-8 h-8 min-w-[2rem] min-h-[2rem] aspect-square flex-shrink-0",
  "text-sm font-bold",
  // ...
)}>
```

### Ficheiros Afetados
- `src/components/video-production/VideoVersionsList.tsx`

---

## 2. PLAYER DE VÍDEO — Erro código 4 ao pausar/play

### Diagnóstico
O `VideoPlayer.tsx` já tem lógica de recovery para erros de media (linhas 276-294), mas apenas faz 1 tentativa de recuperação. O problema ocorre quando o HLS perde o contexto do source após pausas longas.

### Solução

1. **Aumentar tentativas de recovery para 3**
2. **Adicionar retry silencioso antes de mostrar erro**
3. **Reinicializar HLS se recovery falhar** (preservando timestamp)
4. **Adicionar listener para `waiting` event** para detectar stalls

```tsx
// Novo estado
const retryCountRef = useRef(0);
const lastTimeRef = useRef(0);

// Guardar posição antes de recovery
const handleVideoError = useCallback(() => {
  const video = videoRef.current;
  lastTimeRef.current = video?.currentTime || 0;
  
  if (retryCountRef.current < 3 && hlsRef.current) {
    retryCountRef.current++;
    hlsRef.current.recoverMediaError();
    return;
  }
  
  // Reinicializar HLS mantendo timestamp
  if (retryCountRef.current < 5) {
    retryCountRef.current++;
    reinitializeHls(lastTimeRef.current);
    return;
  }
  
  // Só mostrar erro após todas as tentativas
  setLoadError('Falha ao carregar o vídeo (código 4)');
}, []);
```

### Ficheiros Afetados
- `src/components/video-production/VideoPlayer.tsx`

---

## 3. PAINEL DE FEEDBACK — Não aparece no Super Admin

### Diagnóstico
Verifiquei na base de dados e existem feedbacks registados:
```
id: 094adc9a-fc54-4e13-a017-d3770b5dcd11 | title: "erro" | status: pending
id: 03928793-a83d-4575-8ef3-c0f0651aeaab | title: "wefwef" | status: pending
```

O hook `useFeedbackAdmin.ts` já usa `enabled: isSuperAdmin` (corrigido anteriormente). O problema pode estar nas **RLS policies** da tabela `feedback` que bloqueiam SELECT para super admins.

### Solução

1. **Verificar RLS policies** - criar política SELECT para super admins
2. **Adicionar logging de erro** no frontend para debug
3. **Melhorar tratamento de erro** no hook

```sql
-- Criar política de leitura para super admins
CREATE POLICY "Super admins can read all feedback"
ON feedback FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_system_admin = true
  )
);
```

### Ficheiros Afetados
- Migração SQL para RLS
- `src/hooks/useFeedbackAdmin.ts` (melhorar error handling)

---

## 4. MÍDIA — Storage Manager (Admin)

### Diagnóstico
Já existe um `StorageManagementCard.tsx` na pasta `video-production` que mostra uso de storage individual. Falta uma visão administrativa para gestão de mídias por projeto.

### Solução

Criar nova aba "Armazenamento" no menu de definições ou na área de Mídia com:

```text
┌─────────────────────────────────────────────────────────────┐
│  STORAGE OVERVIEW                                           │
├─────────────────────────────────────────────────────────────┤
│  [████████░░░░░░░░░░] 45% usado                            │
│  4.5 GB / 10 GB                                             │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Vídeos   │ │ Imagens  │ │ Raw      │ │ Outros   │      │
│  │ 3.2 GB   │ │ 0.8 GB   │ │ 0.5 GB   │ │ 0 GB     │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
├─────────────────────────────────────────────────────────────┤
│  MÍDIAS POR PROJETO                                         │
│  ▼ Projeto "Park Hyatt Sydney"                              │
│    • V3 - final_edit.mp4 (850 MB) - Aprovado ⏱ 12 dias     │
│    • V2 - draft_v2.mp4 (720 MB)   [Apagar]                 │
│    • V1 - draft_v1.mp4 (680 MB)   [Apagar]                 │
│  ▼ Projeto "Reel Contrastes"                                │
│    • V1 - reel.mp4 (1.2 GB)       [Apagar]                 │
├─────────────────────────────────────────────────────────────┤
│  [Upgrade Storage]                                          │
└─────────────────────────────────────────────────────────────┘
```

### Ficheiros a Criar
- `src/components/settings/StorageManagerTab.tsx`
- `src/hooks/useWorkspaceMediaList.ts`

### Ficheiros a Modificar
- `src/pages/app/Definicoes.tsx` (adicionar aba)

---

## 5. DOWNLOAD DE VÍDEO — Produção + Review

### Diagnóstico
Não existe funcionalidade de download. Precisa ser implementada em:
- `VideoVersionsList.tsx` (botão de download)
- `VideoApproval.tsx` (portal público)
- `VideoPlayer.tsx` (menu de controles)

### Solução

1. **Criar Edge Function para gerar URL de download assinada**
```typescript
// supabase/functions/video-download-url/index.ts
export async function generateDownloadUrl(streamUid: string): Promise<string> {
  // Cloudflare Stream permite download via API
  const downloadUrl = `https://videodelivery.net/${streamUid}/downloads/default.mp4`;
  return signUrl(downloadUrl, 300); // 5 min expiry
}
```

2. **Adicionar botão Download no VideoVersionsList**
```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={(e) => {
    e.stopPropagation();
    handleDownload(version);
  }}
>
  <Download className="h-4 w-4" />
</Button>
```

3. **Logging de downloads** para auditoria

### Ficheiros a Criar
- `supabase/functions/video-download-url/index.ts`

### Ficheiros a Modificar
- `src/components/video-production/VideoVersionsList.tsx`
- `src/components/video-production/VideoPlayer.tsx`
- `src/pages/public/VideoApproval.tsx`

---

## 6. STORAGE WORKSPACE OVERRIDE — In-Sights para 1TB

### Diagnóstico
Workspace encontrado:
- **ID:** `6ee9555c-1dbd-4503-8889-24f97226b202`
- **Nome:** In-Sights
- **Slug:** estudio-wilker-mkmrr15j
- **Storage atual:** 10 GB (10737418240 bytes)

### Solução

Executar migração SQL para atualizar quota:

```sql
-- Atualizar storage limit para 1TB (1099511627776 bytes)
UPDATE workspace_storage 
SET 
  storage_limit_bytes = 1099511627776,
  base_storage_bytes = 1099511627776,
  updated_at = NOW()
WHERE workspace_id = '6ee9555c-1dbd-4503-8889-24f97226b202';

-- Caso não exista registro, inserir
INSERT INTO workspace_storage (workspace_id, storage_limit_bytes, base_storage_bytes, storage_used_bytes)
SELECT 
  '6ee9555c-1dbd-4503-8889-24f97226b202',
  1099511627776,
  1099511627776,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_storage 
  WHERE workspace_id = '6ee9555c-1dbd-4503-8889-24f97226b202'
);
```

### Ficheiros Afetados
- Migração SQL única

---

## 7. FINANCEIRO — Campo pagamento salva a cada tecla

### Diagnóstico
No `ProjectFinancialTab.tsx` (linhas 348-355), o `CurrencyInput` chama `handleTeamMemberPaymentChange` diretamente no `onChange`, disparando uma API call a cada keystroke:

```tsx
<CurrencyInput
  value={member.payment_amount}
  onChange={(value) => handleTeamMemberPaymentChange(
    member.id, 
    'payment_amount', 
    value || 0
  )}
/>
```

### Solução

1. **Implementar draft state local** para cada membro
2. **Salvar apenas em onBlur ou Enter**
3. **Mostrar indicador visual de "não salvo"**

```tsx
// Estado local por membro
const [draftAmounts, setDraftAmounts] = useState<Record<string, number | null>>({});

// Handler de mudança local (sem API)
const handleLocalAmountChange = (memberId: string, value: number | null) => {
  setDraftAmounts(prev => ({ ...prev, [memberId]: value }));
};

// Handler de save (onBlur ou Enter)
const handleSaveAmount = async (memberId: string) => {
  const value = draftAmounts[memberId];
  if (value === undefined) return; // Sem mudanças
  
  await handleTeamMemberPaymentChange(memberId, 'payment_amount', value || 0);
  setDraftAmounts(prev => {
    const { [memberId]: _, ...rest } = prev;
    return rest;
  });
};

// No CurrencyInput
<CurrencyInput
  value={draftAmounts[member.id] ?? member.payment_amount}
  onChange={(value) => handleLocalAmountChange(member.id, value)}
  onBlur={() => handleSaveAmount(member.id)}
  onKeyDown={(e) => e.key === 'Enter' && handleSaveAmount(member.id)}
  className={cn(
    draftAmounts[member.id] !== undefined && "border-warning"
  )}
/>
```

### Ficheiros Afetados
- `src/components/projects/ProjectFinancialTab.tsx`
- `src/components/ui/currency-input.tsx` (adicionar onBlur e onKeyDown props)

---

## 8. TESTES OBRIGATÓRIOS

### Lista de Testes a Criar

```text
src/components/video-production/__tests__/
├── VideoPlayer.test.tsx       # pause/play, error recovery
├── VideoVersionsList.test.tsx # badge proporção, delete
└── StorageManager.test.tsx    # cálculos, display

src/components/projects/__tests__/
└── ProjectFinancialTab.test.tsx # draft state, save behavior

src/hooks/__tests__/
├── useFeedbackAdmin.test.ts   # fetch, filters
└── useWorkspaceStorage.test.ts # cálculos

e2e/
└── video-production.spec.ts   # upload, play, download
```

### Cobertura Mínima
- Player pause/play sem erro
- Upload/delete mídia
- Storage cálculo correto
- Download versão
- Feedback submit → super admin
- Financeiro editar valor (debounced)
- Badge versão responsivo

---

## 9. QUALIDADE DE CÓDIGO

### Checklist de Refactoring

| Área | Problema | Solução |
|------|----------|---------|
| `ProjectFinancialTab` | Auto-save agressivo | Draft state + debounce |
| `VideoPlayer` | Recovery limitado | 3 tentativas + reinit |
| `CurrencyInput` | Sem onBlur | Adicionar prop |
| `useFeedbackAdmin` | Sem error logging | Adicionar console.error |
| URLs de vídeo | Inconsistência | Normalizar para videodelivery.net |

---

## Sequência de Implementação Recomendada

```text
Fase 1 (Crítico - Bugs)
├── 2. Player erro código 4
├── 3. Feedback RLS
└── 7. Financeiro auto-save

Fase 2 (UX)
├── 1. Badge versão
├── 5. Download vídeo
└── 6. Storage override In-Sights

Fase 3 (Funcionalidades)
├── 4. Storage Manager
└── 8. Testes

Fase 4 (Manutenção)
└── 9. Refactoring código
```

---

## Secção Técnica Detalhada

### Dependências Entre Tarefas
- Storage Manager (4) depende de useWorkspaceMediaList hook
- Download (5) depende de Edge Function
- Testes (8) dependem de todas as correções anteriores

### Riscos Identificados
1. **RLS Feedback**: Pode requerer verificação de permissões is_system_admin
2. **HLS Recovery**: Browsers Safari vs Chrome comportam-se diferente
3. **Storage Override**: Validar que não afeta cálculos de addon

### Estimativa de Esforço
- Fase 1: ~3-4 horas
- Fase 2: ~4-5 horas
- Fase 3: ~6-8 horas
- Fase 4: ~2-3 horas
- **Total: ~15-20 horas**

