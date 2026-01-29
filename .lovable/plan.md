
# Plano: Correções no Módulo de Produção de Vídeo

## Resumo das Alterações

Duas correções pontuais para melhorar a apresentação e segurança da funcionalidade de aprovação de vídeos:

1. **Link público sempre willflow.app** – O link de aprovação nunca mais mostrará domínios internos (lovableproject.com ou lovable.app).

2. **Nome do ficheiro com quebra controlada** – Nomes longos aparecem em até 2 linhas com reticências (...) no final, sem ultrapassar o card.

---

## Detalhes Técnicos

### 1. Forçar domínio willflow.app no link de aprovação

**Ficheiro:** `src/hooks/useVideoApproval.ts`

**Alteração:** A função `getApprovalUrl` deixará de usar `window.location.origin` e passará a usar a constante `https://willflow.app`.

```text
// ANTES
const getApprovalUrl = (token: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/video-approval/${token}`;
};

// DEPOIS
const getApprovalUrl = (token: string): string => {
  return `https://willflow.app/video-approval/${token}`;
};
```

**Resultado:** Mesmo no ambiente de preview, o link copiado e exibido será sempre `https://willflow.app/video-approval/...`.

---

### 2. Nome do ficheiro limitado a 2 linhas

**Ficheiro:** `src/components/video-production/VideoVersionsList.tsx`

**Alteração:** Trocar a classe `truncate` (1 linha) por `line-clamp-2 break-all` (2 linhas + reticências).

```text
// ANTES
<p className="font-medium truncate">{version.file_name}</p>

// DEPOIS
<p className="font-medium line-clamp-2 break-all">{version.file_name}</p>
```

**Resultado:** O nome do ficheiro pode ocupar até 2 linhas; se ainda for longo, termina com "..." e nunca ultrapassa o card.

---

## Ficheiros Afetados

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useVideoApproval.ts` | URL fixo `willflow.app` |
| `src/components/video-production/VideoVersionsList.tsx` | `line-clamp-2 break-all` no nome |

---

## Validação Recomendada

Após a implementação:

1. Abrir a aba **Produção** e gerar um link de aprovação.
2. Confirmar que o link exibido e copiado começa por `https://willflow.app/`.
3. Carregar um vídeo com nome longo e verificar que o nome quebra em 2 linhas sem sair do card.
