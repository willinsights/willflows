

# Plano: Nova Aba "Timeline" - Estrutura de Video com Templates

## Resumo

Vou criar uma nova aba "Timeline" nos detalhes do projeto que permite definir a **estrutura do video final** com segmentos de tempo. Esta funcionalidade serve como guia para editores saberem exatamente quanto tempo cada secao do video deve ter.

A grande diferenca em relacao ao prompt original e que **nao focaremos em status de progresso** (Not Started, In Progress, etc.), mas sim em:

1. **Definir a estrutura do video** - Segmentos como "Introducao (5s)", "Objecto (4-6s)", "Acao (20s)"
2. **Templates reutilizaveis** - Guardar estruturas para usar em projetos futuros
3. **Flexibilidade** - Segmentos podem ter duracao fixa (5s) ou intervalo (4-6s)

---

## Exemplo de Uso

Um utilizador define esta estrutura para um video de hotel:

| Segmento | Duracao |
|----------|---------|
| Introducao (contexto) | 5 segundos |
| Objecto | 4 a 6 segundos |
| Intervenientes | 4 segundos |
| Acao | 20 segundos |
| Detalhes | 12 segundos |
| Drones | 8 a 12 segundos |

Depois pode guardar isto como template "Video Hotel Standard" para reutilizar em projetos semelhantes.

---

## Estrutura de Dados

### Tabela: `video_structures`

Armazena estruturas de segmentos de video por projeto.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| project_id | uuid | Referencia ao projeto |
| workspace_id | uuid | Referencia ao workspace |
| name | text | Nome do segmento (ex: "Introducao") |
| description | text | Descricao opcional |
| min_duration_seconds | integer | Duracao minima em segundos |
| max_duration_seconds | integer | Duracao maxima (se for intervalo) |
| position | integer | Ordem na timeline |
| notes | text | Notas opcionais |
| created_by | uuid | Quem criou |
| created_at | timestamp | Data de criacao |
| updated_at | timestamp | Data de atualizacao |

### Tabela: `video_structure_templates`

Armazena templates reutilizaveis de estrutura.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Identificador unico |
| workspace_id | uuid | Referencia ao workspace |
| name | text | Nome do template (ex: "Video Hotel") |
| description | text | Descricao opcional |
| segments | jsonb | Array com os segmentos |
| is_default | boolean | Se e o template padrao |
| created_by | uuid | Quem criou |
| created_at | timestamp | Data de criacao |
| updated_at | timestamp | Data de atualizacao |

---

## Componentes Visuais

### 1. Cabecalho da Timeline

- Titulo "Timeline" com icone de video
- Botao "+ Adicionar Segmento" (primario)
- Dropdown "Aplicar Template" com templates disponiveis
- Botao "Guardar como Template" (secundario)

### 2. Overview de Duracao

- Duracao total estimada (ex: "53-65 segundos")
- Numero de segmentos
- Badge indicando se ha template aplicado

### 3. Timeline Visual Horizontal

- Linha do tempo horizontal ocupando toda a largura
- Segmentos como blocos coloridos proporcionais a duracao
- Cada segmento mostra:
  - Nome (ex: "Introducao")
  - Duracao (ex: "5s" ou "4-6s")
- Cores seguem a paleta WillFlow (violeta primario, tons de cinza)
- Marcadores de tempo na parte inferior

### 4. Lista de Segmentos (alternativa mobile)

- Em ecras pequenos, lista vertical em vez de timeline horizontal
- Cards arrastáveis para reordenar
- Mesma informacao que a timeline

---

## Fluxo de Interacao

```text
Usuario abre detalhes do projeto
        |
        v
Clica na aba "Timeline"
        |
        v
Ve timeline vazia ou com segmentos
        |
        +---> "Aplicar Template"
        |            |
        |            v
        |     Lista de templates do workspace
        |     Seleciona um -> Segmentos carregados
        |
        +---> "+ Adicionar Segmento"
        |            |
        |            v
        |     Modal com campos:
        |     - Nome (obrigatorio)
        |     - Descricao
        |     - Duracao minima (segundos)
        |     - Duracao maxima (opcional)
        |     - Notas
        |            |
        |            v
        |     Valida e adiciona
        |
        +---> Clica em segmento
        |            |
        |            v
        |     Popover com detalhes
        |     Botoes Editar / Apagar
        |
        +---> "Guardar como Template"
                     |
                     v
              Modal pede nome do template
              Salva e fica disponivel
              para outros projetos
```

---

## Ficheiros a Criar

| Ficheiro | Descricao |
|----------|-----------|
| `src/components/projects/ProjectTimelineTab.tsx` | Componente principal da aba |
| `src/components/projects/timeline/TimelineSegment.tsx` | Segmento visual na timeline |
| `src/components/projects/timeline/TimelineOverview.tsx` | Resumo de duracao |
| `src/components/projects/timeline/AddSegmentModal.tsx` | Modal para adicionar segmento |
| `src/components/projects/timeline/EditSegmentModal.tsx` | Modal para editar segmento |
| `src/components/projects/timeline/SegmentPopover.tsx` | Popover de detalhes |
| `src/components/projects/timeline/ApplyTemplateDropdown.tsx` | Dropdown de templates |
| `src/components/projects/timeline/SaveTemplateModal.tsx` | Modal para guardar template |
| `src/hooks/useVideoStructure.ts` | Hook para CRUD de segmentos |
| `src/hooks/useVideoStructureTemplates.ts` | Hook para CRUD de templates |
| `src/lib/duration-utils.ts` | Funcoes utilitarias para duracoes |

---

## Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/projects/ProjectDetailsSheet.tsx` | Adicionar nova aba "Timeline" no TabsList |
| `src/components/projects/ProjectDetailsModal.tsx` | Mesmas alteracoes para consistencia |

---

## Adaptacoes ao Estilo WillFlow

Em vez das cores do prompt original, usarei:

- **Primary Violet** (#5B4AE4) para elementos de destaque
- **Muted** para segmentos sem cor especial
- **Glassmorphism** para modais e popovers
- **Transicoes suaves** com Framer Motion
- **Sombras premium** do design system existente

---

## Responsividade

- **Desktop**: Timeline horizontal completa com marcadores de tempo
- **Tablet**: Timeline com scroll horizontal
- **Mobile**: Lista vertical de segmentos em cards arrastaveis

---

## Secao Tecnica

### Funcoes de Duracao

```typescript
// Formatar segundos para display legivel
formatDuration(seconds: number): string
// Retorna "5s" ou "1m 30s"

// Formatar intervalo de duracao
formatDurationRange(min: number, max: number | null): string
// Retorna "5s" ou "4-6s"

// Calcular duracao total de segmentos
calculateTotalDuration(segments: VideoStructure[]): { min: number; max: number }

// Calcular largura percentual do segmento
calculateSegmentWidth(segment: VideoStructure, totalMax: number): number

// Gerar marcadores de tempo para a timeline
generateTimeMarkers(totalSeconds: number, count: number): string[]
```

### Hook useVideoStructure

```typescript
interface UseVideoStructure {
  segments: VideoStructure[];
  loading: boolean;
  addSegment: (data: CreateSegmentInput) => Promise<void>;
  updateSegment: (id: string, data: UpdateSegmentInput) => Promise<void>;
  deleteSegment: (id: string) => Promise<void>;
  reorderSegments: (segments: VideoStructure[]) => Promise<void>;
  applyTemplate: (templateId: string) => Promise<void>;
  clearAll: () => Promise<void>;
}
```

### Hook useVideoStructureTemplates

```typescript
interface UseVideoStructureTemplates {
  templates: VideoStructureTemplate[];
  loading: boolean;
  createTemplate: (name: string, description?: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  updateTemplate: (id: string, data: UpdateTemplateInput) => Promise<void>;
}
```

### Migracao SQL

- Criar tabela `video_structures`
- Criar tabela `video_structure_templates`
- Adicionar indices para `project_id` e `workspace_id`
- Habilitar realtime para atualizacoes em tempo real
- Configurar politicas RLS

### Politicas RLS

**video_structures**:
- SELECT: Membros do workspace podem visualizar
- INSERT: Roles admin, editor, captacao podem criar
- UPDATE: Criador ou admin podem editar
- DELETE: Criador ou admin podem apagar

**video_structure_templates**:
- SELECT: Membros do workspace podem visualizar
- INSERT: Admin pode criar
- UPDATE: Criador ou admin podem editar
- DELETE: Criador ou admin podem apagar

---

## Ordem de Implementacao

1. Criar migracao das tabelas `video_structures` e `video_structure_templates`
2. Criar funcoes utilitarias de duracao
3. Criar hooks `useVideoStructure` e `useVideoStructureTemplates`
4. Criar componentes de timeline (segmento, overview, etc.)
5. Criar modais de adicionar/editar segmentos
6. Criar componentes de templates (dropdown, modal guardar)
7. Integrar nova aba nos detalhes do projeto
8. Testar funcionalidade completa

