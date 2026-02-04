
# Plano: Seleção em Massa para Eliminar Mídia

## Contexto

A página **Media & Uploads** → aba **Armazenamento** permite gerir vídeos armazenados por projeto. Atualmente só é possível eliminar um vídeo de cada vez. Vamos adicionar seleção em massa seguindo o padrão já existente na página de Leads.

---

## O que será implementado

1. **Checkboxes de seleção** em cada linha de vídeo
2. **Opção "Selecionar todos"** ao expandir um projeto
3. **Barra de ação flutuante** quando há itens selecionados
4. **Modal de confirmação** para eliminação em massa
5. **Eliminação paralela** dos vídeos selecionados (incluindo Cloudflare Stream)

---

## Design da Interface

Quando expandires um projeto:

```text
┌─────────────────────────────────────────────────────────────────┐
│ ☑ Selecionar todos (3)                                          │
├─────────────────────────────────────────────────────────────────┤
│ ☐  V1  video_final.mp4     │  250 MB  │  15 Jan 2026  │  🗑️   │
│ ☐  V2  video_v2_cor.mp4    │  280 MB  │  18 Jan 2026  │  🗑️   │
│ ☑  V3  video_final_ok.mp4  │  290 MB  │  20 Jan 2026  │  🗑️   │
└─────────────────────────────────────────────────────────────────┘
```

Barra de ação (quando há seleção):

```text
┌──────────────────────────────────────────────────────────────────┐
│  ✓ 3 vídeos selecionados (820 MB)     [Limpar]  [Eliminar 3]    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Alterações

### 1. StorageManagerTab.tsx - Estado de Seleção

Adicionar estado para controlar seleção:

```typescript
const [selectedVersionIds, setSelectedVersionIds] = useState<Set<string>>(new Set());
const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
const [isBulkDeleting, setIsBulkDeleting] = useState(false);
```

### 2. StorageManagerTab.tsx - Handlers de Seleção

```typescript
// Toggle individual
const handleToggleSelect = (versionId: string) => {
  setSelectedVersionIds(prev => {
    const next = new Set(prev);
    if (next.has(versionId)) next.delete(versionId);
    else next.add(versionId);
    return next;
  });
};

// Toggle todos de um projeto
const handleSelectAllProject = (projectId: string, versions: VideoVersionWithProject[]) => {
  setSelectedVersionIds(prev => {
    const next = new Set(prev);
    const allSelected = versions.every(v => prev.has(v.id));
    
    if (allSelected) {
      versions.forEach(v => next.delete(v.id));
    } else {
      versions.forEach(v => next.add(v.id));
    }
    return next;
  });
};

// Limpar seleção
const handleClearSelection = () => setSelectedVersionIds(new Set());
```

### 3. StorageManagerTab.tsx - Eliminação em Massa

```typescript
const handleBulkDelete = async () => {
  setIsBulkDeleting(true);
  const ids = Array.from(selectedVersionIds);
  
  try {
    // Eliminar em paralelo (batches de 5)
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      await Promise.all(batch.map(async (id) => {
        const version = videoVersions.find(v => v.id === id);
        
        // Eliminar do Cloudflare Stream se existir
        if (version?.cloudflare_stream_uid) {
          await supabase.functions.invoke('stream-delete-video', {
            body: { streamUid: version.cloudflare_stream_uid }
          });
        }
        
        // Eliminar da base de dados
        await supabase.from('video_versions').delete().eq('id', id);
      }));
    }
    
    toast({
      title: 'Vídeos eliminados',
      description: `${ids.length} vídeo(s) removido(s) do armazenamento.`,
    });
    
    queryClient.invalidateQueries({ queryKey: ['storage-manager-videos'] });
    queryClient.invalidateQueries({ queryKey: ['workspace-storage'] });
    
  } catch (error: any) {
    toast({
      title: 'Erro ao eliminar',
      description: error.message,
      variant: 'destructive',
    });
  } finally {
    setIsBulkDeleting(false);
    setShowBulkDeleteModal(false);
    setSelectedVersionIds(new Set());
  }
};
```

### 4. StorageManagerTab.tsx - UI Atualizada

**Checkbox em cada linha de vídeo:**

```tsx
<motion.div className="flex items-center justify-between...">
  <div className="flex items-center gap-3 min-w-0">
    <Checkbox
      checked={selectedVersionIds.has(version.id)}
      onCheckedChange={() => handleToggleSelect(version.id)}
    />
    <div className="w-8 h-8...">V{version.version_number}</div>
    {/* resto */}
  </div>
</motion.div>
```

**Selecionar todos no topo do projeto expandido:**

```tsx
<CollapsibleContent>
  <div className="flex items-center gap-3 px-4 py-2 border-b border-muted">
    <Checkbox
      checked={group.versions.every(v => selectedVersionIds.has(v.id))}
      onCheckedChange={() => handleSelectAllProject(group.projectId, group.versions)}
    />
    <span className="text-sm text-muted-foreground">
      Selecionar todos ({group.versions.length})
    </span>
  </div>
  {/* lista de versões */}
</CollapsibleContent>
```

**Barra de ação flutuante:**

```tsx
{selectedVersionIds.size > 0 && (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="sticky top-0 z-10 flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 mb-4"
  >
    <div className="flex items-center gap-3">
      <CheckSquare className="h-5 w-5 text-primary" />
      <span className="font-medium">
        {selectedVersionIds.size} vídeo{selectedVersionIds.size > 1 ? 's' : ''} selecionado{selectedVersionIds.size > 1 ? 's' : ''}
        <span className="text-muted-foreground ml-2">
          ({formatBytes(selectedTotalBytes)})
        </span>
      </span>
    </div>
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={handleClearSelection}>
        Limpar
      </Button>
      <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteModal(true)}>
        <Trash2 className="h-4 w-4 mr-2" />
        Eliminar {selectedVersionIds.size}
      </Button>
    </div>
  </motion.div>
)}
```

### 5. Modal de Confirmação em Massa

Reutilizar o AlertDialog existente, modificando para suportar múltiplos:

```tsx
<AlertDialog open={showBulkDeleteModal} onOpenChange={setShowBulkDeleteModal}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        Apagar {selectedVersionIds.size} vídeos?
      </AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação irá libertar <strong>{formatBytes(selectedTotalBytes)}</strong> de espaço.
        Os vídeos serão removidos permanentemente.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isBulkDeleting}>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleBulkDelete}
        disabled={isBulkDeleting}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Apagar {selectedVersionIds.size}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/storage/StorageManagerTab.tsx` | Adicionar estado, handlers, UI de seleção em massa |

---

## Funcionalidades Incluídas

- ☑ Checkbox individual por vídeo
- ☑ "Selecionar todos" por projeto
- ☑ Barra flutuante com contagem e tamanho total
- ☑ Botão "Limpar seleção"
- ☑ Botão "Eliminar X"
- ☑ Modal de confirmação com espaço a libertar
- ☑ Eliminação em batches para performance
- ☑ Eliminação do Cloudflare Stream (se aplicável)
- ☑ Feedback visual durante eliminação
- ☑ Atualização automática após eliminação

---

## Secção Técnica

### Padrão seguido
O mesmo padrão de seleção em massa do `src/pages/app/Leads.tsx`:
- Estado com Set de IDs selecionados
- Checkbox individual e "selecionar todos"
- Barra de ação animada com motion
- Modal AlertDialog para confirmação

### Imports necessários
```typescript
import { Checkbox } from '@/components/ui/checkbox';
import { CheckSquare } from 'lucide-react';
```

### Cálculo do tamanho selecionado
```typescript
const selectedTotalBytes = useMemo(() => {
  return videoVersions
    .filter(v => selectedVersionIds.has(v.id))
    .reduce((sum, v) => sum + v.file_size_bytes, 0);
}, [videoVersions, selectedVersionIds]);
```
