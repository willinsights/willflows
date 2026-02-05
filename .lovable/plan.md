
# Plano: Mostrar Detalhes dos Segmentos na Timeline

## Problema

Actualmente, cada segmento da timeline só mostra o nome e a duração. Os campos adicionais como **descrição** e **notas** não são visíveis sem clicar para editar.

## Dados Disponíveis por Segmento

| Campo | Visível Actualmente | Proposta |
|-------|:-------------------:|:--------:|
| Nome | Sim | Sim |
| Duração | Sim | Sim |
| Descrição | Nao | Tooltip/HoverCard |
| Notas | Nao | Tooltip/HoverCard |

---

## Solucao Proposta

### Opcao Recomendada: HoverCard (Popover ao Passar o Rato)

Ao passar o rato sobre cada segmento, aparece um painel com todos os detalhes:

```text
┌────────────────────────────────────┐
│  Fachada                           │
│  Duracao: 4s                       │
├────────────────────────────────────┤
│  Descricao:                        │
│  Mostrar fachada do edificio...    │
├────────────────────────────────────┤
│  Notas:                            │
│  Usar drone se disponivel          │
└────────────────────────────────────┘
```

### Vantagens
- Nao ocupa espaco extra na UI
- Detalhes completos disponiveis instantaneamente
- Mantém o design limpo da timeline
- Funciona em desktop (hover) e mobile (lista ja mostra detalhes)

---

## Implementacao

### Parte 1: Actualizar TimelineSegment com HoverCard

Envolver cada segmento num `HoverCard` que mostra os detalhes ao passar o rato:

```typescript
// TimelineSegment.tsx
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

export function TimelineSegment({ segment, width, index, onClick }) {
  const colorClass = segmentColors[index % segmentColors.length];
  const hasDetails = segment.description || segment.notes;
  
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <motion.div ...>
          {/* Conteudo actual do segmento */}
        </motion.div>
      </HoverCardTrigger>
      
      {hasDetails && (
        <HoverCardContent className="w-72" side="top">
          <div className="space-y-2">
            <div>
              <h4 className="font-semibold">{segment.name}</h4>
              <p className="text-xs text-muted-foreground">
                {formatDurationRange(...)}
              </p>
            </div>
            
            {segment.description && (
              <div>
                <p className="text-xs font-medium">Descricao</p>
                <p className="text-sm">{segment.description}</p>
              </div>
            )}
            
            {segment.notes && (
              <div>
                <p className="text-xs font-medium">Notas</p>
                <p className="text-sm text-muted-foreground">
                  {segment.notes}
                </p>
              </div>
            )}
          </div>
        </HoverCardContent>
      )}
    </HoverCard>
  );
}
```

### Parte 2: Indicador Visual de Detalhes

Adicionar um pequeno icone ou indicador quando o segmento tem descricao ou notas:

```typescript
// Dentro do segmento, mostrar um ponto ou icone
{hasDetails && (
  <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-white/60 rounded-full" />
)}
```

### Parte 3: Melhorar Vista Mobile

A vista mobile (lista vertical) ja mostra a descricao, mas podemos adicionar as notas tambem:

```typescript
// ProjectTimelineTab.tsx - Vista mobile
<div>
  <p className="font-medium">{segment.name}</p>
  {segment.description && (
    <p className="text-xs text-muted-foreground">{segment.description}</p>
  )}
  {segment.notes && (
    <p className="text-xs text-muted-foreground/70 italic mt-1">
      Notas: {segment.notes}
    </p>
  )}
</div>
```

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/projects/timeline/TimelineSegment.tsx` | Adicionar HoverCard com detalhes e indicador visual |
| `src/components/projects/ProjectTimelineTab.tsx` | Adicionar notas na vista mobile |

---

## Comportamento Esperado

### Desktop
1. Timeline mostra segmentos com nome e duracao
2. Segmentos com detalhes mostram um pequeno indicador (ponto)
3. Ao passar o rato, aparece um painel com descricao e notas
4. Clicar ainda abre o modal de edicao

### Mobile
1. Lista vertical mostra nome, descricao e notas directamente
2. Tocar abre o modal de edicao

---

## Impacto

- Detalhes de cada segmento visiveis sem necessidade de clicar
- Interface limpa mantida na timeline horizontal
- Experiencia melhorada para editores que precisam ver notas rapidamente
