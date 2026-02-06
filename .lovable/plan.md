
# Sidebar Minimizado: Apenas Icones com Separadores

## Problema Actual
No sidebar colapsado, cada item mostra o icone E um texto pequeno (10px) por baixo. Isto ocupa espaco desnecessario e fica visualmente pesado.

## Solucao
Remover os textos dos itens no modo colapsado, mantendo apenas os icones. Adicionar separadores finos (`<Separator />`) entre os segmentos para manter a organizacao visual.

## Alteracoes

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/layout/AppSidebar.tsx` | Remover o `<span>` com label no modo colapsado (linha 249). Mostrar apenas o icone. Adicionar `<Separator />` entre secoes no modo colapsado. Ajustar padding/gap dos itens colapsados. |

### Detalhes

**Itens colapsados** - antes:
```
[icone]
texto
```
**Itens colapsados** - depois:
```
[icone]
```

**Separadores** - entre cada grupo de secoes no modo colapsado, um `<Separator />` horizontal fino substituira o espaco vazio onde estava o titulo da secao.

**Ajustes de estilo**:
- Remover `flex-col` e `gap-0.5` do item colapsado (fica centrado sem texto)
- Usar `justify-center` para centrar o icone
- Icone sobe ligeiramente para `h-5 w-5` (mesmo tamanho que expandido) para melhor visibilidade
- `space-y-6` entre secoes reduz para `space-y-1` no colapsado, com `Separator` a fazer a divisao visual
