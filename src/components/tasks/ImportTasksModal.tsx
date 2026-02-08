import { useState, useCallback } from 'react';
import { Upload, Sparkles, Trash2, Loader2, AlertTriangle, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';

type Task = Tables<'tasks'>;

interface ParsedTask {
  id: string;
  title: string;
  description: string;
  phase: 'captacao' | 'edicao';
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  checklist_items: string[];
  selected: boolean;
  isDuplicate: boolean;
}

interface ImportTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceId: string;
  currentPhase: 'captacao' | 'edicao';
  existingTasks: Task[];
  onSuccess: () => void;
}

const priorityColors: Record<string, string> = {
  baixa: 'bg-muted text-muted-foreground',
  media: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  alta: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  urgente: 'bg-destructive/10 text-destructive border-destructive/30',
};

const priorityLabels: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

const phaseLabels: Record<string, string> = {
  captacao: 'Captação',
  edicao: 'Edição',
};

export function ImportTasksModal({
  open,
  onOpenChange,
  projectId,
  workspaceId,
  currentPhase,
  existingTasks,
  onSuccess,
}: ImportTasksModalProps) {
  const { toast } = useToast();
  const [textContent, setTextContent] = useState('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const existingTitles = existingTasks.map(t => t.title.toLowerCase().trim());

  const resetState = useCallback(() => {
    setTextContent('');
    setParsedTasks([]);
    setShowPreview(false);
    setIsAnalyzing(false);
    setIsImporting(false);
  }, []);

  const handleAnalyze = async () => {
    if (!textContent.trim() || textContent.trim().length < 10) {
      toast({ title: 'Texto demasiado curto', description: 'Cole pelo menos uma frase com contexto.', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-parse-tasks', {
        body: { text: textContent, currentPhase },
      });

      if (error) {
        const message = (error as any)?.message || 'Erro ao analisar texto';
        toast({ title: 'Erro na análise', description: message, variant: 'destructive' });
        return;
      }

      if (!data?.tasks?.length) {
        toast({ title: 'Nenhuma tarefa encontrada', description: 'A IA não conseguiu extrair tarefas deste texto. Tenta reformular.', variant: 'destructive' });
        return;
      }

      const mapped: ParsedTask[] = data.tasks.slice(0, 50).map((t: any, i: number) => ({
        id: `parsed-${i}-${Date.now()}`,
        title: (t.title || '').slice(0, 80),
        description: t.description || '',
        phase: ['captacao', 'edicao'].includes(t.phase) ? t.phase : currentPhase,
        priority: ['baixa', 'media', 'alta', 'urgente'].includes(t.priority) ? t.priority : 'media',
        checklist_items: Array.isArray(t.checklist_items) ? t.checklist_items.filter((s: any) => typeof s === 'string' && s.trim()) : [],
        selected: true,
        isDuplicate: existingTitles.includes((t.title || '').toLowerCase().trim()),
      }));

      setParsedTasks(mapped);
      setShowPreview(true);
      toast({ title: `${mapped.length} tarefa(s) extraída(s)` });
    } catch (e) {
      console.error('AI parse error:', e);
      toast({ title: 'Erro inesperado', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleTask = (id: string) => {
    setParsedTasks(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const removeTask = (id: string) => {
    setParsedTasks(prev => prev.filter(t => t.id !== id));
  };

  const updateTask = (id: string, field: keyof ParsedTask, value: any) => {
    setParsedTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      const updated = { ...t, [field]: value };
      if (field === 'title') {
        updated.isDuplicate = existingTitles.includes((value as string).toLowerCase().trim());
      }
      return updated;
    }));
  };

  const handleImport = async () => {
    const selected = parsedTasks.filter(t => t.selected && t.title.trim());
    if (!selected.length) {
      toast({ title: 'Nenhuma tarefa selecionada', variant: 'destructive' });
      return;
    }

    setIsImporting(true);
    try {
      // Get current max position
      const { data: existingPositions } = await supabase
        .from('tasks')
        .select('position')
        .eq('project_id', projectId)
        .order('position', { ascending: false })
        .limit(1);

      let nextPosition = (existingPositions?.[0]?.position ?? -1) + 1;

      for (const task of selected) {
        const { data: newTask, error: taskError } = await supabase
          .from('tasks')
          .insert({
            project_id: projectId,
            workspace_id: workspaceId,
            title: task.title.trim(),
            description: task.description.trim() || null,
            phase: task.phase,
            priority: task.priority,
            position: nextPosition++,
          })
          .select()
          .single();

        if (taskError || !newTask) {
          console.error('Error creating task:', taskError);
          continue;
        }

        // Insert checklist items
        if (task.checklist_items.length > 0) {
          const checklistInserts = task.checklist_items.map((item, idx) => ({
            task_id: newTask.id,
            title: item.trim(),
            position: idx,
            is_completed: false,
          }));

          const { error: checklistError } = await supabase
            .from('task_checklists')
            .insert(checklistInserts);

          if (checklistError) {
            console.error('Error creating checklists:', checklistError);
          }
        }
      }

      toast({ title: `${selected.length} tarefa(s) importada(s) com sucesso` });
      onSuccess();
      onOpenChange(false);
      resetState();
    } catch (e) {
      console.error('Import error:', e);
      toast({ title: 'Erro ao importar tarefas', variant: 'destructive' });
    } finally {
      setIsImporting(false);
    }
  };

  const selectedCount = parsedTasks.filter(t => t.selected).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Importar Tarefas com IA
          </DialogTitle>
          <DialogDescription>
            Cole texto livre (briefing, notas de reunião, email) e a IA extrai tarefas automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!showPreview ? (
          <div className="space-y-4 flex-1">
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder={"Ex: Precisamos gravar a entrevista com o CEO na sexta-feira.\nDepois editar o vídeo com correção de cor e adicionar legendas.\nPrioridade alta para a entrevista."}
              className="min-h-[200px] resize-none"
              maxLength={10000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {textContent.length}/10.000 caracteres
              </span>
              <Button
                onClick={handleAnalyze}
                disabled={isAnalyzing || textContent.trim().length < 10}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A analisar...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {selectedCount} de {parsedTasks.length} tarefa(s) selecionada(s)
              </p>
              <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                ← Voltar ao texto
              </Button>
            </div>

            <ScrollArea className="flex-1 max-h-[50vh]">
              <div className="space-y-3 pr-4">
                {parsedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      "border rounded-lg p-3 space-y-2 transition-opacity",
                      !task.selected && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={task.selected}
                        onCheckedChange={() => toggleTask(task.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <Input
                          value={task.title}
                          onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                          className="h-8 text-sm font-medium"
                          maxLength={80}
                        />
                        {task.isDuplicate && (
                          <div className="flex items-center gap-1 text-xs text-yellow-500">
                            <AlertTriangle className="h-3 w-3" />
                            Possível duplicado
                          </div>
                        )}
                        <Input
                          value={task.description}
                          onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                          placeholder="Descrição (opcional)"
                          className="h-7 text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <Select
                            value={task.phase}
                            onValueChange={(v) => updateTask(task.id, 'phase', v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="captacao">Captação</SelectItem>
                              <SelectItem value="edicao">Edição</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={task.priority}
                            onValueChange={(v) => updateTask(task.id, 'priority', v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="baixa">Baixa</SelectItem>
                              <SelectItem value="media">Média</SelectItem>
                              <SelectItem value="alta">Alta</SelectItem>
                              <SelectItem value="urgente">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge variant="outline" className={cn("text-[10px]", priorityColors[task.priority])}>
                            {priorityLabels[task.priority]}
                          </Badge>
                        </div>
                        {task.checklist_items.length > 0 && (
                          <div className="pl-2 space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sub-itens:</p>
                            {task.checklist_items.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Check className="h-3 w-3 opacity-40" />
                                {item}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeTask(task.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => { onOpenChange(false); resetState(); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || selectedCount === 0}
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A importar...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {selectedCount} tarefa(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
