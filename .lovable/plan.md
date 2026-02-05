
# Plano: Corrigir Notificações que Não Fecham

## Problema Identificado

As notificações do sistema (Sonner toasts), como "Projeto Entregue", não podem ser fechadas ao clicar no botão X. O problema é visível na screenshot onde a notificação verde permanece aberta.

### Causas Raiz

1. **Conflito Sonner + Radix UI**: Bug conhecido onde interações com toasts Sonner não funcionam correctamente quando disparados em contextos de modals ou dialogs Radix UI, porque o Radix captura os eventos de clique.

2. **z-index Insuficiente**: O Sonner não tem z-index explícito elevado, podendo ficar atrás de overlays invisíveis.

3. **CloseButton Não Global**: O `closeButton` é passado individualmente em cada chamada de toast, o que pode não estar a funcionar correctamente.

---

## Solução

### Parte 1: Configurar Sonner com CloseButton Global e z-index Elevado

Actualizar `src/components/ui/sonner.tsx` para:
- Adicionar `closeButton` globalmente
- Definir z-index elevado (9999) para garantir que fica acima de todos os elementos
- Usar o atributo `containerAriaLabel` para acessibilidade

```typescript
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      expand={true}
      richColors
      closeButton          // Botão de fechar em todos os toasts
      toastOptions={{
        duration: 4000,
        style: {
          zIndex: 9999,    // Garantir que fica acima de tudo
        },
        classNames: {
          // ... estilos existentes ...
          closeButton: "!bg-background !border-border hover:!bg-muted",
        },
      }}
      {...props}
    />
  );
};
```

### Parte 2: Adicionar CSS para Garantir Interactividade

Adicionar estilos em `src/index.css` para garantir que o container do Sonner tem `pointer-events` correcto:

```css
/* Sonner toast fixes */
[data-sonner-toaster] {
  z-index: 9999 !important;
  pointer-events: auto !important;
}

[data-sonner-toast] {
  pointer-events: auto !important;
}

[data-sonner-toast] button {
  pointer-events: auto !important;
  cursor: pointer !important;
}
```

### Parte 3: Remover CloseButton Redundante das Chamadas Individuais

Actualizar `src/hooks/useRealtimeNotifications.ts` para remover o `closeButton: true` individual, já que será global:

```typescript
// Linha 92-96 - Antes
toastFn(title, {
  description: message,
  duration: 8000,
  closeButton: true,  // Remover - já é global
});

// Depois
toastFn(title, {
  description: message,
  duration: 8000,
});
```

### Parte 4: Adicionar Comportamento de Swipe para Mobile

Garantir que os toasts podem ser descartados por swipe (alternativa ao botão X):

```typescript
<Sonner
  // ... outras props
  swipeDirections={['right', 'down']}  // Permitir swipe para fechar
/>
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/ui/sonner.tsx` | Adicionar `closeButton`, z-index, e estilos do botão |
| `src/index.css` | CSS para garantir pointer-events no Sonner |
| `src/hooks/useRealtimeNotifications.ts` | Remover `closeButton: true` redundante |

---

## Impacto

- Todas as notificações terão botão de fechar visível e funcional
- O swipe também funcionará para fechar em mobile
- As notificações ficarão sempre acima de todos os outros elementos
- Nenhuma funcionalidade existente será afectada
