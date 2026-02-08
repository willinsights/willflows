import { useState, useMemo, useRef, useCallback } from 'react';
import { Upload, FileText, AlertTriangle, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useClients } from '@/hooks/useClients';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { KanbanPhase } from '@/hooks/useKanban';

interface ImportProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: KanbanPhase;
  onSuccess: () => void;
}

interface ParsedProject {
  id: string;
  selected: boolean;
  name: string;
  clientName: string;
  clientId: string | null;
  priority: string;
  itemType: string;
  shootDate: string;
  deliveryDate: string;
  city: string;
  notes: string;
  projectCode: string;
  agreedValue: string;
  isDuplicate: boolean;
}

const COLUMN_MAP: Record<string, keyof ParsedProject> = {
  nome: 'name',
  name: 'name',
  cliente: 'clientName',
  client: 'clientName',
  prioridade: 'priority',
  priority: 'priority',
  tipo: 'itemType',
  type: 'itemType',
  item_type: 'itemType',
  data_captacao: 'shootDate',
  shoot_date: 'shootDate',
  data_entrega: 'deliveryDate',
  delivery_date: 'deliveryDate',
  cidade: 'city',
  city: 'city',
  notas: 'notes',
  notes: 'notes',
  codigo: 'projectCode',
  project_code: 'projectCode',
  valor: 'agreedValue',
  agreed_value: 'agreedValue',
};

const PRIORITY_MAP: Record<string, string> = {
  baixa: 'baixa',
  low: 'baixa',
  media: 'media',
  média: 'media',
  medium: 'media',
  alta: 'alta',
  high: 'alta',
  urgente: 'urgente',
  urgent: 'urgente',
};

const TYPE_MAP: Record<string, string> = {
  projeto_captacao: 'projeto_captacao',
  projeto_edicao: 'projeto_edicao',
  projeto_completo: 'projeto_completo',
  reuniao: 'reuniao',
  captacao: 'projeto_captacao',
  edicao: 'projeto_edicao',
  completo: 'projeto_completo',
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function createEmptyProject(id: string): ParsedProject {
  return {
    id,
    selected: true,
    name: '',
    clientName: '',
    clientId: null,
    priority: 'media',
    itemType: 'projeto_completo',
    shootDate: '',
    deliveryDate: '',
    city: '',
    notes: '',
    projectCode: '',
    agreedValue: '',
    isDuplicate: false,
  };
}

export function ImportProjectsModal({ open, onOpenChange, phase, onSuccess }: ImportProjectsModalProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { clients } = useClients();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawText, setRawText] = useState('');
  const [parsedProjects, setParsedProjects] = useState<ParsedProject[]>([]);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Fetch existing project names for duplicate detection
  const fetchExistingNames = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    const { data } = await supabase
      .from('projects')
      .select('name')
      .eq('workspace_id', currentWorkspace.id);
    if (data) {
      setExistingNames(new Set(data.map(p => p.name.toLowerCase().trim())));
    }
  }, [currentWorkspace?.id]);

  const matchClient = useCallback((name: string): string | null => {
    if (!name) return null;
    const lower = name.toLowerCase().trim();
    const match = clients.find(c => c.name.toLowerCase().trim() === lower);
    return match?.id || null;
  }, [clients]);

  const parseInput = useCallback((text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    // Detect if CSV (first line has commas and looks like headers)
    const firstLine = lines[0].toLowerCase();
    const hasCommas = firstLine.includes(',');
    const looksLikeHeader = hasCommas && (
      firstLine.includes('nome') || firstLine.includes('name') ||
      firstLine.includes('cliente') || firstLine.includes('client')
    );

    if (looksLikeHeader && lines.length > 1) {
      // CSV mode
      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const mappedHeaders = headers.map(h => COLUMN_MAP[h] || null);

      return lines.slice(1).slice(0, 50).map((line, idx) => {
        const values = parseCSVLine(line);
        const project = createEmptyProject(`import-${idx}`);

        mappedHeaders.forEach((field, colIdx) => {
          if (!field || colIdx >= values.length) return;
          const val = values[colIdx];
          if (!val) return;

          if (field === 'priority') {
            project.priority = PRIORITY_MAP[val.toLowerCase()] || 'media';
          } else if (field === 'itemType') {
            project.itemType = TYPE_MAP[val.toLowerCase()] || 'projeto_completo';
          } else if (field === 'clientName') {
            project.clientName = val;
            project.clientId = matchClient(val);
          } else {
            (project as any)[field] = val;
          }
        });

        project.isDuplicate = existingNames.has(project.name.toLowerCase().trim());
        return project;
      }).filter(p => p.name.length > 0);
    }

    // Simple text mode - one project per line
    return lines.slice(0, 50).map((line, idx) => {
      const project = createEmptyProject(`import-${idx}`);
      project.name = line;
      project.isDuplicate = existingNames.has(line.toLowerCase().trim());
      return project;
    });
  }, [existingNames, matchClient]);

  const handleParse = useCallback(async () => {
    await fetchExistingNames();
    const projects = parseInput(rawText);
    if (projects.length === 0) {
      toast({ title: 'Nenhum projeto encontrado', description: 'Verifica o formato do texto.', variant: 'destructive' });
      return;
    }
    setParsedProjects(projects);
    setStep('preview');
  }, [rawText, parseInput, fetchExistingNames, toast]);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawText(text);
  }, []);

  const updateProject = useCallback((id: string, field: string, value: any) => {
    setParsedProjects(prev => prev.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    setParsedProjects(prev => prev.map(p => ({ ...p, selected: checked })));
  }, []);

  const handleImport = useCallback(async () => {
    if (!currentWorkspace?.id || !user?.id) return;

    const selected = parsedProjects.filter(p => p.selected && p.name.trim());
    if (selected.length === 0) {
      toast({ title: 'Nenhum projeto selecionado', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      // Get first non-final column for this phase
      const { data: columns } = await supabase
        .from('kanban_columns')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .eq('phase', phase)
        .eq('is_final', false)
        .order('position', { ascending: true })
        .limit(1);

      const columnId = columns?.[0]?.id || null;

      const projectsToInsert = selected.map(p => ({
        name: p.name.trim(),
        workspace_id: currentWorkspace.id,
        created_by: user.id,
        current_phase: phase,
        ...(phase === 'captacao'
          ? { captacao_column_id: columnId }
          : { edicao_column_id: columnId }),
        client_id: p.clientId || null,
        priority: (p.priority || 'media') as 'baixa' | 'media' | 'alta' | 'urgente',
        item_type: (p.itemType || 'projeto_completo') as 'projeto_captacao' | 'projeto_edicao' | 'projeto_completo' | 'reuniao',
        type: 'video' as const,
        shoot_date: p.shootDate || null,
        delivery_date: p.deliveryDate || null,
        city: p.city || null,
        notes: p.notes || null,
        project_code: p.projectCode || null,
        agreed_value: p.agreedValue ? parseFloat(p.agreedValue) : null,
      }));

      const { error } = await supabase
        .from('projects')
        .insert(projectsToInsert);

      if (error) throw error;

      toast({
        title: `${selected.length} projeto${selected.length > 1 ? 's' : ''} importado${selected.length > 1 ? 's' : ''}`,
      });

      onSuccess();
      handleReset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Erro ao importar',
        description: err.message || 'Tenta novamente.',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  }, [parsedProjects, currentWorkspace?.id, user?.id, phase, onSuccess, onOpenChange, toast]);

  const handleReset = useCallback(() => {
    setRawText('');
    setParsedProjects([]);
    setStep('input');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const selectedCount = parsedProjects.filter(p => p.selected).length;
  const allSelected = parsedProjects.length > 0 && parsedProjects.every(p => p.selected);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar Projetos
          </DialogTitle>
          <DialogDescription>
            Cola texto (um projeto por linha) ou importa um ficheiro CSV.
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-3 flex-1">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Colar Texto
                </TabsTrigger>
                <TabsTrigger value="csv">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Ficheiro CSV
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text" className="mt-3">
                <Textarea
                  placeholder={"Casamento Ana e Pedro\nVídeo Corporativo Empresa X\nSessão Recém-Nascido Maria"}
                  className="min-h-[200px] text-sm font-mono"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
              </TabsContent>
              <TabsContent value="csv" className="mt-3">
                <div className="space-y-3">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="text-sm"
                  />
                  {rawText && (
                    <div className="rounded-lg bg-muted/50 p-3 text-xs font-mono max-h-[150px] overflow-auto whitespace-pre-wrap">
                      {rawText.slice(0, 1000)}{rawText.length > 1000 ? '...' : ''}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <p className="text-[11px] text-muted-foreground">
              Texto simples: um nome de projeto por linha. CSV: use headers como <code>nome</code>, <code>cliente</code>, <code>prioridade</code>, <code>data_entrega</code>, etc. Máx 50 projetos.
            </p>
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 overflow-hidden flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => toggleAll(!!v)}
                />
                <span className="text-xs text-muted-foreground">
                  {selectedCount} de {parsedProjects.length} selecionado{selectedCount !== 1 ? 's' : ''}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setStep('input')}>
                ← Voltar
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-1.5">
                {parsedProjects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg border text-sm transition-colors",
                      project.selected ? "bg-background border-border" : "bg-muted/30 border-transparent opacity-60"
                    )}
                  >
                    <Checkbox
                      checked={project.selected}
                      onCheckedChange={(v) => updateProject(project.id, 'selected', !!v)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Input
                          value={project.name}
                          onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                          className="h-7 text-xs font-medium flex-1 min-w-[150px]"
                          placeholder="Nome do projeto"
                        />
                        {project.isDuplicate && (
                          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/10">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            Duplicado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Input
                          value={project.clientName}
                          onChange={(e) => {
                            updateProject(project.id, 'clientName', e.target.value);
                            updateProject(project.id, 'clientId', matchClient(e.target.value));
                          }}
                          className="h-6 text-[11px] w-[120px]"
                          placeholder="Cliente"
                        />
                        <Select
                          value={project.priority}
                          onValueChange={(v) => updateProject(project.id, 'priority', v)}
                        >
                          <SelectTrigger className="h-6 text-[11px] w-[90px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixa">Baixa</SelectItem>
                            <SelectItem value="media">Média</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={project.itemType}
                          onValueChange={(v) => updateProject(project.id, 'itemType', v)}
                        >
                          <SelectTrigger className="h-6 text-[11px] w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="projeto_completo">Completo</SelectItem>
                            <SelectItem value="projeto_captacao">Captação</SelectItem>
                            <SelectItem value="projeto_edicao">Edição</SelectItem>
                            <SelectItem value="reuniao">Reunião</SelectItem>
                          </SelectContent>
                        </Select>
                        {project.clientId && (
                          <Badge variant="secondary" className="text-[10px]">✓ Cliente</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => setParsedProjects(prev => prev.filter(p => p.id !== project.id))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {step === 'input' ? (
            <Button
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="gradient-primary"
            >
              Pré-visualizar
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="gradient-primary"
            >
              {importing && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Importar {selectedCount} projeto{selectedCount !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
