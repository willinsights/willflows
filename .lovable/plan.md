

## Tornar Links Clicáveis no Chat

### Problema Atual

O conteúdo das mensagens no chat é renderizado como texto simples. Quando um utilizador envia uma URL (ex: `https://exemplo.com`), ela aparece como texto não clicável.

---

### Solução

Criar uma função utilitária `linkifyText` que:
1. Deteta URLs no texto usando regex
2. Converte-as em elementos `<a>` clicáveis
3. Abre links em nova aba (`target="_blank"`)
4. Adiciona segurança com `rel="noopener noreferrer"`

---

### Ficheiros a Modificar/Criar

| Ficheiro | Alteração |
|----------|-----------|
| `src/lib/linkify.tsx` | Criar função utilitária para detetar e renderizar links |
| `src/components/chat/ChatMessage.tsx` | Usar `linkifyText` no corpo da mensagem |

---

### Implementação

**1. Criar função `linkifyText` (src/lib/linkify.tsx):**

```typescript
import React from 'react';

// Regex para detetar URLs (http, https, www)
const URL_REGEX = /((https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?"'\])>])/gi;

export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];

  const parts = text.split(URL_REGEX);
  
  return parts.map((part, index) => {
    // Verificar se esta parte é uma URL
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex
      URL_REGEX.lastIndex = 0;
      
      // Adicionar https:// se começar com www.
      const href = part.startsWith('www.') ? `https://${part}` : part;
      
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
```

**2. Usar no ChatMessage.tsx (linha 247-249):**

```tsx
// Antes
<div className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words leading-relaxed">
  {message.body}
</div>

// Depois
import { linkifyText } from '@/lib/linkify';

<div className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap break-words leading-relaxed">
  {linkifyText(message.body)}
</div>
```

---

### Comportamento

| Texto Original | Resultado |
|----------------|-----------|
| `Vê este site https://exemplo.com` | Vê este site <u>https://exemplo.com</u> (clicável) |
| `www.google.pt` | <u>www.google.pt</u> → abre `https://www.google.pt` |
| `Texto sem links` | Texto sem links (inalterado) |

---

### Características

1. **Segurança**: `rel="noopener noreferrer"` previne ataques de tab-nabbing
2. **Nova aba**: `target="_blank"` não interrompe a navegação atual
3. **Visual**: Links aparecem sublinhados com cor primária
4. **Compatibilidade**: Suporta URLs com http://, https:// e www.
5. **Preserva espaços**: O resto do texto mantém formatação original

